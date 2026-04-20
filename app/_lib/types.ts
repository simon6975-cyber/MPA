/**
 * 공유 타입 정의
 * 고객 앱과 관리자가 동일하게 참조하는 데이터 모델입니다.
 * Firestore 문서 구조와 1:1로 대응됩니다.
 */

export type OrderStatus = "pending" | "producing" | "shipping" | "delivered" | "cancelled";

export interface OrderPhoto {
  id: string;           // Firestore에서 생성한 unique ID
  url: string;          // Storage 다운로드 URL
  filename: string;     // 원본 파일명
  storagePath: string;  // Storage 경로 (삭제 시 필요)
  size: number;         // 파일 크기 (bytes)
  order: number;        // 고객이 정한 순서 (0부터)
}

export interface Order {
  id: string;                    // Firestore 문서 ID
  orderNumber: string;           // MPA-YYYYMMDDxx
  createdAt: string;             // ISO string
  userId: string;                // Auth UID
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
  status: OrderStatus;
  photos: OrderPhoto[];
  pdf?: {
    generated: boolean;
    generatedAt?: string;
    totalPages?: number;
    fileSizeKb?: number;
    storagePath?: string;        // PDF가 Storage에 저장된 경로 (Cloud Functions 처리 시)
    downloadUrl?: string;        // PDF 다운로드 URL
  };
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  provider: "kakao" | "naver" | "demo";
  joinedAt: string;
  orderCount: number;
  totalSpent: number;
}

/* ─── 상태 표시용 상수 ─── */

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "결제완료",
  producing: "제작중",
  shipping: "배송중",
  delivered: "배송완료",
  cancelled: "취소됨",
};

export const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending: { bg: "#E3F2FD", text: "#1565C0" },
  producing: { bg: "#FFF3E0", text: "#E65100" },
  shipping: { bg: "#F3E5F5", text: "#6A1B9A" },
  delivered: { bg: "#E8F5E9", text: "#2E7D32" },
  cancelled: { bg: "#FAFAFA", text: "#888" },
};

/* ─── 상품/가격 설정 (관리자 편집 대상) ─── */

export type ProductTierKey = "mini" | "standard" | "premium";

export interface ProductTier {
  key: ProductTierKey;
  name: string;          // 예: "미니앨범"
  maxPhotos: number;     // 상한 장수 (예: 40)
  price: number;         // 판매가 (원, 부가세 포함)
  description?: string;  // 선택 설명 문구
  enabled: boolean;      // 판매 노출 여부
}

export interface CoverColor {
  id: string;       // "deepgreen", "yellow" ... (영문 slug)
  name: string;     // 한글 표시명 (예: "딥그린")
  hex: string;      // 커버 색상 HEX
  light: string;    // 밝은 배경 HEX (선택지 배경용)
  enabled: boolean; // 판매 노출 여부
  order: number;    // 정렬 순서 (0부터)
}

export interface ProductSettings {
  tiers: ProductTier[];       // 항상 3개 (mini / standard / premium)
  colors: CoverColor[];       // 6개 기본, 확장 가능
  shippingFee: number;        // 배송비 (0이면 무료)
  freeShippingThreshold: number; // 이 금액 이상이면 무료 (0 = 비활성)
  giftWrapFee: number;        // 선물 포장 추가 금액
  updatedAt: string;          // ISO
  updatedBy?: string;         // 수정한 관리자 식별
}

/* 기본값 (Firestore에 문서가 없을 때 초기 표시용) */
export const DEFAULT_PRODUCT_SETTINGS: ProductSettings = {
  tiers: [
    { key: "mini",     name: "미니앨범",     maxPhotos: 40,  price: 19900, description: "가볍게 즐기는 사이즈",        enabled: true },
    { key: "standard", name: "스탠다드앨범", maxPhotos: 70,  price: 29900, description: "가장 인기있는 기본 사이즈",  enabled: true },
    { key: "premium",  name: "프리미엄앨범", maxPhotos: 100, price: 39900, description: "최대 100장, 풍성한 볼륨",    enabled: true },
  ],
  colors: [
    { id: "deepgreen",  name: "딥그린",     hex: "#1B5E20", light: "#E8F5E9", enabled: true, order: 0 },
    { id: "lightgreen", name: "라이트그린", hex: "#4CAF50", light: "#F1F8E9", enabled: true, order: 1 },
    { id: "yellow",     name: "옐로우",     hex: "#F9A825", light: "#FFFDE7", enabled: true, order: 2 },
    { id: "orange",     name: "오렌지",     hex: "#EF6C00", light: "#FFF3E0", enabled: true, order: 3 },
    { id: "purple",     name: "퍼플",       hex: "#6A1B9A", light: "#F3E5F5", enabled: true, order: 4 },
    { id: "burgundy",   name: "버건디",     hex: "#4E342E", light: "#EFEBE9", enabled: true, order: 5 },
  ],
  shippingFee: 3000,
  freeShippingThreshold: 0,
  giftWrapFee: 3000,
  updatedAt: new Date(0).toISOString(),
};
