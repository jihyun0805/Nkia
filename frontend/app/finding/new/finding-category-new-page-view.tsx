"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { CustomerAutocomplete } from "@/components/erp/customer-autocomplete"
import { Button } from "@/components/ui/button"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { analyzeBusinessCard } from "@/lib/business-card-ocr-api"
import { findingStatuses, getCustomerByName, getFindingCategoryLabel, registerCustomer, registerOpportunity, type CustomerRecord } from "@/lib/finding-data"
import { currentUser, isSalesUser } from "@/lib/current-user"
import { toast } from "@/hooks/use-toast"
import { Loader2, Plus, ScanLine, Trash2, X } from "lucide-react"

const customerGroupOptions = ["공공", "민간", "해외"]
const partnerTypeOptions = ["SI", "파트너", "기타"]
const businessTypeOptions = ["EMS", "ITSM", "Automation", "WSS"]

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
  businessCardImage: string
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
    businessCardImage: "",
  }
}

function hasContactValue(contact: ContactDraft) {
  return [contact.name, contact.position, contact.department, contact.email, contact.mobilePhone, contact.landlinePhone, contact.fax, contact.duty, contact.memo].some(
    (value) => value.trim(),
  )
}

function keepExistingValue(currentValue: string | undefined, nextValue: string | null | undefined) {
  const trimmedNext = String(nextValue ?? "").trim()
  if (trimmedNext) return trimmedNext
  return currentValue ?? ""
}

function createBusinessCardThumbnail(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Failed to read business card image."))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error("Failed to load business card image."))
      image.onload = () => {
        const maxWidth = 960
        const scale = Math.min(1, maxWidth / image.width)
        const width = Math.max(1, Math.round(image.width * scale))
        const height = Math.max(1, Math.round(image.height * scale))
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext("2d")
        if (!context) {
          reject(new Error("Failed to render business card image."))
          return
        }
        context.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", 0.72))
      }
      image.src = String(reader.result ?? "")
    }
    reader.readAsDataURL(file)
  })
}

