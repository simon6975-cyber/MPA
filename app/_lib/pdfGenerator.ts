/* PDF 출력 파일 생성 유틸리티
 *
 * 스펙:
 * - 용지: 330 × 482mm
 * - 사진 프레임: 152.4 × 101.6mm (가로형, 6×4인치)
 * - 레이아웃: 2열 × 4행 = 페이지당 8장
 * - 사진 간격: 5mm
 * - 여백: 좌우 10.1mm, 상하 30.3mm (자동 계산)
 * - 세로 사진도 가로 프레임에 맞춤 (cover 방식 - 비율 유지하며 프레임 채움, 넘치는 부분은 중앙 크롭)
 */

import { PDFDocument, PDFImage } from "pdf-lib";

// mm → PDF pt 변환 (1mm = 2.8346pt)
const MM_TO_PT = 2.8346456693;
const mm = (n: number) => n * MM_TO_PT;

// 레이아웃 상수
export const LAYOUT = {
  PAGE_WIDTH_MM: 330,
  PAGE_HEIGHT_MM: 482,
  PHOTO_WIDTH_MM: 152.4,
  PHOTO_HEIGHT_MM: 101.6,
  GAP_MM: 5,
  COLS: 2,
  ROWS: 4,
  PHOTOS_PER_PAGE: 8,
};

// 여백 자동 계산
const TOTAL_PHOTOS_WIDTH_MM = LAYOUT.PHOTO_WIDTH_MM * LAYOUT.COLS + LAYOUT.GAP_MM * (LAYOUT.COLS - 1);
const TOTAL_PHOTOS_HEIGHT_MM = LAYOUT.PHOTO_HEIGHT_MM * LAYOUT.ROWS + LAYOUT.GAP_MM * (LAYOUT.ROWS - 1);
const MARGIN_X_MM = (LAYOUT.PAGE_WIDTH_MM - TOTAL_PHOTOS_WIDTH_MM) / 2;
const MARGIN_Y_MM = (LAYOUT.PAGE_HEIGHT_MM - TOTAL_PHOTOS_HEIGHT_MM) / 2;

export interface PdfPhoto {
  id: string;
  url: string;
  filename: string;
}

export interface PdfGenerationProgress {
  current: number;
  total: number;
  stage: "downloading" | "embedding" | "drawing" | "saving";
}

/**
 * 이미지 URL을 fetch해서 ArrayBuffer로 변환 (CORS 허용 이미지만)
 */
async function fetchImageBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`이미지 다운로드 실패 (${response.status}): ${url}`);
  }
  return await response.arrayBuffer();
}

/**
 * ArrayBuffer의 첫 바이트를 검사해 이미지 포맷을 추정
 * JPEG: FF D8 FF / PNG: 89 50 4E 47
 */
function detectImageFormat(buf: ArrayBuffer): "jpeg" | "png" | "unknown" {
  const view = new Uint8Array(buf);
  if (view.length < 4) return "unknown";
  if (view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) return "jpeg";
  if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4e && view[3] === 0x47) return "png";
  return "unknown";
}

/**
 * pdf-lib은 HEIC/WEBP 등을 지원하지 않으므로, Canvas를 이용해 JPEG로 재인코딩
 */
async function convertToJpegViaCanvas(url: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context 생성 실패"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas blob 생성 실패"));
            return;
          }
          blob.arrayBuffer().then(resolve).catch(reject);
        },
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => reject(new Error(`이미지 로드 실패: ${url}`));
    img.src = url;
  });
}

/**
 * cover 방식으로 이미지를 프레임에 맞춤
 * 넘치는 부분은 중앙 크롭 → 그릴 좌표와 크기 반환
 */
function calculateCoverFit(
  imgWidth: number,
  imgHeight: number,
  frameWidthPt: number,
  frameHeightPt: number,
  frameXPt: number,
  frameYPt: number
): { x: number; y: number; width: number; height: number; clipX: number; clipY: number; clipWidth: number; clipHeight: number } {
  const imgRatio = imgWidth / imgHeight;
  const frameRatio = frameWidthPt / frameHeightPt;

  let drawWidth: number;
  let drawHeight: number;

  if (imgRatio > frameRatio) {
    // 이미지가 프레임보다 가로로 길다 → 높이에 맞추고 가로는 넘침
    drawHeight = frameHeightPt;
    drawWidth = drawHeight * imgRatio;
  } else {
    // 이미지가 프레임보다 세로로 길다 → 너비에 맞추고 세로는 넘침
    drawWidth = frameWidthPt;
    drawHeight = drawWidth / imgRatio;
  }

  // 중앙 정렬로 배치
  const drawX = frameXPt - (drawWidth - frameWidthPt) / 2;
  const drawY = frameYPt - (drawHeight - frameHeightPt) / 2;

  return {
    x: drawX,
    y: drawY,
    width: drawWidth,
    height: drawHeight,
    clipX: frameXPt,
    clipY: frameYPt,
    clipWidth: frameWidthPt,
    clipHeight: frameHeightPt,
  };
}

