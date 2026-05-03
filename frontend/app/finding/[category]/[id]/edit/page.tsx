"use client"

import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { CustomerAutocomplete } from "@/components/erp/customer-autocomplete"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { findingStatuses, getFindingCategoryLabel, getFindingItem, updateOpportunity, type CustomerRecord, type FindingCategory, type OpportunityRecord } from "@/lib/finding-data"
import { currentUser, isSalesUser } from "@/lib/current-user"
import { toast } from "@/hooks/use-toast"

const businessTypeOptions = ["EMS", "ITSM", "Automation", "WSS"]
const customerGroupOptions = ["공공", "민간", "해외"]

export default function FindingEditPage() {
  const params = useParams<{ category?: string | string[]; id?: string | string[] }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const categoryParam = Array.isArray(params.category) ? params.category[0] : params.category ?? ""
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? ""
  const category = (categoryParam === "opportunities" || categoryParam === "customers" || categoryParam === "partners"
    ? categoryParam
    : "opportunities") as FindingCategory
  const [item, setItem] = useState<OpportunityRecord | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [opportunityName, setOpportunityName] = useState("")
  const [registrant, setRegistrant] = useState(currentUser.name)
  const [partnerName, setPartnerName] = useState("")
  const [expectedDate, setExpectedDate] = useState("")
  const [expectedAmount, setExpectedAmount] = useState("")
  const [customerGroup, setCustomerGroup] = useState("민간")
  const [salesRep, setSalesRep] = useState(isSalesUser(currentUser) ? currentUser.name : "")
  const [businessType, setBusinessType] = useState("")
  const [moduleName, setModuleName] = useState("")
  const [issue, setIssue] = useState("")
  const [competition, setCompetition] = useState("")
  const [decisionInfo, setDecisionInfo] = useState("")
  const [status, setStatus] = useState("발굴")

  useEffect(() => {
    const sync = () => {
      const current = getFindingItem(category, id) as OpportunityRecord | null
      setItem(current)
      if (current && category === "opportunities") {
        setSelectedCustomer({ id: current.customerCode, name: current.customer, category: current.category, opportunities: 0, contracts: 0, contact: "", phone: "" })
        setCustomerName(current.customer)
        setOpportunityName(current.name)
        setRegistrant(current.registrant)
        setPartnerName(current.partner === "-" ? "" : current.partner)
        setExpectedDate(current.expectedDate === "-" ? "" : current.expectedDate)
        setExpectedAmount(current.expectedAmount === "-" ? "" : current.expectedAmount)
        setCustomerGroup(current.category)
        setSalesRep(current.salesRep)
        setBusinessType(current.product)
        setModuleName(current.module === "-" ? "" : current.module)
        setIssue(current.issue === "-" ? "" : current.issue)
        setCompetition(current.competition === "-" ? "" : current.competition)
        setDecisionInfo(current.decisionInfo === "-" ? "" : current.decisionInfo)
        setStatus(current.status)
      }
    }

    sync()
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [category, id])

  const label = getFindingCategoryLabel(category)
  const tab = searchParams.get("tab") ?? category
  const backHref = `/finding/${category}/${id}?tab=${tab}`

  const handleSave = () => {
    if (category !== "opportunities") {
      router.push(backHref)
      return
    }

    if (!selectedCustomer) {
      toast({
        title: "사업기회 수정 확인",
        description: "등록된 고객사만 선택할 수 있습니다. 자동완성 목록에서 고객사를 선택해주십시오.",
      })
      return
    }

    if (!opportunityName.trim() || !businessType) {
      toast({
        title: "사업기회 수정 확인",
        description: "사업명과 사업 구분을 입력해주십시오.",
      })
      return
    }

    const result = updateOpportunity(id, {
      customerCode: selectedCustomer.id,
      category: customerGroup,
      name: opportunityName,
      registrant,
      partner: partnerName,
      expectedDate,
      expectedAmount,
      product: businessType,
      module: moduleName,
      issue,
      competition,
      decisionInfo,
      status,
      salesRep,
    })

    if (result.status === "not_found") {
      toast({
        title: "사업기회 수정 실패",
        description: "수정할 사업기회를 찾지 못했습니다.",
      })
      return
    }

    if (result.status === "customer_not_found") {
      toast({
        title: "사업기회 수정 실패",
        description: "선택한 고객사를 찾지 못했습니다. 다시 선택해주십시오.",
      })
      return
    }

    toast({
      title: "사업기회 수정 완료",
      description: `${result.opportunity.name} 정보가 수정되었습니다.`,
    })
    router.push(`/finding/opportunities/${result.opportunity.id}?tab=${tab}`)
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title={`${label} 수정`} description={`${label} 정보를 조회합니다`} />
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

  if (category !== "opportunities") {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title={`${label} 수정`} description="현재 이 화면에서는 사업기회 수정만 지원합니다" />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-5xl">
              <Card>
                <CardContent className="flex justify-end py-10">
                  <Button asChild>
                    <Link href={backHref}>상세로 돌아가기</Link>
                  </Button>
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
        <Header title={`${label} 수정`} description="등록된 고객사 코드와 연결된 상태로 사업기회를 수정합니다" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/finding?tab=${tab}`}>발굴</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={backHref}>{id}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>수정</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader>
                <CardTitle>{label} 수정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <section className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>고객사명 *</Label>
                      <CustomerAutocomplete
                        value={customerName}
                        onSelect={(customer) => {
                          setSelectedCustomer(customer)
                          setCustomerName(customer?.name ?? "")
                          setCustomerGroup(customer?.category ?? "민간")
                        }}
                        onValueChange={setCustomerName}
                        onUnregisteredAttempt={() =>
                          toast({
                            title: "등록된 고객사 선택 필요",
                            description: "사업기회의 고객사명은 기존 고객사 코드와 연결된 고객사만 선택할 수 있습니다.",
                          })
                        }
                        placeholder="고객사명 일부를 입력해 기존 고객사를 선택하세요"
                      />
                      {selectedCustomer ? <p className="text-xs text-muted-foreground">고객사 코드: {selectedCustomer.id}</p> : null}
                    </div>
                    <div className="space-y-2">
                      <Label>고객군</Label>
                      <Select value={customerGroup} onValueChange={setCustomerGroup}>
                        <SelectTrigger>
                          <SelectValue placeholder="선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {customerGroupOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>등록자</Label>
                      <Input value={registrant} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>영업대표</Label>
                      <Input value={salesRep} onChange={(event) => setSalesRep(event.target.value)} placeholder="영업대표명을 입력하세요" />
                    </div>
                    <div className="space-y-2">
                      <Label>사업명 *</Label>
                      <Input value={opportunityName} onChange={(event) => setOpportunityName(event.target.value)} placeholder="사업명을 입력하세요" />
                    </div>
                    <div className="space-y-2">
                      <Label>협력사명</Label>
                      <Input value={partnerName} onChange={(event) => setPartnerName(event.target.value)} placeholder="협력사명을 입력하세요" />
                    </div>
                    <div className="space-y-2">
                      <Label>예상 입찰 또는 계약 시점</Label>
                      <Input value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} placeholder="예: 2026년 3분기" />
                    </div>
                    <div className="space-y-2">
                      <Label>예상 예산 또는 매출</Label>
                      <Input value={expectedAmount} onChange={(event) => setExpectedAmount(event.target.value)} placeholder="예: 8억" />
                    </div>
                    <div className="space-y-2">
                      <Label>사업 구분 *</Label>
                      <Select value={businessType} onValueChange={setBusinessType}>
                        <SelectTrigger>
                          <SelectValue placeholder="선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {businessTypeOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>상태</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {findingStatuses.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>납품 모듈</Label>
                      <Input value={moduleName} onChange={(event) => setModuleName(event.target.value)} placeholder="납품 모듈을 입력하세요" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>주요 사업 내용 및 주요 이슈 내용</Label>
                      <Textarea value={issue} onChange={(event) => setIssue(event.target.value)} rows={4} placeholder="주요 사업 내용 및 주요 이슈 내용을 입력하세요" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>경쟁 상황</Label>
                      <Textarea value={competition} onChange={(event) => setCompetition(event.target.value)} rows={4} placeholder="경쟁 상황을 입력하세요" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>고객사 의사결정구조 및 담당자 정보</Label>
                      <Textarea value={decisionInfo} onChange={(event) => setDecisionInfo(event.target.value)} rows={4} placeholder="고객사 의사결정구조 및 담당자 정보를 입력하세요" />
                    </div>
                  </div>
                </section>

                <section className="space-y-2">
                  <Label>첨부파일</Label>
                  <Input type="file" multiple />
                </section>

                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href={backHref}>취소</Link>
                  </Button>
                  <Button onClick={handleSave}>수정</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
