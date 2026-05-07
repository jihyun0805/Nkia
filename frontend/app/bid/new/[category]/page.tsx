import Link from "next/link"
import { notFound } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { BidResultRegistrationForm } from "@/components/erp/bid-result-registration-form"
import { PrbRegistrationForm } from "@/components/erp/prb-registration-form"
import { ProposalRegistrationForm } from "@/components/erp/proposal-registration-form"
import { RfpAnalysisSheetLoader } from "@/components/erp/rfp-analysis-sheet-loader"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
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
            ) : category === "result" ? (
              <BidResultRegistrationForm proposalId={proposalId} />
            ) : category === "prb" ? (
              <PrbRegistrationForm />
            ) : (
              null
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
