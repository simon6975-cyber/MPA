/**
 * Firebase 초기화 모듈
 *
 * Next.js는 서버/클라이언트 양쪽에서 실행되므로, 브라우저에서만 초기화되도록 주의합니다.
 * 환경 변수는 NEXT_PUBLIC_ 접두사로 노출되며, 이 값들은 클라이언트 코드에 번들됩니다.
 *
 * ⚠ Firebase 공개 API 키는 "공개되어도 괜찮은 값"입니다. 실제 보안은:
 *   1. Firestore / Storage 보안 규칙 (firestore.rules, storage.rules)
 *   2. App Check (봇 차단)
 *   3. Authentication (사용자 확인)
 * 으로 이루어집니다.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// HMR 중복 초기화 방지 (getApps().length가 0일 때만 새로 생성)
let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;
let auth: Auth;

function getFirebase() {
  if (!app) {
    // 설정값 검증 (개발 중 실수로 빈 config 쓰는 것 방지)
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error(
        "Firebase 설정이 누락되었습니다. .env.local 파일을 확인하세요.\n" +
        "필요한 환경변수: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID 등"
      );
    }
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
  }
  return { app, db, storage, auth };
}

export function getDb(): Firestore {
  return getFirebase().db;
}

export function getFirebaseStorage(): FirebaseStorage {
  return getFirebase().storage;
}

export function getFirebaseAuth(): Auth {
  return getFirebase().auth;
}

// Firebase 연결 여부 확인 (UI에서 상태 표시용)
export function isFirebaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
}

/* ─── 썸네일 URL 유틸 (Firebase Resize Images Extension 연동) ─── */

/**
 * Firebase Resize Images Extension이 생성한 썸네일 URL을 반환합니다.
 *
 * Extension 설정 가정:
 *   - Sizes of resized images: "200x200,400x400"
 *   - Cloud Storage path for resized images: "thumbnails"
 *   - Convert image to preferred type: "webp"
 *
 * 변환 규칙:
 *   원본 storagePath: "photos/abc123.jpg"
 *   썸네일 storagePath: "thumbnails/photos/abc123_200x200.webp"
 *
 * URL은 Firebase Storage 다운로드 URL 형식을 따르며, 토큰 파라미터는 제거됩니다
 * (썸네일은 별도 객체이므로 자체 토큰을 가짐).
 *
 * 어드민 환경에서는 storage.rules에서 thumbnails/ 경로 읽기 권한을 허용해야 합니다.
 *
 * @param originalUrl 원본 사진의 다운로드 URL (Firebase Storage)
 * @param size 썸네일 크기 ("200x200" 또는 "400x400")
 * @returns 썸네일 URL. 변환 실패 시 원본 URL 반환 (안전한 fallback)
 */
export function getThumbnailUrl(originalUrl: string, size: "200x200" | "400x400" = "200x200"): string {
  try {
    const url = new URL(originalUrl);

    // Firebase Storage URL 형식:
    //   https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media&token=...
    // pathname에서 "/o/" 뒤의 인코딩된 경로를 추출
    const match = url.pathname.match(/\/o\/(.+)$/);
    if (!match) return originalUrl;

    const encodedPath = match[1];
    const decodedPath = decodeURIComponent(encodedPath);

    // 확장자 분리: "photos/abc123.jpg" → ["photos/abc123", "jpg"]
    const lastDot = decodedPath.lastIndexOf(".");
    if (lastDot === -1) return originalUrl;

    const pathWithoutExt = decodedPath.substring(0, lastDot);

    // 썸네일 경로 생성: "thumbnails/photos/abc123_200x200.webp"
    const thumbPath = `thumbnails/${pathWithoutExt}_${size}.webp`;
    const encodedThumbPath = encodeURIComponent(thumbPath);

    // 토큰은 제거하고 alt=media만 유지 (썸네일은 자체 토큰을 가짐)
    return `${url.origin}${url.pathname.replace(/\/o\/.+$/, `/o/${encodedThumbPath}`)}?alt=media`;
  } catch {
    return originalUrl; // URL 파싱 실패 시 원본 URL 반환
  }
}
