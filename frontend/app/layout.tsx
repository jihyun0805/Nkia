import type { Metadata } from 'next'
import { Noto_Sans_KR } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import './globals.css'

const notoSansKR = Noto_Sans_KR({ 
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-kr'
});

export const metadata: Metadata = {
  title: 'Orbis',
  description: 'B2B 소프트웨어 기업을 위한 영업관리시스템',
  generator: 'v0.app',
  icons: {
    icon: '/orbis_logo.png',
    apple: '/orbis_logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSansKR.variable} font-sans antialiased`}>
        {children}
        {/* Radix toast (useToast hook 기반) — 기존 사용처 유지 */}
        <Toaster />
        {/* sonner toast — contract-form, workflow-approval, management-report-store 등이 import { toast } from "sonner" 로 호출. mount 안 되어 있어서 PROD 에서 안 보이던 이슈 fix. */}
        <SonnerToaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
