import Link from "next/link"
import { notFound } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { BidResultRegistrationForm } from "@/components/erp/bid-result-registration-form"
import { PrbRegistrationForm } from "@/components/erp/prb-registration-form"
import { PrbResultRegistrationForm } from "@/components/erp/prb-result-registration-form"
import { ProposalRegistrationForm } from "@/components/erp/proposal-registration-form"
import { RfpAnalysisSheetLoader } from "@/components/erp/rfp-analysis-sheet-loader"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { type BidCategory, getBidCategoryLabel, getBidCreateActionLabel, rfpList } from "@/lib/bid-data"

// 입찰 신규 등록 라우트 구분값.
// - rfp: RFP 분석 생성
// - prb: PRB 보고서 생성
// - prb-result: PRB 결과 생성
// - proposal: 제안서 생성
// - result: 입찰 결과 생성
// category 파라미터를 이 배열로 제한해서 잘못된 경로는 notFound()로 보낸다.
const categories: BidCategory[] = ["rfp", "prb", "prb-result", "proposal", "result"]

export default async function BidCategoryNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: BidCategory }>
  searchParams: Promise<{ requestId?: string; standalone?: string; proposalId?: string; cloneFrom?: string; tab?: string }>
}) {
  const { category } = await params
  const { requestId, standalone, proposalId, cloneFrom, tab } = await searchParams
  if (!categories.includes(category)) notFound()

  const title = getBidCategoryLabel(category)
  const actionLabel = getBidCreateActionLabel(category)
  const backHref = tab ? `/bid?tab=${tab}` : "/bid"

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
                    <Link href={backHref}>입찰</Link>
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
            ) : category === "result" ? (
              <BidResultRegistrationForm proposalId={proposalId} showWorkflowDetail={false} />
            ) : category === "prb-result" ? (
              <PrbResultRegistrationForm showWorkflowDetail={false} />
            ) : category === "prb" ? (
              <PrbRegistrationForm cloneFromId={cloneFrom} />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  )
}
