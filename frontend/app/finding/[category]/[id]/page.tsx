"use client"

import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
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
import { RfpSummaryMarkdown } from "@/components/erp/rfp-summary-markdown"
import { formatAttachmentSize } from "@/lib/attachments"
import { toast } from "@/hooks/use-toast"
import { deleteOpportunity, deletePartner, getFindingCategoryLabel, getFindingFields, getFindingItem, type FindingCategory, type FindingFormField } from "@/lib/finding-data"
import { FileText } from "lucide-react"

function formatRfpSummaryTitle(fileName: string) {
  const title = fileName.replace(/\.[^.]+$/, "").trim()
  return title || "RFP 문서"
}

function FindingDetailControl({ field, value }: { field: FindingFormField; value: string }) {
  if (field.type === "file") return <Input readOnly value="등록된 첨부파일이 없습니다." />
  if (field.type === "textarea") return <Textarea readOnly rows={4} value={value || "-"} />
  return <Input readOnly value={value || "-"} />
}

function getPartnerContacts(item: any) {
  if (Array.isArray(item.contacts) && item.contacts.length > 0) return item.contacts
  return [
    {
      name: item.contact ?? "-",
      position: item.position ?? "",
      department: item.department ?? "",
      email: item.email ?? "",
      mobilePhone: item.mobilePhone ?? item.phone ?? "",
      landlinePhone: item.landlinePhone ?? "",
      duty: item.duty ?? "",
      memo: item.memo ?? "",
    },
  ]
}

