/**
 * 1:1 문의 서비스
 *
 * Firestore 컬렉션 "inquiries" + Storage 이미지 업로드를 관리합니다.
 *
 * Storage 경로: inquiries/{userId}/{inquiryId}/{filename}
 * 이미지 최대: 5장, 각 5MB 이하
 *
 * 상태 전이:
 *   pending → answered (관리자가 답변 작성 시)
 *   answered → closed (사용자가 종료하거나 관리자가 종료)
 */

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getDb, getFirebaseStorage } from "./firebase";
import { Inquiry, InquiryImage, InquiryStatus } from "./types";

const COLLECTION = "inquiries";

export const INQUIRY_MAX_IMAGES = 5;
export const INQUIRY_MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/* ─── 이미지 업로드 유틸 ─── */

/**
 * 단일 이미지를 Storage에 업로드하고 InquiryImage 객체 반환.
 *
 * @param userId 작성자 UID (Storage 경로에 사용)
 * @param inquiryId 문의 ID (Storage 경로에 사용)
 * @param file 업로드할 파일 (이미지여야 함)
 */
export async function uploadInquiryImage(
  userId: string,
  inquiryId: string,
  file: File,
): Promise<InquiryImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }
  if (file.size > INQUIRY_MAX_IMAGE_SIZE) {
    throw new Error(`파일 크기는 ${INQUIRY_MAX_IMAGE_SIZE / 1024 / 1024}MB 이하여야 합니다.`);
  }

  const storage = getFirebaseStorage();
  // 파일명 충돌 방지: timestamp_original.ext 형식
  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const storagePath = `inquiries/${userId}/${inquiryId}/${safeName}`;
  const fileRef = ref(storage, storagePath);

  await uploadBytes(fileRef, file, { contentType: file.type });
  const url = await getDownloadURL(fileRef);

  return { url, storagePath, filename: file.name };
}

/* ─── 읽기 (고객용) ─── */

/** 특정 사용자의 문의 목록 (최신순) */
export async function fetchInquiriesByUserId(userId: string): Promise<Inquiry[]> {
  const db = getDb();
  const q = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Inquiry);
}

/** 특정 사용자의 문의 실시간 구독 */
export function subscribeInquiriesByUserId(
  userId: string,
  onChange: (inquiries: Inquiry[]) => void,
): () => void {
  const db = getDb();
  const q = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Inquiry);
    onChange(list);
  });
}

/** 문의 단건 조회 */
export async function fetchInquiryById(id: string): Promise<Inquiry | null> {
  const db = getDb();
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Inquiry;
}

/* ─── 읽기 (어드민) ─── */

/** 전체 문의 목록 (최신순). 상태별 필터 지원 */
export async function fetchAllInquiries(statusFilter?: InquiryStatus): Promise<Inquiry[]> {
  const db = getDb();
  let q;
  if (statusFilter) {
    q = query(
      collection(db, COLLECTION),
      where("status", "==", statusFilter),
      orderBy("createdAt", "desc"),
    );
  } else {
    q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Inquiry);
}

/* ─── 쓰기 (고객) ─── */

export interface InquiryInput {
  userId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  title: string;
  content: string;
  orderNumber?: string;
}

/**
 * 새 문의를 생성합니다. 이미지는 먼저 문의 문서를 만들고, 그 ID를 경로로 업로드합니다.
 *
 * 순서:
 *   1. Firestore에 빈 문의 문서 생성 (images=[])
 *   2. 각 이미지를 해당 inquiryId 경로로 업로드
 *   3. 문서에 images 배열 업데이트
 */
export async function createInquiry(
  input: InquiryInput,
  imageFiles: File[] = [],
): Promise<string> {
  if (imageFiles.length > INQUIRY_MAX_IMAGES) {
    throw new Error(`이미지는 최대 ${INQUIRY_MAX_IMAGES}장까지 첨부 가능합니다.`);
  }

  const db = getDb();
  const now = new Date().toISOString();

  // 1. 빈 문서 생성
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    images: [],
    status: "pending" as InquiryStatus,
    createdAt: now,
  });

  // 2. 이미지 업로드
  const uploadedImages: InquiryImage[] = [];
  for (const file of imageFiles) {
    try {
      const image = await uploadInquiryImage(input.userId, ref.id, file);
      uploadedImages.push(image);
    } catch (err) {
      console.error("이미지 업로드 실패:", file.name, err);
      // 이미지 하나 실패해도 문의는 생성되도록 continue
    }
  }

  // 3. 이미지 URL 저장
  if (uploadedImages.length > 0) {
    await updateDoc(ref, { images: uploadedImages });
  }

  return ref.id;
}

/** 문의 종료 (고객이 직접 종료) */
export async function closeInquiry(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), { status: "closed" as InquiryStatus });
}

/** 문의 삭제 (고객 또는 관리자). Storage 이미지도 함께 삭제 */
export async function deleteInquiry(id: string): Promise<void> {
  const db = getDb();
  const inquiry = await fetchInquiryById(id);
  if (!inquiry) return;

  // Storage 이미지 삭제 (실패해도 문서 삭제는 진행)
  const storage = getFirebaseStorage();
  for (const img of inquiry.images) {
    try {
      await deleteObject(ref(storage, img.storagePath));
    } catch (err) {
      console.warn("이미지 삭제 실패 (문서는 삭제됨):", img.storagePath, err);
    }
  }

  await deleteDoc(doc(db, COLLECTION, id));
}

/* ─── 쓰기 (어드민) ─── */

export interface AnswerInput {
  content: string;
  answeredBy?: string;
}

/** 답변 작성 (상태가 자동으로 "answered"로 변경됨) */
export async function answerInquiry(id: string, input: AnswerInput): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    answer: {
      content: input.content,
      answeredAt: new Date().toISOString(),
      answeredBy: input.answeredBy ?? null,
    },
    status: "answered" as InquiryStatus,
  });
}

/** 답변 수정 (답변 시각은 유지) */
export async function updateAnswer(id: string, content: string): Promise<void> {
  const db = getDb();
  const inquiry = await fetchInquiryById(id);
  if (!inquiry || !inquiry.answer) {
    throw new Error("수정할 답변이 없습니다.");
  }
  await updateDoc(doc(db, COLLECTION, id), {
    "answer.content": content,
  });
}

/** 상태 변경 */
export async function updateInquiryStatus(id: string, status: InquiryStatus): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), { status });
}
