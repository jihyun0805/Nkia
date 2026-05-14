"use client"

import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"
import { Header } from "@/components/erp/header"
import { Sidebar } from "@/components/erp/sidebar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { toast } from "@/hooks/use-toast"
import { type CustomerRecord } from "@/lib/finding-data"
import { deleteBackendCompany, loadBackendFindingData } from "@/lib/finding-backend"

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
      fax: customer.fax ?? "",
      duty: customer.duty ?? "",
      memo: customer.memo ?? "",
      businessCardImage: customer.contacts?.[0]?.businessCardImage ?? "",
    }]
}

function CustomerDetailPageContent() {
  const params = useParams<{ id?: string | string[] }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? ""
  const [customer, setCustomer] = useState<CustomerRecord | null>(null)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    loadBackendFindingData()
      .then((data) => {
        if (cancelled) return
        setCustomer(data.customers.find((item) => item.id === id) ?? null)
      })
      .catch(() => {
        if (!cancelled) {
          setCustomer(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const contacts = useMemo(() => (customer ? getContactRows(customer) : []), [customer])
  const backHref = `/finding?tab=${searchParams.get("tab") ?? "customers"}`
  const editHref = `/finding/customers/${id}/edit?tab=${searchParams.get("tab") ?? "customers"}`

  const handleDelete = () => {
    const backendId = customer?.backendId
    if (!backendId) {
      toast({
        title: "고객사 삭제 실패",
        description: "삭제할 고객사 정보를 찾지 못했습니다.",
      })
      setIsDeleteAlertOpen(false)
      return
    }

    void (async () => {
      try {
        await deleteBackendCompany(backendId)
        toast({
          title: "고객사 삭제 완료",
          description: `${customer.name} 고객사가 삭제되었습니다.`,
        })
        setIsDeleteAlertOpen(false)
        router.push(backHref)
      } catch {
        toast({
          title: "고객사 삭제 실패",
          description: "백엔드에서 고객사를 삭제하지 못했습니다.",
        })
        setIsDeleteAlertOpen(false)
      }
    })()
  }

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
              <CardHeader className="border-b pb-6">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-semibold tracking-tight">{customer.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{customer.id}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <section className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>고객군</Label>
                      <Input readOnly value={customer.category} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>주소</Label>
                      <Input readOnly value={customer.address ?? "-"} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>메모</Label>
                      <Textarea readOnly rows={4} value={customer.memo ?? `진행중 사업기회 ${customer.opportunities}건 / 계약 ${customer.contracts}건`} />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-base font-semibold">고객사 담당자 정보</h2>
                  <div className="space-y-6">
                    {contacts.map((contact, index) => (
                      <section key={index} className="space-y-4 border border-border p-4">
                        <h3 className="text-sm font-semibold">{`담당자 ${index + 1}`}</h3>
                        {contact.businessCardImage ? (
                          <img
                            src={contact.businessCardImage}
                            alt="Business card preview"
                            className="w-full max-w-xl rounded border border-border object-contain md:w-[560px]"
                          />
                        ) : null}
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
                          <div className="space-y-2">
                            <Label>FAX</Label>
                            <CustomerDetailControl label="FAX" value={contact.fax ?? ""} />
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
                  <Button variant="destructive" onClick={() => setIsDeleteAlertOpen(true)}>
                    삭제
                  </Button>
                  <Button asChild>
                    <Link href={editHref}>수정</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>고객사를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제 후에는 고객사 상세 정보와 담당자 정보를 이 화면에서 다시 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function CustomerDetailPage() {
  return (
    <Suspense fallback={null}>
      <CustomerDetailPageContent />
    </Suspense>
  )
}
