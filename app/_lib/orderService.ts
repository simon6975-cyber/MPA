/**
 * 주문 생성 서비스
 * 결제 버튼 클릭 시 호출되어 다음을 수행합니다:
 *   1. 익명 인증 (로그인 안 되어 있으면)
 *   2. 사진을 Firebase Storage에 업로드 (병렬, 진행률 추적)
 *   3. Firestore orders 컬렉션에 주문 문서 생성
 */

import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  UploadResult,
} from "firebase/storage";
import { signInAnonymously } from "firebase/auth";
import { getDb, getFirebaseStorage, getFirebaseAuth } from "./firebase";
import type { Order, OrderPhoto, OrderStatus } from "./types";

export interface OrderCreationProgress {
  stage: "auth" | "uploading" | "saving" | "done";
  current: number;
  total: number;
  message: string;
}

export interface OrderCreationInput {
  photos: { file: File; order: number }[];  // 업로드할 사진과 순서
  customer: {
    name: string;
    phone: string;
    email: string;
    provider: "kakao" | "naver" | "demo";
  };
  product: {
    tier: "mini" | "standard" | "premium";
    tierName: string;
    photoCount: number;
    coverColor: string;
    coverHex: string;
  };
  shipping: {
    address: string;
    addressDetail: string;
    message: string;
  };
  payment: {
    amount: number;
    method: "applepay" | "card";
  };
}

/**
 * 주문번호 생성: MPA-YYYYMMDDxx
 */
function generateOrderNumber(): string {
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const random = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `MPA-${yyyymmdd}${random}`;
}

/**
 * 익명 인증 보장 (이미 로그인되어 있으면 skip)
 */
async function ensureAuth(): Promise<string> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser.uid;
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}

/**
 * 사진 하나를 Storage에 업로드하고 다운로드 URL 반환
 */
async function uploadPhoto(
  userId: string,
  orderId: string,
  file: File,
  order: number
): Promise<OrderPhoto> {
  const storage = getFirebaseStorage();
  const photoId = `photo_${String(order).padStart(4, "0")}_${Date.now()}`;
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const storagePath = `orders/${userId}/${orderId}/photos/${photoId}.${extension}`;

  const storageRef = ref(storage, storagePath);
  const result: UploadResult = await uploadBytes(storageRef, file, {
    contentType: file.type || "image/jpeg",
  });
  const url = await getDownloadURL(result.ref);

  return {
    id: photoId,
    url,
    filename: file.name,
    storagePath,
    size: file.size,
    order,
  };
}

/**
 * 주문 생성 메인 함수
 */
export async function createOrder(
  input: OrderCreationInput,
  onProgress?: (p: OrderCreationProgress) => void
): Promise<string> {
  const db = getDb();
  const totalPhotos = input.photos.length;

  // ─ 1단계: 인증 ─
  onProgress?.({
    stage: "auth",
    current: 0, total: totalPhotos,
    message: "사용자 인증 중...",
  });
  const userId = await ensureAuth();

  // ─ 2단계: 주문 문서 ID 생성 (사진 업로드 경로에 필요) ─
  const ordersRef = collection(db, "orders");
  const orderDocRef = doc(ordersRef); // 자동 ID 생성
  const orderId = orderDocRef.id;

  // ─ 3단계: 사진 업로드 (동시 3개씩) ─
  // 병렬 업로드하되, 너무 많이 동시에 하면 네트워크가 터지므로 배치 처리
  const uploadedPhotos: OrderPhoto[] = [];
  const CONCURRENCY = 3;

  for (let i = 0; i < totalPhotos; i += CONCURRENCY) {
    const batch = input.photos.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(p => uploadPhoto(userId, orderId, p.file, p.order))
    );
    uploadedPhotos.push(...results);
    onProgress?.({
      stage: "uploading",
      current: uploadedPhotos.length, total: totalPhotos,
      message: `사진 업로드 중... (${uploadedPhotos.length}/${totalPhotos})`,
    });
  }

  // 순서대로 정렬
  uploadedPhotos.sort((a, b) => a.order - b.order);

  // ─ 4단계: Firestore 주문 문서 저장 ─
  onProgress?.({
    stage: "saving",
    current: totalPhotos, total: totalPhotos,
    message: "주문 정보 저장 중...",
  });

  const orderNumber = generateOrderNumber();
  const now = new Date();

  const orderData: Omit<Order, "id"> & { createdAtTimestamp: Timestamp } = {
    orderNumber,
    createdAt: now.toISOString(),
    createdAtTimestamp: Timestamp.fromDate(now), // 쿼리용
    userId,
    customer: input.customer,
    product: input.product,
    shipping: input.shipping,
    payment: input.payment,
    status: "pending" as OrderStatus,
    photos: uploadedPhotos,
    pdf: {
      generated: false, // Cloud Functions가 이후 생성
    },
  };

  await setDoc(orderDocRef, orderData);

  onProgress?.({
    stage: "done",
    current: totalPhotos, total: totalPhotos,
    message: "주문 완료!",
  });

  return orderId;
}
