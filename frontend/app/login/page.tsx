"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { login } from "@/lib/api/generated/auth/auth"
import { saveAuthSession, loadAuthSession } from "@/lib/auth-session"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // 이미 로그인된 상태 -> 메인으로 리다이렉트
  useEffect(() => {
    if (loadAuthSession()) {
      router.replace("/")
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Orval로 자동 생성된 login API 호출
      const response = await login({ email, password })
      
      // 응답 데이터에서 토큰 추출 (API 스펙에 따라 response.data 구조에 맞게 수정 필요)
      // 아래는 일반적인 로그인 응답 구조를 가정했습니다.
      const authData = response as any 

      saveAuthSession({
        email: email,
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        issuedAt: new Date().toISOString(),
      })

      toast({
        title: "로그인 성공",
        description: "Orbis 시스템에 오신 것을 환영합니다.",
      })
      
      router.push("/") // 대시보드로 이동
    } catch (error) {
      toast({
        title: "로그인 실패",
        description: "아이디 또는 비밀번호를 확인해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="flex justify-center mb-4">
            {/* TODO : 로고삽입 */}
          </div>
          <CardTitle className="text-2xl font-bold">Orbis</CardTitle>
          <CardDescription>관리자에게 발급받은 계정으로 로그인해주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일 (아이디)</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full mt-6" disabled={isLoading}>
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}