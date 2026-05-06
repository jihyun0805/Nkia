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
import { findingStatuses, getFindingCategoryLabel, getFindingItem, updateOpportunity, updatePartner, type CustomerContact, type CustomerRecord, type FindingCategory, type OpportunityRecord, type PartnerRecord } from "@/lib/finding-data"
import { currentUser, isSalesUser } from "@/lib/current-user"
import { toast } from "@/hooks/use-toast"

const businessTypeOptions = ["EMS", "ITSM", "Automation", "WSS"]
const customerGroupOptions = ["공공", "민간", "해외"]
const partnerTypeOptions = ["SI", "파트너", "기타"]

type ContactDraft = {
  name: string
  position: string
  department: string
  email: string
  mobilePhone: string
  landlinePhone: string
  fax: string
  duty: string
  memo: string
}

function createEmptyContactDraft(): ContactDraft {
  return {
    name: "",
    position: "",
    department: "",
    email: "",
    mobilePhone: "",
    landlinePhone: "",
    fax: "",
    duty: "",
    memo: "",
  }
}

function toContactDrafts(partner: PartnerRecord | null) {
  if (!partner) return [createEmptyContactDraft()]
  const contacts = Array.isArray(partner.contacts) && partner.contacts.length > 0
    ? partner.contacts
    : [{
        name: partner.contactName ?? partner.contact ?? "",
        position: partner.position ?? "",
        department: partner.department ?? "",
        email: partner.email ?? "",
        mobilePhone: partner.mobilePhone ?? partner.phone ?? "",
        landlinePhone: partner.landlinePhone ?? "",
        fax: partner.fax ?? "",
        duty: partner.duty ?? "",
        memo: partner.memo ?? "",
      }]

  return contacts.map((contact) => ({
    name: contact.name ?? "",
    position: contact.position ?? "",
    department: contact.department ?? "",
    email: contact.email ?? "",
    mobilePhone: contact.mobilePhone ?? "",
    landlinePhone: contact.landlinePhone ?? "",
    fax: contact.fax ?? "",
    duty: contact.duty ?? "",
    memo: contact.memo ?? "",
  }))
}

function hasContactValue(contact: ContactDraft) {
  return [contact.name, contact.position, contact.department, contact.email, contact.mobilePhone, contact.landlinePhone, contact.fax, contact.duty, contact.memo].some(
    (value) => value.trim(),
  )
}

