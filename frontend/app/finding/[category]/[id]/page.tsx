"use client"

import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { RfpSummaryMarkdown } from "@/components/erp/rfp-summary-markdown"
import { formatAttachmentSize } from "@/lib/attachments"
import { toast } from "@/hooks/use-toast"
import {
  type CustomerRecord,
  type FindingCategory,
  type OpportunityRecord,
  type PartnerRecord,
  getFindingCategoryLabel,
} from "@/lib/finding-data"
import { type ActivityRecord, getActivityDisplayType } from "@/lib/activity-data"
import { loadBackendActivityRecords } from "@/lib/sales-activity-backend"
import { deleteBackendCompany, deleteBackendProjectOpportunity, loadBackendFindingData, loadBackendProjectOpportunity, stageLabel } from "@/lib/finding-backend"
import { FileText } from "lucide-react"

function formatRfpSummaryTitle(fileName: string) {
  const title = fileName.replace(/\.[^.]+$/, "").trim()
  return title || "RFP 문서"
}

function getOpportunityPartnerNames(item: OpportunityRecord | null) {
  if (!item) return []
  if (Array.isArray(item.partners) && item.partners.length > 0) {
    return item.partners.filter((partner) => String(partner ?? "").trim())
  }
  return String(item.partner ?? "")
    .split(",")
    .map((partner) => partner.trim())
    .filter(Boolean)
}

function getCustomerContacts(customer: CustomerRecord | null) {
  if (!customer) return []

  if (Array.isArray(customer.contacts) && customer.contacts.length > 0) {
    return customer.contacts.filter((contact) =>
      [contact.name, contact.position, contact.department, contact.email, contact.mobilePhone, contact.landlinePhone].some((value) => String(value ?? "").trim()),
    )
  }

  if ([customer.contactName ?? customer.contact, customer.position, customer.department, customer.email, customer.mobilePhone ?? customer.phone, customer.landlinePhone].some((value) => String(value ?? "").trim())) {
    return [
      {
        name: customer.contactName ?? customer.contact ?? "",
        position: customer.position ?? "",
        department: customer.department ?? "",
        email: customer.email ?? "",
        mobilePhone: customer.mobilePhone ?? customer.phone ?? "",
        landlinePhone: customer.landlinePhone ?? "",
      },
    ]
  }

  return []
}

function getPartnerContacts(partner: PartnerRecord | null) {
  if (!partner) return []

  if (Array.isArray(partner.contacts) && partner.contacts.length > 0) {
    return partner.contacts.filter((contact) =>
      [contact.name, contact.position, contact.department, contact.email, contact.mobilePhone, contact.landlinePhone].some((value) => String(value ?? "").trim()),
    )
  }

  if ([partner.contactName ?? partner.contact, partner.position, partner.department, partner.email, partner.mobilePhone ?? partner.phone, partner.landlinePhone].some((value) => String(value ?? "").trim())) {
    return [
      {
        name: partner.contactName ?? partner.contact ?? "",
        position: partner.position ?? "",
        department: partner.department ?? "",
        email: partner.email ?? "",
        mobilePhone: partner.mobilePhone ?? partner.phone ?? "",
        landlinePhone: partner.landlinePhone ?? "",
        duty: partner.duty ?? "",
        memo: partner.memo ?? "",
      },
    ]
  }

  return []
}

