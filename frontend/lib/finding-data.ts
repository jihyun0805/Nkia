import type { StoredFileAttachment } from "@/lib/attachments"

export type FindingCategory = "opportunities" | "customers" | "partners"
export type CustomerAttachment = StoredFileAttachment
export type CustomerRecord = {
  id: string
  name: string
  category: string
  opportunities: number
  contracts: number
  contact: string
  phone: string
  contacts?: CustomerContact[]
  contactName?: string
  position?: string
  department?: string
  email?: string
  mobilePhone?: string
  landlinePhone?: string
  fax?: string
  duty?: string
  address?: string
  memo?: string
  aliases?: string[]
  attachments?: CustomerAttachment[]
}
export type CustomerContact = {
  name: string
  position?: string
  department?: string
  email?: string
  mobilePhone?: string
  landlinePhone?: string
  fax?: string
  duty?: string
  memo?: string
  businessCardImage?: string
}
export type PartnerRecord = {
  id: string
  name: string
  type: string
  opportunities: number
  projects: number
  contact: string
  phone: string
  contacts?: CustomerContact[]
  contactName?: string
  position?: string
  department?: string
  email?: string
  mobilePhone?: string
  landlinePhone?: string
  fax?: string
  duty?: string
  address?: string
  memo?: string
  attachments?: CustomerAttachment[]
}
export type OpportunityRecord = {
  id: string
  createdAt: string
  customerCode: string
  partnerCode: string
  partnerCodes?: string[]
  name: string
  registrant: string
  customer: string
  partner: string
  partners?: string[]
  category: string
  product: string
  module: string
  expectedAmount: string
  expectedDate: string
  issue: string
  competition: string
  decisionInfo: string
  partnerType: string
  partnerContact: string
  partnerPhone: string
  status: string
  salesRep: string
  rfpAttachments?: OpportunityAttachment[]
}
export type OpportunityAttachment = {
  id: string
  name: string
  size: number
  contentType: string
  dataUrl: string
  summary: string
  createdAt: string
}
export type FindingFormField = {
  label: string
  required?: boolean
  type?: "text" | "textarea" | "select" | "file"
  options?: string[]
}

export type FindingFormSection = {
  title: string
  fields: FindingFormField[]
}

type CustomerRegistrationInput = {
  name: string
  category: string
  contacts: CustomerContact[]
  address?: string
  memo?: string
  aliases?: string[]
  attachments?: CustomerAttachment[]
}

type CustomerUpdateInput = {
  name: string
  category: string
  contacts: CustomerContact[]
  address?: string
  memo?: string
  aliases?: string[]
  attachments?: CustomerAttachment[]
}

type OpportunityRegistrationInput = {
  customerCode: string
  category: string
  name: string
  registrant: string
  partner?: string
  partners?: string[]
  expectedDate?: string
  expectedAmount?: string
  product: string
  module?: string
  issue?: string
  competition?: string
  decisionInfo?: string
  status?: string
  salesRep?: string
  rfpAttachments?: OpportunityAttachment[]
}

type OpportunityUpdateInput = OpportunityRegistrationInput
type PartnerRegistrationInput = {
  name: string
  type: string
  contacts: CustomerContact[]
  address?: string
  memo?: string
  attachments?: CustomerAttachment[]
}
type PartnerUpdateInput = PartnerRegistrationInput

const customerStorageKey = "orbis.customers"
const deletedCustomerIdsStorageKey = "orbis.deleted-customer-ids"
const opportunityStorageKey = "orbis.opportunities"
const partnerStorageKey = "orbis.partners"
const deletedPartnerIdsStorageKey = "orbis.deleted-partner-ids"
const customerGroupOptions = ["공공", "민간", "해외"]
const businessTypeOptions = ["EMS", "ITSM", "Automation", "WSS"]

export const findingFormSections: FindingFormSection[] = [
  {
    title: "등록정보",
    fields: [
      { label: "사업명", required: true },
      { label: "고객군", required: true, type: "select", options: customerGroupOptions },
      { label: "협력사명" },
      { label: "예상 입찰 또는 계약 시점" },
      { label: "예상 예산 또는 매출" },
      { label: "사업 구분", required: true, type: "select", options: businessTypeOptions },
      { label: "납품 모듈" },
      { label: "주요 사업 내용 및 주요 이슈 내용", type: "textarea" },
      { label: "경쟁 상황", type: "textarea" },
      { label: "고객사 의사결정구조 및 담당자 정보", type: "textarea" },
    ],
  },
  {
    title: "첨부파일",
    fields: [{ label: "첨부파일", type: "file" }],
  },
]

