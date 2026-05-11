import Link from "next/link"
import { notFound } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { DetailFormCard } from "@/components/erp/detail-form-card"
import { OrderReportDetail } from "@/components/erp/contract/order-report-detail"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { getContractCategoryLabel, getContractFields, getContractItem, type ContractCategory, type OrderReport } from "@/lib/contract-data"

export default async function ContractDetailPage({ params }: { params: Promise<{ category: ContractCategory; id: string }> }) {
  const { category, id } = await params
  const item = getContractItem(category, id)
  if (!item) notFound()
  const label = getContractCategoryLabel(category)
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${label} 상세`} description={`${label} 정보를 페이지에서 조회합니다`} />
        <main className="flex-1 overflow-auto p-6">
          <div className={`space-y-6 ${category === "orders" ? "" : "mx-auto max-w-5xl"}`}>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link href="/contract">계약</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{item.id}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            {category === "orders" ? (
              <OrderReportDetail report={item as OrderReport} />
            ) : (
              <DetailFormCard
                title={`${label} 상세`}
                fields={getContractFields(category, item)}
                listHref="/contract"
                editHref={`/contract/${category}/${id}/edit`}
                includeAttachment
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
