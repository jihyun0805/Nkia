"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api/generated/auth/auth";
import { customInstance } from "@/lib/api/customAxios";
import { saveAuthSession, loadAuthSession } from "@/lib/auth-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 이미 로그인된 상태 -> 메인으로 리다이렉트
  useEffect(() => {
    if (loadAuthSession()) {
      router.replace("/dashboard");
    }
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="flex justify-center mb-4">{/* TODO : 로고삽입 */}</div>
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