const baseOpportunities: OpportunityRecord[] = [
  { id: "OPP-2026-001", createdAt: "2026-04-30", customerCode: "CUS-001", partnerCode: "-", name: "삼성전자 EMS 구축", registrant: "김영업", customer: "삼성전자", partner: "-", category: "민간", product: "EMS", module: "SMS", expectedAmount: "5억", expectedDate: "2026년 2분기", issue: "인프라 통합 관제 체계 고도화 검토", competition: "기존 관제 솔루션 교체 경쟁", decisionInfo: "IT운영팀 홍길동 / 구매팀 협의", partnerType: "-", partnerContact: "-", partnerPhone: "-", status: "진행중", salesRep: "김영업" },
  { id: "OPP-2026-002", createdAt: "2026-04-24", customerCode: "CUS-002", partnerCode: "PTN-001", name: "국방부 ITSM 도입", registrant: "이대리", customer: "국방부", partner: "LG CNS", category: "공공", product: "ITSM", module: "ITSM", expectedAmount: "8억", expectedDate: "2026년 3분기", issue: "공공 ITSM 표준 프로세스 도입", competition: "대형 SI 제안 경쟁 예상", decisionInfo: "정보화담당관 김철수 / 단계별 승인", partnerType: "SI업체", partnerContact: "강대표", partnerPhone: "010-5678-9012", status: "발굴", salesRep: "이대리" },
  { id: "OPP-2026-003", createdAt: "2026-04-18", customerCode: "CUS-003", partnerCode: "-", name: "현대차 Automation 확장", registrant: "박기술", customer: "현대자동차", partner: "-", category: "민간", product: "Automation", module: "Automation", expectedAmount: "3억", expectedDate: "2026년 2분기", issue: "업무 자동화 적용 범위 확대", competition: "RPA 솔루션 비교 검토", decisionInfo: "디지털혁신팀 이영희", partnerType: "-", partnerContact: "-", partnerPhone: "-", status: "진행중", salesRep: "박과장" },
  { id: "OPP-2026-004", createdAt: "2026-04-09", customerCode: "CUS-004", partnerCode: "PTN-002", name: "SK텔레콤 NMS 업그레이드", registrant: "김영업", customer: "SK텔레콤", partner: "SK C&C", category: "민간", product: "EMS", module: "NMS", expectedAmount: "2억", expectedDate: "2026년 1분기", issue: "노후 NMS 기능 업그레이드", competition: "내부 개발 대체 가능성 검토", decisionInfo: "NW운영팀 박민수", partnerType: "SI업체", partnerContact: "윤실장", partnerPhone: "010-6789-0123", status: "유망", salesRep: "김영업" },
  { id: "OPP-2026-005", createdAt: "2026-03-20", customerCode: "CUS-005", partnerCode: "PTN-003", name: "일본 NTT DoCoMo WSS", registrant: "최PM", customer: "NTT DoCoMo", partner: "NTT DATA", category: "해외", product: "WSS", module: "WSS", expectedAmount: "10억", expectedDate: "2026년 4분기", issue: "해외 통신사 WSS 신규 도입", competition: "현지 벤더와 가격 경쟁", decisionInfo: "서비스기획 Tanaka / NTT DATA 협업", partnerType: "파트너", partnerContact: "Yamamoto", partnerPhone: "+81-90-2345-6789", status: "발굴", salesRep: "최부장" },
]

export const opportunities: OpportunityRecord[] = baseOpportunities

const baseCustomers: CustomerRecord[] = [
  { id: "CUS-001", name: "삼성전자", category: "민간", opportunities: 3, contracts: 5, contact: "홍길동", phone: "010-1234-5678", aliases: ["samsung", "samsungelectronics"], attachments: [{ id: "CUS-001-ATT-001", name: "삼성전자_고객사소개서.pdf", size: 182400, contentType: "application/pdf", dataUrl: "data:application/pdf;base64,JVBERi0xLjQKJcfs...", createdAt: "2026-04-30" }] },
  { id: "CUS-002", name: "국방부", category: "공공", opportunities: 2, contracts: 1, contact: "김철수", phone: "010-2345-6789", aliases: ["mnd"] },
  { id: "CUS-003", name: "현대자동차", category: "민간", opportunities: 2, contracts: 3, contact: "이영희", phone: "010-3456-7890", aliases: ["현대차", "hyundai", "hyundaimotor"] },
  { id: "CUS-004", name: "SK텔레콤", category: "민간", opportunities: 1, contracts: 4, contact: "박민수", phone: "010-4567-8901", aliases: ["skt", "sktelecom"] },
  { id: "CUS-005", name: "NTT DoCoMo", category: "해외", opportunities: 1, contracts: 0, contact: "Tanaka", phone: "+81-90-1234-5678", aliases: ["nttdocomo", "docomo"] },
  { id: "CUS-008", name: "엘지씨엔에스", category: "민간", opportunities: 1, contracts: 2, contact: "강대표", phone: "010-5678-9012", aliases: ["lg cns", "lgcns", "lgc", "엘지씨", "엘지씨엔에스", "lg 씨엔에스"] },
]

