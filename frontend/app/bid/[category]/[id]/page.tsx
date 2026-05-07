import Link from "next/link"
import { notFound } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { BidResultRegistrationForm } from "@/components/erp/bid-result-registration-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProposalDetailPage } from "@/components/erp/proposal-detail-page"
import { DetailFormCard } from "@/components/erp/detail-form-card"
import { RfpAnalysisSheetLoader } from "@/components/erp/rfp-analysis-sheet-loader"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { getBidCategoryLabel, getBidFields, getBidItem, type BidCategory } from "@/lib/bid-data"

export default async function BidDetailPage({ params }: { params: Promise<{ category: BidCategory; id: string }> }) {
  const { category, id } = await params
  if (category === "proposal") {
    return <ProposalDetailPage />
  }
  if (category === "result") {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="입찰 결과 상세" description="입찰 결과 정보를 표 형식으로 조회합니다" />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-5xl space-y-6">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/bid">입찰</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{id}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <BidResultRegistrationForm bidResultId={id} />
            </div>
          </main>
        </div>
      </div>
    )
  }
  const item = getBidItem(category, id)
  if (category !== "rfp" && !item) notFound()
  const detailItem = item as Exclude<typeof item, null>
  const label = getBidCategoryLabel(category)
  const pageTitle = category === "rfp" ? "RFP 분석" : `${label} 상세`
  const pageDescription = category === "rfp" ? "기본 정보와 요구사항 기준으로 RFP를 분석합니다" : `${label} 정보를 페이지에서 조회합니다`
  const approvalSteps = ["영업대표", "팀장", "본부장", "배포 권한 보유자", "공유 권한 보유자"]
  const versionHistory = [
    { version: "v1.0", date: "2026-03-15", title: "PRB 보고서 최초 작성", description: "사업 개요, 리스크 등급, 검토 의견을 등록했습니다." },
    { version: "v1.1", date: "2026-03-16", title: "내부 검토 의견 반영", description: "수익성 검토와 경쟁 분석 내용을 보완했습니다." },
    { version: "v1.2", date: "2026-03-17", title: "본부장 승인 요청", description: "최종 검토본으로 결재 프로세스를 진행했습니다." },
  ]
  return (
    <div className="min-h-screen bg-background"><Sidebar /><div className="flex-1 flex flex-col"><Header title={pageTitle} description={pageDescription} />
      <main className="flex-1 overflow-auto p-6"><div className="mx-auto max-w-6xl space-y-6"><Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link href="/bid">입찰</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{category === "rfp" ? id : detailItem.id}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>{category === "rfp" ? <RfpAnalysisSheetLoader title="RFP 분석" requestId={id} /> : <><DetailFormCard title={`${label} 상세`} fields={getBidFields(category, detailItem)} listHref="/bid" editHref={`/bid/${category}/${id}/edit`} includeAttachment />{category === "prb" && <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-lg">승인 프로세스</CardTitle></CardHeader><CardContent><div className="flex flex-wrap items-center gap-2">{approvalSteps.map((step, index) => <div key={step} className="flex items-center gap-2"><div className="rounded-md border bg-muted px-3 py-2 text-sm font-medium">{step}</div>{index < approvalSteps.length - 1 && <span className="text-muted-foreground">&rarr;</span>}</div>)}</div></CardContent></Card>{category === "prb" && <Card><CardHeader><CardTitle className="text-lg">수정 이력 및 버전</CardTitle></CardHeader><CardContent className="space-y-4">{versionHistory.map((history) => <div key={history.version} className="border-l-2 border-primary pl-4"><div className="flex items-center justify-between gap-4"><p className="font-semibold">{history.version} · {history.title}</p><p className="text-sm text-muted-foreground">{history.date}</p></div><p className="mt-1 text-sm text-muted-foreground">{history.description}</p></div>)}</CardContent></Card>}</div>}</>}</div></main></div></div>
  )
}
