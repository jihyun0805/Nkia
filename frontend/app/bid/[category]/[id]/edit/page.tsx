import Link from "next/link"
import { notFound } from "next/navigation"
import { BidResultRegistrationForm } from "@/components/erp/bid-result-registration-form"
import { PrbRegistrationForm } from "@/components/erp/prb-registration-form"
import { PrbResultRegistrationForm } from "@/components/erp/prb-result-registration-form"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { ProposalRegistrationForm } from "@/components/erp/proposal-registration-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getBidCategoryLabel, getBidFields, getBidItem, type BidCategory } from "@/lib/bid-data"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getStatusOptions, isStatusField } from "@/lib/status-options"

export default async function BidEditPage({
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
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="제안서 수정" description="제안서 정보를 페이지에서 수정합니다" />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-5xl space-y-6">
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
              <ProposalRegistrationForm proposalId={id} />
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (category === "result") {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="입찰 결과 수정" description="입찰 결과 정보를 페이지에서 수정합니다" />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-5xl space-y-6">
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
              <BidResultRegistrationForm bidResultId={id} />
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (category === "prb-result") {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="PRB 결과 수정" description="PRB 결과 보고서 정보를 페이지에서 수정합니다" />
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
              <PrbResultRegistrationForm prbResultId={id} />
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
          <Header title="PRB 수정" description="PRB 보고서 정보를 페이지에서 수정합니다" />
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
              <PrbRegistrationForm prbId={id} />
            </div>
          </main>
        </div>
      </div>
    )
  }

  const item = getBidItem(category, id)
  if (!item) notFound()
  const label = getBidCategoryLabel(category)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${label} 수정`} description={`${label} 정보를 페이지에서 수정합니다`} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
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
            <Card>
              <CardHeader>
                <CardTitle>{label} 수정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {getBidFields(category, item).map((field) => (
                    <div key={field.label} className="space-y-2">
                      <Label>{field.label}</Label>
                      {isStatusField(field.label) ? (
                        <Select defaultValue={field.value}>
                          <SelectTrigger><SelectValue placeholder="상태 선택" /></SelectTrigger>
                          <SelectContent>{getStatusOptions(field.value).map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Input defaultValue={field.value} />
                      )}
                    </div>
                  ))}
                  <div className="space-y-2 md:col-span-2">
                    <Label>첨부파일</Label>
                    <Input type="file" multiple />
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href={tab ? `/bid/${category}/${id}?tab=${tab}` : `/bid/${category}/${id}`}>취소</Link>
                  </Button>
                  <Button asChild>
                    <Link href={tab ? `/bid/${category}/${id}?tab=${tab}` : `/bid/${category}/${id}`}>수정</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
