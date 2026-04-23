import Link from "next/link"
import { notFound } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { DetailFormCard } from "@/components/erp/detail-form-card"
import { getAdminCategoryLabel, getAdminFields, getAdminItem, type AdminCategory } from "@/lib/admin-data"

export default async function AdminDetailPage({ params }: { params: Promise<{ category: AdminCategory; id: string }> }) {
  const { category, id } = await params
  const item = getAdminItem(category, id)
  if (!item) notFound()
  const label = getAdminCategoryLabel(category)
  return (
    <div className="min-h-screen bg-background"><Sidebar /><div className="flex-1 flex flex-col"><Header title={`${label} 상세`} description={`${label} 정보를 페이지에서 조회합니다`} />
      <main className="flex-1 overflow-auto p-6"><div className="mx-auto max-w-5xl space-y-6"><Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link href="/admin">시스템관리</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{id}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb><DetailFormCard title={`${label} 상세`} fields={getAdminFields(category, item)} listHref="/admin" editHref={`/admin/${category}/${id}/edit`} includeAttachment /></div></main></div></div>
  )
}
