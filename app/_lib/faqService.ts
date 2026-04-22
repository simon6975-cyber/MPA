/**
 * FAQ 서비스
 *
 * Firestore 컬렉션 "faqs"에 대한 CRUD 및 실시간 구독.
 *
 * 정렬: order 필드 ASC (관리자가 드래그/버튼으로 순서 지정)
 * published=false 항목은 고객 화면에서 제외
 */

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, where,
} from "firebase/firestore";
import { getDb } from "./firebase";
import { Faq } from "./types";

const COLLECTION = "faqs";

/* ─── 읽기 ─── */

/** 어드민용: 모든 FAQ (비공개 포함) */
export async function fetchAllFaqs(): Promise<Faq[]> {
  const db = getDb();
  const q = query(collection(db, COLLECTION), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Faq);
}

/** 고객용: 공개된 FAQ만 실시간 구독 */
export function subscribePublishedFaqs(onChange: (faqs: Faq[]) => void): () => void {
  const db = getDb();
  const q = query(
    collection(db, COLLECTION),
    where("published", "==", true),
    orderBy("order", "asc"),
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Faq);
    onChange(list);
  });
}

/** FAQ 단건 조회 */
export async function fetchFaqById(id: string): Promise<Faq | null> {
  const db = getDb();
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Faq;
}

/* ─── 쓰기 (어드민) ─── */

export interface FaqInput {
  question: string;
  answer: string;
  order: number;
  published: boolean;
}

export async function createFaq(input: FaqInput): Promise<string> {
  const db = getDb();
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateFaq(id: string, input: Partial<FaqInput>): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    ...input,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteFaq(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, COLLECTION, id));
}

/**
 * 다음 order 값 계산 (기존 최대값 + 1).
 * 새 FAQ 추가 시 기본 순서를 맨 아래로 두기 위함.
 */
export async function getNextOrder(): Promise<number> {
  const all = await fetchAllFaqs();
  if (all.length === 0) return 0;
  const maxOrder = Math.max(...all.map(f => f.order));
  return maxOrder + 1;
}

/** 순서 일괄 업데이트 (드래그 후 reorder에 사용) */
export async function reorderFaqs(items: { id: string; order: number }[]): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await Promise.all(
    items.map(item =>
      updateDoc(doc(db, COLLECTION, item.id), { order: item.order, updatedAt: now })
    )
  );
}
