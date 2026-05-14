"use client";

export const AUTH_SESSION_STORAGE_KEY = "orbis-auth-session";
const AUTH_SESSION_EVENT_NAME = "orbis-auth-session-change";

export type AuthSession = {
  email: string;
  name?: string;
  roles?: string[];
  permissions?: string[];
  accessToken: string;
  refreshToken: string;
  issuedAt: string;
};

function dispatchAuthSessionEvent() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT_NAME));
}

export function loadAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.email) {
      return null;
    }

    return {
      email: parsed.email,
      name: parsed.name,
      roles: parsed.roles,
      permissions: parsed.permissions,
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      issuedAt: parsed.issuedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));

  // 미들웨어가 인증 여부를 확인할 수 있도록 쿠키에 마커 저장
  // HttpOnly가 아니므로 실제 토큰 값은 담지 않음 (localStorage가 primary store)
  document.cookie = `orbis-auth-marker=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

  dispatchAuthSessionEvent();
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);

  // 쿠키 마커도 함께 제거
  document.cookie = `orbis-auth-marker=; path=/; max-age=0; SameSite=Lax`;

  dispatchAuthSessionEvent();
}

export function getAccessToken() {
  return loadAuthSession()?.accessToken ?? null;
}

export function buildAuthHeaders(headers?: HeadersInit) {
  const token = getAccessToken();
  if (!token) return { ...(headers || {}) };
  return {
    Authorization: `Bearer ${token}`,
    ...(headers || {}),
  };
}

export function subscribeAuthSession(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => listener();
  window.addEventListener(AUTH_SESSION_EVENT_NAME, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(AUTH_SESSION_EVENT_NAME, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}
