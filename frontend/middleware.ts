import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_SESSION_STORAGE_KEY } from "@/lib/auth-session";

// 로그인 없이 접근 가능한 경로 (페이지 및 API)
const PUBLIC_PATHS = ["/login", "/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로는 통과
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Next.js 내부 경로 및 정적 파일 통과
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon") ||
    pathname.match(/\.(png|svg|jpg|jpeg|gif|webp|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // 쿠키에서 세션 확인 (Next.js 미들웨어는 localStorage 접근 불가 → 쿠키 기반 체크)
  // localStorage는 클라이언트 전용이므로, 쿠키에 인증 마커를 저장하는 방식 사용
  const authCookie = request.cookies.get("orbis-auth-marker");

  if (!authCookie?.value) {
    // 로그인 페이지로 리다이렉트
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청에 적용:
     * - api routes
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
