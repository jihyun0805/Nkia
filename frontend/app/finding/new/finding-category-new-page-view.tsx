"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { CustomerAutocomplete } from "@/components/erp/entity-customer-autocomplete"
import { EntityAutocomplete } from "@/components/erp/entity-autocomplete"
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
import { RFP_DOCUMENT_ACCEPT, assertRfpDocumentFile, summarizeRfpDocument } from "@/lib/rfp-summary-api"
import { RfpSummaryMarkdown } from "@/components/erp/rfp-summary-markdown"
import { type StoredFileAttachment } from "@/lib/attachments"
import { findingStatuses, type CustomerContact, type CustomerRecord, type OpportunityAttachment, type PartnerRecord } from "@/lib/finding-data"
import { validateManagerContacts } from "@/lib/finding-contact-validation"
import {
  buildCompanyCode,
  buildFallbackManagerEmail,
  createBackendCompany,
  createBackendCompanyManager,
  createBackendProjectOpportunity,
  deleteBackendCompany,
  loadBackendFindingData,
  mapCustomerSector,
  mapPartnerCategory,
  resolveSalesRepresentativeId,
} from "@/lib/finding-backend"
import { toast } from "@/hooks/use-toast"
import { FileText, Loader2, Plus, ScanLine, Sparkles, Trash2, X } from "lucide-react"

const customerGroupOptions = ["공공", "민간", "해외"]
const partnerTypeOptions = ["SI", "솔루션", "기타"]
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

function hasContactValue(contact: ContactDraft) {
  return [contact.name, contact.position, contact.department, contact.email, contact.mobilePhone, contact.landlinePhone, contact.duty, contact.memo].some(
    (value) => value.trim(),
  )
}

function formatRfpSummaryTitle(fileName: string) {
  const title = fileName.replace(/\.[^.]+$/, "").trim()
  return title || "RFP 臾몄꽌"
}

function keepExistingValue(currentValue: string | undefined, nextValue: string | null | undefined) {
  const trimmedNext = String(nextValue ?? "").trim()
  if (trimmedNext) return trimmedNext
  return currentValue ?? ""
}

function getFindingCategoryLabel(category: "opportunities" | "customers" | "partners") {
  if (category === "opportunities") return "사업기회"
  if (category === "customers") return "고객사"
  return "협력사"
}

function parseExpectedBudget(value?: string) {
  const normalized = String(value ?? "").trim()
  if (!normalized) return undefined

  const compact = normalized.replace(/[,\s원]/g, "")
  const match = compact.match(/^(\d+(?:\.\d+)?)(억|만)?$/)
  if (match) {
    const amount = Number.parseFloat(match[1])
    if (Number.isNaN(amount)) return undefined
    if (match[2] === "억") return Math.round(amount * 100000000)
    if (match[2] === "만") return Math.round(amount * 10000)
    return amount
  }

  const numeric = Number.parseFloat(compact)
  return Number.isNaN(numeric) ? undefined : numeric
}

function createAutoBusinessRegistrationNumber(prefix: "CUS" | "PTN", code: string) {
  return `${prefix}-${code.trim()}`
}

function buildOpportunityDescription(params: {
  moduleName: string
  issue: string
  competition: string
  decisionInfo: string
}) {
  return [params.moduleName, params.issue, params.competition, params.decisionInfo]
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n\n")
}

function mapOpportunityProductClass(value: string) {
  const normalized = value.trim().toUpperCase()
  if (normalized === "EMS" || normalized === "ITSM") return normalized
  return "ETC"
}

function createCompanyManagerPayload(params: {
  companyCode: string
  contact: ContactDraft
  index: number
}) {
  return {
    name: params.contact.name.trim(),
    email: params.contact.email.trim() || buildFallbackManagerEmail(params.companyCode, params.contact.name, params.index),
    mobilePhone: params.contact.mobilePhone.trim() || undefined,
    officePhone: params.contact.landlinePhone.trim() || undefined,
    department: params.contact.department.trim() || undefined,
    position: params.contact.position.trim() || undefined,
    role: params.contact.duty.trim() || undefined,
  }
}

function validateCompanyManagers(contacts: ContactDraft[]) {
  for (let index = 0; index < contacts.length; index += 1) {
    const contact = contacts[index]
    const email = contact.email.trim()
    const mobilePhone = contact.mobilePhone.trim()

    if (!contact.name.trim()) return `${index + 1}踰덉㎏ ?대떦?먮챸???낅젰?댁＜?몄슂.`
    if (!mobilePhone) return `${index + 1}踰덉㎏ ?대떦???대??꾪솕瑜??낅젰?댁＜?몄슂.`
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return `${index + 1}踰덉㎏ ?대떦???대찓???뺤떇???щ컮瑜댁? ?딆뒿?덈떎.`
    }
  }

  return null
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

