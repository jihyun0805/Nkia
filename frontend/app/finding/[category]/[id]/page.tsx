import Link from "next/link"
import { notFound } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { findingFormSections, getFindingCategoryLabel, getFindingFields, getFindingItem, type FindingCategory, type FindingFormField } from "@/lib/finding-data"

function FindingDetailControl({ field, value }: { field: FindingFormField; value: string }) {
  if (field.type === "file") return <Input readOnly value="등록된 첨부파일이 없습니다." />
  if (field.type === "textarea") return <Textarea readOnly rows={4} value={value || "-"} />
  return <Input readOnly value={value || "-"} />
}

export default async function FindingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: FindingCategory; id: string }>
  searchParams?: Promise<{ tab?: string }>
}) {
  const { category, id } = await params
  const { tab } = (await searchParams) ?? {}
  const item = getFindingItem(category, id)
  if (!item) notFound()
  const label = getFindingCategoryLabel(category)
  const backHref = `/finding?tab=${tab ?? category}`
  const fields = category === "customers" ? getFindingFields(category, item) : findingFormSections.flatMap((section) => section.fields.map((field) => ({ label: field.label, value: "" })))

  return (
    <div className="min-h-screen bg-background"><Sidebar /><div className="flex-1 flex flex-col"><Header title={`${label} 상세`} description={`${label} 정보를 페이지에서 조회합니다`} />
      <main className="flex-1 overflow-auto p-6"><div className="mx-auto max-w-5xl space-y-6"><Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link href={backHref}>발굴</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{item.id}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb><Card><CardHeader><CardTitle>{label} 상세</CardTitle></CardHeader><CardContent className="space-y-8">{category === "customers" ? <section className="space-y-4"><div className="grid gap-4 md:grid-cols-2">{fields.map((field) => <div key={field.label} className="space-y-2 md:col-span-2"><Label>{field.label}</Label><FindingDetailControl field={{ label: field.label }} value={field.value} /></div>)}</div></section> : findingFormSections.map((section) => <section key={section.title} className="space-y-4"><h2 className="text-base font-semibold">{section.title}</h2><div className="grid gap-4 md:grid-cols-2">{section.fields.map((field) => { const value = item ? String((item as any)[field.label] ?? "") : ""; return <div key={field.label} className={field.type === "textarea" || field.type === "file" ? "space-y-2 md:col-span-2" : "space-y-2"}><Label>{field.label}{field.required ? " *" : ""}</Label><FindingDetailControl field={field} value={value} /></div> })}</div></section>)}<div className="flex justify-end gap-2 border-t pt-6"><Button variant="outline" asChild><Link href={backHref}>목록</Link></Button><Button asChild><Link href={`/finding/${category}/${id}/edit?tab=${tab ?? category}`}>수정</Link></Button></div></CardContent></Card></div></main></div></div>
  )
}