export function FindingCategoryNewPageView({
  category,
}: {
  category: "opportunities" | "customers" | "partners"
}) {
  const router = useRouter()
  const label = getFindingCategoryLabel(category)
  const [customerName, setCustomerName] = useState("")
  const [customerGroup, setCustomerGroup] = useState("민간")
  const [partnerName, setPartnerName] = useState("")
  const [partnerType, setPartnerType] = useState("SI")
  const [address, setAddress] = useState("")
  const [memo, setMemo] = useState("")
  const [contacts, setContacts] = useState<ContactDraft[]>([createEmptyContactDraft()])
  const [selectedOpportunityCustomer, setSelectedOpportunityCustomer] = useState<CustomerRecord | null>(null)
  const [opportunityCustomerName, setOpportunityCustomerName] = useState("")
  const [opportunityName, setOpportunityName] = useState("")
  const [opportunityPartnerName, setOpportunityPartnerName] = useState("")
  const [expectedDate, setExpectedDate] = useState("")
  const [expectedAmount, setExpectedAmount] = useState("")
  const [opportunityCustomerGroup, setOpportunityCustomerGroup] = useState("민간")
  const [opportunityRegistrant] = useState(currentUser.name)
  const [opportunitySalesRep, setOpportunitySalesRep] = useState(isSalesUser(currentUser) ? currentUser.name : "")
  const [businessType, setBusinessType] = useState("")
  const [moduleName, setModuleName] = useState("")
  const [issue, setIssue] = useState("")
  const [competition, setCompetition] = useState("")
  const [decisionInfo, setDecisionInfo] = useState("")
  const [opportunityStatus, setOpportunityStatus] = useState("발굴")
  const [customerRegistrationGuideOpen, setCustomerRegistrationGuideOpen] = useState(false)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const [ocrLoadingIndex, setOcrLoadingIndex] = useState<number | null>(null)
  const businessCardInputRef = useRef<HTMLInputElement | null>(null)
  const pendingOcrIndexRef = useRef<number | null>(null)

  const openBusinessCardInput = (contactIndex: number) => {
    pendingOcrIndexRef.current = contactIndex
    businessCardInputRef.current?.click()
  }

  const handleBusinessCardFileChange = async (file: File | undefined) => {
    if (!file) return

    const targetIndex = pendingOcrIndexRef.current
    if (targetIndex === null || targetIndex < 0 || targetIndex >= contacts.length) return

    setOcrLoadingIndex(targetIndex)
    try {
      const [result, businessCardImage] = await Promise.all([
        analyzeBusinessCard(file),
        createBusinessCardThumbnail(file),
      ])
      const currentContact = contacts[targetIndex] ?? createEmptyContactDraft()
      const nextContact: ContactDraft = {
        ...currentContact,
        name: keepExistingValue(currentContact.name, result.contactName),
        position: keepExistingValue(currentContact.position, result.position),
        department: keepExistingValue(currentContact.department, result.department),
        email: keepExistingValue(currentContact.email, result.email),
        mobilePhone: keepExistingValue(currentContact.mobilePhone, result.mobile),
        landlinePhone: keepExistingValue(currentContact.landlinePhone, result.phone),
        fax: keepExistingValue(currentContact.fax, result.fax),
        duty: keepExistingValue(currentContact.duty, result.role),
        businessCardImage,
      }

      if (!hasContactValue(nextContact)) {
        toast({
          title: "명함 OCR 결과 없음",
          description: "담당자 정보로 입력할 값을 찾지 못했습니다.",
        })
        return
      }

      setContacts((prev) => prev.map((contact, index) => (index === targetIndex ? nextContact : contact)))
      toast({
        title: "명함 OCR 완료",
        description: `${nextContact.name || "담당자"} 정보를 해당 담당자 칸에 채웠습니다.`,
      })
    } catch (error) {
      toast({
        title: "명함 OCR 실패",
        description: error instanceof Error ? error.message : "이미지를 다시 확인해주십시오.",
      })
    } finally {
      setOcrLoadingIndex(null)
      pendingOcrIndexRef.current = null
    }
  }

  const handleSubmit = () => {
    const normalizedName = customerName.trim()
    const filledContacts = contacts.filter(hasContactValue)
    const primaryContact = filledContacts[0]

    if (!normalizedName || !primaryContact?.name.trim() || !primaryContact?.mobilePhone.trim()) {
      toast({
        title: "고객사 등록 확인",
        description: "고객사명, 담당자 1의 성명, 무선전화번호를 모두 입력해주십시오.",
      })
      return
    }

    const duplicate = getCustomerByName(normalizedName)
    if (duplicate) {
      setDuplicateOpen(true)
      return
    }

    const result = registerCustomer({
      name: normalizedName,
      category: customerGroup,
      contacts: filledContacts,
      address,
      memo,
      aliases: [],
    })

    if (result.status === "duplicate") {
      setDuplicateOpen(true)
      return
    }

    toast({
      title: "고객사 등록 완료",
      description: `${result.customer.name} 고객사가 등록되었습니다.`,
    })
    router.push("/finding?tab=customers")
  }

  const handlePartnerSubmit = () => {
    const normalizedName = partnerName.trim()
    const filledContacts = contacts.filter(hasContactValue)
    const primaryContact = filledContacts[0]

    if (!normalizedName || !partnerType || !primaryContact?.name.trim() || !primaryContact?.mobilePhone.trim()) {
      toast({
        title: "협력사 등록 확인",
        description: "협력사명, 유형, 담당자 1의 성명, 무선전화번호를 모두 입력해주십시오.",
      })
      return
    }

    toast({
      title: "협력사 등록 완료",
      description: `${normalizedName} 협력사가 등록되었습니다.`,
    })
    router.push("/finding?tab=partners")
  }

  if (category === "partners") {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title={`${label} 등록`} description="협력사 기본정보와 담당자 정보를 등록합니다" />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-5xl space-y-6">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/finding?tab=partners">발굴</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{label} 등록</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <Card>
                <CardHeader>
                  <CardTitle>{label} 등록</CardTitle>
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
                      <Button
                        type="button"
                        variant="outline"
                        className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setContacts((prev) => [...prev, createEmptyContactDraft()])}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        담당자 추가
                      </Button>
                    </div>

                    <div className="space-y-6">
                      {contacts.map((contact, index) => (
                        <section key={index} className="space-y-4 border border-border p-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">{`담당자 ${index + 1}`}</h3>
                            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteIndex(index)}>
                              <Trash2 className="mr-2 h-4 w-4" />
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
                      <Link href="/finding?tab=partners">취소</Link>
                    </Button>
                    <Button onClick={handlePartnerSubmit}>등록</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (category !== "customers") {
    const backHref = `/finding?tab=${category}`
    const pageDescription = "신규 사업기회 등록정보를 입력합니다"

    const handleOpportunitySubmit = () => {
      if (!selectedOpportunityCustomer) {
        setCustomerRegistrationGuideOpen(true)
        return
      }

      if (!opportunityName.trim() || !businessType) {
        toast({
          title: "사업기회 등록 확인",
          description: "사업명과 사업 구분을 입력해주십시오.",
        })
        return
      }

      const result = registerOpportunity({
        customerCode: selectedOpportunityCustomer.id,
        category: opportunityCustomerGroup,
        name: opportunityName,
        registrant: opportunityRegistrant,
        partner: opportunityPartnerName,
        expectedDate,
        expectedAmount,
        product: businessType,
        module: moduleName,
        issue,
        competition,
        decisionInfo,
        status: opportunityStatus,
        salesRep: opportunitySalesRep,
      })

      if (result.status === "customer_not_found") {
        toast({
          title: "사업기회 등록 실패",
          description: "선택한 고객사를 찾지 못했습니다. 다시 선택해주십시오.",
        })
        return
      }

      toast({
        title: "사업기회 등록 완료",
        description: `${result.opportunity.customer} 고객사의 사업기회가 등록되었습니다.`,
      })
      router.push(`/finding/opportunities/${result.opportunity.id}?tab=opportunities`)
    }

    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title={`${label} 등록`} description={pageDescription} />
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
                    <BreadcrumbPage>{label} 등록</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <Card>
                <CardHeader>
                  <CardTitle>{label} 등록</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <section className="space-y-4">
                    <h2 className="text-base font-semibold">등록정보</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>고객사명 *</Label>
                        <CustomerAutocomplete
                          value={opportunityCustomerName}
                          onSelect={(customer) => {
                            setSelectedOpportunityCustomer(customer)
                            setOpportunityCustomerName(customer?.name ?? "")
                            setOpportunityCustomerGroup(customer?.category ?? "민간")
                          }}
                          onValueChange={setOpportunityCustomerName}
                          onUnregisteredAttempt={() => setCustomerRegistrationGuideOpen(true)}
                          placeholder="고객사명 일부를 입력해 기존 고객사를 선택하세요"
                        />
                        {selectedOpportunityCustomer ? (
                          <p className="text-xs text-muted-foreground">고객사 코드: {selectedOpportunityCustomer.id}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">자동완성 목록에서 선택하면 고객사 코드가 함께 연결됩니다.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>협력사명</Label>
                        <Input value={opportunityPartnerName} onChange={(event) => setOpportunityPartnerName(event.target.value)} placeholder="협력사명을 입력하세요" />
                      </div>
                      <div className="space-y-2">
                        <Label>사업명 *</Label>
                        <Input value={opportunityName} onChange={(event) => setOpportunityName(event.target.value)} placeholder="사업명을 입력하세요" />
                      </div>
                      <div className="space-y-2">
                        <Label>고객군</Label>
                        <Select value={opportunityCustomerGroup} onValueChange={setOpportunityCustomerGroup}>
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
                        <Input value={opportunityRegistrant} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>영업대표</Label>
                        <Input value={opportunitySalesRep} onChange={(event) => setOpportunitySalesRep(event.target.value)} placeholder="영업대표명을 입력하세요" />
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
                        <Select value={opportunityStatus} onValueChange={setOpportunityStatus}>
                          <SelectTrigger>
                            <SelectValue placeholder="선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {findingStatuses.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
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
                    <Button onClick={handleOpportunitySubmit}>등록</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>

        <AlertDialog open={customerRegistrationGuideOpen} onOpenChange={setCustomerRegistrationGuideOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>고객사 등록 필요</AlertDialogTitle>
              <AlertDialogDescription>
                등록된 고객사 정보가 없어서 영업기회 등록을 할 수 없습니다. 먼저 고객사 등록 후 사업기회등록을 진행해주십시오.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>닫기</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Link href="/finding/new/customers">고객사 등록</Link>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${label} 등록`} description="고객사명 자동완성으로 기존 고객을 먼저 찾고, 신규 고객을 등록합니다" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/finding?tab=customers">발굴</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{label} 등록</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader>
                <CardTitle>{label} 등록</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <section className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>고객사명 *</Label>
                      <CustomerAutocomplete
                        value={customerName}
                        onSelect={(customer) => setCustomerName(customer?.name ?? "")}
                        onValueChange={setCustomerName}
                        allowCustomValue
                        placeholder="고객사명을 입력하세요"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>고객군 *</Label>
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
                    <h2 className="text-base font-semibold">고객사 담당자 정보</h2>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setContacts((prev) => [...prev, createEmptyContactDraft()])}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      담당자 추가
                    </Button>
                    <Input
                      ref={businessCardInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={ocrLoadingIndex !== null}
                      onChange={(event) => {
                        void handleBusinessCardFileChange(event.target.files?.[0])
                        event.target.value = ""
                      }}
                    />
                  </div>

                  <div className="space-y-6">
                    {contacts.map((contact, index) => (
                      <section key={index} className="space-y-4 border border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold">{`담당자 ${index + 1}`}</h3>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" disabled={ocrLoadingIndex !== null} onClick={() => openBusinessCardInput(index)}>
                              {ocrLoadingIndex === index ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                              명함 등록
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteIndex(index)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              담당자 삭제
                            </Button>
                          </div>
                        </div>
                        {contact.businessCardImage ? (
                          <div className="flex items-start gap-3">
                            <img
                              src={contact.businessCardImage}
                              alt="Business card preview"
                              className="w-full max-w-xl rounded border border-border object-contain md:w-[560px]"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, businessCardImage: "" } : item)))
                              }
                            >
                              <X className="mr-2 h-4 w-4" />
                              미리보기 제거
                            </Button>
                          </div>
                        ) : null}
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
                          <div className="space-y-2">
                            <Label>FAX</Label>
                            <Input
                              value={contact.fax}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, fax: event.target.value } : item)))
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
                    <Link href="/finding">취소</Link>
                  </Button>
                  <Button onClick={handleSubmit}>등록</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <AlertDialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <AlertDialogContent>
          <AlertDialogCancel className="absolute top-4 right-4 h-9 w-9 p-0">
            <X className="h-4 w-4" />
          </AlertDialogCancel>
          <AlertDialogHeader>
            <AlertDialogTitle>고객사 중복 등록</AlertDialogTitle>
            <AlertDialogDescription>이미 등록된 동일한 이름의 고객사가 있습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDuplicateOpen(false)}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogCancel className="absolute top-4 right-4 h-9 w-9 p-0">
            <X className="h-4 w-4" />
          </AlertDialogCancel>
          <AlertDialogHeader>
            <AlertDialogTitle>담당자 삭제</AlertDialogTitle>
            <AlertDialogDescription>담당자 정보 전체를 삭제합니다. 진행하시겠습니까?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteIndex === null) return
                setContacts((prev) => prev.filter((_, index) => index !== deleteIndex))
                setDeleteIndex(null)
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
