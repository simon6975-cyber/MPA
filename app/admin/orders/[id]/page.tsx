"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchOrderById, updateOrderStatus, markPdfGenerated } from "../../../_lib/adminOrderService";
import { STATUS_LABELS, STATUS_COLORS, Order, OrderStatus } from "../../../_lib/types";
import { generateOrderPdfSafe, downloadPdf, LAYOUT, PdfGenerationProgress } from "../../../_lib/pdfGenerator";
import { getThumbnailUrl } from "../../../_lib/firebase";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusUpdated, setStatusUpdated] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<PdfGenerationProgress | null>(null);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchOrderById(orderId);
        if (!data) {
          setError("주문을 찾을 수 없습니다.");
        } else {
          setOrder(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "주문 조회 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  if (loading) {
    return (
      <div style={{ background: "#fff", borderRadius: 10, padding: 60, textAlign: "center", border: "1px solid #e8eaed" }}>
        <div style={{ width: 32, height: 32, margin: "0 auto 16px", border: "3px solid #eee", borderTopColor: "#1a1a1a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#888", fontSize: 13, margin: 0 }}>주문 정보 불러오는 중...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ background: "#fff", borderRadius: 10, padding: 40, textAlign: "center", border: "1px solid #e8eaed" }}>
        <p style={{ color: "#888", fontSize: 14, margin: 0 }}>{error || "주문을 찾을 수 없습니다."}</p>
        <Link href="/admin" style={{ display: "inline-block", marginTop: 16, fontSize: 13, color: "#1a1a1a", textDecoration: "underline" }}>
          ← 주문 목록으로
        </Link>
      </div>
    );
  }

  const totalPdfPages = Math.ceil(order.photos.length / LAYOUT.PHOTOS_PER_PAGE);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (newStatus === order.status) return;
    if (!confirm(`주문 상태를 "${STATUS_LABELS[newStatus]}"(으)로 변경하시겠습니까?`)) return;
    try {
      await updateOrderStatus(order.id, newStatus);
      setOrder({ ...order, status: newStatus });
      setStatusUpdated(true);
      setTimeout(() => setStatusUpdated(false), 2000);
    } catch (err) {
      alert(`상태 변경 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    }
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    // 실제로는 Cloud Functions에서 ZIP 생성 후 서명된 URL 반환
    // 지금은 Storage URL을 직접 순차 다운로드하는 방식으로 대체
    await new Promise(r => setTimeout(r, 500));
    for (const p of order.photos) {
      const a = document.createElement("a");
      a.href = p.url;
      a.download = p.filename;
      a.target = "_blank";
      a.click();
      await new Promise(r => setTimeout(r, 200)); // 브라우저가 처리할 시간
    }
    setDownloadingAll(false);
  };

  const handleDownloadSingle = (photoUrl: string, filename: string) => {
    const a = document.createElement("a");
    a.href = photoUrl;
    a.download = filename;
    a.target = "_blank";
    a.click();
  };

  const handleGeneratePdf = async () => {
    setPdfGenerating(true);
    setPdfError("");
    setPdfProgress({ current: 0, total: order.photos.length, stage: "downloading" });

    try {
      const pdfBytes = await generateOrderPdfSafe(order.photos, (p) => setPdfProgress(p));
      downloadPdf(pdfBytes, `${order.orderNumber}_print.pdf`);

      const sizeKb = Math.round(pdfBytes.length / 1024);
      await markPdfGenerated(order.id, { totalPages: totalPdfPages, fileSizeKb: sizeKb });
      setOrder({ ...order, pdf: { generated: true, generatedAt: new Date().toISOString(), totalPages: totalPdfPages, fileSizeKb: sizeKb } });
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "PDF 생성 중 오류가 발생했습니다");
    } finally {
      setPdfGenerating(false);
      setPdfProgress(null);
    }
  };

  const statusOptions: OrderStatus[] = ["pending", "producing", "shipping", "delivered", "cancelled"];

  return (
    <div>
      <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#888", fontSize: 13, textDecoration: "none", marginBottom: 16 }}>← 주문 목록</Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a1a", fontFamily: "monospace" }}>{order.orderNumber}</h1>
            <span style={{ padding: "4px 10px", background: STATUS_COLORS[order.status].bg, color: STATUS_COLORS[order.status].text, borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
              {STATUS_LABELS[order.status]}
            </span>
            {statusUpdated && <span style={{ fontSize: 11, color: "#2E7D32", fontWeight: 500 }}>✓ 상태 변경됨</span>}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>주문일시: {formatDate(order.createdAt)}</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>상태 변경</label>
          <select value={order.status} onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
            style={{ padding: "8px 12px", background: "#fff", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, color: "#1a1a1a", cursor: "pointer", outline: "none" }}>
            {statusOptions.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #e8eaed" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>고객 정보</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: order.customer.provider === "kakao" ? "#FEE500" : order.customer.provider === "naver" ? "#03C75A" : "#999",
              color: order.customer.provider === "kakao" ? "#191919" : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700,
            }}>
              {order.customer.provider === "kakao" ? "K" : order.customer.provider === "naver" ? "N" : "D"}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{order.customer.name}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#888" }}>
                {order.customer.provider === "kakao" ? "카카오" : order.customer.provider === "naver" ? "네이버" : "데모"} · {order.userId.slice(0, 12)}...
              </p>
            </div>
          </div>
          {[["연락처", order.customer.phone], ["이메일", order.customer.email]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", fontSize: 13, padding: "6px 0" }}>
              <span style={{ width: 80, color: "#888" }}>{k}</span>
              <span style={{ color: "#1a1a1a" }}>{v || "(없음)"}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #e8eaed" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>배송 정보</h3>
          {[["주소", order.shipping.address], ["상세주소", order.shipping.addressDetail], ["배송메시지", order.shipping.message || "(없음)"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", fontSize: 13, padding: "6px 0", lineHeight: 1.5 }}>
              <span style={{ width: 80, color: "#888", flexShrink: 0 }}>{k}</span>
              <span style={{ color: "#1a1a1a" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #e8eaed", marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>상품 및 결제</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 60, height: 80, background: order.product.coverHex, borderRadius: "2px 6px 6px 2px", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>{order.product.tierName}</p>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#888" }}>사진 {order.product.photoCount}장 · 커버 {order.product.coverColor}</p>
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "#aaa" }}>결제수단: {order.payment.method === "applepay" ? "Apple Pay" : "신용카드"}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 11, color: "#888" }}>결제 금액</p>
            <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>{order.payment.amount.toLocaleString()}원</p>
          </div>
        </div>
      </div>

      {/* PDF 출력 파일 */}
      <div style={{ background: "linear-gradient(135deg, #fff 0%, #fafaf8 100%)", borderRadius: 10, padding: 20, border: "2px solid #1a1a1a", marginBottom: 16, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, padding: "4px 12px", background: "#1a1a1a", color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, borderRadius: "0 0 8px 0" }}>⭐ 제작용 출력 파일</div>

        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <h3 style={{ margin: "8px 0 0", fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>인쇄용 PDF</h3>
            <p style={{ margin: "6px 0 12px", fontSize: 12, color: "#666", lineHeight: 1.6 }}>
              용지 {LAYOUT.PAGE_WIDTH_MM}×{LAYOUT.PAGE_HEIGHT_MM}mm · 페이지당 {LAYOUT.PHOTOS_PER_PAGE}장 배치
            </p>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12 }}>
              <div>
                <span style={{ color: "#888" }}>총 페이지</span>
                <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{totalPdfPages}<span style={{ fontSize: 11, color: "#aaa", marginLeft: 2 }}>페이지</span></p>
              </div>
              <div>
                <span style={{ color: "#888" }}>사진 수</span>
                <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{order.photos.length}<span style={{ fontSize: 11, color: "#aaa", marginLeft: 2 }}>장</span></p>
              </div>
              {order.pdf?.generated && order.pdf.generatedAt && (
                <div>
                  <span style={{ color: "#888" }}>생성 일시</span>
                  <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>{formatDate(order.pdf.generatedAt)}</p>
                </div>
              )}
            </div>
            <div style={{ marginTop: 12 }}>
              {order.pdf?.generated ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "#E8F5E9", color: "#2E7D32", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                  ✓ 생성 완료
                  {order.pdf.fileSizeKb && <span style={{ opacity: 0.7, fontWeight: 400, marginLeft: 4 }}>({(order.pdf.fileSizeKb / 1024).toFixed(1)}MB)</span>}
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "#FFF3E0", color: "#E65100", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>⏳ 미생성</span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
            <button onClick={handleGeneratePdf} disabled={pdfGenerating} style={{
              padding: "12px 20px", background: pdfGenerating ? "#ccc" : "#1a1a1a", color: "#fff", border: "none", borderRadius: 8,
              fontSize: 14, fontWeight: 700, cursor: pdfGenerating ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: pdfGenerating ? "none" : "0 2px 8px rgba(0,0,0,0.2)",
            }}>
              {pdfGenerating ? "⚙ 생성 중..." : order.pdf?.generated ? "⬇ PDF 다시 생성 및 다운로드" : "⬇ PDF 생성 및 다운로드"}
            </button>

            {pdfGenerating && pdfProgress && (
              <div style={{ padding: "10px 12px", background: "#fff", border: "1px solid #e8eaed", borderRadius: 8, fontSize: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#666", fontWeight: 500 }}>
                    {pdfProgress.stage === "downloading" && "📥 사진 다운로드"}
                    {pdfProgress.stage === "embedding" && "🎨 PDF 임베딩"}
                    {pdfProgress.stage === "drawing" && "📄 페이지 그리기"}
                    {pdfProgress.stage === "saving" && "💾 저장 중"}
                  </span>
                  <span style={{ color: "#1a1a1a", fontWeight: 600 }}>{pdfProgress.current} / {pdfProgress.total}</span>
                </div>
                <div style={{ height: 4, background: "#eee", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(pdfProgress.current / pdfProgress.total) * 100}%`, background: "#1a1a1a", transition: "width 0.2s" }} />
                </div>
              </div>
            )}

            {pdfError && <div style={{ padding: "10px 12px", background: "#FFEBEE", border: "1px solid #FFCDD2", borderRadius: 8, fontSize: 11, color: "#C62828", lineHeight: 1.5 }}>⚠ {pdfError}</div>}
          </div>
        </div>
      </div>

      {/* 사진 원본 - 옵션 C: 요약 카드 + 펼치기 + 점진적 렌더링 */}
      <PhotosSection
        photos={order.photos}
        onDownloadAll={handleDownloadAll}
        onDownloadSingle={handleDownloadSingle}
        downloadingAll={downloadingAll}
      />
    </div>
  );
}

