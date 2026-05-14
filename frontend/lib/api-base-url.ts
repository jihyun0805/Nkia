"use client";

function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, "");
}

export function getBackendApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configured?.startsWith("/")) {
    return normalizeBaseUrl(configured);
  }

  if (configured && typeof window === "undefined") {
    return normalizeBaseUrl(configured);
  }

  if (typeof window !== "undefined") {
    if (!configured) {
      if (window.location.hostname === "localhost" && window.location.port && window.location.port !== "80") {
        return "https://k14s106.p.ssafy.io/api/v1";
      }

      return "/api/v1";
    }

    return normalizeBaseUrl(configured);
  }

  return "/api/v1";
}
