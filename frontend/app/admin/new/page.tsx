import Link from "next/link"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminNewPage() {
  return (
    <div className="min-h-screen bg-background"><Sidebar /><div className="flex-1 flex flex-col"><Header title="계정 등록" description="계정을 페이지에서 등록합니다" />
      <main className="flex-1 overflow-auto p-6"><div className="mx-auto max-w-4xl space-y-6"><Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link href="/admin">시스템관리</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>계정 등록</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb><Card><CardHeader><CardTitle>신규 계정 등록</CardTitle></CardHeader><CardContent className="space-y-6"><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>이름 *</Label><Input /></div><div className="space-y-2"><Label>이메일 *</Label><Input type="email" /></div></div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>부서 *</Label><Input /></div><div className="space-y-2"><Label>역할 *</Label><Input /></div></div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>권한 그룹</Label><Input /></div><div className="space-y-2"><Label>상태 *</Label><Select><SelectTrigger><SelectValue placeholder="상태 선택" /></SelectTrigger><SelectContent><SelectItem value="활성">활성</SelectItem><SelectItem value="비활성">비활성</SelectItem></SelectContent></Select></div></div><div className="space-y-2"><Label>첨부파일</Label><Input type="file" multiple /></div><div className="flex justify-end gap-2 border-t pt-6"><Button variant="outline" asChild><Link href="/admin">취소</Link></Button><Button asChild><Link href="/admin">등록</Link></Button></div></CardContent></Card></div></main></div></div>
  )
}
