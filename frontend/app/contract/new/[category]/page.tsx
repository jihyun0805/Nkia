import Link from "next/link"
import { notFound } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type ContractCategory, getContractCategoryLabel } from "@/lib/contract-data"

const categories: ContractCategory[] = ["orders", "contracts", "licenses"]

export default async function ContractCategoryNewPage({ params }: { params: Promise<{ category: ContractCategory }> }) {
  const { category } = await params
  if (!categories.includes(category)) notFound()

  const title = getContractCategoryLabel(category)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${title} 등록`} description={`${title} 정보를 페이지에서 등록합니다`} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/contract">계약</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{title} 등록</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <Card>
              <CardHeader>
                <CardTitle>{title} 등록</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {category === "orders" && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>사업명 *</Label><Input /></div><div className="space-y-2"><Label>고객사 *</Label><Input /></div></div>
                    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>수주일 *</Label><Input type="date" /></div><div className="space-y-2"><Label>계약금액 *</Label><Input /></div></div>
                    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>제품 *</Label><Input /></div><div className="space-y-2"><Label>납품 모듈</Label><Input /></div></div>
                    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>사업 시작일</Label><Input type="date" /></div><div className="space-y-2"><Label>사업 종료일</Label><Input type="date" /></div></div>
                    <div className="space-y-2"><Label>비고</Label><Textarea rows={4} /></div>
                  </>
                )}
                {category === "contracts" && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>수주번호 *</Label><Input /></div><div className="space-y-2"><Label>계약번호 *</Label><Input /></div></div>
                    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>계약일 *</Label><Input type="date" /></div><div className="space-y-2"><Label>계약금액 *</Label><Input /></div></div>
                    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>사업 시작일 *</Label><Input type="date" /></div><div className="space-y-2"><Label>사업 종료일 *</Label><Input type="date" /></div></div>
                    <div className="space-y-2"><Label>유지보수 종료일</Label><Input type="date" /></div>
                  </>
                )}
                {category === "licenses" && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>계약번호</Label><Input /></div><div className="space-y-2"><Label>고객사 *</Label><Input /></div></div>
                    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>제품 *</Label><Input /></div><div className="space-y-2"><Label>모듈 *</Label><Input /></div></div>
                    <div className="grid gap-4 md:grid-cols-3"><div className="space-y-2"><Label>수량 *</Label><Input /></div><div className="space-y-2"><Label>유형 *</Label><Input placeholder="예: 영구" /></div><div className="space-y-2"><Label>발급일 *</Label><Input type="date" /></div></div>
                    <div className="space-y-2"><Label>만료일</Label><Input type="date" /></div>
                  </>
                )}
                <div className="space-y-2"><Label>첨부파일</Label><Input type="file" multiple /></div>
                <div className="flex justify-end gap-2 border-t pt-6"><Button variant="outline" asChild><Link href="/contract">취소</Link></Button><Button asChild><Link href="/contract">등록</Link></Button></div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
