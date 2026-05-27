import Link from "next/link"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function ApiManagementNewPage() {
  return (
    <div className="min-h-screen bg-background"><Sidebar /><div className="flex-1 flex flex-col"><Header title="API 등록" description="API 연동 정보를 페이지에서 등록합니다" />
      <main className="flex-1 overflow-auto p-6"><div className="mx-auto max-w-4xl space-y-6"><Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link href="/api-management">API</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>API 등록</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb><Card><CardHeader><CardTitle>신규 API 등록</CardTitle></CardHeader><CardContent className="space-y-6"><div className="space-y-2"><Label>API 명칭 *</Label><Input /></div><div className="space-y-2"><Label>API 유형 *</Label><Input /></div><div className="space-y-2"><Label>엔드포인트 URL *</Label><Input /></div><div className="space-y-2"><Label>동기화 주기</Label><Input /></div><div className="space-y-2"><Label>설명</Label><Textarea rows={4} /></div><div className="space-y-2"><Label>첨부파일</Label><Input type="file" multiple /></div><div className="flex justify-end gap-2 border-t pt-6"><Button variant="outline" asChild><Link href="/api-management">취소</Link></Button><Button asChild><Link href="/api-management">등록</Link></Button></div></CardContent></Card></div></main></div></div>
  )
}