/**
 * 주문의 사진들로 PDF 생성
 * @param photos 사진 목록
 * @param onProgress 진행 상황 콜백
 * @returns PDF 바이트 배열
 */
export async function generateOrderPdf(
  photos: PdfPhoto[],
  onProgress?: (p: PdfGenerationProgress) => void
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const totalPhotos = photos.length;
  const totalPages = Math.ceil(totalPhotos / LAYOUT.PHOTOS_PER_PAGE);

  const pageWidthPt = mm(LAYOUT.PAGE_WIDTH_MM);
  const pageHeightPt = mm(LAYOUT.PAGE_HEIGHT_MM);
  const photoWidthPt = mm(LAYOUT.PHOTO_WIDTH_MM);
  const photoHeightPt = mm(LAYOUT.PHOTO_HEIGHT_MM);
  const gapPt = mm(LAYOUT.GAP_MM);
  const marginXPt = mm(MARGIN_X_MM);
  const marginYPt = mm(MARGIN_Y_MM);

  // 이미지를 순차적으로 embed (병렬로 하면 메모리 이슈 가능)
  const embeddedImages: (PDFImage | null)[] = [];

  for (let i = 0; i < totalPhotos; i++) {
    onProgress?.({ current: i + 1, total: totalPhotos, stage: "downloading" });

    try {
      let imageBytes: ArrayBuffer;
      let format: "jpeg" | "png" | "unknown";

      // 먼저 직접 fetch 시도
      try {
        imageBytes = await fetchImageBytes(photos[i].url);
        format = detectImageFormat(imageBytes);
      } catch {
        // 실패 시 Canvas 경유로 JPEG 변환
        imageBytes = await convertToJpegViaCanvas(photos[i].url);
        format = "jpeg";
      }

      // 포맷이 jpeg/png이 아니면 Canvas로 변환
      if (format === "unknown") {
        imageBytes = await convertToJpegViaCanvas(photos[i].url);
        format = "jpeg";
      }

      onProgress?.({ current: i + 1, total: totalPhotos, stage: "embedding" });

      const embedded = format === "png"
        ? await pdfDoc.embedPng(imageBytes)
        : await pdfDoc.embedJpg(imageBytes);

      embeddedImages.push(embedded);
    } catch (err) {
      console.error(`사진 ${i + 1} 처리 실패:`, err);
      embeddedImages.push(null); // 실패한 사진은 빈 자리로 유지
    }
  }

  // 페이지 그리기
  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    onProgress?.({ current: pageIdx + 1, total: totalPages, stage: "drawing" });

    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

    for (let slotIdx = 0; slotIdx < LAYOUT.PHOTOS_PER_PAGE; slotIdx++) {
      const photoIdx = pageIdx * LAYOUT.PHOTOS_PER_PAGE + slotIdx;
      if (photoIdx >= totalPhotos) break;

      const embedded = embeddedImages[photoIdx];
      if (!embedded) continue;

      const col = slotIdx % LAYOUT.COLS;
      const row = Math.floor(slotIdx / LAYOUT.COLS);

      // pdf-lib은 좌하단이 원점. 우리는 좌상단 기준으로 계산하므로 뒤집음
      const frameXPt = marginXPt + col * (photoWidthPt + gapPt);
      const frameTopPt = marginYPt + row * (photoHeightPt + gapPt);
      const frameYPt = pageHeightPt - frameTopPt - photoHeightPt;

      // cover fit 계산
      const fit = calculateCoverFit(
        embedded.width,
        embedded.height,
        photoWidthPt,
        photoHeightPt,
        frameXPt,
        frameYPt
      );

      // 프레임으로 클리핑하면서 그리기 (pdf-lib은 clipping이 제한적이라,
      // cover fit 방식으로 프레임을 완전히 덮도록 그림 — 넘치는 부분은 인접 셀을 침범할 수 있으므로
      // GAP이 충분한지 체크 필요. 5mm GAP이 있으니 약간의 overflow는 허용됨.)
      // 더 안전하게 하려면 Canvas에서 미리 cover 크롭 후 embed.
      page.drawImage(embedded, {
        x: fit.x,
        y: fit.y,
        width: fit.width,
        height: fit.height,
      });
    }
  }

  onProgress?.({ current: totalPages, total: totalPages, stage: "saving" });

  return await pdfDoc.save();
}

