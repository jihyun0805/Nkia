"use client";

export const AUTH_SESSION_STORAGE_KEY = "orbis-auth-session";
const AUTH_SESSION_EVENT_NAME = "orbis-auth-session-change";

// 토큰 만료 전 자동 갱신을 위한 여유 시간
const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000;

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

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    // Base64URL → Base64 변환
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, bufferMs: number = 0): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) {
    return false;
  }

  const expiresAt = payload.exp * 1000;
  return Date.now() >= expiresAt - bufferMs;
}

function getTokenRemainingTime(token: string): number {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return 0;

  const remaining = payload.exp * 1000 - Date.now();
  return Math.max(0, remaining);
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

export function loadValidAuthSession(): AuthSession | null {
  const session = loadAuthSession();
  if (!session) return null;

  // accessToken이 만료되었는지 확인
  if (isTokenExpired(session.accessToken)) {
    // refreshToken도 만료되었으면 세션 완전 정리
    if (isTokenExpired(session.refreshToken)) {
      clearAuthSession();
      return null;
    }
    // refreshToken은 유효 → 세션 반환 (호출자가 토큰 갱신 시도 가능)
    return session;
  }

  return session;
}

export function hasValidAccessToken(): boolean {
  const session = loadAuthSession();
  if (!session) return false;
  return !isTokenExpired(session.accessToken);
}

export function saveAuthSession(session: AuthSession) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));

  // 미들웨어가 인증 여부를 확인할 수 있도록 쿠키에 마커 저장
  // HttpOnly가 아니므로 실제 토큰 값은 담지 않음 (localStorage가 primary store)
  // 토큰 만료 시간에 맞춰 쿠키 만료도 설정
  const remaining = getTokenRemainingTime(session.refreshToken);
  const maxAge = remaining > 0 ? Math.ceil(remaining / 1000) : 60 * 60 * 24 * 7;
  document.cookie = `orbis-auth-marker=1; path=/; max-age=${maxAge}; SameSite=Lax`;

  // 선제적 토큰 갱신 스케줄러 시작
  scheduleTokenRefresh(session);

  dispatchAuthSessionEvent();
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);

  // 쿠키 마커도 함께 제거
  document.cookie = `orbis-auth-marker=; path=/; max-age=0; SameSite=Lax`;

  // 갱신 타이머 정리
  cancelScheduledRefresh();

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

let refreshTimerId: ReturnType<typeof setTimeout> | null = null;

function cancelScheduledRefresh() {
  if (refreshTimerId !== null) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
}

function scheduleTokenRefresh(session: AuthSession) {
  cancelScheduledRefresh();

  const remaining = getTokenRemainingTime(session.accessToken);
  if (remaining <= 0) return;

  const delay = Math.max(remaining - TOKEN_REFRESH_BUFFER_MS, 1000);

  refreshTimerId = setTimeout(async () => {
    const handleRefreshFailure = () => {
      clearAuthSession();
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    };

    try {
      const currentSession = loadAuthSession();
      if (!currentSession?.refreshToken) return;
      if (isTokenExpired(currentSession.refreshToken)) {
        handleRefreshFailure();
        return;
      }

      // 동적 import로 순환 참조 방지
      const { getBackendApiBaseUrl } = await import("./api-base-url");
      const baseUrl = getBackendApiBaseUrl();

      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
      });

      if (!response.ok) {
        handleRefreshFailure();
        return;
      }

      const result = await response.json();
      const newAccessToken = result?.data?.accessToken;
      const newRefreshToken = result?.data?.refreshToken;

      if (!newAccessToken) {
        handleRefreshFailure();
        return;
      }

      // 세션 업데이트
      saveAuthSession({
        ...currentSession,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken || currentSession.refreshToken,
        issuedAt: new Date().toISOString(),
      });

      console.log("[Auth] 토큰 선제적 갱신 완료");
    } catch (error) {
      console.error("[Auth] 토큰 선제적 갱신 실패:", error);
      handleRefreshFailure();
    }
  }, delay);
}

export function initTokenRefreshScheduler() {
  const session = loadAuthSession();
  if (session && !isTokenExpired(session.accessToken)) {
    scheduleTokenRefresh(session);
  }
}
