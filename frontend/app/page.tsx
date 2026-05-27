"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api/generated/auth/auth";
import { customInstance } from "@/lib/api/customAxios";
import Image from "next/image";
import { saveAuthSession, loadAuthSession, clearAuthSession, isTokenExpired, initTokenRefreshScheduler } from "@/lib/auth-session";
import { getBackendApiBaseUrl } from "@/lib/api-base-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // 기존 세션 유효성 검증 후 자동 리다이렉트 또는 로그인 페이지 표시
  useEffect(() => {
    async function validateExistingSession() {
      const session = loadAuthSession();

      // 세션이 없으면 로그인 페이지 표시
      if (!session) {
        setIsCheckingSession(false);
        return;
      }

      // accessToken이 아직 유효하면 → 서버에 확인 후 리다이렉트
      if (!isTokenExpired(session.accessToken)) {
        try {
          // 실제 서버에 토큰 유효성 확인
          const baseUrl = getBackendApiBaseUrl();
          const res = await fetch(`${baseUrl}/user/me`, {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          });

          if (res.ok) {
            // 유효한 세션 → 토큰 갱신 스케줄러 시작 후 대시보드로
            initTokenRefreshScheduler();
            router.replace("/dashboard");
            return;
          }
        } catch {
          // 네트워크 오류 등 → 세션 정리
        }
      }

      // accessToken 만료 → refreshToken으로 갱신 시도
      if (session.refreshToken && !isTokenExpired(session.refreshToken)) {
        try {
          const baseUrl = getBackendApiBaseUrl();
          const res = await fetch(`${baseUrl}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: session.refreshToken }),
          });

          if (res.ok) {
            const result = await res.json();
            const newAccessToken = result?.data?.accessToken;
            const newRefreshToken = result?.data?.refreshToken;

            if (newAccessToken) {
              saveAuthSession({
                ...session,
                accessToken: newAccessToken,
                refreshToken: newRefreshToken || session.refreshToken,
                issuedAt: new Date().toISOString(),
              });
              router.replace("/dashboard");
              return;
            }
          }
        } catch {
          // 갱신 실패 → 세션 정리
        }
      }

      // 모든 검증 실패 → 세션 정리하고 로그인 페이지 표시
      clearAuthSession();
      setIsCheckingSession(false);
    }

    validateExistingSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Orval로 자동 생성된 login API 호출
      // customInstance: axios response의 data 필드 unwrap
      // 반환값 = ApiResponseLoginResponse { result, data: { accessToken, refreshToken }, ... }
      const response = await login({ email, password });

      const accessToken = response?.data?.accessToken;
      const refreshToken = response?.data?.refreshToken;

      if (!accessToken || !refreshToken) {
        throw new Error("토큰 정보를 받지 못했습니다.");
      }

      saveAuthSession({
        email: email,
        accessToken: accessToken,
        refreshToken: refreshToken,
        issuedAt: new Date().toISOString(),
      });

      try {
        const userInfoResponse = await customInstance<any>({ url: "/user/me", method: "GET" });
        const userData = userInfoResponse?.data;
        if (userData) {
          saveAuthSession({
            email: userData.email || email,
            name: userData.name,
            roles: userData.roles || [],
            permissions: userData.permissions || [],
            accessToken: accessToken,
            refreshToken: refreshToken,
            issuedAt: new Date().toISOString(),
          });
        }
      } catch (userError) {
        console.error("Failed to fetch user info", userError);
      }

      toast({
        title: "로그인 성공",
        description: "Orbis 시스템에 오신 것을 환영합니다.",
      });

      router.push("/dashboard"); // 대시보드로 이동
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || "아이디 또는 비밀번호를 확인해주세요.";
      toast({
        title: "로그인 실패",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 세션 검증 중일 때 로딩 표시
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">세션 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center">
            <Image src="/orbis_logo.png" alt="Orbis Logo" width={64} height={64} />
          </div>
          <CardTitle className="text-2xl font-bold">Orbis</CardTitle>
          <CardDescription>관리자에게 발급받은 계정으로 로그인해주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일 (아이디)</Label>
              <Input id="email" type="email" placeholder="nkia@nkia.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full mt-6" disabled={isLoading}>
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
