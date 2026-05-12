"use client"

import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
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
  AlertDialogTrigger,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { BUSINESS_CARD_IMAGE_MAX_SIZE_LABEL, analyzeBusinessCard, assertBusinessCardImageSize } from "@/lib/business-card-ocr-api"
import { RfpSummaryMarkdown } from "@/components/erp/rfp-summary-markdown"
import { formatAttachmentSize, readFileAsStoredAttachment, type StoredFileAttachment } from "@/lib/attachments"
import { RFP_DOCUMENT_ACCEPT, assertRfpDocumentFile, summarizeRfpDocument } from "@/lib/rfp-summary-api"
import { findingStatuses, getCustomers, getFindingCategoryLabel, getFindingItem, updateOpportunity, updatePartner, type CustomerContact, type CustomerRecord, type FindingCategory, type OpportunityAttachment, type OpportunityRecord, type PartnerRecord } from "@/lib/finding-data"
import { currentUser, isSalesUser } from "@/lib/current-user"
import { toast } from "@/hooks/use-toast"
import { Loader2, Plus, ScanLine, Sparkles, Trash2, X } from "lucide-react"

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
  businessCardImage: string
}

type AttachmentDraft = StoredFileAttachment
type RfpAttachmentDraft = OpportunityAttachment & {
  file?: File
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
        businessCardImage: "",
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
    businessCardImage: contact.businessCardImage ?? "",
  }))
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

function formatRfpSummaryTitle(fileName: string) {
  const title = fileName.replace(/\.[^.]+$/, "").trim()
  return title || "RFP 문서"
}

function getCustomerDecisionContacts(customer: CustomerRecord | null): CustomerContact[] {
  if (!customer) return []

  if (Array.isArray(customer.contacts) && customer.contacts.length > 0) {
    return customer.contacts.filter((contact) =>
      [contact.name, contact.position, contact.department, contact.email, contact.mobilePhone, contact.landlinePhone].some((value) => String(value ?? "").trim()),
    )
  }

  if ([customer.contactName ?? customer.contact, customer.position, customer.department, customer.email, customer.mobilePhone ?? customer.phone, customer.landlinePhone].some((value) => String(value ?? "").trim())) {
    return [{
      name: customer.contactName ?? customer.contact ?? "",
      position: customer.position ?? "",
      department: customer.department ?? "",
      email: customer.email ?? "",
      mobilePhone: customer.mobilePhone ?? customer.phone ?? "",
      landlinePhone: customer.landlinePhone ?? "",
    }]
  }

  return []
}

function buildDecisionInfoFromCustomer(customer: CustomerRecord | null, fallback: string) {
  const contacts = getCustomerDecisionContacts(customer)
  if (contacts.length === 0) return fallback.trim() || "-"

  return contacts
    .map((contact, index) =>
      [
        `${index + 1}순위`,
        contact.name || "-",
        contact.position || "-",
        contact.department || "-",
        contact.email || "-",
        contact.mobilePhone || "-",
        contact.landlinePhone || "-",
      ].join(" / "),
    )
    .join(" | ")
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Failed to read RFP document."))
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.readAsDataURL(file)
  })
}