export const customers: CustomerRecord[] = baseCustomers

const basePartners: PartnerRecord[] = [
  { id: "PTN-001", name: "LG CNS", type: "SI", opportunities: 2, projects: 3, contact: "강대표", phone: "010-5678-9012", attachments: [{ id: "PTN-001-ATT-001", name: "LGCNS_파트너소개서.pdf", size: 214528, contentType: "application/pdf", dataUrl: "data:application/pdf;base64,JVBERi0xLjQKJcfs...", createdAt: "2026-05-02" }] },
  { id: "PTN-002", name: "SK C&C", type: "SI", opportunities: 1, projects: 2, contact: "윤실장", phone: "010-6789-0123" },
  { id: "PTN-003", name: "NTT DATA", type: "파트너", opportunities: 1, projects: 1, contact: "Yamamoto", phone: "+81-90-2345-6789" },
  { id: "PTN-004", name: "삼성SDS", type: "SI", opportunities: 0, projects: 4, contact: "정팀장", phone: "010-7890-1234" },
]

export const findingStatuses: string[] = ["진행중", "발굴", "유망"]

function normalizePartnerNames(partners: string[] = []) {
  return Array.from(
    new Set(
      partners
        .map((partner) => partner.trim())
        .filter(Boolean),
    ),
  )
}

function buildOpportunityPartnerData(partners: string[]) {
  const normalizedPartners = normalizePartnerNames(partners)
  const matchedPartners = normalizedPartners
    .map((partnerName) => getPartnerByName(partnerName))
    .filter((partner): partner is PartnerRecord => Boolean(partner))

  return {
    partner: normalizedPartners.length > 0 ? normalizedPartners.join(", ") : "-",
    partners: normalizedPartners,
    partnerCode: matchedPartners.length > 0 ? matchedPartners.map((partner) => partner.id).join(", ") : "-",
    partnerCodes: matchedPartners.map((partner) => partner.id),
    partnerType:
      matchedPartners.length > 1
        ? "복수"
        : matchedPartners[0]?.type ?? (normalizedPartners.length > 0 ? "기타" : "-"),
    partnerContact:
      matchedPartners.length > 0
        ? matchedPartners
            .map((partner) => partner.contactName ?? partner.contact ?? "-")
            .join(", ")
        : "-",
    partnerPhone:
      matchedPartners.length > 0
        ? matchedPartners
            .map((partner) => partner.mobilePhone ?? partner.phone ?? "-")
            .join(", ")
        : "-",
  }
}

export function getFindingItem(category: FindingCategory, id: string) {
  if (category === "opportunities") return getOpportunities().find((item) => item.id === id) ?? null
  if (category === "customers") return getCustomers().find((item) => item.id === id) ?? null
  return getPartners().find((item) => item.id === id) ?? null
}

export function getFindingFields(category: FindingCategory, item: any) {
  if (category === "opportunities") {
    return [
      { label: "사업기회번호", value: item.id },
      { label: "등록일", value: item.createdAt },
      { label: "등록자", value: item.registrant },
      { label: "영업대표", value: item.salesRep || "-" },
      { label: "고객 코드", value: item.customerCode },
      { label: "사업 코드", value: item.id },
      { label: "사업명", value: item.name },
      { label: "고객군", value: item.category },
      { label: "고객명", value: item.customer },
      { label: "협력사명", value: item.partner },
      { label: "예상 입찰 또는 계약 시점", value: item.expectedDate },
      { label: "예상 예산 또는 매출", value: item.expectedAmount },
      { label: "사업 구분", value: item.product },
      { label: "납품 모듈", value: item.module },
      { label: "주요 사업 내용 및 주요 이슈 내용", value: item.issue },
      { label: "경쟁 상황", value: item.competition },
      { label: "고객사 의사결정구조 및 담당자 정보", value: item.decisionInfo },
      { label: "상태", value: item.status },
    ]
  }
  if (category === "customers") {
    const contacts = Array.isArray(item.contacts) && item.contacts.length > 0 ? item.contacts : [{
      name: item.contactName ?? item.contact ?? "-",
      position: item.position ?? "",
      department: item.department ?? "",
      email: item.email ?? "",
      mobilePhone: item.mobilePhone ?? item.phone ?? "",
      landlinePhone: item.landlinePhone ?? "",
      fax: item.fax ?? "",
      duty: item.duty ?? "",
      memo: item.memo ?? "",
    }]
    return [
      { label: "고객사코드", value: item.id },
      { label: "고객사명", value: item.name },
      { label: "고객군", value: item.category },
      { label: "담당자 수", value: `${contacts.length}명` },
      { label: "담당자 요약", value: contacts.map((contact: CustomerContact, index: number) => `${index + 1}. ${contact.name}${contact.position ? ` / ${contact.position}` : ""}`).join(" | ") },
      { label: "주소", value: item.address ?? "-" },
      { label: "메모", value: item.memo ?? `진행중 사업기회 ${item.opportunities}건 / 계약 ${item.contracts}건` },
    ]
  }
  return [
    { label: "협력사코드", value: item.id },
    { label: "협력사명", value: item.name },
    { label: "유형", value: item.type },
    { label: "담당자", value: item.contact },
    { label: "연락처", value: item.phone },
    { label: "주요 협업 분야", value: `진행중 사업기회 ${item.opportunities}건 / 진행중 프로젝트 ${item.projects}건` },
  ]
}

