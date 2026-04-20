/**
 * 상품 설정 서비스
 *
 * Firestore 구조:
 *   settings (collection)
 *     └─ product (document)   ← 이 하나의 문서에 모든 상품/커버/배송 정보 저장
 *
 * MPA는 단일 상품 (최대 100장 · 10,000원 · 부가세 별도) 구조입니다.
 * 관리자 화면에서 편집 후 저장하면 전체 문서를 덮어쓰며,
 * 고객 앱은 onSnapshot으로 실시간 구독하여 즉시 반영받습니다.
 */

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { ProductSettings } from "./types";
import { DEFAULT_PRODUCT_SETTINGS } from "./types";

const COLLECTION = "settings";
const DOC_ID = "product";

/** 상품 설정 1회 조회 (없으면 기본값 반환, 생성은 하지 않음) */
export async function fetchProductSettings(): Promise<ProductSettings> {
  const db = getDb();
  const snap = await getDoc(doc(db, COLLECTION, DOC_ID));
  if (!snap.exists()) return { ...DEFAULT_PRODUCT_SETTINGS };
  return snap.data() as ProductSettings;
}

/** 상품 설정 실시간 구독 — 관리자가 저장하면 고객 앱에도 즉시 반영됨 */
export function subscribeToProductSettings(
  onUpdate: (settings: ProductSettings) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const db = getDb();
  return onSnapshot(
    doc(db, COLLECTION, DOC_ID),
    (snap) => {
      if (!snap.exists()) {
        onUpdate({ ...DEFAULT_PRODUCT_SETTINGS });
        return;
      }
      onUpdate(snap.data() as ProductSettings);
    },
    (err) => {
      console.error("상품 설정 구독 오류:", err);
      onError?.(err);
    }
  );
}

/** 상품 설정 전체 저장 (덮어쓰기) */
export async function saveProductSettings(
  settings: ProductSettings,
  updatedBy?: string
): Promise<void> {
  const db = getDb();
  const payload: ProductSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy ?? "admin",
  };
  await setDoc(doc(db, COLLECTION, DOC_ID), payload);
}

/** 초기값으로 리셋 */
export async function resetProductSettings(): Promise<void> {
  const db = getDb();
  await setDoc(doc(db, COLLECTION, DOC_ID), {
    ...DEFAULT_PRODUCT_SETTINGS,
    updatedAt: new Date().toISOString(),
    updatedBy: "admin (reset)",
  });
}