/* ─── 사진 섹션 (성능 최적화용 하위 컴포넌트) ─── */

interface PhotosSectionProps {
  photos: Order["photos"];
  onDownloadAll: () => void;
  onDownloadSingle: (url: string, filename: string) => void;
  downloadingAll: boolean;
}

/**
 * 성능 최적화 전략:
 * 1. 기본값은 "접힘" 상태 - 요약 카드만 표시하여 페이지 초기 렌더링 부담 0
 * 2. 펼치면 점진적 렌더링 - 처음에 PAGE_SIZE(20)장만 렌더링하고, 스크롤 또는 "더 보기" 버튼으로 추가 로딩
 * 3. img에 loading="lazy" + 썸네일 URL 사용으로 네트워크 부담도 최소화
 *
 * 100장 주문 기준:
 *   - 접힘 상태: DOM 요소 수 거의 0 → 페이지 전체가 가벼움
 *   - 펼침 상태 초기: 20장만 렌더링 → 스크롤 부드러움
 *   - 필요 시 모두 로딩: 25장씩 점진 추가
 */
function PhotosSection({ photos, onDownloadAll, onDownloadSingle, downloadingAll }: PhotosSectionProps) {
  const PAGE_SIZE = 25;
  const [expanded, setExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // 파일 크기 합계 (MB 단위)
  const totalSizeMb = React.useMemo(() => {
    const bytes = photos.reduce((sum, p) => sum + (p.size || 0), 0);
    return (bytes / (1024 * 1024)).toFixed(1);
  }, [photos]);

  // 펼치기 토글 시 visibleCount 리셋
  const handleToggleExpand = () => {
    if (expanded) {
      setExpanded(false);
      setVisibleCount(PAGE_SIZE); // 다음 펼침을 대비해 리셋
    } else {
      setExpanded(true);
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, photos.length));
  };

  const handleLoadAll = () => {
    setVisibleCount(photos.length);
  };

  const hasMore = visibleCount < photos.length;
  const visiblePhotos = expanded ? photos.slice(0, visibleCount) : [];

  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #e8eaed" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: expanded ? 16 : 0, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: "#f0f2f5",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>📷</div>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>
              제작용 사진 {photos.length}장
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#888" }}>
              총 {totalSizeMb}MB · 원본 이미지 Firebase Storage 저장
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={handleToggleExpand} style={{
            padding: "9px 14px", background: expanded ? "#fff" : "#f5f6f8", color: "#1a1a1a",
            border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {expanded ? "▲ 접기" : "▼ 펼쳐보기"}
          </button>
          <button onClick={onDownloadAll} disabled={downloadingAll} style={{
            padding: "9px 16px", background: downloadingAll ? "#ccc" : "#1a1a1a", color: "#fff", border: "none", borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: downloadingAll ? "default" : "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {downloadingAll ? "⏳ 다운로드 중..." : "⬇ 전체 다운로드"}
          </button>
        </div>
      </div>

      {/* 펼침 상태에서만 썸네일 그리드 표시 */}
      {expanded && (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 11, color: "#888" }}>
            클릭하면 Firebase Storage에서 원본 다운로드 · {visibleCount}/{photos.length}장 표시 중
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, padding: 4 }}>
            {visiblePhotos.map((p, i) => (
              <div key={p.id} onClick={() => onDownloadSingle(p.url, p.filename)} style={{
                position: "relative", paddingBottom: "100%", cursor: "pointer", borderRadius: 6, overflow: "hidden",
                background: "#f5f6f8", transition: "transform 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              title={`${p.filename} - 클릭하여 다운로드`}>
                <img
                  src={getThumbnailUrl(p.url, "200x200")}
                  alt={p.filename}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    // 썸네일이 아직 생성되지 않았거나 Extension 미설치 시 원본으로 fallback
                    const img = e.currentTarget;
                    if (img.src !== p.url) img.src = p.url;
                  }}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", top: 4, left: 4, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>
                  {i + 1}
                </div>
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                  color: "#fff", fontSize: 9, padding: "14px 6px 5px", fontFamily: "monospace",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {p.filename}
                </div>
              </div>
            ))}
          </div>

          {/* 점진적 로딩 버튼 */}
          {hasMore && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
              <button onClick={handleLoadMore} style={{
                padding: "10px 20px", background: "#f5f6f8", color: "#1a1a1a",
                border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}>
                + {Math.min(PAGE_SIZE, photos.length - visibleCount)}장 더 보기
              </button>
              <button onClick={handleLoadAll} style={{
                padding: "10px 20px", background: "#1a1a1a", color: "#fff",
                border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}>
                전체 {photos.length}장 모두 보기
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
