"use client"

export const AUTH_SESSION_STORAGE_KEY = "orbis-auth-session"
const AUTH_SESSION_EVENT_NAME = "orbis-auth-session-change"

export type AuthSession = {
  email: string
  accessToken: string
  refreshToken: string
  issuedAt: string
}

function dispatchAuthSessionEvent() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT_NAME))
}

export function loadAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null

  const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.email) {
      return null
    }

    return {
      email: parsed.email,
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      issuedAt: parsed.issuedAt || new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function saveAuthSession(session: AuthSession) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session))
  dispatchAuthSessionEvent()
}

export function clearAuthSession() {
  if (typeof window === "undefined") return

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
  dispatchAuthSessionEvent()
}

export function getAccessToken() {
  return loadAuthSession()?.accessToken ?? null
}

export function buildAuthHeaders(headers?: HeadersInit) {
  const token = getAccessToken()
  if (!token) return { ...(headers || {}) }
  return {
    Authorization: `Bearer ${token}`,
    ...(headers || {}),
  }
}

export function subscribeAuthSession(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const handleChange = () => listener()
  window.addEventListener(AUTH_SESSION_EVENT_NAME, handleChange)
  window.addEventListener("storage", handleChange)

  return () => {
    window.removeEventListener(AUTH_SESSION_EVENT_NAME, handleChange)
    window.removeEventListener("storage", handleChange)
  }
}
