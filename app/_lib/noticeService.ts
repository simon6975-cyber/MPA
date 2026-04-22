/**
 * 공지사항 서비스
 *
 * Firestore 컬렉션 "notices"에 대한 CRUD 및 실시간 구독 기능을 제공합니다.
 *
 * 정렬 전략:
 *   - pinned(true)가 먼저, 그 안에서 updatedAt DESC
 *   - pinned(false)는 그 다음, updatedAt DESC
 *   Firestore 복합 인덱스: (pinned DESC, updatedAt DESC)
 */

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, Timestamp,
} from "firebase/firestore";
import { getDb } from "./firebase";
import { Notice } from "./types";

const COLLECTION = "notices";

/* ─── 읽기 ─── */

/** 공지사항 전체 목록 (pinned 우선, 최신순) */
export async function fetchAllNotices(): Promise<Notice[]> {
  const db = getDb();
  const q = query(collection(db, COLLECTION), orderBy("pinned", "desc"), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Notice);
}

/** 공지사항 단건 조회 */
export async function fetchNoticeById(id: string): Promise<Notice | null> {
  const db = getDb();
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Notice;
}

/** 공지사항 실시간 구독 (고객용 홈에서 사용) */
export function subscribeNotices(onChange: (notices: Notice[]) => void): () => void {
  const db = getDb();
  const q = query(collection(db, COLLECTION), orderBy("pinned", "desc"), orderBy("updatedAt", "desc"));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Notice);
    onChange(list);
  });
}

/* ─── 쓰기 (어드민) ─── */

export interface NoticeInput {
  title: string;
  content: string;
  pinned: boolean;
  authorName?: string;
}

/** 새 공지사항 생성 */
export async function createNotice(input: NoticeInput): Promise<string> {
  const db = getDb();
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

/** 공지사항 수정 */
export async function updateNotice(id: string, input: Partial<NoticeInput>): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    ...input,
    updatedAt: new Date().toISOString(),
  });
}

/** 공지사항 삭제 */
export async function deleteNotice(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, COLLECTION, id));
}

/** 고정 상태 토글 */
export async function togglePinned(id: string, pinned: boolean): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    pinned,
    updatedAt: new Date().toISOString(),
  });
}