function buildDecisionInfoFromCustomer(customer: CustomerRecord | null) {
  const contacts = getCustomerDecisionContacts(customer)
  if (contacts.length === 0) return "-"

  return contacts
    .map((contact, index) =>
      [
        `${index + 1}?쒖쐞`,
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

export function FindingCategoryNewPageView({
  category,
}: {
  category: "opportunities" | "customers" | "partners"
}) {
  const router = useRouter()
  const label = getFindingCategoryLabel(category)
  const [backendCustomers, setBackendCustomers] = useState<CustomerRecord[]>([])
  const [backendPartners, setBackendPartners] = useState<PartnerRecord[]>([])
  const [loadingBackend, setLoadingBackend] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [customerGroup, setCustomerGroup] = useState("誘쇨컙")
  const [partnerName, setPartnerName] = useState("")
  const [partnerType, setPartnerType] = useState("SI")
  const [address, setAddress] = useState("")
  const [memo, setMemo] = useState("")
  const [contacts, setContacts] = useState<ContactDraft[]>([createEmptyContactDraft()])
  const [selectedOpportunityCustomer, setSelectedOpportunityCustomer] = useState<CustomerRecord | null>(null)
  const [opportunityCustomerName, setOpportunityCustomerName] = useState("")
  const [opportunityName, setOpportunityName] = useState("")
  const [opportunityPartnerNames, setOpportunityPartnerNames] = useState<string[]>([""])
  const [expectedDate, setExpectedDate] = useState("")
  const [expectedAmount, setExpectedAmount] = useState("")
  const [opportunityCustomerGroup, setOpportunityCustomerGroup] = useState("誘쇨컙")
  const [opportunityRegistrant, setOpportunityRegistrant] = useState("")
  const [opportunitySalesRep, setOpportunitySalesRep] = useState("")
  const [businessType, setBusinessType] = useState("")
  const [moduleName, setModuleName] = useState("")
  const [issue, setIssue] = useState("")
  const [competition, setCompetition] = useState("")
  const [opportunityStatus, setOpportunityStatus] = useState("諛쒓뎬")
  const [customerRegistrationGuideOpen, setCustomerRegistrationGuideOpen] = useState(false)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const [ocrLoadingIndex, setOcrLoadingIndex] = useState<number | null>(null)
  const [rfpAttachments, setRfpAttachments] = useState<RfpAttachmentDraft[]>([])
  const [rfpSummaryLoadingId, setRfpSummaryLoadingId] = useState<string | null>(null)
  const businessCardInputRef = useRef<HTMLInputElement | null>(null)
  const rfpInputRef = useRef<HTMLInputElement | null>(null)
  const pendingOcrIndexRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const sync = async () => {
      setLoadingBackend(true)
      try {
        const data = await loadBackendFindingData()
        if (cancelled) return
        setBackendCustomers(data.customers)
        setBackendPartners(data.partners)
      } catch {
        if (!cancelled) {
          setBackendCustomers([])
          setBackendPartners([])
        }
      } finally {
        if (!cancelled) {
          setLoadingBackend(false)
        }
      }
    }

    void sync()
    return () => {
      cancelled = true
    }
  }, [])

  const openBusinessCardInput = (contactIndex: number) => {
    pendingOcrIndexRef.current = contactIndex
    businessCardInputRef.current?.click()
  }

  const handleBusinessCardFileChange = async (file: File | undefined) => {
    if (!file) return

    const targetIndex = pendingOcrIndexRef.current
    if (targetIndex === null || targetIndex < 0 || targetIndex >= contacts.length) return

    try {
      assertBusinessCardImageSize(file)
    } catch (error) {
      toast({
        title: "紐낇븿 OCR ?ㅽ뙣",
        description: error instanceof Error ? error.message : `紐낇븿 ?대?吏??${BUSINESS_CARD_IMAGE_MAX_SIZE_LABEL} ?댄븯留??낅줈?쒗븷 ???덉뒿?덈떎.`,
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
        fax: "",
        duty: keepExistingValue(currentContact.duty, result.role),
        businessCardImage,
      }

      if (!hasContactValue(nextContact)) {
        toast({
          title: "紐낇븿 OCR 寃곌낵 ?놁쓬",
          description: "?대떦???뺣낫濡??낅젰??媛믪쓣 李얠? 紐삵뻽?듬땲??",
        })
        return
      }

      setContacts((prev) => prev.map((contact, index) => (index === targetIndex ? nextContact : contact)))
      toast({
        title: "紐낇븿 OCR ?꾨즺",
        description: `${nextContact.name || "담당자"} 정보를 해당 담당자 칸에 채웠습니다.`,
      })
    } catch (error) {
      toast({
        title: "紐낇븿 OCR ?ㅽ뙣",
        description: error instanceof Error ? error.message : "?대?吏瑜??ㅼ떆 ?뺤씤?댁＜??떆??",
      })
    } finally {
      setOcrLoadingIndex(null)
      pendingOcrIndexRef.current = null
    }
  }

  const handleRfpFileChange = async (files: FileList | null | undefined) => {
    const selectedFiles = Array.from(files ?? [])
    if (selectedFiles.length === 0) {
      return
    }

    try {
      selectedFiles.forEach(assertRfpDocumentFile)
      const attachments = await Promise.all(
        selectedFiles.map(async (file) => createRfpAttachment(file, await readFileAsDataUrl(file))),
      )
      setRfpAttachments((prev) => [...prev, ...attachments])
      if (rfpInputRef.current) rfpInputRef.current.value = ""
    } catch (error) {
      toast({
        title: "RFP \ubb38\uc11c \ud655\uc778",
        description: error instanceof Error ? error.message : "\uc9c0\uc6d0\ud558\uc9c0 \uc54a\ub294 RFP \ubb38\uc11c \ud615\uc2dd\uc785\ub2c8\ub2e4.",
      })
    }
  }

  const handleGenerateRfpSummary = async (attachment: RfpAttachmentDraft) => {
    if (!attachment.file) {
      toast({
        title: "RFP \ubb38\uc11c \ud655\uc778",
        description: "\uc694\uc57d\ud560 RFP \ubb38\uc11c\ub97c \ub2e4\uc2dc \uc120\ud0dd\ud558\uc138\uc694.",
      })
      return
    }

    setRfpSummaryLoadingId(attachment.id)
    try {
      const result = await summarizeRfpDocument(attachment.file)
      setRfpAttachments((prev) => prev.map((item) => (item.id === attachment.id ? { ...item, summary: result.summary } : item)))
      toast({
        title: "RFP AI \uc694\uc57d \uc0dd\uc131 \uc644\ub8cc",
        description: `${attachment.name} \ubb38\uc11c\ub97c \uc694\uc57d\ud588\uc2b5\ub2c8\ub2e4.`,
      })
    } catch (error) {
      toast({
        title: "RFP AI \uc694\uc57d \uc0dd\uc131 \uc2e4\ud328",
        description: error instanceof Error ? error.message : "\uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
      })
    } finally {
      setRfpSummaryLoadingId(null)
    }
  }

  const handleDeleteRfpAttachment = (attachmentId: string) => {
    setRfpAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId))
  }

  const handleSubmit = () => {
    const normalizedName = customerName.trim()
    const filledContacts = contacts.filter(hasContactValue)
    const primaryContact = filledContacts[0]

    if (!normalizedName || !primaryContact?.name.trim() || !primaryContact?.mobilePhone.trim()) {
      toast({
        title: "怨좉컼???깅줉 ?뺤씤",
        description: "怨좉컼?щ챸, ?대떦??1???깅챸, 臾댁꽑?꾪솕踰덊샇瑜?紐⑤몢 ?낅젰?댁＜??떆??",
      })
      return
    }

    const contactValidationMessage = validateManagerContacts(filledContacts)
    if (contactValidationMessage) {
      toast({
        title: "?대떦???낅젰 ?뺤씤",
        description: contactValidationMessage,
      })
      return
    }

    const duplicate = backendCustomers.find((item) => item.name.trim().toLowerCase() === normalizedName.toLowerCase()) ?? null
    if (duplicate) {
      setDuplicateOpen(true)
      return
    }

    setSubmitting(true)
    void (async () => {
      let createdCompanyId: number | null = null
      try {
        const code = buildCompanyCode("CUS")
        const companyId = await createBackendCompany({
          companyType: "CUSTOMER",
          code,
          name: normalizedName,
          businessRegistrationNumber: createAutoBusinessRegistrationNumber("CUS", code),
          sector: mapCustomerSector(customerGroup),
          address,
        })
        createdCompanyId = companyId

        for (let index = 0; index < filledContacts.length; index += 1) {
          await createBackendCompanyManager(
            companyId,
            createCompanyManagerPayload({
              companyCode: code,
              contact: filledContacts[index],
              index,
            }),
          )
        }

        toast({
          title: "怨좉컼???깅줉 ?꾨즺",
          description: `${normalizedName} 怨좉컼?ш? ?깅줉?섏뿀?듬땲??`,
        })
        router.push(`/finding/customers/${code}?tab=customers`)
      } catch (error) {
        if (createdCompanyId != null) {
          try {
            await deleteBackendCompany(createdCompanyId)
          } catch {
            // Keep the original registration error visible to the user.
          }
        }
        toast({
          title: "怨좉컼???깅줉 ?ㅽ뙣",
          description: error instanceof Error ? error.message : "?깅줉???ㅽ뙣?덉뒿?덈떎.",
        })
      } finally {
        setSubmitting(false)
      }
    })()
  }

  const handlePartnerSubmit = () => {
    const normalizedName = partnerName.trim()
    const filledContacts = contacts.filter(hasContactValue)
    const primaryContact = filledContacts[0]

    if (!normalizedName || !partnerType || !primaryContact?.name.trim() || !primaryContact?.mobilePhone.trim()) {
      toast({
        title: "?묐젰???깅줉 ?뺤씤",
        description: "?묐젰?щ챸, ?좏삎, ?대떦??1???깅챸, 臾댁꽑?꾪솕踰덊샇瑜?紐⑤몢 ?낅젰?댁＜??떆??",
      })
      return
    }

    const contactValidationMessage = validateManagerContacts(filledContacts)
    if (contactValidationMessage) {
      toast({
        title: "?대떦???낅젰 ?뺤씤",
        description: contactValidationMessage,
      })
      return
    }

    const duplicate = backendPartners.find((item) => item.name.trim().toLowerCase() === normalizedName.toLowerCase()) ?? null
    if (duplicate) {
      toast({
        title: "?묐젰???깅줉 ?뺤씤",
        description: "媛숈? ?대쫫???묐젰?ш? ?대? ?깅줉?섏뼱 ?덉뒿?덈떎.",
      })
      return
    }

    setSubmitting(true)
    void (async () => {
      let createdCompanyId: number | null = null
      try {
        const code = buildCompanyCode("PTN")
        const companyId = await createBackendCompany({
          companyType: "PARTNER",
          code,
          name: normalizedName,
          businessRegistrationNumber: createAutoBusinessRegistrationNumber("PTN", code),
          category: mapPartnerCategory(partnerType),
          address,
        })
        createdCompanyId = companyId

        for (let index = 0; index < filledContacts.length; index += 1) {
          await createBackendCompanyManager(
            companyId,
            createCompanyManagerPayload({
              companyCode: code,
              contact: filledContacts[index],
              index,
            }),
          )
        }

        toast({
          title: "?묐젰???깅줉 ?꾨즺",
          description: `${normalizedName} ?묐젰?ш? ?깅줉?섏뿀?듬땲??`,
        })
        router.push("/finding?tab=partners")
      } catch (error) {
        if (createdCompanyId != null) {
          try {
            await deleteBackendCompany(createdCompanyId)
          } catch {
            // Keep the original registration error visible to the user.
          }
        }
        toast({
          title: "?묐젰???깅줉 ?ㅽ뙣",
          description: error instanceof Error ? error.message : "?깅줉???ㅽ뙣?덉뒿?덈떎.",
        })
      } finally {
        setSubmitting(false)
      }
    })()
  }

  if (category === "partners") {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title={`${label} ?깅줉`} description="?묐젰??湲곕낯?뺣낫? ?대떦???뺣낫瑜??깅줉?⑸땲?? />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-5xl space-y-6">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/finding?tab=partners">諛쒓뎬</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{label} ?깅줉</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <Card>
                <CardHeader>
                  <CardTitle>{label} ?깅줉</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <section className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>?묐젰?щ챸 *</Label>
                        <EntityAutocomplete
                          value={partnerName}
                          target="partners"
                          onValueChange={setPartnerName}
                          onSelect={(suggestion) => {
                            if (suggestion) setPartnerName(suggestion.label)
                          }}
                          allowCustomValue
                          placeholder="?묐젰?щ챸???낅젰?섏꽭??
                          emptyMessage="?깅줉???묐젰?ш? ?놁뒿?덈떎."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>?좏삎 *</Label>
                        <Select value={partnerType} onValueChange={setPartnerType}>
                          <SelectTrigger>
                            <SelectValue placeholder="?좏깮?섏꽭?? />
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
                        <Label>二쇱냼</Label>
                        <Input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="二쇱냼瑜??낅젰?섏꽭?? />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>硫붾え</Label>
                        <Textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={4} placeholder="硫붾え瑜??낅젰?섏꽭?? />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-semibold">?묐젰???대떦???뺣낫</h2>
                        <p className="text-xs text-muted-foreground">紐낇븿 ?대?吏??{BUSINESS_CARD_IMAGE_MAX_SIZE_LABEL} ?댄븯留??낅줈?쒗븷 ???덉뒿?덈떎.</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setContacts((prev) => [...prev, createEmptyContactDraft()])}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        ?대떦??異붽?
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
                            <h3 className="text-sm font-semibold">{`?대떦??${index + 1}`}</h3>
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" variant="outline" size="sm" disabled={ocrLoadingIndex !== null} onClick={() => openBusinessCardInput(index)}>
                                {ocrLoadingIndex === index ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                                紐낇븿 ?깅줉
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button type="button" variant="outline" size="sm">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    ?대떦????젣
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogCancel className="absolute top-4 right-4 h-9 w-9 p-0">
                                    <X className="h-4 w-4" />
                                  </AlertDialogCancel>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>?대떦????젣</AlertDialogTitle>
                                    <AlertDialogDescription>?대떦???뺣낫 ?꾩껜瑜???젣?⑸땲?? 吏꾪뻾?섏떆寃좎뒿?덇퉴?</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>痍⑥냼</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => setContacts((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}>
                                      ??젣
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
                                <X className="mr-2 h-4 w-4" />
                                誘몃━蹂닿린 ?쒓굅
                              </Button>
                            </div>
                          ) : null}
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label>?대떦?먮챸</Label>
                              <Input
                                value={contact.name}
                                onChange={(event) =>
                                  setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item)))
                                }
                                placeholder="?대떦???대쫫???낅젰?섏꽭??"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>吏곴툒/吏곸콉</Label>
                              <Input
                                value={contact.position}
                                onChange={(event) =>
                                  setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, position: event.target.value } : item)))
                                }
                                placeholder="吏곴툒/吏곸콉???낅젰?섏꽭??"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>?뚯냽遺??/Label>
                              <Input
                                value={contact.department}
                                onChange={(event) =>
                                  setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, department: event.target.value } : item)))
                                }
                                placeholder="?뚯냽遺?쒕챸???낅젰?섏꽭??"
                              />
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label>?대찓??/Label>
                              <Input
                                type="email"
                                inputMode="email"
                                autoComplete="email"
                                value={contact.email}
                                onChange={(event) =>
                                  setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, email: event.target.value } : item)))
                                }
                                placeholder="0000@000.co.kr"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>臾댁꽑?꾪솕踰덊샇</Label>
                              <Input
                                inputMode="tel"
                                autoComplete="tel"
                                value={contact.mobilePhone}
                                onChange={(event) =>
                                  setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, mobilePhone: event.target.value } : item)))
                                }
                                placeholder="000-000-0000"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>?좎꽑?꾪솕踰덊샇</Label>
                              <Input
                                inputMode="tel"
                                autoComplete="tel"
                                value={contact.landlinePhone}
                                onChange={(event) =>
                                  setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, landlinePhone: event.target.value } : item)))
                                }
                                placeholder="02-0000-0000"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>?대떦 吏곷Т</Label>
                            <Input
                              value={contact.duty}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, duty: event.target.value } : item)))
                              }
                              placeholder="?대떦 吏곷Т瑜??낅젰?섏꽭??"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>鍮꾧퀬</Label>
                            <Textarea
                              value={contact.memo}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, memo: event.target.value } : item)))
                              }
                              rows={3}
                              placeholder="?대떦??愿???밴린?ы빆???낅젰?섏꽭??"
                            />
                          </div>
                        </section>
                      ))}
                    </div>
                  </section>

                  <div className="flex justify-end gap-2 border-t pt-6">
                    <Button variant="outline" asChild disabled={submitting}>
                      <Link href="/finding?tab=partners">痍⑥냼</Link>
                    </Button>
                    <Button onClick={handlePartnerSubmit} disabled={submitting || loadingBackend}>
                      {submitting ? "?깅줉 以?.." : "?깅줉"}
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

  if (category !== "customers") {
    const backHref = `/finding?tab=${category}`
    const pageDescription = "?좉퇋 ?ъ뾽湲고쉶 ?깅줉?뺣낫瑜??낅젰?⑸땲??

    const handleOpportunitySubmit = () => {
      const resolvedCustomer = selectedOpportunityCustomer
        ? backendCustomers.find((item) => item.id === selectedOpportunityCustomer.id || item.name === selectedOpportunityCustomer.name) ?? selectedOpportunityCustomer
        : null

      if (!resolvedCustomer) {
        setCustomerRegistrationGuideOpen(true)
        return
      }

      if (!opportunityName.trim() || !businessType) {
        toast({
          title: "?ъ뾽湲고쉶 ?깅줉 ?뺤씤",
          description: "?ъ뾽紐낃낵 ?ъ뾽 援щ텇???낅젰?댁＜??떆??",
        })
        return
      }

      void (async () => {
        try {
          const salesRepresentativeId = await resolveSalesRepresentativeId(opportunitySalesRep)
          if (!salesRepresentativeId) {
            toast({
              title: "?ъ뾽湲고쉶 ?깅줉 ?뺤씤",
              description: "?곸뾽??쒕? ?ъ슜??紐⑸줉?먯꽌 李얠? 紐삵뻽?듬땲??",
            })
            return
          }

          const customerCompanyId = resolvedCustomer.backendId
          if (!customerCompanyId) {
            toast({
              title: "?ъ뾽湲고쉶 ?깅줉 ?뺤씤",
              description: "?좏깮??怨좉컼?ъ쓽 諛깆뿏???앸퀎?먮? 李얠? 紐삵뻽?듬땲??",
            })
            return
          }
          const customerRouteId = resolvedCustomer.id

          const result = await createBackendProjectOpportunity({
            opportunityName: opportunityName.trim(),
            customerCompanyId,
            salesRepresentativeId,
            projectType: businessType,
            expectedBidDate: expectedDate || undefined,
            expectedBudget: expectedAmount || undefined,
            description: buildOpportunityDescription({
              moduleName,
              issue,
              competition,
              decisionInfo: buildDecisionInfoFromCustomer(resolvedCustomer),
            }),
            competitionStatus: competition,
          })

          toast({
            title: "?ъ뾽湲고쉶 ?깅줉 ?꾨즺",
            description: `${result.opportunityName ?? opportunityName} ?ъ뾽湲고쉶媛 ?깅줉?섏뿀?듬땲??`,
          })
          router.push(`/finding/opportunities/${result.opportunityCode ?? customerRouteId}?tab=opportunities`)
        } catch (error) {
          toast({
            title: "?ъ뾽湲고쉶 ?깅줉 ?ㅽ뙣",
            description: error instanceof Error ? error.message : "?깅줉???ㅽ뙣?덉뒿?덈떎.",
          })
        }
      })()
    }

    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title={`${label} ?깅줉`} description={pageDescription} />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-5xl space-y-6">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href={backHref}>諛쒓뎬</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{label} ?깅줉</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <Card>
                <CardHeader>
                  <CardTitle>{label} ?깅줉</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <section className="space-y-4">
                    <h2 className="text-base font-semibold">?깅줉?뺣낫</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>怨좉컼?щ챸 *</Label>
                        <CustomerAutocomplete
                          value={opportunityCustomerName}
                          onSelect={(customer) => {
                            const resolvedCustomer = backendCustomers.find((item) => item.id === customer?.id || item.name === customer?.name) ?? customer
                            setSelectedOpportunityCustomer(resolvedCustomer ?? null)
                            setOpportunityCustomerName(resolvedCustomer?.name ?? "")
                            setOpportunityCustomerGroup(resolvedCustomer?.category ?? "誘쇨컙")
                          }}
                          onValueChange={setOpportunityCustomerName}
                          onUnregisteredAttempt={() => setCustomerRegistrationGuideOpen(true)}
                          placeholder="怨좉컼?щ챸 ?쇰?瑜??낅젰??湲곗〈 怨좉컼?щ? ?좏깮?섏꽭??
                        />
                        {selectedOpportunityCustomer ? (
                          <p className="text-xs text-muted-foreground">怨좉컼??肄붾뱶: {selectedOpportunityCustomer.id}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">?먮룞?꾩꽦 紐⑸줉?먯꽌 ?좏깮?섎㈃ 怨좉컼??肄붾뱶媛 ?④퍡 ?곌껐?⑸땲??</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>?묐젰?щ챸</Label>
                        <div className="space-y-2">
                          {opportunityPartnerNames.map((partnerName, index) => (
                            <div key={`opportunity-partner-${index}`} className="flex items-center gap-2">
                              <EntityAutocomplete
                                value={partnerName}
                                target="partners"
                                onValueChange={(value) =>
                                  setOpportunityPartnerNames((prev) => prev.map((item, itemIndex) => (itemIndex === index ? value : item)))
                                }
                                onSelect={(suggestion) => {
                                  if (!suggestion) return
                                  setOpportunityPartnerNames((prev) => prev.map((item, itemIndex) => (itemIndex === index ? suggestion.label : item)))
                                }}
                                allowCustomValue
                                placeholder={index === 0 ? "?묐젰?щ챸???낅젰?섏꽭?? : `?묐젰?щ챸 ${index + 1}`}
                                emptyMessage="?깅줉???묐젰?ш? ?놁뒿?덈떎."
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={opportunityPartnerNames.length === 1}
                                onClick={() => setOpportunityPartnerNames((prev) => (prev.length > 1 ? prev.filter((_, itemIndex) => itemIndex !== index) : prev))}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <Button type="button" variant="outline" size="sm" onClick={() => setOpportunityPartnerNames((prev) => [...prev, ""])}>
                            <Plus className="mr-2 h-4 w-4" />
                            ?묐젰??異붽?
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>?ъ뾽紐?*</Label>
                        <Input value={opportunityName} onChange={(event) => setOpportunityName(event.target.value)} placeholder="?ъ뾽紐낆쓣 ?낅젰?섏꽭?? />
                      </div>
                      <div className="space-y-2">
                        <Label>怨좉컼援?/Label>
                        <Select value={opportunityCustomerGroup} onValueChange={setOpportunityCustomerGroup}>
                          <SelectTrigger>
                            <SelectValue placeholder="?좏깮?섏꽭?? />
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
                        <Label>?깅줉??/Label>
                        <Input value={opportunityRegistrant} onChange={(event) => setOpportunityRegistrant(event.target.value)} placeholder="?깅줉?먮챸???낅젰?섏꽭?? />
                      </div>
                      <div className="space-y-2">
                        <Label>?곸뾽???/Label>
                        <Input value={opportunitySalesRep} onChange={(event) => setOpportunitySalesRep(event.target.value)} placeholder="?곸뾽??쒕챸???낅젰?섏꽭?? />
                      </div>
                      <div className="space-y-2">
                        <Label>?덉긽 ?낆같 ?먮뒗 怨꾩빟 ?쒖젏</Label>
                        <Input value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} placeholder="?? 2026??3遺꾧린" />
                      </div>
                      <div className="space-y-2">
                        <Label>?덉긽 ?덉궛 ?먮뒗 留ㅼ텧</Label>
                        <Input value={expectedAmount} onChange={(event) => setExpectedAmount(event.target.value)} placeholder="?? 8?? />
                      </div>
                      <div className="space-y-2">
                        <Label>?ъ뾽 援щ텇 *</Label>
                        <Select value={businessType} onValueChange={setBusinessType}>
                          <SelectTrigger>
                            <SelectValue placeholder="?좏깮?섏꽭?? />
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
                        <Label>?곹깭</Label>
                        <Select value={opportunityStatus} onValueChange={setOpportunityStatus}>
                          <SelectTrigger>
                            <SelectValue placeholder="?좏깮?섏꽭?? />
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
                        <Label>?⑺뭹 紐⑤뱢</Label>
                        <Input value={moduleName} onChange={(event) => setModuleName(event.target.value)} placeholder="?⑺뭹 紐⑤뱢???낅젰?섏꽭?? />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>二쇱슂 ?ъ뾽 ?댁슜 諛?二쇱슂 ?댁뒋 ?댁슜</Label>
                        <Textarea value={issue} onChange={(event) => setIssue(event.target.value)} rows={4} placeholder="二쇱슂 ?ъ뾽 ?댁슜 諛?二쇱슂 ?댁뒋 ?댁슜???낅젰?섏꽭?? />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>寃쎌웳 ?곹솴</Label>
                        <Textarea value={competition} onChange={(event) => setCompetition(event.target.value)} rows={4} placeholder="寃쎌웳 ?곹솴???낅젰?섏꽭?? />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>怨좉컼???대떦???뺣낫</Label>
                        <div className="overflow-hidden rounded-md border">
                          <table className="w-full border-collapse text-sm [&_td]:border [&_th]:border">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-3 py-2 text-center font-medium">?쒖쐞</th>
                                <th className="px-3 py-2 text-center font-medium">?깅챸</th>
                                <th className="px-3 py-2 text-center font-medium">吏곴툒</th>
                                <th className="px-3 py-2 text-center font-medium">遺?쒕챸</th>
                                <th className="px-3 py-2 text-center font-medium">?꾩옄?고렪</th>
                                <th className="px-3 py-2 text-center font-medium">?대룞?꾪솕</th>
                                <th className="px-3 py-2 text-center font-medium">?쇰컲?꾪솕</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getCustomerDecisionContacts(selectedOpportunityCustomer).length > 0 ? (
                                getCustomerDecisionContacts(selectedOpportunityCustomer).map((contact, index) => (
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
                                    ?좏깮??怨좉컼?ъ쓽 ?대떦???뺣낫媛 ?놁뒿?덈떎.
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
                    <Label>RFP 臾몄꽌</Label>
                    <div className="flex flex-col gap-2 md:flex-row">
                      <Input
                        ref={rfpInputRef}
                        className="hidden"
                        type="file"
                        accept={RFP_DOCUMENT_ACCEPT}
                        multiple
                        disabled={rfpSummaryLoadingId !== null}
                        onChange={(event) => {
                          void handleRfpFileChange(event.target.files)
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-fit"
                        disabled={rfpSummaryLoadingId !== null}
                        onClick={() => rfpInputRef.current?.click()}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        ?뚯씪 異붽?
                      </Button>
                    </div>
                    {rfpAttachments.length > 0 ? (
                      <div className="space-y-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                        {rfpAttachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate font-medium">{attachment.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{Math.ceil(attachment.size / 1024).toLocaleString()}KB</span>
                            <div className="ml-auto flex shrink-0 items-center gap-1">
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
                                AI ?붿빟
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                disabled={rfpSummaryLoadingId === attachment.id}
                                onClick={() => handleDeleteRfpAttachment(attachment.id)}
                                title="??젣"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {rfpAttachments.some((attachment) => attachment.summary) ? (
                      <div className="space-y-3">
                        {rfpAttachments.filter((attachment) => attachment.summary).map((attachment) => (
                          <div key={attachment.id} className="space-y-3 rounded-md border border-border p-4">
                            <h3 className="text-sm font-semibold">&lt;{formatRfpSummaryTitle(attachment.name)}&gt; ?붿빟</h3>
                            <RfpSummaryMarkdown markdown={attachment.summary} />
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <p className="text-xs text-muted-foreground">?ъ뾽湲고쉶? ?④퍡 寃?좏븷 RFP 臾몄꽌瑜?異붽??⑸땲??</p>
                  </section>

                  <div className="flex justify-end gap-2 border-t pt-6">
                    <Button variant="outline" asChild disabled={submitting}>
                      <Link href={backHref}>痍⑥냼</Link>
                    </Button>
                    <Button onClick={handleOpportunitySubmit} disabled={submitting || loadingBackend}>
                      {submitting ? "?깅줉 以?.." : "?깅줉"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>

        <AlertDialog open={customerRegistrationGuideOpen} onOpenChange={setCustomerRegistrationGuideOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>怨좉컼???깅줉 ?꾩슂</AlertDialogTitle>
              <AlertDialogDescription>
                ?깅줉??怨좉컼???뺣낫媛 ?놁뼱???곸뾽湲고쉶 ?깅줉???????놁뒿?덈떎. 癒쇱? 怨좉컼???깅줉 ???ъ뾽湲고쉶?깅줉??吏꾪뻾?댁＜??떆??
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>?リ린</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Link href="/finding/new/customers">怨좉컼???깅줉</Link>
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
        <Header title={`${label} ?깅줉`} description="怨좉컼?щ챸 ?먮룞?꾩꽦?쇰줈 湲곗〈 怨좉컼??癒쇱? 李얘퀬, ?좉퇋 怨좉컼???깅줉?⑸땲?? />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/finding?tab=customers">諛쒓뎬</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{label} ?깅줉</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader>
                <CardTitle>{label} ?깅줉</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <section className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>怨좉컼?щ챸 *</Label>
                      <CustomerAutocomplete
                        value={customerName}
                        onSelect={(customer) => setCustomerName(customer?.name ?? "")}
                        onValueChange={setCustomerName}
                        allowCustomValue
                        placeholder="怨좉컼?щ챸???낅젰?섏꽭??
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>怨좉컼援?*</Label>
                      <Select value={customerGroup} onValueChange={setCustomerGroup}>
                        <SelectTrigger>
                          <SelectValue placeholder="?좏깮?섏꽭?? />
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
                      <Label>二쇱냼</Label>
                      <Input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="二쇱냼瑜??낅젰?섏꽭?? />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>硫붾え</Label>
                      <Textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={4} placeholder="硫붾え瑜??낅젰?섏꽭?? />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold">怨좉컼???대떦???뺣낫</h2>
                      <p className="text-xs text-muted-foreground">紐낇븿 ?대?吏??{BUSINESS_CARD_IMAGE_MAX_SIZE_LABEL} ?댄븯留??낅줈?쒗븷 ???덉뒿?덈떎.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setContacts((prev) => [...prev, createEmptyContactDraft()])}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      ?대떦??異붽?
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
                          <h3 className="text-sm font-semibold">{`?대떦??${index + 1}`}</h3>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" disabled={ocrLoadingIndex !== null} onClick={() => openBusinessCardInput(index)}>
                              {ocrLoadingIndex === index ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                              紐낇븿 ?깅줉
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteIndex(index)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              ?대떦????젣
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
                              誘몃━蹂닿린 ?쒓굅
                            </Button>
                          </div>
                        ) : null}
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>?대떦?먮챸</Label>
                            <Input
                              value={contact.name}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item)))
                              }
                              placeholder="?대떦???대쫫???낅젰?섏꽭??"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>吏곴툒/吏곸콉</Label>
                            <Input
                              value={contact.position}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, position: event.target.value } : item)))
                              }
                              placeholder="吏곴툒/吏곸콉???낅젰?섏꽭??"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>?뚯냽遺??/Label>
                            <Input
                              value={contact.department}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, department: event.target.value } : item)))
                              }
                              placeholder="?뚯냽遺?쒕챸???낅젰?섏꽭??"
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>?대찓??/Label>
                            <Input
                              type="email"
                              inputMode="email"
                              autoComplete="email"
                              value={contact.email}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, email: event.target.value } : item)))
                              }
                              placeholder="0000@000.co.kr"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>臾댁꽑?꾪솕踰덊샇</Label>
                            <Input
                              inputMode="tel"
                              autoComplete="tel"
                              value={contact.mobilePhone}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, mobilePhone: event.target.value } : item)))
                              }
                              placeholder="000-000-0000"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>?좎꽑?꾪솕踰덊샇</Label>
                            <Input
                              inputMode="tel"
                              autoComplete="tel"
                              value={contact.landlinePhone}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, landlinePhone: event.target.value } : item)))
                              }
                              placeholder="02-0000-0000"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>?대떦 吏곷Т</Label>
                          <Input
                            value={contact.duty}
                            onChange={(event) =>
                              setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, duty: event.target.value } : item)))
                            }
                            placeholder="?대떦 吏곷Т瑜??낅젰?섏꽭??"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>鍮꾧퀬</Label>
                          <Textarea
                            value={contact.memo}
                            onChange={(event) =>
                              setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, memo: event.target.value } : item)))
                            }
                            rows={3}
                            placeholder="?대떦??愿???밴린?ы빆???낅젰?섏꽭??"
                          />
                        </div>
                      </section>
                    ))}
                  </div>
                </section>

                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild disabled={submitting}>
                    <Link href="/finding">痍⑥냼</Link>
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting || loadingBackend}>
                    {submitting ? "?깅줉 以?.." : "?깅줉"}
                  </Button>
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
            <AlertDialogTitle>怨좉컼??以묐났 ?깅줉</AlertDialogTitle>
            <AlertDialogDescription>?대? ?깅줉???숈씪???대쫫??怨좉컼?ш? ?덉뒿?덈떎.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDuplicateOpen(false)}>?뺤씤</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogCancel className="absolute top-4 right-4 h-9 w-9 p-0">
            <X className="h-4 w-4" />
          </AlertDialogCancel>
          <AlertDialogHeader>
            <AlertDialogTitle>?대떦????젣</AlertDialogTitle>
            <AlertDialogDescription>?대떦???뺣낫 ?꾩껜瑜???젣?⑸땲?? 吏꾪뻾?섏떆寃좎뒿?덇퉴?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>痍⑥냼</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteIndex === null) return
                setContacts((prev) => prev.filter((_, index) => index !== deleteIndex))
                setDeleteIndex(null)
              }}
            >
              ??젣
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