export function getFindingFormFieldValue(category: FindingCategory, item: any, label: string) {
  if (category === "opportunities") {
    const values: Record<string, string> = {
      "사업명": item.name,
      "고객군": item.category,
      "협력사명": item.partner,
      "예상 입찰 또는 계약 시점": item.expectedDate,
      "예상 예산 또는 매출": item.expectedAmount,
      "사업 구분": item.product,
      "납품 모듈": item.module,
      "주요 사업 내용 및 주요 이슈 내용": item.issue,
      "경쟁 상황": item.competition,
      "고객사 의사결정구조 및 담당자 정보": item.decisionInfo,
    }
    return values[label] ?? ""
  }

  if (category === "customers") {
    const values: Record<string, string> = {
      "사업명": item.name,
      "고객군": item.category,
      "고객사 의사결정구조 및 담당자 정보": `${item.contactName ?? item.contact} / ${item.mobilePhone ?? item.phone}`,
      "주소": item.address ?? "",
      "메모": item.memo ?? "",
    }
    return values[label] ?? ""
  }

  const values: Record<string, string> = {
    "협력사명": item.name,
  }
  return values[label] ?? ""
}

export function getFindingCategoryLabel(category: FindingCategory) {
  if (category === "opportunities") return "사업기회"
  if (category === "customers") return "고객사"
  return "협력사"
}

export function hasRegisteredCustomer(customerName: string) {
  const normalized = customerName.trim().toLowerCase()
  if (!normalized) return false

  return getCustomers().some((item) => item.name.trim().toLowerCase() === normalized)
}

export function getCustomerByName(customerName: string) {
  const normalized = normalizeCustomerKeyword(customerName)
  if (!normalized) return null

  return (
    getCustomers().find((item) => {
      if (normalizeCustomerKeyword(item.name) === normalized) return true
      return item.aliases?.some((alias) => normalizeCustomerKeyword(alias) === normalized)
    }) ?? null
  )
}

export function getCustomerByCode(customerCode: string) {
  const normalized = customerCode.trim().toLowerCase()
  if (!normalized) return null

  return getCustomers().find((item) => item.id.trim().toLowerCase() === normalized) ?? null
}

export function getOpportunitiesByCustomerName(customerName: string) {
  const customer = getCustomerByName(customerName)
  if (!customer) return []

  return getOpportunities().filter((item) => item.customerCode === customer.id)
}

export function normalizeCustomerKeyword(value: string) {
  return value.trim().toLowerCase().replace(/[\s\-_.()/]/g, "")
}

export function searchCustomers(query: string) {
  const normalized = normalizeCustomerKeyword(query)
  if (!normalized) return getCustomers()

  return [...getCustomers()]
    .map((customer) => {
      const keywords = [customer.name, ...(customer.aliases ?? [])].map(normalizeCustomerKeyword)
      const startsWith = keywords.some((keyword) => keyword.startsWith(normalized))
      const includes = keywords.some((keyword) => keyword.includes(normalized))
      return { customer, startsWith, includes }
    })
    .filter((item) => item.startsWith || item.includes)
    .sort((a, b) => {
      if (a.startsWith !== b.startsWith) return a.startsWith ? -1 : 1
      return a.customer.name.localeCompare(b.customer.name)
    })
    .map((item) => item.customer)
}

