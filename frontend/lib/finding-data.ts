export type FindingCategory = "opportunities" | "customers" | "partners"
export type CustomerRecord = {
  id: string
  name: string
  category: string
  opportunities: number
  contracts: number
  contact: string
  phone: string
  aliases?: string[]
}
export type OpportunityRecord = {
  id: string
  customerCode: string
  partnerCode: string
  name: string
  customer: string
  partner: string
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

export const opportunities: OpportunityRecord[] = [
  { id: "OPP-2026-001", customerCode: "CUS-001", partnerCode: "-", name: "삼성전자 EMS 구축", customer: "삼성전자", partner: "-", category: "민간", product: "EMS", module: "SMS", expectedAmount: "5억", expectedDate: "2026년 2분기", issue: "인프라 통합 관제 체계 고도화 검토", competition: "기존 관제 솔루션 교체 경쟁", decisionInfo: "IT운영팀 홍길동 / 구매팀 협의", partnerType: "-", partnerContact: "-", partnerPhone: "-", status: "진행중", salesRep: "김영업" },
  { id: "OPP-2026-002", customerCode: "CUS-002", partnerCode: "PTN-001", name: "국방부 ITSM 도입", customer: "국방부", partner: "LG CNS", category: "공공", product: "ITSM", module: "ITSM", expectedAmount: "8억", expectedDate: "2026년 3분기", issue: "공공 ITSM 표준 프로세스 도입", competition: "대형 SI 제안 경쟁 예상", decisionInfo: "정보화담당관 김철수 / 단계별 승인", partnerType: "SI업체", partnerContact: "강대표", partnerPhone: "010-5678-9012", status: "발굴", salesRep: "이대리" },
  { id: "OPP-2026-003", customerCode: "CUS-003", partnerCode: "-", name: "현대차 Automation 확장", customer: "현대자동차", partner: "-", category: "민간", product: "Automation", module: "Automation", expectedAmount: "3억", expectedDate: "2026년 2분기", issue: "업무 자동화 적용 범위 확대", competition: "RPA 솔루션 비교 검토", decisionInfo: "디지털혁신팀 이영희", partnerType: "-", partnerContact: "-", partnerPhone: "-", status: "진행중", salesRep: "박과장" },
  { id: "OPP-2026-004", customerCode: "CUS-004", partnerCode: "PTN-002", name: "SK텔레콤 NMS 업그레이드", customer: "SK텔레콤", partner: "SK C&C", category: "민간", product: "EMS", module: "NMS", expectedAmount: "2억", expectedDate: "2026년 1분기", issue: "노후 NMS 기능 업그레이드", competition: "내부 개발 대체 가능성 검토", decisionInfo: "NW운영팀 박민수", partnerType: "SI업체", partnerContact: "윤실장", partnerPhone: "010-6789-0123", status: "유망", salesRep: "김영업" },
  { id: "OPP-2026-005", customerCode: "CUS-005", partnerCode: "PTN-003", name: "일본 NTT DoCoMo WSS", customer: "NTT DoCoMo", partner: "NTT DATA", category: "해외", product: "WSS", module: "WSS", expectedAmount: "10억", expectedDate: "2026년 4분기", issue: "해외 통신사 WSS 신규 도입", competition: "현지 벤더와 가격 경쟁", decisionInfo: "서비스기획 Tanaka / NTT DATA 협업", partnerType: "파트너", partnerContact: "Yamamoto", partnerPhone: "+81-90-2345-6789", status: "발굴", salesRep: "최부장" },
]

export const customers: CustomerRecord[] = [
  { id: "CUS-001", name: "삼성전자", category: "민간", opportunities: 3, contracts: 5, contact: "홍길동", phone: "010-1234-5678", aliases: ["samsung", "samsungelectronics"] },
  { id: "CUS-002", name: "국방부", category: "공공", opportunities: 2, contracts: 1, contact: "김철수", phone: "010-2345-6789", aliases: ["mnd"] },
  { id: "CUS-003", name: "현대자동차", category: "민간", opportunities: 2, contracts: 3, contact: "이영희", phone: "010-3456-7890", aliases: ["현대차", "hyundai", "hyundaimotor"] },
  { id: "CUS-004", name: "SK텔레콤", category: "민간", opportunities: 1, contracts: 4, contact: "박민수", phone: "010-4567-8901", aliases: ["skt", "sktelecom"] },
  { id: "CUS-005", name: "NTT DoCoMo", category: "해외", opportunities: 1, contracts: 0, contact: "Tanaka", phone: "+81-90-1234-5678", aliases: ["nttdocomo", "docomo"] },
  { id: "CUS-008", name: "엘지씨엔에스", category: "민간", opportunities: 1, contracts: 2, contact: "강대표", phone: "010-5678-9012", aliases: ["lg cns", "lgcns", "lgc", "엘지씨", "엘지씨엔에스", "lg 씨엔에스"] },
]

export const partners = [
  { id: "PTN-001", name: "LG CNS", type: "SI", opportunities: 2, projects: 3, contact: "강대표", phone: "010-5678-9012" },
  { id: "PTN-002", name: "SK C&C", type: "SI", opportunities: 1, projects: 2, contact: "윤실장", phone: "010-6789-0123" },
  { id: "PTN-003", name: "NTT DATA", type: "파트너", opportunities: 1, projects: 1, contact: "Yamamoto", phone: "+81-90-2345-6789" },
  { id: "PTN-004", name: "삼성SDS", type: "SI", opportunities: 0, projects: 4, contact: "정팀장", phone: "010-7890-1234" },
]

export const findingStatuses = ["진행중", "발굴", "유망"]

export function getFindingItem(category: FindingCategory, id: string) {
  if (category === "opportunities") return opportunities.find((item) => item.id === id) ?? null
  if (category === "customers") return customers.find((item) => item.id === id) ?? null
  return partners.find((item) => item.id === id) ?? null
}

export function getFindingFields(category: FindingCategory, item: any) {
  if (category === "opportunities") {
    return [
      { label: "사업기회번호", value: item.id },
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
    return [
      { label: "고객사코드", value: item.id },
      { label: "고객사명", value: item.name },
      { label: "고객군", value: item.category },
      { label: "담당자", value: item.contact },
      { label: "연락처", value: item.phone },
      { label: "주소", value: "-" },
      { label: "메모", value: `진행중 사업기회 ${item.opportunities}건 / 계약 ${item.contracts}건` },
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
      "고객사 의사결정구조 및 담당자 정보": `${item.contact} / ${item.phone}`,
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

  return customers.some((item) => item.name.trim().toLowerCase() === normalized)
}

export function getCustomerByName(customerName: string) {
  const normalized = normalizeCustomerKeyword(customerName)
  if (!normalized) return null

  return (
    customers.find((item) => {
      if (normalizeCustomerKeyword(item.name) === normalized) return true
      return item.aliases?.some((alias) => normalizeCustomerKeyword(alias) === normalized)
    }) ?? null
  )
}

export function getCustomerByCode(customerCode: string) {
  const normalized = customerCode.trim().toLowerCase()
  if (!normalized) return null

  return customers.find((item) => item.id.trim().toLowerCase() === normalized) ?? null
}

export function getOpportunitiesByCustomerName(customerName: string) {
  const customer = getCustomerByName(customerName)
  if (!customer) return []

  return opportunities.filter((item) => item.customerCode === customer.id)
}

export function normalizeCustomerKeyword(value: string) {
  return value.trim().toLowerCase().replace(/[\s\-_.()/]/g, "")
}

export function searchCustomers(query: string) {
  const normalized = normalizeCustomerKeyword(query)
  if (!normalized) return customers

  return [...customers]
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