function createRfpAttachment(file: File, dataUrl: string, summary = ""): RfpAttachmentDraft {
  return {
    id: `${Date.now()}-${file.name}-${file.size}`,
    name: file.name,
    size: file.size,
    contentType: file.type || "application/octet-stream",
    dataUrl,
    summary,
    createdAt: new Date().toISOString(),
    file,
  }
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
  const [partnerNames, setPartnerNames] = useState<string[]>([""])
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
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([])
  const [rfpAttachments, setRfpAttachments] = useState<RfpAttachmentDraft[]>([])
  const [rfpSummaryLoadingId, setRfpSummaryLoadingId] = useState<string | null>(null)
  const [ocrLoadingIndex, setOcrLoadingIndex] = useState<number | null>(null)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const businessCardInputRef = useRef<HTMLInputElement | null>(null)
  const rfpInputRef = useRef<HTMLInputElement | null>(null)
  const pendingOcrIndexRef = useRef<number | null>(null)

  useEffect(() => {
    const sync = () => {
      const current = getFindingItem(category, id) as OpportunityRecord | PartnerRecord | null
      setItem(current)
      if (current && category === "opportunities") {
        const opportunity = current as OpportunityRecord
        const matchedCustomer = getCustomers().find((customer) => customer.id === opportunity.customerCode) ?? null
        setSelectedCustomer(matchedCustomer ?? { id: opportunity.customerCode, name: opportunity.customer, category: opportunity.category, opportunities: 0, contracts: 0, contact: "", phone: "" })
        setCustomerName(opportunity.customer)
        setOpportunityName(opportunity.name)
        setRegistrant(opportunity.registrant)
        setPartnerNames(
          Array.isArray(opportunity.partners) && opportunity.partners.length > 0
            ? opportunity.partners
            : opportunity.partner === "-" ? [""] : opportunity.partner.split(",").map((partner) => partner.trim()),
        )
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
        setRfpAttachments(opportunity.rfpAttachments ?? [])
      }
      if (current && category === "partners") {
        const partner = current as PartnerRecord
        setPartnerName(partner.name)
        setPartnerType(partner.type || "SI")
        setAddress(partner.address ?? "")
        setMemo(partner.memo ?? "")
        setContacts(toContactDrafts(partner))
        setAttachments(partner.attachments ?? [])
      }
    }

    sync()
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [category, id])

  const label = getFindingCategoryLabel(category)
  const tab = searchParams.get("tab") ?? category
  const backHref = `/finding/${category}/${id}?tab=${tab}`

  const openBusinessCardInput = (contactIndex: number) => {
    pendingOcrIndexRef.current = contactIndex
    businessCardInputRef.current?.click()
  }

  const handleAttachmentChange = async (files: FileList | null | undefined) => {
    const selectedFiles = Array.from(files ?? [])
    if (selectedFiles.length === 0) return

    try {
      const nextAttachments = await Promise.all(selectedFiles.map((file) => readFileAsStoredAttachment(file)))
      setAttachments((prev) => [...prev, ...nextAttachments])
    } catch (error) {
      toast({
        title: "첨부파일 등록 실패",
        description: error instanceof Error ? error.message : "첨부파일을 다시 확인해주십시오.",
      })
    }
  }

  const handleRfpFileChange = async (files: FileList | null | undefined) => {
    const selectedFiles = Array.from(files ?? [])
    if (selectedFiles.length === 0) return

    try {
      selectedFiles.forEach(assertRfpDocumentFile)
      const nextAttachments = await Promise.all(
        selectedFiles.map(async (file) => createRfpAttachment(file, await readFileAsDataUrl(file))),
      )
      setRfpAttachments((prev) => [...prev, ...nextAttachments])
      if (rfpInputRef.current) rfpInputRef.current.value = ""
    } catch (error) {
      toast({
        title: "첨부파일 등록 실패",
        description: error instanceof Error ? error.message : "첨부파일을 다시 확인해주십시오.",
      })
    }
  }

  const handleGenerateRfpSummary = async (attachment: RfpAttachmentDraft) => {
    if (!attachment.file) {
      toast({
        title: "RFP 문서 확인",
        description: "기존 문서는 브라우저에 원본 파일이 없어 다시 첨부한 뒤 요약할 수 있습니다.",
      })
      return
    }

    setRfpSummaryLoadingId(attachment.id)
    try {
      const result = await summarizeRfpDocument(attachment.file)
      setRfpAttachments((prev) => prev.map((item) => (item.id === attachment.id ? { ...item, summary: result.summary } : item)))
      toast({
        title: "RFP AI 요약 생성 완료",
        description: `${attachment.name} 문서를 요약했습니다.`,
      })
    } catch (error) {
      toast({
        title: "RFP AI 요약 생성 실패",
        description: error instanceof Error ? error.message : "잠시 후 다시 시도하세요.",
      })
    } finally {
      setRfpSummaryLoadingId(null)
    }
  }

  const handleDeleteRfpAttachment = (attachmentId: string) => {
    setRfpAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId))
  }

  const handleBusinessCardFileChange = async (file: File | undefined) => {
    if (!file) return

    const targetIndex = pendingOcrIndexRef.current
    if (targetIndex === null || targetIndex < 0 || targetIndex >= contacts.length) return

    try {
      assertBusinessCardImageSize(file)
    } catch (error) {
      toast({
        title: "명함 OCR 실패",
        description: error instanceof Error ? error.message : `명함 이미지는 ${BUSINESS_CARD_IMAGE_MAX_SIZE_LABEL} 이하만 업로드할 수 있습니다.`,
      })
      pendingOcrIndexRef.current = null
      return
    }

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
        description: error instanceof Error ? error.message : "이미지를 다시 확인해 주세요.",
      })
    } finally {
      setOcrLoadingIndex(null)
      pendingOcrIndexRef.current = null
    }
  }

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
        attachments,
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
        partners: partnerNames,
        expectedDate,
        expectedAmount,
        product: businessType,
        module: moduleName,
        issue,
        competition,
        decisionInfo: buildDecisionInfoFromCustomer(selectedCustomer, decisionInfo),
        status,
        salesRep,
        rfpAttachments: rfpAttachments.map(({ file, ...attachment }) => attachment),
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
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button type="button" variant="outline" size="sm">
                                    담당자 삭제
                                  </Button>
                                </AlertDialogTrigger>
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
                                    <AlertDialogAction onClick={() => setContacts((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}>
                                      삭제
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
                    <Input
                      type="file"
                      multiple
                      onChange={(event) => {
                        void handleAttachmentChange(event.target.files)
                        event.target.value = ""
                      }}
                    />
                    {attachments.length > 0 ? (
                      <div className="space-y-2 rounded-md border border-border p-3">
                        {attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center justify-between gap-3 text-sm">
                            <a href={attachment.dataUrl} download={attachment.name} className="truncate text-primary hover:underline">
                              {attachment.name}
                            </a>
                            <Button type="button" variant="outline" size="sm" onClick={() => setAttachments((prev) => prev.filter((item) => item.id !== attachment.id))}>
                              삭제
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Input readOnly value="등록된 첨부파일이 없습니다." />
                    )}
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
                      <div className="space-y-2">
                        {partnerNames.map((partnerName, index) => (
                          <div key={`edit-opportunity-partner-${index}`} className="flex items-center gap-2">
                            <Input
                              value={partnerName}
                              onChange={(event) =>
                                setPartnerNames((prev) => prev.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                              }
                              placeholder={index === 0 ? "협력사명을 입력하세요" : `협력사명 ${index + 1}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={partnerNames.length === 1}
                              onClick={() => setPartnerNames((prev) => (prev.length > 1 ? prev.filter((_, itemIndex) => itemIndex !== index) : prev))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => setPartnerNames((prev) => [...prev, ""])}>
                          <Plus className="mr-2 h-4 w-4" />
                          협력사 추가
                        </Button>
                      </div>
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
                            {getCustomerDecisionContacts(selectedCustomer).length > 0 ? (
                              getCustomerDecisionContacts(selectedCustomer).map((contact, index) => (
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
                  <Input
                    type="file"
                    accept={RFP_DOCUMENT_ACCEPT}
                    multiple
                    disabled={rfpSummaryLoadingId !== null}
                    onChange={(event) => {
                      void handleRfpFileChange(event.target.files)
                      event.target.value = ""
                    }}
                  />
                  {rfpAttachments.length > 0 ? (
                    <div className="space-y-2 rounded-md border border-border p-3">
                      {rfpAttachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between gap-3 text-sm">
                          <div className="min-w-0 flex-1">
                            <a href={attachment.dataUrl} download={attachment.name} className="truncate text-primary hover:underline">
                              {attachment.name}
                            </a>
                            <p className="text-xs text-muted-foreground">{formatAttachmentSize(attachment.size)}</p>
                            {attachment.summary ? (
                              <div className="mt-3 rounded-md border border-border p-4">
                                <h3 className="mb-3 text-sm font-semibold">&lt;{formatRfpSummaryTitle(attachment.name)}&gt; 요약</h3>
                                <RfpSummaryMarkdown markdown={attachment.summary} />
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              disabled={rfpSummaryLoadingId !== null}
                              onClick={() => {
                                void handleGenerateRfpSummary(attachment)
                              }}
                            >
                              {rfpSummaryLoadingId === attachment.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                              AI 요약
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteRfpAttachment(attachment.id)}>
                              삭제
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Input readOnly value="등록된 첨부파일이 없습니다." />
                  )}
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
