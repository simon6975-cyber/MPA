/**
 * 상품 설정 서비스
 *
 * Firestore 구조:
 *   settings (collection)
 *     └─ product (document)   ← 이 하나의 문서에 모든 가격/커버 정보 저장
 *
 * 상품 정보는 전역 단일 설정이므로 컬렉션 안에 "product"라는 고정 ID를 가진
 * 단일 문서로 관리합니다. 관리자 화면에서 편집 후 저장하면 전체 문서를 덮어쓰며,
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

/**
 * 상품 설정 1회 조회
 * 문서가 없으면 기본값을 반환합니다 (생성은 하지 않음).
 */
export async function fetchProductSettings(): Promise<ProductSettings> {
  const db = getDb();
  const snap = await getDoc(doc(db, COLLECTION, DOC_ID));
  if (!snap.exists()) return { ...DEFAULT_PRODUCT_SETTINGS };
  return snap.data() as ProductSettings;
}

/**
 * 상품 설정 실시간 구독
 * 관리자가 저장하면 고객 앱에도 즉시 반영됩니다.
 */
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

/**
 * 상품 설정 전체 저장 (덮어쓰기)
 * 관리자 화면의 "저장" 버튼에서 호출됩니다.
 */
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

/**
 * 초기값으로 리셋 (관리자 "기본값 복원" 버튼)
 */
export async function resetProductSettings(): Promise<void> {
  const db = getDb();
  await setDoc(doc(db, COLLECTION, DOC_ID), {
    ...DEFAULT_PRODUCT_SETTINGS,
    updatedAt: new Date().toISOString(),
    updatedBy: "admin (reset)",
  });
}

/* ─── 유틸: 장수 → 티어 자동 판정 ─── */

export function getTierForPhotoCount(
  settings: ProductSettings,
  count: number
) {
  // 활성 티어 중, 장수 오름차순으로 정렬해 처음 맞는 것을 반환
  const enabled = settings.tiers
    .filter(t => t.enabled)
    .sort((a, b) => a.maxPhotos - b.maxPhotos);
  if (enabled.length === 0) return null;
  for (const t of enabled) {
    if (count <= t.maxPhotos) return t;
  }
  return enabled[enabled.length - 1]; // 최대치 초과 시 최상위 티어
}
