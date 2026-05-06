import Link from "next/link"
import { notFound } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { ProposalRegistrationForm } from "@/components/erp/proposal-registration-form"
import { RfpAnalysisSheetLoader } from "@/components/erp/rfp-analysis-sheet-loader"
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type BidCategory, getBidCategoryLabel, getBidCreateActionLabel, rfpList } from "@/lib/bid-data"

const categories: BidCategory[] = ["rfp", "prb", "proposal", "result"]

export default async function BidCategoryNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: BidCategory }>
  searchParams: Promise<{ requestId?: string; standalone?: string; proposalId?: string }>
}) {
  const { category } = await params
  const { requestId, standalone, proposalId } = await searchParams
  if (!categories.includes(category)) notFound()

  const title = getBidCategoryLabel(category)
  const actionLabel = getBidCreateActionLabel(category)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={actionLabel} description={`${title} 정보를 페이지에서 등록합니다`} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/bid">입찰</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{actionLabel}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            {category === "rfp" ? (
              <RfpAnalysisSheetLoader title={actionLabel} requestId={standalone === "1" ? undefined : (requestId ?? rfpList[0]?.id)} blankMode />
            ) : category === "proposal" ? (
              <ProposalRegistrationForm initialRequestId={requestId} proposalId={proposalId} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{actionLabel}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                {category === "prb" && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>RFP 번호 *</Label><Input /></div><div className="space-y-2"><Label>검토자 *</Label><Input /></div></div>
                    <div className="grid gap-4 md:grid-cols-3"><div className="space-y-2"><Label>상신일 *</Label><Input type="date" /></div><div className="space-y-2"><Label>검토일</Label><Input type="date" /></div><div className="space-y-2"><Label>리스크 등급 *</Label><Input placeholder="예: 중" /></div></div>
                    <div className="space-y-2"><Label>검토 의견 *</Label><Textarea rows={4} /></div>
                  </>
                )}
                {category === "result" && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>사업명 *</Label><Input /></div><div className="space-y-2"><Label>고객사 *</Label><Input /></div></div>
                    <div className="grid gap-4 md:grid-cols-3"><div className="space-y-2"><Label>입찰일 *</Label><Input type="date" /></div><div className="space-y-2"><Label>결과 *</Label><Input placeholder="예: 수주" /></div><div className="space-y-2"><Label>금액</Label><Input /></div></div>
                    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>경쟁사</Label><Input /></div><div className="space-y-2"><Label>담당자</Label><Input /></div></div>
                    <div className="space-y-2"><Label>결과 사유</Label><Textarea rows={4} /></div>
                  </>
                )}
                <div className="space-y-2"><Label>첨부파일</Label><Input type="file" multiple /></div>
                <div className="flex justify-end gap-2 border-t pt-6"><Button variant="outline" asChild><Link href="/bid">취소</Link></Button><Button asChild><Link href="/bid">등록</Link></Button></div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