export default function FindingDetailPage() {
  const params = useParams<{ category?: string | string[]; id?: string | string[] }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const categoryParam = Array.isArray(params.category) ? params.category[0] : params.category ?? ""
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? ""
  const category = (categoryParam === "opportunities" || categoryParam === "customers" || categoryParam === "partners"
    ? categoryParam
    : "opportunities") as FindingCategory
  const [item, setItem] = useState<any>(null)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)

  useEffect(() => {
    const sync = () => setItem(getFindingItem(category, id))
    sync()
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [category, id])

  const label = getFindingCategoryLabel(category)
  const tab = searchParams.get("tab") ?? category
  const backHref = `/finding?tab=${tab}`
  const editHref = `/finding/${category}/${id}/edit?tab=${tab}`

  const handleDelete = () => {
    if (category === "partners") {
      const result = deletePartner(id)
      if (result.status === "not_found") {
        toast({
          title: "협력사 삭제 실패",
          description: "삭제할 협력사를 찾지 못했습니다.",
        })
        setIsDeleteAlertOpen(false)
        return
      }

      toast({
        title: "협력사 삭제 완료",
        description: `${result.partner.name} 협력사가 삭제되었습니다.`,
      })
      setIsDeleteAlertOpen(false)
      router.push(backHref)
      return
    }

    if (category === "opportunities") {
      const result = deleteOpportunity(id)
      if (result.status === "not_found") {
        toast({
          title: "사업기회 삭제 실패",
          description: "삭제할 사업기회를 찾지 못했습니다.",
        })
        setIsDeleteAlertOpen(false)
        return
      }

      toast({
        title: "사업기회 삭제 완료",
        description: `${result.opportunity.name} 사업기회가 삭제되었습니다.`,
      })
      setIsDeleteAlertOpen(false)
      router.push(backHref)
      return
    }

    return
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title={`${label} 상세`} description={`${label} 정보를 조회합니다`} />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-5xl">
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">{label} 정보를 찾을 수 없습니다.</CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const fields = getFindingFields(category, item)
  const partnerContacts = category === "partners" ? getPartnerContacts(item) : []

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${label} 상세`} description={`${label} 정보를 페이지에서 조회합니다`} />
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
                  <BreadcrumbPage>{item.id}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader className="border-b pb-6">
                {category === "partners" ? (
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-semibold tracking-tight">{item.name ?? "-"}</CardTitle>
                    <p className="text-sm text-muted-foreground">{item.id}</p>
                  </div>
                ) : (
                  <CardTitle>{label} 상세</CardTitle>
                )}
              </CardHeader>
              <CardContent className="space-y-8">
                {category === "partners" ? (
                  <>
                    <section className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>유형</Label>
                          <Input readOnly value={item.type ?? "-"} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>주소</Label>
                          <Input readOnly value={item.address ?? "-"} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>메모</Label>
                          <Textarea readOnly rows={4} value={item.memo ?? `진행중 사업기회 ${item.opportunities ?? 0}건 / 진행중 프로젝트 ${item.projects ?? 0}건`} />
                        </div>
                      </div>
                    </section>
                    <section className="space-y-4">
                      <h2 className="text-base font-semibold">협력사 담당자 정보</h2>
                      <div className="space-y-6">
                        {partnerContacts.map((contact: any, index: number) => (
                          <section key={index} className="space-y-4 border border-border p-4">
                            <h3 className="text-sm font-semibold">{`담당자 ${index + 1}`}</h3>
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                                <Label>담당자명</Label>
                                <Input readOnly value={contact.name || "-"} />
                              </div>
                              <div className="space-y-2">
                                <Label>직급/직책</Label>
                                <Input readOnly value={contact.position || "-"} />
                              </div>
                              <div className="space-y-2">
                                <Label>소속부서</Label>
                                <Input readOnly value={contact.department || "-"} />
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                                <Label>이메일</Label>
                                <Input readOnly value={contact.email || "-"} />
                              </div>
                              <div className="space-y-2">
                                <Label>무선전화번호</Label>
                                <Input readOnly value={contact.mobilePhone || "-"} />
                              </div>
                              <div className="space-y-2">
                                <Label>유선전화번호</Label>
                                <Input readOnly value={contact.landlinePhone || "-"} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>담당 직무</Label>
                              <Input readOnly value={contact.duty || "-"} />
                            </div>
                            <div className="space-y-2">
                              <Label>비고</Label>
                              <Textarea readOnly rows={3} value={contact.memo || "-"} />
                            </div>
                          </section>
                        ))}
                      </div>
                    </section>
                    <section className="space-y-2">
                      <Label>첨부파일</Label>
                      {Array.isArray(item.attachments) && item.attachments.length > 0 ? (
                        <div className="space-y-2 rounded-md border border-border p-3">
                          {item.attachments.map((attachment: any) => (
                            <div key={attachment.id} className="flex items-center justify-between gap-3 text-sm">
                              <div className="min-w-0 flex-1">
                                <a href={attachment.dataUrl} download={attachment.name} className="truncate text-primary hover:underline">
                                  {attachment.name}
                                </a>
                                <p className="text-xs text-muted-foreground">{formatAttachmentSize(attachment.size)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Input readOnly value="등록된 첨부파일이 없습니다." />
                      )}
                    </section>
                  </>
                ) : (
                  <>
                    <section className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        {fields.map((field) => (
                          <div key={field.label} className="space-y-2 md:col-span-2">
                            <Label>{field.label}</Label>
                            <FindingDetailControl field={{ label: field.label }} value={field.value} />
                          </div>
                        ))}
                      </div>
                    </section>
                    {category === "opportunities" ? (
                      <section className="space-y-3">
                        <h2 className="text-base font-semibold">RFP 문서</h2>
                        {Array.isArray(item.rfpAttachments) && item.rfpAttachments.length > 0 ? (
                          <>
                            <div className="space-y-2">
                              {item.rfpAttachments.map((attachment: any) => (
                                <div key={attachment.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <div className="min-w-0 flex-1">
                                    <a href={attachment.dataUrl} download={attachment.name} className="truncate font-medium text-primary hover:underline">
                                      {attachment.name}
                                    </a>
                                    <p className="text-xs text-muted-foreground">{formatAttachmentSize(attachment.size)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {item.rfpAttachments.some((attachment: any) => attachment.summary) ? (
                              <div className="space-y-3">
                                {item.rfpAttachments.filter((attachment: any) => attachment.summary).map((attachment: any) => (
                                  <div key={attachment.id} className="space-y-3 rounded-md border border-border p-4">
                                    <h3 className="text-sm font-semibold">&lt;{formatRfpSummaryTitle(attachment.name)}&gt; 요약</h3>
                                    <RfpSummaryMarkdown markdown={attachment.summary} />
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">등록된 RFP 문서가 없습니다.</div>
                        )}
                      </section>
                    ) : null}
                  </>
                )}

                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href={backHref}>목록</Link>
                  </Button>
                  {category === "partners" || category === "opportunities" ? (
                    <Button variant="destructive" onClick={() => setIsDeleteAlertOpen(true)}>
                      삭제
                    </Button>
                  ) : null}
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
            <AlertDialogTitle>{category === "opportunities" ? "사업기회를 삭제하시겠습니까?" : "협력사를 삭제하시겠습니까?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {category === "opportunities"
                ? "삭제 후에는 사업기회 상세 정보와 첨부파일을 이 화면에서 다시 복구할 수 없습니다."
                : "삭제 후에는 협력사 상세 정보와 담당자 정보를 이 화면에서 다시 복구할 수 없습니다."}
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