/**
 * Cover fit을 안전하게 하기 위해 Canvas에서 미리 크롭한 이미지를 반환
 * (프레임보다 큰 부분은 잘라서 정확히 프레임 크기로)
 */
export async function cropImageToCover(url: string, targetRatio: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const imgRatio = img.naturalWidth / img.naturalHeight;
      let srcX = 0, srcY = 0, srcW = img.naturalWidth, srcH = img.naturalHeight;

      if (imgRatio > targetRatio) {
        // 이미지가 가로로 더 김 → 가로 크롭
        srcW = img.naturalHeight * targetRatio;
        srcX = (img.naturalWidth - srcW) / 2;
      } else {
        // 이미지가 세로로 더 김 → 세로 크롭
        srcH = img.naturalWidth / targetRatio;
        srcY = (img.naturalHeight - srcH) / 2;
      }

      const canvas = document.createElement("canvas");
      // 출력 해상도는 원본의 크롭된 크기를 유지 (인쇄 품질 보존)
      canvas.width = Math.round(srcW);
      canvas.height = Math.round(srcH);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context 실패")); return; }

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Blob 생성 실패")); return; }
          blob.arrayBuffer().then(resolve).catch(reject);
        },
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => reject(new Error(`이미지 로드 실패: ${url}`));
    img.src = url;
  });
}

/**
 * Cover 크롭 버전의 PDF 생성 (더 안전, 권장)
 */
export async function generateOrderPdfSafe(
  photos: PdfPhoto[],
  onProgress?: (p: PdfGenerationProgress) => void
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const totalPhotos = photos.length;
  const totalPages = Math.ceil(totalPhotos / LAYOUT.PHOTOS_PER_PAGE);

  const pageWidthPt = mm(LAYOUT.PAGE_WIDTH_MM);
  const pageHeightPt = mm(LAYOUT.PAGE_HEIGHT_MM);
  const photoWidthPt = mm(LAYOUT.PHOTO_WIDTH_MM);
  const photoHeightPt = mm(LAYOUT.PHOTO_HEIGHT_MM);
  const gapPt = mm(LAYOUT.GAP_MM);
  const marginXPt = mm(MARGIN_X_MM);
  const marginYPt = mm(MARGIN_Y_MM);

  const targetRatio = photoWidthPt / photoHeightPt; // 프레임 비율

  const embeddedImages: (PDFImage | null)[] = [];

  for (let i = 0; i < totalPhotos; i++) {
    onProgress?.({ current: i + 1, total: totalPhotos, stage: "downloading" });
    try {
      // Canvas에서 cover 크롭 후 JPEG로 변환
      const croppedBytes = await cropImageToCover(photos[i].url, targetRatio);
      onProgress?.({ current: i + 1, total: totalPhotos, stage: "embedding" });
      const embedded = await pdfDoc.embedJpg(croppedBytes);
      embeddedImages.push(embedded);
    } catch (err) {
      console.error(`사진 ${i + 1} 처리 실패:`, err);
      embeddedImages.push(null);
    }
  }

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    onProgress?.({ current: pageIdx + 1, total: totalPages, stage: "drawing" });
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

    for (let slotIdx = 0; slotIdx < LAYOUT.PHOTOS_PER_PAGE; slotIdx++) {
      const photoIdx = pageIdx * LAYOUT.PHOTOS_PER_PAGE + slotIdx;
      if (photoIdx >= totalPhotos) break;

      const embedded = embeddedImages[photoIdx];
      if (!embedded) continue;

      const col = slotIdx % LAYOUT.COLS;
      const row = Math.floor(slotIdx / LAYOUT.COLS);
      const frameXPt = marginXPt + col * (photoWidthPt + gapPt);
      const frameTopPt = marginYPt + row * (photoHeightPt + gapPt);
      const frameYPt = pageHeightPt - frameTopPt - photoHeightPt;

      // 크롭된 이미지는 이미 정확한 비율이므로 프레임에 딱 맞춤
      page.drawImage(embedded, {
        x: frameXPt,
        y: frameYPt,
        width: photoWidthPt,
        height: photoHeightPt,
      });
    }
  }

  onProgress?.({ current: totalPages, total: totalPages, stage: "saving" });
  return await pdfDoc.save();
}

/**
 * Uint8Array를 브라우저에서 파일로 다운로드
 */
export function downloadPdf(bytes: Uint8Array, filename: string): void {
  // Uint8Array를 Blob으로 변환 (TypeScript strict 모드 호환)
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 메모리 정리는 약간 지연 (다운로드 시작 보장)
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
