"use client"

import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { CustomerAutocomplete } from "@/components/erp/entity-customer-autocomplete"
import { EntityAutocomplete } from "@/components/erp/entity-autocomplete"
import { ProductModuleMultiPicker } from "@/components/erp/product-module-multi-picker"
import { SimilarMatchHint, type SimilarMatchCandidate } from "@/components/erp/similar-match-hint"
import { UserIdPicker } from "@/components/erp/user-id-picker"
import { useBackendUsers } from "@/lib/use-backend-users"
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
import { RFP_DOCUMENT_ACCEPT, assertRfpDocumentFile, summarizeRfpDocument } from "@/lib/rfp-summary-api"
import { type CustomerContact, type CustomerRecord, type FindingCategory, type OpportunityAttachment, type OpportunityRecord, type PartnerRecord } from "@/lib/finding-data"
import { validateManagerContacts } from "@/lib/finding-contact-validation"
import {
  createBackendCompanyManager,
  deleteBackendCompanyManager,
  loadBackendCompanyManagers,
  loadBackendFindingData,
  loadBackendProjectOpportunity,
  loadBackendProductModules,
  mapPartnerCategory,
  resolveSalesRepresentativeId,
  stageLabel,
  updateBackendCompany,
  updateBackendCompanyManager,
  updateBackendProjectOpportunity,
  uploadBackendRfpFiles,
} from "@/lib/finding-backend"
import { currentUser, isSalesUser } from "@/lib/current-user"
import type { EntitySuggestion } from "@/lib/entity-suggestions-api"
import { useChatbotPrefill } from "@/lib/use-chatbot-prefill"
import { toast } from "@/hooks/use-toast"
import { FileText, Loader2, Plus, ScanLine, Sparkles, Trash2, X } from "lucide-react"

type OpportunityStage = "FINDING" | "PROMISING" | "PROGRESSING"
type BackendProductModuleSummary = {
  id?: number
  productName?: string
  productClass?: string
}
const opportunityStatusOptions: Array<{ value: OpportunityStage; label: string }> = [
  { value: "FINDING", label: "발굴" },
  { value: "PROMISING", label: "유망" },
  { value: "PROGRESSING", label: "진행중" },
]
const partnerTypeOptions = ["SI", "파트너", "기타"]

type ContactDraft = {
  name: string
  position: string
  department: string
  email: string
  mobilePhone: string
  landlinePhone: string
  duty: string
  memo: string
  businessCardImage: string
}

type RfpAttachmentDraft = OpportunityAttachment & {
  file?: File
  fileId?: number
}

function createEmptyContactDraft(): ContactDraft {
  return {
    name: "",
    position: "",
    department: "",
    email: "",
    mobilePhone: "",
    landlinePhone: "",
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
    duty: contact.duty ?? "",
    memo: contact.memo ?? "",
    businessCardImage: contact.businessCardImage ?? "",
  }))
}

function hasContactValue(contact: ContactDraft) {
  return [contact.name, contact.position, contact.department, contact.email, contact.mobilePhone, contact.landlinePhone, contact.duty, contact.memo].some(
    (value) => value.trim(),
  )
}

function keepExistingValue(currentValue: string | undefined, nextValue: string | null | undefined) {
  const trimmedNext = String(nextValue ?? "").trim()
  if (trimmedNext) return trimmedNext
  return currentValue ?? ""
}

function normalizeCompanyName(value: string) {
  return value.replace(/[\s\u00A0]+/g, "").trim().toLowerCase()
}

function mapOpportunityProductClass(value: string) {
  const normalized = value.trim().toUpperCase()
  if (
    normalized === "EMS" ||
    normalized === "DASHBOARD" ||
    normalized === "DATACENTER" ||
    normalized === "RCA" ||
    normalized === "DCA" ||
    normalized === "ITSM" ||
    normalized === "ITAM" ||
    normalized === "SUPPORTING_TOOLS" ||
    normalized === "CLOUD" ||
    normalized === "BSM" ||
    normalized === "E2E" ||
    normalized === "ETC"
  ) {
    return normalized
  }
  return "ETC"
}