function getStoredCustomers(): CustomerRecord[] {
  if (typeof window === "undefined") return []

  const stored = window.localStorage.getItem(customerStorageKey)
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored) as CustomerRecord[]
    return Array.isArray(parsed)
      ? parsed
          .filter((item) => item && typeof item.id === "string" && typeof item.name === "string")
          .map((item) => ({
            ...item,
            aliases: Array.isArray(item.aliases) ? item.aliases.filter((alias) => typeof alias === "string") : [],
            attachments: Array.isArray(item.attachments)
              ? item.attachments.filter((attachment) => attachment && typeof attachment.id === "string" && typeof attachment.name === "string")
              : [],
          }))
      : []
  } catch {
    return []
  }
}

function getStoredOpportunities(): OpportunityRecord[] {
  if (typeof window === "undefined") return []

  const stored = window.localStorage.getItem(opportunityStorageKey)
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored) as OpportunityRecord[]
    return Array.isArray(parsed)
      ? parsed
          .filter(
            (item) =>
            item &&
            typeof item.id === "string" &&
            typeof item.createdAt === "string" &&
            typeof item.customerCode === "string" &&
            typeof item.name === "string" &&
            typeof item.customer === "string",
          )
          .map((item) => ({
            ...item,
            createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
            registrant: typeof item.registrant === "string" ? item.registrant : "",
            salesRep: typeof item.salesRep === "string" ? item.salesRep : "",
            partners: Array.isArray(item.partners)
              ? normalizePartnerNames(item.partners)
              : typeof item.partner === "string" && item.partner !== "-"
                ? normalizePartnerNames(item.partner.split(","))
                : [],
            partnerCodes: Array.isArray(item.partnerCodes)
              ? item.partnerCodes.filter((partnerCode) => typeof partnerCode === "string")
              : typeof item.partnerCode === "string" && item.partnerCode !== "-"
                ? item.partnerCode.split(",").map((partnerCode) => partnerCode.trim()).filter(Boolean)
                : [],
          }))
      : []
  } catch {
    return []
  }
}

function getStoredPartners(): PartnerRecord[] {
  if (typeof window === "undefined") return []

  const stored = window.localStorage.getItem(partnerStorageKey)
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored) as PartnerRecord[]
    return Array.isArray(parsed)
      ? parsed
          .filter((item) => item && typeof item.id === "string" && typeof item.name === "string")
          .map((item) => ({
            ...item,
            attachments: Array.isArray(item.attachments)
              ? item.attachments.filter((attachment) => attachment && typeof attachment.id === "string" && typeof attachment.name === "string")
              : [],
          }))
      : []
  } catch {
    return []
  }
}

function getDeletedCustomerIds(): string[] {
  if (typeof window === "undefined") return []

  const stored = window.localStorage.getItem(deletedCustomerIdsStorageKey)
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored) as string[]
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []
  } catch {
    return []
  }
}

function getDeletedPartnerIds(): string[] {
  if (typeof window === "undefined") return []

  const stored = window.localStorage.getItem(deletedPartnerIdsStorageKey)
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored) as string[]
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []
  } catch {
    return []
  }
}

