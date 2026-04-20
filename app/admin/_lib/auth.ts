/* 관리자 인증 유틸
   ▼ 주의: 클라이언트 사이드 인증은 데모용입니다. 실제 운영 시에는:
     1. Firebase Auth로 교체
     2. 비밀번호는 절대 클라이언트 코드에 하드코딩하지 않음
     3. Firestore 보안 규칙으로 admin 역할 체크
   ▼ */

const SESSION_KEY = "mpa_admin_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8시간

// ⚠️ 데모용 임시 비밀번호 (실제 서비스 전 반드시 교체 필요)
const ADMIN_PASSWORD = "mpa2026!";

export function verifyPassword(input: string): boolean {
  return input === ADMIN_PASSWORD;
}

export function createSession(): void {
  if (typeof window === "undefined") return;
  const session = {
    authenticated: true,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function checkSession(): boolean {
  if (typeof window === "undefined") return false;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return false;
  try {
    const session = JSON.parse(raw);
    if (!session.authenticated) return false;
    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}