export default function FindingEditPage() {
  const params = useParams<{ category?: string | string[]; id?: string | string[] }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const categoryParam = Array.isArray(params.category) ? params.category[0] : params.category ?? ""
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? ""
  const category = (categoryParam === "opportunities" || categoryParam === "customers" || categoryParam === "partners"
    ? categoryParam
    : "opportunities") as FindingCategory
  const [item, setItem] = useState<OpportunityRecord | PartnerRecord | null>(null)
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
  const [partnerType, setPartnerType] = useState("SI")
  const [address, setAddress] = useState("")
  const [memo, setMemo] = useState("")
  const [contacts, setContacts] = useState<ContactDraft[]>([createEmptyContactDraft()])

  useEffect(() => {
    const sync = () => {
      const current = getFindingItem(category, id) as OpportunityRecord | PartnerRecord | null
      setItem(current)
      if (current && category === "opportunities") {
        const opportunity = current as OpportunityRecord
        setSelectedCustomer({ id: opportunity.customerCode, name: opportunity.customer, category: opportunity.category, opportunities: 0, contracts: 0, contact: "", phone: "" })
        setCustomerName(opportunity.customer)
        setOpportunityName(opportunity.name)
        setRegistrant(opportunity.registrant)
        setPartnerName(opportunity.partner === "-" ? "" : opportunity.partner)
        setExpectedDate(opportunity.expectedDate === "-" ? "" : opportunity.expectedDate)
        setExpectedAmount(opportunity.expectedAmount === "-" ? "" : opportunity.expectedAmount)
        setCustomerGroup(opportunity.category)
        setSalesRep(opportunity.salesRep)
        setBusinessType(opportunity.product)
        setModuleName(opportunity.module === "-" ? "" : opportunity.module)
        setIssue(opportunity.issue === "-" ? "" : opportunity.issue)
        setCompetition(opportunity.competition === "-" ? "" : opportunity.competition)
        setDecisionInfo(opportunity.decisionInfo === "-" ? "" : opportunity.decisionInfo)
        setStatus(opportunity.status)
      }
      if (current && category === "partners") {
        const partner = current as PartnerRecord
        setPartnerName(partner.name)
        setPartnerType(partner.type || "SI")
        setAddress(partner.address ?? "")
        setMemo(partner.memo ?? "")
        setContacts(toContactDrafts(partner))
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
    if (category === "partners") {
      const normalizedName = partnerName.trim()
      const filledContacts = contacts.filter(hasContactValue)
      const primaryContact = filledContacts[0]

      if (!normalizedName || !partnerType || !primaryContact?.name.trim() || !primaryContact?.mobilePhone.trim()) {
        toast({
          title: "협력사 수정 확인",
          description: "협력사명, 유형, 담당자 1의 성명, 무선전화번호를 모두 입력해주십시오.",
        })
        return
      }

      const result = updatePartner(id, {
        name: normalizedName,
        type: partnerType,
        contacts: filledContacts as CustomerContact[],
        address,
        memo,
      })

      if (result.status === "not_found") {
        toast({
          title: "협력사 수정 실패",
          description: "수정할 협력사를 찾지 못했습니다.",
        })
        return
      }

      toast({
        title: "협력사 수정 완료",
        description: `${result.partner.name} 정보가 수정되었습니다.`,
      })
      router.push(`/finding/partners/${result.partner.id}?tab=${tab}`)
      return
    }

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

  if (category === "partners") {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title={`${label} 수정`} description="등록된 협력사 기본정보와 담당자 정보를 수정합니다" />
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
                        <Label>협력사명 *</Label>
                        <Input value={partnerName} onChange={(event) => setPartnerName(event.target.value)} placeholder="협력사명을 입력하세요" />
                      </div>
                      <div className="space-y-2">
                        <Label>유형 *</Label>
                        <Select value={partnerType} onValueChange={setPartnerType}>
                          <SelectTrigger>
                            <SelectValue placeholder="선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {partnerTypeOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>주소</Label>
                        <Input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="주소를 입력하세요" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>메모</Label>
                        <Textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={4} placeholder="메모를 입력하세요" />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold">협력사 담당자 정보</h2>
                      <Button type="button" variant="outline" onClick={() => setContacts((prev) => [...prev, createEmptyContactDraft()])}>
                        담당자 추가
                      </Button>
                    </div>
                    <div className="space-y-6">
                      {contacts.map((contact, index) => (
                        <section key={index} className="space-y-4 border border-border p-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">{`담당자 ${index + 1}`}</h3>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setContacts((prev) => (prev.length > 1 ? prev.filter((_, itemIndex) => itemIndex !== index) : prev))}
                            >
                              담당자 삭제
                            </Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label>담당자명</Label>
                              <Input
                                value={contact.name}
                                onChange={(event) =>
                                  setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item)))
                                }
                                placeholder="담당자 이름을 입력하세요."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>직급/직책</Label>
                              <Input
                                value={contact.position}
                                onChange={(event) =>
                                  setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, position: event.target.value } : item)))
                                }
                                placeholder="직급/직책을 입력하세요."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>소속부서</Label>
                              <Input
                                value={contact.department}
                                onChange={(event) =>
                                  setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, department: event.target.value } : item)))
                                }
                                placeholder="소속부서명을 입력하세요."
                              />
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label>이메일</Label>
                              <Input
                                value={contact.email}
                                onChange={(event) =>
                                  setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, email: event.target.value } : item)))
                                }
                                placeholder="0000@000.co.kr"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>무선전화번호</Label>
                              <Input
                                value={contact.mobilePhone}
                                onChange={(event) =>
                                  setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, mobilePhone: event.target.value } : item)))
                                }
                                placeholder="000-000-0000"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>유선전화번호</Label>
                              <Input
                                value={contact.landlinePhone}
                                onChange={(event) =>
                                  setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, landlinePhone: event.target.value } : item)))
                                }
                                placeholder="02-0000-0000"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>담당 직무</Label>
                            <Input
                              value={contact.duty}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, duty: event.target.value } : item)))
                              }
                              placeholder="담당 직무를 입력하세요."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>비고</Label>
                            <Textarea
                              value={contact.memo}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, memo: event.target.value } : item)))
                              }
                              rows={3}
                              placeholder="담당자 관련 특기사항을 입력하세요."
                            />
                          </div>
                        </section>
                      ))}
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
