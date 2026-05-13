import Link from "next/link"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { BidResultDetailPage } from "@/components/erp/bid-result-detail-page"
import { PrbRegistrationForm } from "@/components/erp/prb-registration-form"
import { PrbResultRegistrationForm } from "@/components/erp/prb-result-registration-form"
import { ProposalDetailPage } from "@/components/erp/proposal-detail-page"
import { DetailFormCard } from "@/components/erp/detail-form-card"
import { RfpAnalysisSheetLoader } from "@/components/erp/rfp-analysis-sheet-loader"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { getBidCategoryLabel, getBidFields, getBidItem, type BidCategory } from "@/lib/bid-data"

export default async function BidDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: BidCategory; id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { category, id } = await params
  const { tab } = await searchParams
  const backHref = tab ? `/bid?tab=${tab}` : "/bid"

  if (category === "proposal") {
    return <ProposalDetailPage />
  }

  if (category === "result") {
    return <BidResultDetailPage />
  }

  if (category === "prb-result") {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="PRB 결과" description="PRB 결과 보고서를 등록 화면과 동일한 형식으로 확인합니다" />
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
                    <BreadcrumbPage>{id}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <PrbResultRegistrationForm prbResultId={id} allowDelete />
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (category === "prb") {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="PRB 상세" description="PRB 보고서를 등록 화면과 동일한 형식으로 확인합니다" />
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
                    <BreadcrumbPage>{id}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <PrbRegistrationForm prbId={id} allowDelete />
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (category === "rfp") {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="RFP 분석" description="기본 정보와 요구사항 기준으로 RFP를 분석합니다" />
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
                    <BreadcrumbPage>{id}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <RfpAnalysisSheetLoader title="RFP 분석" requestId={id} />
            </div>
          </main>
        </div>
      </div>
    )
  }

  const item = getBidItem(category, id)

  const detailItem = item as Exclude<typeof item, null>
  const label = getBidCategoryLabel(category)
  const pageTitle = category === "rfp" ? "RFP 분석" : `${label} 상세`
  const pageDescription = category === "rfp" ? "기본 정보와 요구사항 기준으로 RFP를 분석합니다" : `${label} 정보를 페이지에서 조회합니다`

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={pageTitle} description={pageDescription} />
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
                  <BreadcrumbPage>{category === "rfp" ? id : detailItem.id}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <DetailFormCard
              title={`${label} 상세`}
              fields={getBidFields(category, detailItem)}
              listHref={backHref}
              editHref={tab ? `/bid/${category}/${id}/edit?tab=${tab}` : `/bid/${category}/${id}/edit`}
              includeAttachment
            />
          </div>
        </main>
      </div>
    </div>
  )
}