function setStoredCustomers(value: CustomerRecord[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(customerStorageKey, JSON.stringify(value))
}

function setDeletedCustomerIds(value: string[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(deletedCustomerIdsStorageKey, JSON.stringify(value))
}

function setStoredOpportunities(value: OpportunityRecord[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(opportunityStorageKey, JSON.stringify(value))
}

function setStoredPartners(value: PartnerRecord[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(partnerStorageKey, JSON.stringify(value))
}

function setDeletedPartnerIds(value: string[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(deletedPartnerIdsStorageKey, JSON.stringify(value))
}

function parseCustomerCode(customerId: string) {
  const match = customerId.match(/^CUS-(\d+)$/i)
  return match ? Number.parseInt(match[1], 10) : 0
}

function parseOpportunityCode(opportunityId: string) {
  const match = opportunityId.match(/^OPP-(\d{4})-(\d+)$/i)
  return match ? Number.parseInt(match[2], 10) : 0
}

function parsePartnerCode(partnerId: string) {
  const match = partnerId.match(/^PTN-(\d+)$/i)
  return match ? Number.parseInt(match[1], 10) : 0
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function getCustomers(): CustomerRecord[] {
  const merged = new Map<string, CustomerRecord>()
  const deletedIds = new Set(getDeletedCustomerIds())
  for (const customer of baseCustomers) {
    if (!deletedIds.has(customer.id)) {
      merged.set(customer.id, customer)
    }
  }
  for (const customer of getStoredCustomers()) merged.set(customer.id, customer)
  return [...merged.values()]
}

export function getNextCustomerCode() {
  const nextNumber = getCustomers().reduce((max, customer) => Math.max(max, parseCustomerCode(customer.id)), 0) + 1
  return `CUS-${String(nextNumber).padStart(3, "0")}`
}

export function getOpportunities() {
  const merged = new Map<string, OpportunityRecord>()
  for (const opportunity of baseOpportunities) merged.set(opportunity.id, opportunity)
  for (const opportunity of getStoredOpportunities()) merged.set(opportunity.id, opportunity)
  return [...merged.values()]
}

export function getPartners() {
  const merged = new Map<string, PartnerRecord>()
  const deletedIds = new Set(getDeletedPartnerIds())
  for (const partner of basePartners) {
    if (!deletedIds.has(partner.id)) {
      merged.set(partner.id, partner)
    }
  }
  for (const partner of getStoredPartners()) merged.set(partner.id, partner)
  return [...merged.values()]
}

export function getNextPartnerCode() {
  const nextNumber = getPartners().reduce((max, partner) => Math.max(max, parsePartnerCode(partner.id)), 0) + 1
  return `PTN-${String(nextNumber).padStart(3, "0")}`
}

export function getNextOpportunityCode() {
  const nextNumber = getOpportunities().reduce((max, opportunity) => Math.max(max, parseOpportunityCode(opportunity.id)), 0) + 1
  return `OPP-2026-${String(nextNumber).padStart(3, "0")}`
}

export function getPartnerByName(partnerName: string) {
  const normalized = partnerName.trim().toLowerCase()
  if (!normalized) return null

  return getPartners().find((item) => item.name.trim().toLowerCase() === normalized) ?? null
}

export function registerCustomer(input: CustomerRegistrationInput) {
  const name = input.name.trim()
  const existing = getCustomerByName(name)
  if (existing) {
    return { status: "duplicate" as const, customer: existing }
  }

  const created: CustomerRecord = {
    id: getNextCustomerCode(),
    name,
    category: input.category,
    opportunities: 0,
    contracts: 0,
    contact: input.contacts[0]?.name?.trim() ?? "",
    phone: input.contacts[0]?.mobilePhone?.trim() ?? "",
    contacts: input.contacts
      .map((contact) => ({
        name: contact.name.trim(),
        position: contact.position?.trim() ?? "",
        department: contact.department?.trim() ?? "",
        email: contact.email?.trim() ?? "",
        mobilePhone: contact.mobilePhone?.trim() ?? "",
        landlinePhone: contact.landlinePhone?.trim() ?? "",
        fax: contact.fax?.trim() ?? "",
        duty: contact.duty?.trim() ?? "",
        memo: contact.memo?.trim() ?? "",
        businessCardImage: "",
      }))
      .filter((contact) => contact.name || contact.mobilePhone || contact.landlinePhone || contact.fax || contact.email || contact.memo || contact.position || contact.department || contact.duty),
    address: input.address?.trim() ?? "",
    memo: input.memo?.trim() ?? "",
    aliases: input.aliases?.filter(Boolean) ?? [],
    attachments: input.attachments ?? [],
  }

  const storedCustomers = getStoredCustomers()
  setStoredCustomers([...storedCustomers, created])
  setDeletedCustomerIds(getDeletedCustomerIds().filter((item) => item !== created.id))

  return { status: "created" as const, customer: created }
}

export function registerOpportunity(input: OpportunityRegistrationInput) {
  const customer = getCustomerByCode(input.customerCode)
  if (!customer) return { status: "customer_not_found" as const }
  const partnerData = buildOpportunityPartnerData(input.partners ?? (input.partner ? [input.partner] : []))

  const created: OpportunityRecord = {
    id: getNextOpportunityCode(),
    createdAt: formatDateKey(new Date()),
    customerCode: customer.id,
    partnerCode: partnerData.partnerCode,
    partnerCodes: partnerData.partnerCodes,
    name: input.name.trim(),
    registrant: input.registrant.trim(),
    customer: customer.name,
    partner: partnerData.partner,
    partners: partnerData.partners,
    category: input.category,
    product: input.product,
    module: input.module?.trim() || "-",
    expectedAmount: input.expectedAmount?.trim() || "-",
    expectedDate: input.expectedDate?.trim() || "-",
    issue: input.issue?.trim() || "-",
    competition: input.competition?.trim() || "-",
    decisionInfo: input.decisionInfo?.trim() || "-",
    partnerType: partnerData.partnerType,
    partnerContact: partnerData.partnerContact,
    partnerPhone: partnerData.partnerPhone,
    status: input.status?.trim() || "발굴",
    salesRep: input.salesRep?.trim() || "미지정",
    rfpAttachments: input.rfpAttachments ?? [],
  }

  setStoredOpportunities([...getStoredOpportunities(), created])
  return { status: "created" as const, opportunity: created }
}

export function registerPartner(input: PartnerRegistrationInput) {
  const name = input.name.trim()
  const existing = getPartnerByName(name)
  if (existing) {
    return { status: "duplicate" as const, partner: existing }
  }

  const contacts = input.contacts
    .map((contact) => ({
      name: contact.name.trim(),
      position: contact.position?.trim() ?? "",
      department: contact.department?.trim() ?? "",
      email: contact.email?.trim() ?? "",
      mobilePhone: contact.mobilePhone?.trim() ?? "",
      landlinePhone: contact.landlinePhone?.trim() ?? "",
      fax: contact.fax?.trim() ?? "",
      duty: contact.duty?.trim() ?? "",
      memo: contact.memo?.trim() ?? "",
      businessCardImage: "",
    }))
    .filter((contact) => contact.name || contact.position || contact.department || contact.email || contact.mobilePhone || contact.landlinePhone || contact.fax || contact.duty || contact.memo)

  const created: PartnerRecord = {
    id: getNextPartnerCode(),
    name,
    type: input.type,
    opportunities: 0,
    projects: 0,
    contact: contacts[0]?.name ?? "",
    phone: contacts[0]?.mobilePhone ?? "",
    contacts,
    contactName: contacts[0]?.name ?? "",
    position: contacts[0]?.position ?? "",
    department: contacts[0]?.department ?? "",
    email: contacts[0]?.email ?? "",
    mobilePhone: contacts[0]?.mobilePhone ?? "",
    landlinePhone: contacts[0]?.landlinePhone ?? "",
    fax: contacts[0]?.fax ?? "",
    duty: contacts[0]?.duty ?? "",
    address: input.address?.trim() ?? "",
    memo: input.memo?.trim() ?? "",
    attachments: input.attachments ?? [],
  }

  setStoredPartners([...getStoredPartners(), created])
  setDeletedPartnerIds(getDeletedPartnerIds().filter((item) => item !== created.id))

  return { status: "created" as const, partner: created }
}

export function updateCustomer(customerId: string, input: CustomerUpdateInput) {
  const normalizedId = customerId.trim()
  const existing = getCustomers().find((item) => item.id === normalizedId)
  if (!existing) return { status: "not_found" as const }

  const storedCustomers = getStoredCustomers().filter((item) => item.id !== normalizedId)
  const contacts = input.contacts
    .map((contact) => ({
      name: contact.name.trim(),
      position: contact.position?.trim() ?? "",
      department: contact.department?.trim() ?? "",
      email: contact.email?.trim() ?? "",
      mobilePhone: contact.mobilePhone?.trim() ?? "",
      landlinePhone: contact.landlinePhone?.trim() ?? "",
      fax: contact.fax?.trim() ?? "",
      duty: contact.duty?.trim() ?? "",
      memo: contact.memo?.trim() ?? "",
      businessCardImage: "",
    }))
    .filter((contact) => contact.name || contact.position || contact.department || contact.email || contact.mobilePhone || contact.landlinePhone || contact.fax || contact.duty || contact.memo)

  const nextRecord: CustomerRecord = {
    ...existing,
    name: input.name.trim(),
    category: input.category,
    address: input.address?.trim() ?? "",
    memo: input.memo?.trim() ?? "",
    contacts,
    contact: contacts[0]?.name ?? existing.contact,
    phone: contacts[0]?.mobilePhone ?? existing.phone,
    contactName: contacts[0]?.name ?? existing.contactName,
    position: contacts[0]?.position ?? existing.position,
    department: contacts[0]?.department ?? existing.department,
    email: contacts[0]?.email ?? existing.email,
    mobilePhone: contacts[0]?.mobilePhone ?? existing.mobilePhone,
    landlinePhone: contacts[0]?.landlinePhone ?? existing.landlinePhone,
    fax: contacts[0]?.fax ?? existing.fax,
    duty: contacts[0]?.duty ?? existing.duty,
    aliases: input.aliases?.filter(Boolean) ?? existing.aliases ?? [],
    attachments: input.attachments ?? existing.attachments ?? [],
  }

  setStoredCustomers([...storedCustomers, nextRecord])
  setDeletedCustomerIds(getDeletedCustomerIds().filter((item) => item !== normalizedId))
  return { status: "updated" as const, customer: nextRecord }
}

export function updateOpportunity(opportunityId: string, input: OpportunityUpdateInput) {
  const normalizedId = opportunityId.trim()
  const existing = getOpportunities().find((item) => item.id === normalizedId)
  if (!existing) return { status: "not_found" as const }

  const customer = getCustomerByCode(input.customerCode)
  if (!customer) return { status: "customer_not_found" as const }
  const partnerData = buildOpportunityPartnerData(input.partners ?? (input.partner ? [input.partner] : []))

  const nextRecord: OpportunityRecord = {
    ...existing,
    customerCode: customer.id,
    customer: customer.name,
    category: input.category,
    name: input.name.trim(),
    registrant: input.registrant.trim(),
    partner: partnerData.partner,
    partners: partnerData.partners,
    product: input.product,
    module: input.module?.trim() || "-",
    expectedAmount: input.expectedAmount?.trim() || "-",
    expectedDate: input.expectedDate?.trim() || "-",
    issue: input.issue?.trim() || "-",
    competition: input.competition?.trim() || "-",
    decisionInfo: input.decisionInfo?.trim() || "-",
    status: input.status?.trim() || existing.status,
    salesRep: input.salesRep?.trim() || existing.salesRep,
    partnerType: partnerData.partnerType,
    partnerCode: partnerData.partnerCode,
    partnerCodes: partnerData.partnerCodes,
    partnerContact: partnerData.partnerContact,
    partnerPhone: partnerData.partnerPhone,
    rfpAttachments: input.rfpAttachments ?? existing.rfpAttachments ?? [],
  }

  const storedOpportunities = getStoredOpportunities().filter((item) => item.id !== normalizedId)
  setStoredOpportunities([...storedOpportunities, nextRecord])
  return { status: "updated" as const, opportunity: nextRecord }
}

export function updatePartner(partnerId: string, input: PartnerUpdateInput) {
  const normalizedId = partnerId.trim()
  const existing = getPartners().find((item) => item.id === normalizedId)
  if (!existing) return { status: "not_found" as const }

  const contacts = input.contacts
    .map((contact) => ({
      name: contact.name.trim(),
      position: contact.position?.trim() ?? "",
      department: contact.department?.trim() ?? "",
      email: contact.email?.trim() ?? "",
      mobilePhone: contact.mobilePhone?.trim() ?? "",
      landlinePhone: contact.landlinePhone?.trim() ?? "",
      fax: contact.fax?.trim() ?? "",
      duty: contact.duty?.trim() ?? "",
      memo: contact.memo?.trim() ?? "",
      businessCardImage: "",
    }))
    .filter((contact) => contact.name || contact.position || contact.department || contact.email || contact.mobilePhone || contact.landlinePhone || contact.fax || contact.duty || contact.memo)

  const nextRecord: PartnerRecord = {
    ...existing,
    name: input.name.trim(),
    type: input.type,
    address: input.address?.trim() ?? "",
    memo: input.memo?.trim() ?? "",
    contacts,
    contact: contacts[0]?.name ?? existing.contact,
    phone: contacts[0]?.mobilePhone ?? existing.phone,
    contactName: contacts[0]?.name ?? existing.contactName,
    position: contacts[0]?.position ?? existing.position,
    department: contacts[0]?.department ?? existing.department,
    email: contacts[0]?.email ?? existing.email,
    mobilePhone: contacts[0]?.mobilePhone ?? existing.mobilePhone,
    landlinePhone: contacts[0]?.landlinePhone ?? existing.landlinePhone,
    fax: contacts[0]?.fax ?? existing.fax,
    duty: contacts[0]?.duty ?? existing.duty,
    attachments: input.attachments ?? existing.attachments ?? [],
  }

  const storedPartners = getStoredPartners().filter((item) => item.id !== normalizedId)
  setStoredPartners([...storedPartners, nextRecord])
  setDeletedPartnerIds(getDeletedPartnerIds().filter((item) => item !== normalizedId))

  return { status: "updated" as const, partner: nextRecord }
}

export function deleteCustomer(customerId: string) {
  const normalizedId = customerId.trim()
  const existing = getCustomers().find((item) => item.id === normalizedId)
  if (!existing) return { status: "not_found" as const }

  const filteredStoredCustomers = getStoredCustomers().filter((item) => item.id !== normalizedId)
  const deletedIds = new Set(getDeletedCustomerIds())
  deletedIds.add(normalizedId)

  setStoredCustomers(filteredStoredCustomers)
  setDeletedCustomerIds([...deletedIds])

  return { status: "deleted" as const, customer: existing }
}

export function deletePartner(partnerId: string) {
  const normalizedId = partnerId.trim()
  const existing = getPartners().find((item) => item.id === normalizedId)
  if (!existing) return { status: "not_found" as const }

  const filteredStoredPartners = getStoredPartners().filter((item) => item.id !== normalizedId)
  const deletedIds = new Set(getDeletedPartnerIds())
  deletedIds.add(normalizedId)

  setStoredPartners(filteredStoredPartners)
  setDeletedPartnerIds([...deletedIds])

  return { status: "deleted" as const, partner: existing }
}
