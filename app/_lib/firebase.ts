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