function toOpportunityStage(value: string): OpportunityStage {
  const normalized = value.trim().toUpperCase()
  if (normalized === "FINDING" || value === "발굴") return "FINDING"
  if (normalized === "PROMISING" || value === "유망") return "PROMISING"
  if (normalized === "PROGRESSING" || value === "진행중") return "PROGRESSING"
  return "FINDING"
}

function normalizeLookupText(value?: string | number | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s\u00A0]+/g, "")
}

function splitMultipleValues(value: string) {
  return value
    .split(/[,/|+\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function resolvePartnerCompanyIds(partnerNames: string[], backendPartners: PartnerRecord[]) {
  const resolved = partnerNames.flatMap((partnerName) => {
    const normalizedName = normalizeLookupText(partnerName)
    if (!normalizedName) return []
    const matched = backendPartners.find((partner) => {
      const partnerId = normalizeLookupText(partner.backendId)
      return normalizeLookupText(partner.name) === normalizedName || partnerId === normalizedName
    })
    return matched?.backendId != null ? [matched.backendId] : []
  })

  return Array.from(new Set(resolved))
}

function resolveProductModuleIds(moduleNames: string[], productModules: { id?: number; productName?: string }[]) {
  const names = moduleNames.map((item) => item.trim()).filter(Boolean)
  if (names.length === 0) return []

  const resolved = names.flatMap((name) => {
    const normalizedName = normalizeLookupText(name)
    if (!normalizedName) return []
    const matched = productModules.find((module) => {
      const moduleId = normalizeLookupText(module.id)
      const productName = normalizeLookupText(module.productName)
      return productName === normalizedName || moduleId === normalizedName || productName.includes(normalizedName) || normalizedName.includes(productName)
    })
    return matched?.id != null ? [matched.id] : []
  })

  return Array.from(new Set(resolved))
}

async function resolveRfpFileIds(attachments: RfpAttachmentDraft[]) {
  const existingIds = attachments.map((attachment) => attachment.fileId).filter((value): value is number => typeof value === "number")
  const newFiles = attachments.map((attachment) => attachment.file).filter((file): file is File => Boolean(file))
  const uploadedIds = newFiles.length > 0 ? await uploadBackendRfpFiles(newFiles) : []
  return Array.from(new Set([...existingIds, ...uploadedIds]))
}

function parseExpectedBudget(value?: string) {
  const normalized = String(value ?? "").trim()
  if (!normalized) return undefined

  const compact = normalized.replace(/[,원\s]/g, "")
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

function buildOpportunityDescription(params: {
  moduleNames: string[]
  issue: string
  decisionInfo: string
}) {
  const normalizedModuleNames = params.moduleNames.map((value) => value.trim()).filter(Boolean)
  return JSON.stringify({
    moduleName: normalizedModuleNames.join(", "),
    moduleNames: normalizedModuleNames,
    issue: params.issue.trim(),
    decisionInfo: params.decisionInfo.trim(),
  })
}

function getFindingCategoryLabel(category: FindingCategory) {
  if (category === "opportunities") return "사업기회"
  if (category === "customers") return "고객사"
  return "협력사"
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
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [partners, setPartners] = useState<PartnerRecord[]>([])
  const [backendProductModules, setBackendProductModules] = useState<BackendProductModuleSummary[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [opportunityName, setOpportunityName] = useState("")
  const [registrant, setRegistrant] = useState(currentUser.name)
  const [partnerName, setPartnerName] = useState("")
  const [partnerNames, setPartnerNames] = useState<string[]>([""])
  const [expectedDate, setExpectedDate] = useState("")
  const [expectedAmount, setExpectedAmount] = useState("")
  const [salesRep, setSalesRep] = useState(isSalesUser(currentUser) ? currentUser.name : "")
  const [salesRepUserId, setSalesRepUserId] = useState<string | null>(null)
  const backendUsers = useBackendUsers()
  const [businessType, setBusinessType] = useState("")
  const [moduleNames, setModuleNames] = useState<string[]>([])
  const [issue, setIssue] = useState("")
  const [competition, setCompetition] = useState("")
  const [decisionInfo, setDecisionInfo] = useState("")
  const [status, setStatus] = useState<OpportunityStage>("FINDING")
  const [partnerType, setPartnerType] = useState("SI")
  const [address, setAddress] = useState("")
  const [memo, setMemo] = useState("")
  const [contacts, setContacts] = useState<ContactDraft[]>([createEmptyContactDraft()])
  const [rfpAttachments, setRfpAttachments] = useState<RfpAttachmentDraft[]>([])
  const [rfpSummaryLoadingId, setRfpSummaryLoadingId] = useState<string | null>(null)
  const [ocrLoadingIndex, setOcrLoadingIndex] = useState<number | null>(null)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const businessCardInputRef = useRef<HTMLInputElement | null>(null)
  const rfpInputRef = useRef<HTMLInputElement | null>(null)
  const pendingOcrIndexRef = useRef<number | null>(null)
  const businessTypeOptions = useMemo(
    () =>
      backendProductModules.reduce<string[]>((options, product) => {
        const productClass = product.productClass?.trim()
        if (!productClass || options.includes(productClass)) return options
        return [...options, productClass]
      }, []),
    [backendProductModules],
  )
  const partnerSimilarCandidates = useMemo<SimilarMatchCandidate[]>(
    () =>
      partners.map((partner) => ({
        id: partner.id,
        label: partner.name,
        subtitle: partner.type || undefined,
      })),
    [partners],
  )
  const partnerLocalSuggestions = useMemo<EntitySuggestion[]>(
    () =>
      partners.map((partner) => ({
        type: "PARTNER" as const,
        id: partner.id,
        code: partner.id,
        label: partner.name,
        subtitle: partner.type || null,
        score: 0,
        matchedBy: "fuzzy" as const,
        metadata: {},
      })),
    [partners],
  )

  // 챗봇 edit_field action 으로 페이지가 열렸을 때 query 의 chatbotPrefill_* 값을 폼에 반영
  const { values: chatbotPrefillValues, hasPrefill: hasChatbotPrefill, clear: clearChatbotPrefill } = useChatbotPrefill()
  const prefillAppliedRef = useRef(false)

  useEffect(() => {
    if (loading) return
    if (!hasChatbotPrefill) return
    if (prefillAppliedRef.current) return
    prefillAppliedRef.current = true
    const summary: string[] = []
    const v = chatbotPrefillValues
    if (v.sales_representative_name) {
      setSalesRep(v.sales_representative_name)
      summary.push(`영업대표 → ${v.sales_representative_name}`)
    }
    if (v.issue_content) {
      setIssue(v.issue_content)
      summary.push(`이슈 → ${v.issue_content}`)
    }
    if (v.main_content) {
      setMemo(v.main_content)
      summary.push(`주요 내용 → ${v.main_content}`)
    }
    if (v.competitor_status) {
      setCompetition(v.competitor_status)
      summary.push(`경쟁 상황 → ${v.competitor_status}`)
    }
    if (v.expected_amount) {
      setExpectedAmount(v.expected_amount)
      summary.push(`예상 사업비 → ${v.expected_amount}`)
    }
    if (v.business_type) {
      setBusinessType(v.business_type)
      summary.push(`사업유형 → ${v.business_type}`)
    }
    if (v.stage) {
      const stageValue = toOpportunityStage(v.stage)
      setStatus(stageValue)
      summary.push(`현재 단계 → ${stageValue}`)
    }
    if (summary.length > 0) {
      toast({
        title: "챗봇에서 폼 prefill 반영",
        description: summary.join(" / ") + " — 확인 후 저장하세요.",
      })
    }
    // URL 정리 (필드 적용 후)
    const id = window.setTimeout(() => clearChatbotPrefill(), 100)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasChatbotPrefill])

  useEffect(() => {
    let cancelled = false

    const sync = async () => {
      setLoading(true)
      try {
        const [data, productModules] = await Promise.all([
          loadBackendFindingData(),
          loadBackendProductModules().catch(() => []),
        ])
        if (cancelled) return

        setCustomers(data.customers)
        setPartners(data.partners)
        setBackendProductModules(Array.isArray(productModules) ? (productModules as BackendProductModuleSummary[]) : [])

        if (category === "opportunities") {
          const opportunity = data.opportunities.find((current) => current.id === id) ?? null
          const opportunityDetail = opportunity?.backendId ? await loadBackendProjectOpportunity(opportunity.backendId).catch(() => null) : null
          const selectedOpportunity = opportunityDetail
            ? {
                ...(opportunity ?? {}),
                backendId: opportunityDetail.id,
                customerCode:
                  opportunity?.customerCode ??
                  data.customers.find((customer) => customer.backendId === opportunityDetail.customerCompanyId)?.id ??
                  (opportunityDetail.customerCompanyId != null ? String(opportunityDetail.customerCompanyId) : ""),
                createUserName: opportunityDetail.createUserName ?? opportunity?.createUserName,
                name: opportunityDetail.opportunityName ?? opportunity?.name ?? "-",
                customer: opportunityDetail.customerCompanyName ?? opportunity?.customer ?? "-",
                registrant: opportunityDetail.createUserName ?? opportunity?.registrant ?? "-",
                product: opportunityDetail.projectType ? String(opportunityDetail.projectType) : opportunity?.product ?? "-",
                expectedAmount:
                  opportunityDetail.expectedBudget != null
                    ? opportunityDetail.expectedBudget.toLocaleString("ko-KR")
                    : opportunity?.expectedAmount ?? "-",
                expectedDate: opportunityDetail.expectedBidDate ?? opportunity?.expectedDate ?? "-",
                competition: opportunityDetail.competitionStatus ?? opportunity?.competition ?? "-",
                issue: opportunity?.issue ?? opportunityDetail.description ?? "-",
                decisionInfo: opportunity?.decisionInfo ?? opportunityDetail.description ?? "-",
                status: stageLabel(opportunityDetail.stage) ?? opportunity?.status ?? "-",
                salesRepresentativeId: opportunityDetail.salesRepresentativeId ?? opportunity?.salesRepresentativeId,
                salesRep: opportunityDetail.salesRepresentativeName ?? opportunity?.salesRep ?? "-",
              }
            : opportunity

          setItem(selectedOpportunity as OpportunityRecord | PartnerRecord | null)
          if (selectedOpportunity) {
            const matchedCustomer = data.customers.find((customer) => customer.id === selectedOpportunity.customerCode) ?? null
            const partnerText = selectedOpportunity.partner ?? "-"
            setSelectedCustomer(matchedCustomer)
            setCustomerName(selectedOpportunity.customer)
            setOpportunityName(selectedOpportunity.name)
            setRegistrant(selectedOpportunity.registrant)
            setPartnerNames(
              Array.isArray(selectedOpportunity.partners) && selectedOpportunity.partners.length > 0
                ? selectedOpportunity.partners
                : partnerText === "-"
                  ? [""]
                  : partnerText.split(",").map((partner) => partner.trim()),
            )
            setExpectedDate(selectedOpportunity.expectedDate === "-" ? "" : selectedOpportunity.expectedDate)
            setExpectedAmount(selectedOpportunity.expectedAmount === "-" ? "" : selectedOpportunity.expectedAmount)
            setSalesRep(selectedOpportunity.salesRep ?? "")
            setSalesRepUserId(selectedOpportunity.salesRepresentativeId ?? null)
            setBusinessType(selectedOpportunity.product ?? "")
            setModuleNames(
              Array.isArray(selectedOpportunity.productModuleNames) && selectedOpportunity.productModuleNames.length > 0
                ? selectedOpportunity.productModuleNames
                : (selectedOpportunity.module ?? "-") === "-"
                  ? []
                  : splitMultipleValues(selectedOpportunity.module ?? ""),
            )
            setIssue(selectedOpportunity.issue === "-" ? "" : selectedOpportunity.issue)
            setCompetition(selectedOpportunity.competition === "-" ? "" : selectedOpportunity.competition)
            setDecisionInfo(selectedOpportunity.decisionInfo === "-" ? "" : selectedOpportunity.decisionInfo)
            setStatus(toOpportunityStage(opportunityDetail?.stage ?? selectedOpportunity.status))
            setPartnerNames(
              Array.isArray(selectedOpportunity.partnerCompanyNames) && selectedOpportunity.partnerCompanyNames.length > 0
                ? selectedOpportunity.partnerCompanyNames
                : Array.isArray(selectedOpportunity.partners) && selectedOpportunity.partners.length > 0
                  ? selectedOpportunity.partners
                  : partnerText === "-"
                    ? [""]
                    : partnerText.split(",").map((partner) => partner.trim()),
            )
            setRfpAttachments(
              Array.isArray(selectedOpportunity.rfpFileIds) && selectedOpportunity.rfpFileIds.length > 0
                ? selectedOpportunity.rfpFileIds.map((fileId, index) => ({
                    id: String(fileId),
                    name: selectedOpportunity.rfpFileNames?.[index] ?? `첨부파일 ${index + 1}`,
                    size: selectedOpportunity.rfpFileSizes?.[index] ?? 0,
                    contentType: "",
                    dataUrl: "",
                    summary: "",
                    createdAt: "",
                    fileId,
                  }))
                : selectedOpportunity.rfpAttachments ?? [],
            )
          }
        }

        if (category === "partners") {
          const partner = data.partners.find((current) => current.id === id) ?? null
          setItem(partner)
          if (partner) {
            setPartnerName(partner.name)
            setPartnerType(partner.type || "SI")
            setAddress(partner.address ?? "")
            setMemo(partner.memo ?? "")
            setContacts(toContactDrafts(partner))
          }
        }
      } catch {
        if (!cancelled) {
          setItem(null)
          setCustomers([])
          setPartners([])
          setBackendProductModules([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void sync()
    return () => {
      cancelled = true
    }
  }, [category, id])

  useEffect(() => {
    if (category !== "opportunities") return
    if (salesRepUserId || !salesRep.trim() || backendUsers.length === 0) return

    const matchedSalesRep = backendUsers.find((user) => user.id === salesRep.trim() || user.name === salesRep.trim())
    if (matchedSalesRep) {
      setSalesRepUserId(matchedSalesRep.id ?? null)
    }
  }, [backendUsers, category, salesRep, salesRepUserId])

  const label = getFindingCategoryLabel(category)
  const tab = searchParams.get("tab") ?? category
  const backHref = `/finding/${category}/${id}?tab=${tab}`

  const openBusinessCardInput = (contactIndex: number) => {
    pendingOcrIndexRef.current = contactIndex
    businessCardInputRef.current?.click()
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

      if (!normalizedName || !partnerType || !primaryContact?.name.trim() || !primaryContact?.email.trim()) {
        toast({
          title: "협력사 수정 확인",
          description: "협력사명, 유형, 담당자 1의 성명, 이메일을 모두 입력해주십시오.",
        })
        return
      }

      const contactValidationMessage = validateManagerContacts(filledContacts)
      if (contactValidationMessage) {
        toast({
          title: "담당자 입력 확인",
          description: contactValidationMessage,
        })
        return
      }

      const duplicatePartner = partners.find((partner) => partner.id !== id && normalizeCompanyName(partner.name) === normalizeCompanyName(normalizedName)) ?? null
      if (duplicatePartner) {
        toast({
          title: "협력사 중복 등록",
          description: "이미 등록된 동일한 이름의 협력사가 있습니다.",
        })
        return
      }

      const currentPartner = item as PartnerRecord | null
      if (!currentPartner?.backendId) {
        toast({
          title: "협력사 수정 실패",
          description: "백엔드 협력사 정보를 찾지 못했습니다.",
        })
        return
      }

      setSubmitting(true)
      ;(async () => {
        try {
          await updateBackendCompany(currentPartner.backendId!, {
            name: normalizedName,
            category: mapPartnerCategory(partnerType),
            address,
            memo,
          }, currentPartner.id)

          const existingManagers = currentPartner.backendId ? await loadBackendCompanyManagers(currentPartner.backendId) : []
          const sortedManagers = [...existingManagers].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
          for (let index = 0; index < filledContacts.length; index += 1) {
            const contact = filledContacts[index]
            const payload = {
              name: contact.name.trim(),
              email: contact.email?.trim() || "",
              mobilePhone: contact.mobilePhone?.trim() || undefined,
              officePhone: contact.landlinePhone?.trim() || undefined,
              department: contact.department?.trim() || undefined,
              position: contact.position?.trim() || undefined,
              role: contact.duty?.trim() || undefined,
              memo: contact.memo?.trim() || undefined,
            }

            const managerId = sortedManagers[index]?.id
            if (managerId != null) {
              await updateBackendCompanyManager(managerId, payload)
            } else {
              await createBackendCompanyManager(currentPartner.backendId!, payload)
            }
          }

          for (const manager of sortedManagers.slice(filledContacts.length)) {
            if (manager.id != null) {
              await deleteBackendCompanyManager(manager.id)
            }
          }

          toast({
            title: "협력사 수정 완료",
            description: `${normalizedName} 정보가 수정되었습니다.`,
          })
          router.push(`/finding/partners/${currentPartner.id}?tab=${tab}`)
        } catch (error) {
          toast({
            title: "협력사 수정 실패",
            description: error instanceof Error ? error.message : "수정에 실패했습니다.",
          })
        } finally {
          setSubmitting(false)
        }
      })()
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

    const currentOpportunity = item as OpportunityRecord | null
    if (!currentOpportunity?.backendId) {
      toast({
        title: "사업기회 수정 실패",
        description: "백엔드 사업기회 정보를 찾지 못했습니다.",
      })
      return
    }

    if (selectedCustomer.backendId == null) {
      toast({
        title: "사업기회 수정 실패",
        description: "선택한 고객사의 백엔드 식별자를 찾지 못했습니다.",
      })
      return
    }

    setSubmitting(true)
    ;(async () => {
      try {
        const salesRepresentativeId = salesRepUserId ?? (await resolveSalesRepresentativeId(salesRep))
        if (!salesRepresentativeId) {
          toast({
            title: "사업기회 수정 확인",
            description: "영업대표를 사용자 목록에서 찾지 못했습니다.",
          })
          setSubmitting(false)
          return
        }

        const matchedSalesRep = backendUsers.find((user) => user.id === salesRepresentativeId)
        if (!matchedSalesRep) {
          toast({
            title: "사업기회 수정 확인",
            description: "선택한 영업대표를 사용자 목록에서 찾지 못했습니다.",
          })
          setSubmitting(false)
          return
        }

        const [productModules, rfpFileIds] = await Promise.all([
          loadBackendProductModules().catch(() => []),
          resolveRfpFileIds(rfpAttachments),
        ])
        const partnerCompanyIds = resolvePartnerCompanyIds(partnerNames, partners)
        const productModuleIds = resolveProductModuleIds(moduleNames, productModules)
        const customerCompanyId = selectedCustomer.backendId
        if (customerCompanyId == null) {
          toast({
            title: "사업기회 수정 실패",
            description: "선택한 고객사의 백엔드 식별자를 찾지 못했습니다.",
          })
          setSubmitting(false)
          return
        }

        const updated = await updateBackendProjectOpportunity(currentOpportunity.backendId!, {
          opportunityName: opportunityName.trim(),
          stage: status,
          projectType: mapOpportunityProductClass(businessType),
          salesRepresentativeId,
          customerCompanyId,
          expectedBidDate: expectedDate,
          expectedBudget: expectedAmount,
          description: buildOpportunityDescription({
            moduleNames,
            issue,
            decisionInfo: buildDecisionInfoFromCustomer(selectedCustomer, decisionInfo),
          }),
          competitionStatus: competition,
          partnerCompanyIds,
          productModuleIds,
          rfpFileIds,
        })

        toast({
          title: "사업기회 수정 완료",
          description: `${updated.opportunityName ?? opportunityName} 정보가 수정되었습니다.`,
        })
        router.push(`/finding/opportunities/${updated.opportunityCode ?? currentOpportunity.id}?tab=${tab}`)
      } catch (error) {
        toast({
          title: "사업기회 수정 실패",
          description: error instanceof Error ? error.message : "수정에 실패했습니다.",
        })
      } finally {
        setSubmitting(false)
      }
    })()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title={`${label} 수정`} description={`${label} 정보를 조회합니다`} />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-5xl">
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">불러오는 중...</CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    )
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
                        <EntityAutocomplete
                          value={partnerName}
                          target="partners"
                          onValueChange={setPartnerName}
                          onSelect={(suggestion) => {
                            if (suggestion) setPartnerName(suggestion.label)
                          }}
                          allowCustomValue
                          placeholder="협력사명을 입력하세요 (LG, 엘지, 엘쥐 등 유사 표기 자동 매칭)"
                          emptyMessage="등록된 협력사가 없습니다."
                          localCandidates={partnerLocalSuggestions}
                        />
                        <SimilarMatchHint
                          query={partnerName}
                          candidates={partnerSimilarCandidates}
                          hintTitle="비슷한 협력사가 이미 등록되어 있어요"
                          onPick={(candidate) => setPartnerName(candidate.label)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>유형</Label>
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
                              <Label>담당자명 *</Label>
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
                              <Label>이메일 *</Label>
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
                              <Label>무선전화번호</Label>
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
                              <Label>유선전화번호</Label>
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
                            <Label>담당 직무</Label>
                            <Input
                              value={contact.duty}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, duty: event.target.value } : item)))
                              }
                              placeholder="담당 직무를 입력하세요."
                            />
                          </div>
                        </section>
                      ))}
                    </div>
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
                  <h2 className="text-base font-semibold">등록정보</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>고객사명 *</Label>
                      <CustomerAutocomplete
                        value={customerName}
                        onSelect={(customer) => {
                          const resolvedCustomer = customers.find((item) => item.id === customer?.id || item.name === customer?.name) ?? customer
                          setSelectedCustomer(resolvedCustomer ?? null)
                          setCustomerName(resolvedCustomer?.name ?? "")
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
                      {selectedCustomer ? (
                        <p className="text-xs text-muted-foreground">고객사 코드: {selectedCustomer.id}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">자동완성 목록에서 선택하면 고객사 코드가 함께 연결됩니다.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>협력사명</Label>
                      <div className="space-y-2">
                        {partnerNames.map((partnerName, index) => (
                          <div key={`edit-opportunity-partner-${index}`} className="flex items-center gap-2">
                            <EntityAutocomplete
                              value={partnerName}
                              target="partners"
                              onValueChange={(value) =>
                                setPartnerNames((prev) => prev.map((item, itemIndex) => (itemIndex === index ? value : item)))
                              }
                              onSelect={(suggestion) => {
                                if (!suggestion) return
                                setPartnerNames((prev) => prev.map((item, itemIndex) => (itemIndex === index ? suggestion.label : item)))
                              }}
                              allowCustomValue
                              placeholder={index === 0 ? "협력사명을 입력하세요" : `협력사명 ${index + 1}`}
                              emptyMessage="등록된 협력사가 없습니다."
                              localCandidates={partnerLocalSuggestions}
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
                      <Label>사업명 *</Label>
                      <Input value={opportunityName} onChange={(event) => setOpportunityName(event.target.value)} placeholder="사업명을 입력하세요" />
                    </div>
                    <div className="space-y-2">
                      <Label>등록자</Label>
                      <Input readOnly value={registrant} />
                    </div>
                    <div className="space-y-2">
                      <Label>영업대표 *</Label>
                      <UserIdPicker
                        value={salesRepUserId ?? ""}
                        users={backendUsers}
                        onValueChange={setSalesRepUserId}
                        placeholder={backendUsers.length === 0 ? "사용자 목록을 불러오는 중..." : "영업대표를 선택하세요"}
                        disabled={backendUsers.length === 0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>예상 입찰 또는 계약 시점</Label>
                      <Input type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>예상 예산 또는 매출</Label>
                      <Input value={expectedAmount} onChange={(event) => setExpectedAmount(event.target.value)} placeholder="예: 800,000" />
                    </div>
                    <div className="space-y-2">
                      <Label>사업 구분 *</Label>
                      <Select
                        value={businessType}
                        onValueChange={(value) => {
                          setBusinessType(value)
                          setModuleNames([])
                        }}
                      >
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
                      <Select value={status} onValueChange={(value) => setStatus(toOpportunityStage(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {opportunityStatusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>납품 모듈</Label>
                      <ProductModuleMultiPicker
                        value={moduleNames}
                        onValueChange={setModuleNames}
                        placeholder={businessType ? "제품명을 선택하세요" : "사업 구분을 먼저 선택하세요"}
                        disabled={!businessType}
                        productClassFilter={businessType}
                      />
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
                      파일 추가
                    </Button>
                  </div>
                  {rfpAttachments.length > 0 ? (
                    <div className="space-y-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                      {rfpAttachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate font-medium">{attachment.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{Math.ceil(attachment.size / 1024).toLocaleString()}KB</span>
                          <div className="hidden">
                            <a href={attachment.dataUrl} download={attachment.name} className="truncate text-primary hover:underline">
                              {attachment.name}
                            </a>
                            <p className="text-xs text-muted-foreground">{`${Math.ceil(attachment.size / 1024).toLocaleString()}KB`}</p>
                            {attachment.summary ? (
                              <div className="mt-3 rounded-md border border-border p-4">
                                <h3 className="mb-3 text-sm font-semibold">&lt;{formatRfpSummaryTitle(attachment.name)}&gt; 요약</h3>
                                <RfpSummaryMarkdown markdown={attachment.summary} />
                              </div>
                            ) : null}
                          </div>
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
                              AI 요약
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-[0px] text-destructive hover:text-destructive"
                              disabled={rfpSummaryLoadingId === attachment.id}
                              onClick={() => handleDeleteRfpAttachment(attachment.id)}
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                              삭제
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
                          <h3 className="text-sm font-semibold">&lt;{formatRfpSummaryTitle(attachment.name)}&gt; 요약</h3>
                          <RfpSummaryMarkdown markdown={attachment.summary} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground">사업기회와 함께 검토할 RFP 문서를 추가합니다.</p>
                </section>

                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild disabled={submitting}>
                    <Link href={backHref}>취소</Link>
                  </Button>
                  <Button onClick={handleSave} disabled={submitting}>
                    {submitting ? "저장 중..." : "수정"}
                  </Button>
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