function matchesFindingRecordId(item: { id: string; backendId?: number }, id: string) {
  return item.id === id || (item.backendId != null && String(item.backendId) === id)
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
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [partners, setPartners] = useState<PartnerRecord[]>([])
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([])
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    loadBackendFindingData()
      .then((data) => {
        if (cancelled) return
        setCustomers(data.customers)
        setPartners(data.partners)
        setOpportunities(data.opportunities)

        if (category !== "opportunities" || !id) return

        void loadBackendProjectOpportunity(Number(id))
          .then((opportunity) => {
            if (cancelled) return

            const fallback = data.opportunities.find((entry) => matchesFindingRecordId(entry, id)) ?? null
            const matchedCustomer = data.customers.find((customer) => customer.backendId === opportunity.customerCompanyId) ?? null
            const merged: OpportunityRecord = {
              ...(fallback ?? {
                id: opportunity.opportunityCode ?? String(opportunity.id ?? id),
                createdAt: "",
                customerCode: "",
                partnerCode: "-",
                name: opportunity.opportunityName ?? "-",
                registrant: opportunity.createUserName ?? "-",
                customer: opportunity.customerCompanyName ?? "-",
                partner: "-",
                category: "-",
                product: opportunity.projectType ? String(opportunity.projectType) : "-",
                module: "-",
                expectedAmount: opportunity.expectedBudget != null ? opportunity.expectedBudget.toLocaleString("ko-KR") : "-",
                expectedDate: opportunity.expectedBidDate ?? "-",
                issue: opportunity.description ?? "-",
                competition: opportunity.competitionStatus ?? "-",
                decisionInfo: opportunity.description ?? "-",
                partnerType: "-",
                partnerContact: "-",
                partnerPhone: "-",
                status: opportunity.stage ?? "-",
                salesRep: opportunity.salesRepresentativeName ?? opportunity.createUserName ?? "-",
              }),
              backendId: opportunity.id,
              id: fallback?.id ?? opportunity.opportunityCode ?? String(opportunity.id ?? id),
              customerCode: fallback?.customerCode ?? matchedCustomer?.id ?? (opportunity.customerCompanyId != null ? String(opportunity.customerCompanyId) : ""),
              createUserName: opportunity.createUserName ?? fallback?.createUserName,
              name: opportunity.opportunityName ?? fallback?.name ?? "-",
              customer: opportunity.customerCompanyName ?? fallback?.customer ?? "-",
              registrant: opportunity.createUserName ?? fallback?.registrant ?? "-",
              product: opportunity.projectType ? String(opportunity.projectType) : fallback?.product ?? "-",
              expectedAmount:
                opportunity.expectedBudget != null
                  ? opportunity.expectedBudget.toLocaleString("ko-KR")
                  : fallback?.expectedAmount ?? "-",
              expectedDate: opportunity.expectedBidDate ?? fallback?.expectedDate ?? "-",
              competition: opportunity.competitionStatus ?? fallback?.competition ?? "-",
              issue: fallback?.issue ?? opportunity.description ?? "-",
              decisionInfo: fallback?.decisionInfo ?? opportunity.description ?? "-",
              status: stageLabel(opportunity.stage) ?? fallback?.status ?? "-",
              salesRepresentativeId: opportunity.salesRepresentativeId ?? fallback?.salesRepresentativeId,
              salesRep: opportunity.salesRepresentativeName ?? fallback?.salesRep ?? "-",
            }

            setOpportunities((current) => {
              const hasExisting = current.some((entry) => matchesFindingRecordId(entry, id))
              if (!hasExisting) return [merged]
              return current.map((entry) => (matchesFindingRecordId(entry, id) ? merged : entry))
            })
          })
          .catch(() => {
            if (cancelled) return
          })
      })
      .catch(() => {
        if (cancelled) return
        setOpportunities([])
        setCustomers([])
        setPartners([])
      })

    return () => {
      cancelled = true
    }
  }, [category, id])

  useEffect(() => {
    if (category !== "opportunities") return

    let cancelled = false

    loadBackendActivityRecords()
      .then((records) => {
        if (!cancelled) {
          setActivityRecords(records)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActivityRecords([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [category])

  const item = useMemo(() => {
    if (category === "opportunities") return opportunities.find((entry) => matchesFindingRecordId(entry, id)) ?? null
    if (category === "customers") return customers.find((entry) => matchesFindingRecordId(entry, id)) ?? null
    return partners.find((entry) => matchesFindingRecordId(entry, id)) ?? null
  }, [category, customers, id, opportunities, partners])
  const opportunityItem = category === "opportunities" ? (item as OpportunityRecord | null) : null
  const selectedCustomer = useMemo(() => {
    if (!opportunityItem) return null
    return customers.find((entry) => entry.id === opportunityItem.customerCode || entry.name === opportunityItem.customer) ?? null
  }, [customers, opportunityItem])
  const partnerItem = category === "partners" ? (item as PartnerRecord | null) : null
  const opportunityAttachments = opportunityItem?.rfpAttachments ?? []
  const opportunityPartnerNames = getOpportunityPartnerNames(opportunityItem)
  const customerDecisionContacts = getCustomerContacts(selectedCustomer)
  const relatedActivities = useMemo(() => {
    if (!opportunityItem) return []

    const backendId = opportunityItem.backendId
    const backendIdText = backendId != null ? String(backendId) : ""

    return activityRecords
      .filter((activity) => {
        if (backendId != null && activity.projectOpportunityId === backendId) return true
        if (backendIdText && activity.businessCode === backendIdText) return true
        if (activity.businessCode && activity.businessCode === opportunityItem.id) return true
        return activity.customerCode === opportunityItem.customerCode && activity.opportunity === opportunityItem.name
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [activityRecords, opportunityItem])

  const label = getFindingCategoryLabel(category)
  const tab = searchParams.get("tab") ?? category
  const backHref = `/finding?tab=${tab}`
  const editHref = `/finding/${category}/${id}/edit?tab=${tab}`

  const handleDelete = () => {
    if (category === "partners") {
      const backendId = (item as PartnerRecord | null)?.backendId
      if (!backendId) {
        toast({
          title: "협력사 삭제 실패",
          description: "삭제할 협력사를 찾지 못했습니다.",
        })
        setIsDeleteAlertOpen(false)
        return
      }

      void (async () => {
        try {
          await deleteBackendCompany(backendId)
          toast({
            title: "협력사 삭제 완료",
            description: `${(item as PartnerRecord).name} 협력사가 삭제되었습니다.`,
          })
          setIsDeleteAlertOpen(false)
          router.push(backHref)
        } catch {
          toast({
            title: "협력사 삭제 실패",
            description: "백엔드에서 협력사를 삭제하지 못했습니다.",
          })
          setIsDeleteAlertOpen(false)
        }
      })()
      return
    }

    if (category === "opportunities") {
      const backendId = (item as OpportunityRecord | null)?.backendId
      if (!backendId) {
        toast({
          title: "사업기회 삭제 실패",
          description: "삭제할 사업기회를 찾지 못했습니다.",
        })
        setIsDeleteAlertOpen(false)
        return
      }

      void (async () => {
        try {
          await deleteBackendProjectOpportunity(backendId)
          toast({
            title: "사업기회 삭제 완료",
            description: `${(item as OpportunityRecord).name} 사업기회가 삭제되었습니다.`,
          })
          setIsDeleteAlertOpen(false)
          router.push(backHref)
        } catch {
          toast({
            title: "사업기회 삭제 실패",
            description: "백엔드에서 사업기회를 삭제하지 못했습니다.",
          })
          setIsDeleteAlertOpen(false)
        }
      })()
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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${label} 상세`} description="등록 및 수정 화면과 같은 구성으로 정보를 조회합니다" />
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
                    <CardTitle className="text-2xl font-semibold tracking-tight">{partnerItem?.name ?? "-"}</CardTitle>
                    <p className="text-sm text-muted-foreground">{partnerItem?.id ?? "-"}</p>
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
                          <Label>협력사명</Label>
                          <Input readOnly value={partnerItem?.name ?? "-"} />
                        </div>
                        <div className="space-y-2">
                          <Label>유형</Label>
                          <Input readOnly value={partnerItem?.type ?? "-"} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>주소</Label>
                          <Input readOnly value={partnerItem?.address ?? "-"} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>메모</Label>
                          <Textarea readOnly rows={4} value={partnerItem?.memo ?? `진행중 사업기회 ${partnerItem?.opportunities ?? 0}건 / 진행중 프로젝트 ${partnerItem?.projects ?? 0}건`} />
                        </div>
                      </div>
                    </section>
                    <section className="space-y-4">
                      <h2 className="text-base font-semibold">협력사 담당자 정보</h2>
                      <div className="space-y-6">
                        {getPartnerContacts(partnerItem).map((contact: any, index: number) => (
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
                          </section>
                        ))}
                      </div>
                    </section>
                  </>
                ) : (
                  <>
                    <section className="space-y-4">
                      <h2 className="text-base font-semibold">등록정보</h2>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>고객사명</Label>
                          <Input readOnly value={opportunityItem?.customer ?? "-"} />
                        </div>
                        <div className="space-y-2">
                          <Label>협력사명</Label>
                          <div className="space-y-2">
                            {opportunityPartnerNames.length > 0 ? (
                              opportunityPartnerNames.map((partnerName, index) => (
                                <Input key={`${partnerName}-${index}`} readOnly value={partnerName || "-"} />
                              ))
                            ) : (
                              <Input readOnly value="-" />
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>사업명</Label>
                          <Input readOnly value={opportunityItem?.name ?? "-"} />
                        </div>
                        <div className="space-y-2">
                          <Label>고객군</Label>
                          <Input readOnly value={selectedCustomer?.category ?? opportunityItem?.category ?? "-"} />
                        </div>
                        <div className="space-y-2">
                          <Label>등록자</Label>
                          <Input readOnly value={opportunityItem?.createUserName ?? "-"} />
                        </div>
                        <div className="space-y-2">
                          <Label>영업대표</Label>
                          <Input readOnly value={opportunityItem?.salesRep ?? "-"} />
                        </div>
                        <div className="space-y-2">
                          <Label>예상 입찰 또는 계약 시점</Label>
                          <Input readOnly value={opportunityItem?.expectedDate ?? "-"} />
                        </div>
                        <div className="space-y-2">
                          <Label>예상 예산 또는 매출</Label>
                          <Input readOnly value={opportunityItem?.expectedAmount ?? "-"} />
                        </div>
                        <div className="space-y-2">
                          <Label>사업 구분</Label>
                          <Input readOnly value={opportunityItem?.product ?? "-"} />
                        </div>
                        <div className="space-y-2">
                          <Label>상태</Label>
                          <Input readOnly value={opportunityItem?.status ?? "-"} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>납품 모듈</Label>
                          <Input readOnly value={opportunityItem?.module ?? "-"} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>주요 사업 내용 및 주요 이슈 내용</Label>
                          <Textarea readOnly rows={4} value={opportunityItem?.issue ?? "-"} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>경쟁 상황</Label>
                          <Textarea readOnly rows={4} value={opportunityItem?.competition ?? "-"} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>고객사 담당자 정보</Label>
                          <div className="overflow-hidden rounded-md border">
                            <table className="w-full border-collapse text-sm [&_td]:border [&_th]:border">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="px-3 py-2 text-center font-medium">순위</th>
                                  <th className="px-3 py-2 text-center font-medium">성명</th>
                                  <th className="px-3 py-2 text-center font-medium">직급</th>
                                  <th className="px-3 py-2 text-center font-medium">부서명</th>
                                  <th className="px-3 py-2 text-center font-medium">전자우편</th>
                                  <th className="px-3 py-2 text-center font-medium">이동전화</th>
                                  <th className="px-3 py-2 text-center font-medium">일반전화</th>
                                </tr>
                              </thead>
                              <tbody>
                                {customerDecisionContacts.length > 0 ? (
                                  customerDecisionContacts.map((contact, index) => (
                                    <tr key={`${contact.name}-${index}`}>
                                      <td className="px-3 py-2 text-center">{index + 1}</td>
                                      <td className="px-3 py-2 text-center">{contact.name || "-"}</td>
                                      <td className="px-3 py-2 text-center">{contact.position || "-"}</td>
                                      <td className="px-3 py-2 text-center">{contact.department || "-"}</td>
                                      <td className="px-3 py-2 text-center">{contact.email || "-"}</td>
                                      <td className="px-3 py-2 text-center">{contact.mobilePhone || "-"}</td>
                                      <td className="px-3 py-2 text-center">{contact.landlinePhone || "-"}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                                      선택한 고객사의 담당자 정보가 없습니다.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-2">
                      <Label>RFP 문서</Label>
                      {opportunityAttachments.length > 0 ? (
                        <div className="space-y-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                          {opportunityAttachments.map((attachment: any) => (
                            <div key={attachment.id} className="flex items-center gap-2 text-sm">
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
                      ) : (
                        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">등록된 RFP 문서가 없습니다.</div>
                      )}
                      {opportunityAttachments.some((attachment: any) => attachment.summary) ? (
                        <div className="space-y-3">
                          {opportunityAttachments.filter((attachment: any) => attachment.summary).map((attachment: any) => (
                            <div key={attachment.id} className="space-y-3 rounded-md border border-border p-4">
                              <h3 className="text-sm font-semibold">&lt;{formatRfpSummaryTitle(attachment.name)}&gt; 요약</h3>
                              <RfpSummaryMarkdown markdown={attachment.summary} />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </section>
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

            {category === "opportunities" ? (
              <Card>
                <CardHeader>
                  <CardTitle>관련 활동</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-3 pb-4">
                    <p className="text-sm text-muted-foreground">이 사업기회에 연결된 활동 내역입니다.</p>
                    <Badge variant="secondary">{relatedActivities.length}건</Badge>
                  </div>
                  {relatedActivities.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[120px]">활동일</TableHead>
                            <TableHead>활동 구분</TableHead>
                            <TableHead>주요 내용</TableHead>
                            <TableHead className="w-[160px]">등록자</TableHead>
                            <TableHead className="w-[120px]">상태</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {relatedActivities.map((activity) => (
                            <TableRow
                              key={activity.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => router.push(`/activity/activities/${activity.id}`)}
                            >
                              <TableCell>{activity.date || "-"}</TableCell>
                              <TableCell>{getActivityDisplayType(activity)}</TableCell>
                              <TableCell className="max-w-[360px] truncate">{activity.content || "-"}</TableCell>
                              <TableCell>{activity.registrant ?? "-"}</TableCell>
                              <TableCell>{activity.status || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      이 사업기회에 연결된 활동이 없습니다.
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
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
