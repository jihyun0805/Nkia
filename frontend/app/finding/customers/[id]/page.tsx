"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { getCustomers, type CustomerRecord } from "@/lib/finding-data"

function CustomerDetailControl({ label, value }: { label: string; value: string }) {
  if (label === "메모") return <Textarea readOnly rows={4} value={value || "-"} />
  return <Input readOnly value={value || "-"} />
}

function getContactRows(customer: CustomerRecord) {
  return Array.isArray(customer.contacts) && customer.contacts.length > 0
    ? customer.contacts
    : [{
      name: customer.contact ?? "-",
      position: customer.position ?? "",
      department: customer.department ?? "",
      email: customer.email ?? "",
      mobilePhone: customer.mobilePhone ?? customer.phone ?? "",
      landlinePhone: customer.landlinePhone ?? "",
      duty: customer.duty ?? "",
      memo: customer.memo ?? "",
    }]
}

export default function CustomerDetailPage() {
  const params = useParams<{ id?: string | string[] }>()
  const searchParams = useSearchParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? ""
  const [customer, setCustomer] = useState<CustomerRecord | null>(null)

  useEffect(() => {
    const sync = () => {
      setCustomer(getCustomers().find((item) => item.id === id) ?? null)
    }

    sync()
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [id])

  const contacts = useMemo(() => (customer ? getContactRows(customer) : []), [customer])
  const backHref = `/finding?tab=${searchParams.get("tab") ?? "customers"}`

  if (!customer) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="고객사 상세" description="고객사 정보를 조회합니다" />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-5xl">
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  고객사 정보를 찾을 수 없습니다.
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="고객사 상세" description="고객사 정보를 조회합니다" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={backHref}>발굴</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{customer.id}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader>
                <CardTitle>고객사 상세</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <section className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>고객사코드</Label>
                      <Input readOnly value={customer.id} />
                    </div>
                    <div className="space-y-2">
                      <Label>고객사명</Label>
                      <Input readOnly value={customer.name} />
                    </div>
                    <div className="space-y-2">
                      <Label>고객군</Label>
                      <Input readOnly value={customer.category} />
                    </div>
                    <div className="space-y-2">
                      <Label>주소</Label>
                      <Input readOnly value={customer.address ?? "-"} />
                    </div>
                    <div className="space-y-2">
                      <Label>담당자 수</Label>
                      <Input readOnly value={`${contacts.length}명`} />
                    </div>
                    <div className="space-y-2">
                      <Label>메모</Label>
                      <Textarea readOnly rows={4} value={customer.memo ?? `진행중 사업기회 ${customer.opportunities}건 / 계약 ${customer.contracts}건`} />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-base font-semibold">담당자 정보</h2>
                  <div className="space-y-6">
                    {contacts.map((contact, index) => (
                      <section key={index} className="space-y-4 border border-border p-4">
                        <h3 className="text-sm font-semibold">{`담당자 ${index + 1}`}</h3>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>담당자명</Label>
                            <CustomerDetailControl label="담당자명" value={contact.name} />
                          </div>
                          <div className="space-y-2">
                            <Label>직급/직책</Label>
                            <CustomerDetailControl label="직급/직책" value={contact.position ?? ""} />
                          </div>
                          <div className="space-y-2">
                            <Label>소속부서</Label>
                            <CustomerDetailControl label="소속부서" value={contact.department ?? ""} />
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>이메일</Label>
                            <CustomerDetailControl label="이메일" value={contact.email ?? ""} />
                          </div>
                          <div className="space-y-2">
                            <Label>무선전화번호</Label>
                            <CustomerDetailControl label="무선전화번호" value={contact.mobilePhone ?? ""} />
                          </div>
                          <div className="space-y-2">
                            <Label>유선전화번호</Label>
                            <CustomerDetailControl label="유선전화번호" value={contact.landlinePhone ?? ""} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>담당 직무</Label>
                          <CustomerDetailControl label="담당 직무" value={contact.duty ?? ""} />
                        </div>
                        <div className="space-y-2">
                          <Label>비고</Label>
                          <CustomerDetailControl label="메모" value={contact.memo ?? ""} />
                        </div>
                      </section>
                    ))}
                  </div>
                </section>

                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href={backHref}>목록</Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/finding/customers/${customer.id}/edit?tab=${searchParams.get("tab") ?? "customers"}`}>수정</Link>
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
