/**
 * 관리자용 주문 서비스
 * Firestore에서 주문을 조회하고 상태를 업데이트합니다.
 * 실시간 구독도 지원해서 새 주문이 들어오면 관리자 화면이 자동으로 갱신됩니다.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { Order, OrderStatus } from "./types";

/**
 * 모든 주문 조회 (최신순)
 */
export async function fetchAllOrders(): Promise<Order[]> {
  const db = getDb();
  const ordersRef = collection(db, "orders");
  const q = query(ordersRef, orderBy("createdAtTimestamp", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Order);
}

/**
 * 실시간 주문 구독
 * 새 주문 생성, 상태 변경 등이 즉시 반영됩니다.
 */
export function subscribeToOrders(
  onUpdate: (orders: Order[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const db = getDb();
  const ordersRef = collection(db, "orders");
  const q = query(ordersRef, orderBy("createdAtTimestamp", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Order);
      onUpdate(orders);
    },
    (err) => {
      console.error("주문 실시간 구독 오류:", err);
      onError?.(err);
    }
  );
}

/**
 * 단일 주문 조회
 */
export async function fetchOrderById(orderId: string): Promise<Order | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, "orders", orderId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Order;
}

/**
 * 주문 상태 변경 (관리자)
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, "orders", orderId), {
    status: newStatus,
    statusUpdatedAt: new Date().toISOString(),
  });
}

/**
 * PDF 생성 완료 표시 (관리자가 PDF 다운로드 후 수동 표시 또는 Cloud Functions)
 */
export async function markPdfGenerated(
  orderId: string,
  pdfInfo: { totalPages: number; fileSizeKb: number; storagePath?: string; downloadUrl?: string }
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, "orders", orderId), {
    pdf: {
      generated: true,
      generatedAt: new Date().toISOString(),
      ...pdfInfo,
    },
  });
}
