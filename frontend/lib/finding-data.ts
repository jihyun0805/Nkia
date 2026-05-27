import type { StoredFileAttachment } from "@/lib/attachments";
import { fuzzyMatch } from "@/lib/fuzzy-match";

export type FindingCategory = "opportunities" | "customers" | "partners";
export type CustomerAttachment = StoredFileAttachment;
// 발굴 화면에서 공통으로 쓰는 고객사/협력사/사업기회 데이터 모델.
// 각 타입은 상세 페이지, 목록, 검색, 등록/수정 폼에서 같은 레코드를 재사용한다.
export type CustomerRecord = {
  id: string;
  backendId?: number;
  name: string;
  category: string;
  opportunities: number;
  contracts: number;
  contact: string;
  phone: string;
  contacts?: CustomerContact[];
  contactName?: string;
  position?: string;
  department?: string;
  email?: string;
  mobilePhone?: string;
  landlinePhone?: string;
  fax?: string;
  duty?: string;
  address?: string;
  memo?: string;
  aliases?: string[];
  attachments?: CustomerAttachment[];
};
export type CustomerContact = {
  name: string;
  position?: string;
  department?: string;
  email?: string;
  mobilePhone?: string;
  landlinePhone?: string;
  fax?: string;
  duty?: string;
  memo?: string;
  businessCardImage?: string;
};
export type PartnerRecord = {
  id: string;
  backendId?: number;
  name: string;
  type: string;
  opportunities: number;
  projects: number;
  contact: string;
  phone: string;
  contacts?: CustomerContact[];
  contactName?: string;
  position?: string;
  department?: string;
  email?: string;
  mobilePhone?: string;
  landlinePhone?: string;
  fax?: string;
  duty?: string;
  address?: string;
  memo?: string;
  attachments?: CustomerAttachment[];
};
export type OpportunityRecord = {
  id: string;
  backendId?: number;
  customerCompanyId?: number;
  createdAt: string;
  createUserName?: string;
  customerCode: string;
  partnerCode: string;
  partnerCodes?: string[];
  name: string;
  registrant: string;
  customer: string;
  partner: string;
  partners?: string[];
  category: string;
  product: string;
  module: string;
  expectedAmount: string;
  expectedDate: string;
  issue: string;
  competition: string;
  decisionInfo: string;
  partnerType: string;
  partnerContact: string;
  partnerPhone: string;
  status: string;
  salesRepresentativeId?: string;
  salesRep: string;
  partnerCompanyIds?: number[];
  partnerCompanyNames?: string[];
  productModuleIds?: number[];
  productModuleNames?: string[];
  rfpFileIds?: number[];
  rfpFileNames?: string[];
  rfpFileSizes?: number[];
  rfpAttachments?: OpportunityAttachment[];
};
export type OpportunityAttachment = {
  id: string;
  name: string;
  size: number;
  contentType: string;
  dataUrl: string;
  summary: string;
  createdAt: string;
};
export type FindingFormField = {
  label: string;
  required?: boolean;
  type?: "text" | "textarea" | "select" | "file";
  options?: string[];
};

export type FindingFormSection = {
  title: string;
  fields: FindingFormField[];
};

// 등록/수정 화면에서 서버 대신 로컬 스토리지에 저장할 때 쓰는 입력 전용 타입.
type CustomerRegistrationInput = {
  name: string;
  category: string;
  contacts: CustomerContact[];
  address?: string;
  memo?: string;
  aliases?: string[];
  attachments?: CustomerAttachment[];
};

type CustomerUpdateInput = {
  name: string;
  category: string;
  contacts: CustomerContact[];
  address?: string;
  memo?: string;
  aliases?: string[];
  attachments?: CustomerAttachment[];
};

type OpportunityRegistrationInput = {
  customerCode: string;
  category: string;
  name: string;
  registrant: string;
  partner?: string;
  partners?: string[];
  expectedDate?: string;
  expectedAmount?: string;
  product: string;
  module?: string;
  issue?: string;
  competition?: string;
  decisionInfo?: string;
  status?: string;
  salesRep?: string;
  rfpAttachments?: OpportunityAttachment[];
};

type OpportunityUpdateInput = OpportunityRegistrationInput;
type PartnerRegistrationInput = {
  name: string;
  type: string;
  contacts: CustomerContact[];
  address?: string;
  memo?: string;
  attachments?: CustomerAttachment[];
};
type PartnerUpdateInput = PartnerRegistrationInput;

const customerStorageKey = "orbis.customers";
const deletedCustomerIdsStorageKey = "orbis.deleted-customer-ids";
const opportunityStorageKey = "orbis.opportunities";
const deletedOpportunityIdsStorageKey = "orbis.deleted-opportunity-ids";
const partnerStorageKey = "orbis.partners";
const deletedPartnerIdsStorageKey = "orbis.deleted-partner-ids";
// 발굴 화면에서 고객군과 사업구분 select 옵션을 만드는 정적 코드값.
// DASHBOARD 같은 값은 단순 문자열이 아니라 사업군 코드로 취급된다.
const customerGroupOptions = ["공공", "민간", "해외"];
const businessTypeOptions = ["EMS", "DASHBOARD", "DATACENTER", "RCA", "DCA", "ITSM", "ITAM", "SUPPORTING_TOOLS", "CLOUD", "BSM", "E2E", "ETC"];

// 발굴 등록 폼의 섹션/필드 정의.
// 이 정의를 기준으로 신규/수정/상세 화면의 입력 항목과 라벨이 맞춰진다.
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
];

export const opportunities: OpportunityRecord[] = [];

export const customers: CustomerRecord[] = [];

export const partners: PartnerRecord[] = [];

export const findingStatuses: string[] = ["진행중", "발굴", "유망"];

// 협력사 여러 개를 문자열 배열로 받을 때 중복/공백을 제거해 화면과 저장 형식을 통일한다.
function normalizePartnerNames(partners: string[] = []) {
  return Array.from(new Set(partners.map((partner) => partner.trim()).filter(Boolean)));
}

function buildOpportunityPartnerData(partners: string[]) {
  const normalizedPartners = normalizePartnerNames(partners);
  const matchedPartners = normalizedPartners.map((partnerName) => getPartnerByName(partnerName)).filter((partner): partner is PartnerRecord => Boolean(partner));

  return {
    partner: normalizedPartners.length > 0 ? normalizedPartners.join(", ") : "-",
    partners: normalizedPartners,
    partnerCode: matchedPartners.length > 0 ? matchedPartners.map((partner) => partner.id).join(", ") : "-",
    partnerCodes: matchedPartners.map((partner) => partner.id),
    partnerType: matchedPartners.length > 1 ? "복수" : (matchedPartners[0]?.type ?? (normalizedPartners.length > 0 ? "기타" : "-")),
    partnerContact: matchedPartners.length > 0 ? matchedPartners.map((partner) => partner.contactName ?? partner.contact ?? "-").join(", ") : "-",
    partnerPhone: matchedPartners.length > 0 ? matchedPartners.map((partner) => partner.mobilePhone ?? partner.phone ?? "-").join(", ") : "-",
  };
}

// 발굴 상세 화면에서 고객사/협력사/사업기회 중 무엇을 보여줄지 찾는 공통 조회 함수.
export function getFindingItem(category: FindingCategory, id: string) {
  if (category === "opportunities") return getOpportunities().find((item) => item.id === id) ?? null;
  if (category === "customers") return getCustomers().find((item) => item.id === id) ?? null;
  return getPartners().find((item) => item.id === id) ?? null;
}

// 상세 카드/테이블에 표시할 “항목명 / 값” 쌍을 구성한다.
// 카테고리별로 보여줄 정보가 달라서 여기서 한 번에 표준화한다.
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
    ];
  }
  if (category === "customers") {
    const contacts =
      Array.isArray(item.contacts) && item.contacts.length > 0
        ? item.contacts
        : [
            {
              name: item.contactName ?? item.contact ?? "-",
              position: item.position ?? "",
              department: item.department ?? "",
              email: item.email ?? "",
              mobilePhone: item.mobilePhone ?? item.phone ?? "",
              landlinePhone: item.landlinePhone ?? "",
              fax: item.fax ?? "",
              duty: item.duty ?? "",
              memo: item.memo ?? "",
            },
          ];
    return [
      { label: "고객사코드", value: item.id },
      { label: "고객사명", value: item.name },
      { label: "고객군", value: item.category },
      { label: "담당자 수", value: `${contacts.length}명` },
      { label: "담당자 요약", value: contacts.map((contact: CustomerContact, index: number) => `${index + 1}. ${contact.name}${contact.position ? ` / ${contact.position}` : ""}`).join(" | ") },
      { label: "주소", value: item.address ?? "-" },
      { label: "메모", value: item.memo ?? `진행중 사업기회 ${item.opportunities}건 / 계약 ${item.contracts}건` },
    ];
  }
  return [
    { label: "협력사코드", value: item.id },
    { label: "협력사명", value: item.name },
    { label: "유형", value: item.type },
    { label: "담당자", value: item.contact },
    { label: "연락처", value: item.phone },
    { label: "주요 협업 분야", value: `진행중 사업기회 ${item.opportunities}건 / 진행중 프로젝트 ${item.projects}건` },
  ];
}

// 폼 필드명으로 저장된 실제 값을 다시 꺼내서 상세/편집 화면에 채워 넣는 헬퍼.
export function getFindingFormFieldValue(category: FindingCategory, item: any, label: string) {
  if (category === "opportunities") {
    const values: Record<string, string> = {
      사업명: item.name,
      고객군: item.category,
      협력사명: item.partner,
      "예상 입찰 또는 계약 시점": item.expectedDate,
      "예상 예산 또는 매출": item.expectedAmount,
      "사업 구분": item.product,
      "납품 모듈": item.module,
      "주요 사업 내용 및 주요 이슈 내용": item.issue,
      "경쟁 상황": item.competition,
      "고객사 의사결정구조 및 담당자 정보": item.decisionInfo,
    };
    return values[label] ?? "";
  }

  if (category === "customers") {
    const values: Record<string, string> = {
      사업명: item.name,
      고객군: item.category,
      "고객사 의사결정구조 및 담당자 정보": `${item.contactName ?? item.contact} / ${item.mobilePhone ?? item.phone}`,
      주소: item.address ?? "",
      메모: item.memo ?? "",
    };
    return values[label] ?? "";
  }

  const values: Record<string, string> = {
    협력사명: item.name,
  };
  return values[label] ?? "";
}

// 화면 상단 탭/버튼에서 쓰는 한글 표시명으로 변환한다.
export function getFindingCategoryLabel(category: FindingCategory) {
  if (category === "opportunities") return "사업기회";
  if (category === "customers") return "고객사";
  return "협력사";
}

// 고객사 등록 여부를 이름 기준으로 판별한다.
// 신규 입력 시 중복 등록을 막거나 자동완성 후보를 추릴 때 사용한다.
export function hasRegisteredCustomer(customerName: string) {
  const normalized = customerName.trim().toLowerCase();
  if (!normalized) return false;

  return getCustomers().some((item) => item.name.trim().toLowerCase() === normalized);
}

// 고객사명/별칭 기준으로 고객 레코드를 찾아온다.
// 발굴 화면 자동채움과 상세 조회의 핵심 매칭 로직이다.
export function getCustomerByName(customerName: string) {
  const normalized = normalizeCustomerKeyword(customerName);
  if (!normalized) return null;

  return (
    getCustomers().find((item) => {
      if (normalizeCustomerKeyword(item.name) === normalized) return true;
      return item.aliases?.some((alias) => normalizeCustomerKeyword(alias) === normalized);
    }) ?? null
  );
}

// 고객사 코드를 기준으로 정확히 한 건을 찾는다.
export function getCustomerByCode(customerCode: string) {
  const normalized = customerCode.trim().toLowerCase();
  if (!normalized) return null;

  return getCustomers().find((item) => item.id.trim().toLowerCase() === normalized) ?? null;
}

// 특정 고객사에 연결된 사업기회만 필터링한다.
export function getOpportunitiesByCustomerName(customerName: string) {
  const customer = getCustomerByName(customerName);
  if (!customer) return [];

  return getOpportunities().filter((item) => item.customerCode === customer.id);
}

// 검색어 비교를 위해 공백/기호를 제거한 정규화 문자열을 만든다.
export function normalizeCustomerKeyword(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.()/]/g, "");
}

// 발굴 목록의 고객사 자동완성 검색.
export function searchCustomers(query: string) {
  if (!query || !query.trim()) return getCustomers();
  const hits = fuzzyMatch(query, getCustomers(), (c) => [c.name, c.id, ...(c.aliases ?? [])], 20);
  return hits.map((h) => h.item);
}

// 발굴 목록의 협력사 자동완성 검색.
export function searchPartners(query: string) {
  if (!query || !query.trim()) return getPartners();
  const hits = fuzzyMatch(query, getPartners(), (p) => [p.name, p.id, p.contactName ?? "", p.email ?? ""], 20);
  return hits.map((h) => h.item);
}

// 발굴 목록의 사업기회 자동완성 검색.
export function searchOpportunities(query: string) {
  if (!query || !query.trim()) return getOpportunities();
  const hits = fuzzyMatch(query, getOpportunities(), (o) => [o.name, o.id, o.customer, o.customerCode, o.product], 20);
  return hits.map((h) => h.item);
}

// 아래부터는 브라우저 localStorage와 기본 목 데이터를 섞어서 읽고 쓰는 계층이다.
// 서버가 없거나 초기 데이터가 비어 있어도 화면이 동작하도록 하는 역할을 한다.
function getStoredCustomers(): CustomerRecord[] {
  if (typeof window === "undefined") return [];

  const stored = window.localStorage.getItem(customerStorageKey);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as CustomerRecord[];
    return Array.isArray(parsed)
      ? parsed
          .filter((item) => item && typeof item.id === "string" && typeof item.name === "string")
          .map((item) => ({
            ...item,
            aliases: Array.isArray(item.aliases) ? item.aliases.filter((alias) => typeof alias === "string") : [],
            attachments: Array.isArray(item.attachments) ? item.attachments.filter((attachment) => attachment && typeof attachment.id === "string" && typeof attachment.name === "string") : [],
          }))
      : [];
  } catch {
    return [];
  }
}

// 저장된 사업기회 데이터를 읽는다.
// 파트너 코드/배열을 정규화해서 상세 화면과 편집 화면에서 같은 형태로 다루게 한다.
function getStoredOpportunities(): OpportunityRecord[] {
  if (typeof window === "undefined") return [];

  const stored = window.localStorage.getItem(opportunityStorageKey);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as OpportunityRecord[];
    return Array.isArray(parsed)
      ? parsed
          .filter(
            (item) =>
              item && typeof item.id === "string" && typeof item.createdAt === "string" && typeof item.customerCode === "string" && typeof item.name === "string" && typeof item.customer === "string",
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
                ? item.partnerCode
                    .split(",")
                    .map((partnerCode) => partnerCode.trim())
                    .filter(Boolean)
                : [],
          }))
      : [];
  } catch {
    return [];
  }
}

// 저장된 협력사 데이터를 읽는다.
function getStoredPartners(): PartnerRecord[] {
  if (typeof window === "undefined") return [];

  const stored = window.localStorage.getItem(partnerStorageKey);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as PartnerRecord[];
    return Array.isArray(parsed)
      ? parsed
          .filter((item) => item && typeof item.id === "string" && typeof item.name === "string")
          .map((item) => ({
            ...item,
            attachments: Array.isArray(item.attachments) ? item.attachments.filter((attachment) => attachment && typeof attachment.id === "string" && typeof attachment.name === "string") : [],
          }))
      : [];
  } catch {
    return [];
  }
}

// 이미 삭제한 고객사 ID를 따로 보관해 재노출을 막는다.
function getDeletedCustomerIds(): string[] {
  if (typeof window === "undefined") return [];

  const stored = window.localStorage.getItem(deletedCustomerIdsStorageKey);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as string[];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

// 이미 삭제한 협력사 ID를 따로 보관해 재노출을 막는다.
function getDeletedPartnerIds(): string[] {
  if (typeof window === "undefined") return [];

  const stored = window.localStorage.getItem(deletedPartnerIdsStorageKey);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as string[];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

// 이미 삭제한 사업기회 ID를 따로 보관해 재노출을 막는다.
function getDeletedOpportunityIds(): string[] {
  if (typeof window === "undefined") return [];

  const stored = window.localStorage.getItem(deletedOpportunityIdsStorageKey);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as string[];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

// localStorage에 고객사 목록을 저장한다.
function setStoredCustomers(value: CustomerRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(customerStorageKey, JSON.stringify(value));
}

// 고객사 삭제 이력 ID 목록을 저장한다.
function setDeletedCustomerIds(value: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(deletedCustomerIdsStorageKey, JSON.stringify(value));
}

// localStorage에 사업기회 목록을 저장한다.
function setStoredOpportunities(value: OpportunityRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(opportunityStorageKey, JSON.stringify(value));
}

// localStorage에 협력사 목록을 저장한다.
function setStoredPartners(value: PartnerRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(partnerStorageKey, JSON.stringify(value));
}

// 협력사 삭제 이력 ID 목록을 저장한다.
function setDeletedPartnerIds(value: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(deletedPartnerIdsStorageKey, JSON.stringify(value));
}

// 사업기회 삭제 이력 ID 목록을 저장한다.
function setDeletedOpportunityIds(value: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(deletedOpportunityIdsStorageKey, JSON.stringify(value));
}

// CUS-123 같은 고객사 코드를 숫자 순번으로 환산한다.
function parseCustomerCode(customerId: string) {
  const match = customerId.match(/^CUS-(\d+)$/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

// OPP-2026-001 같은 사업기회 코드를 숫자 순번으로 환산한다.
function parseOpportunityCode(opportunityId: string) {
  const match = opportunityId.match(/^OPP-(\d{4})-(\d+)$/i);
  return match ? Number.parseInt(match[2], 10) : 0;
}

// PTN-123 같은 협력사 코드를 숫자 순번으로 환산한다.
function parsePartnerCode(partnerId: string) {
  const match = partnerId.match(/^PTN-(\d+)$/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getCustomers(): CustomerRecord[] {
  const deletedIds = new Set(getDeletedCustomerIds());
  return getStoredCustomers().filter((customer) => !deletedIds.has(customer.id));
}

export function getNextCustomerCode() {
  const nextNumber = getCustomers().reduce((max, customer) => Math.max(max, parseCustomerCode(customer.id)), 0) + 1;
  return `CUS-${String(nextNumber).padStart(3, "0")}`;
}

export function getOpportunities() {
  const deletedIds = new Set(getDeletedOpportunityIds());
  return getStoredOpportunities().filter((opportunity) => !deletedIds.has(opportunity.id));
}

export function getPartners() {
  const deletedIds = new Set(getDeletedPartnerIds());
  return getStoredPartners().filter((partner) => !deletedIds.has(partner.id));
}

export function getNextPartnerCode() {
  const nextNumber = getPartners().reduce((max, partner) => Math.max(max, parsePartnerCode(partner.id)), 0) + 1;
  return `PTN-${String(nextNumber).padStart(3, "0")}`;
}

export function getNextOpportunityCode() {
  const nextNumber = getOpportunities().reduce((max, opportunity) => Math.max(max, parseOpportunityCode(opportunity.id)), 0) + 1;
  return `OPP-2026-${String(nextNumber).padStart(3, "0")}`;
}

export function getPartnerByName(partnerName: string) {
  const normalized = partnerName.trim().toLowerCase();
  if (!normalized) return null;

  return getPartners().find((item) => item.name.trim().toLowerCase() === normalized) ?? null;
}

export function registerCustomer(input: CustomerRegistrationInput) {
  const name = input.name.trim();
  const existing = getCustomerByName(name);
  if (existing) {
    return { status: "duplicate" as const, customer: existing };
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
  };

  const storedCustomers = getStoredCustomers();
  setStoredCustomers([...storedCustomers, created]);
  setDeletedCustomerIds(getDeletedCustomerIds().filter((item) => item !== created.id));

  return { status: "created" as const, customer: created };
}

export function registerOpportunity(input: OpportunityRegistrationInput) {
  const customer = getCustomerByCode(input.customerCode);
  if (!customer) return { status: "customer_not_found" as const };
  const partnerData = buildOpportunityPartnerData(input.partners ?? (input.partner ? [input.partner] : []));

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
  };

  setStoredOpportunities([...getStoredOpportunities(), created]);
  setDeletedOpportunityIds(getDeletedOpportunityIds().filter((item) => item !== created.id));
  return { status: "created" as const, opportunity: created };
}

export function registerPartner(input: PartnerRegistrationInput) {
  const name = input.name.trim();
  const existing = getPartnerByName(name);
  if (existing) {
    return { status: "duplicate" as const, partner: existing };
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
    .filter((contact) => contact.name || contact.position || contact.department || contact.email || contact.mobilePhone || contact.landlinePhone || contact.fax || contact.duty || contact.memo);

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
  };

  setStoredPartners([...getStoredPartners(), created]);
  setDeletedPartnerIds(getDeletedPartnerIds().filter((item) => item !== created.id));

  return { status: "created" as const, partner: created };
}

export function updateCustomer(customerId: string, input: CustomerUpdateInput) {
  const normalizedId = customerId.trim();
  const existing = getCustomers().find((item) => item.id === normalizedId);
  if (!existing) return { status: "not_found" as const };

  const storedCustomers = getStoredCustomers().filter((item) => item.id !== normalizedId);
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
    .filter((contact) => contact.name || contact.position || contact.department || contact.email || contact.mobilePhone || contact.landlinePhone || contact.fax || contact.duty || contact.memo);

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
  };

  setStoredCustomers([...storedCustomers, nextRecord]);
  setDeletedCustomerIds(getDeletedCustomerIds().filter((item) => item !== normalizedId));
  return { status: "updated" as const, customer: nextRecord };
}

export function updateOpportunity(opportunityId: string, input: OpportunityUpdateInput) {
  const normalizedId = opportunityId.trim();
  const existing = getOpportunities().find((item) => item.id === normalizedId);
  if (!existing) return { status: "not_found" as const };

  const customer = getCustomerByCode(input.customerCode);
  if (!customer) return { status: "customer_not_found" as const };
  const partnerData = buildOpportunityPartnerData(input.partners ?? (input.partner ? [input.partner] : []));

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
  };

  const storedOpportunities = getStoredOpportunities().filter((item) => item.id !== normalizedId);
  setStoredOpportunities([...storedOpportunities, nextRecord]);
  setDeletedOpportunityIds(getDeletedOpportunityIds().filter((item) => item !== normalizedId));
  return { status: "updated" as const, opportunity: nextRecord };
}

export function updatePartner(partnerId: string, input: PartnerUpdateInput) {
  const normalizedId = partnerId.trim();
  const existing = getPartners().find((item) => item.id === normalizedId);
  if (!existing) return { status: "not_found" as const };

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
    .filter((contact) => contact.name || contact.position || contact.department || contact.email || contact.mobilePhone || contact.landlinePhone || contact.fax || contact.duty || contact.memo);

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
  };

  const storedPartners = getStoredPartners().filter((item) => item.id !== normalizedId);
  setStoredPartners([...storedPartners, nextRecord]);
  setDeletedPartnerIds(getDeletedPartnerIds().filter((item) => item !== normalizedId));

  return { status: "updated" as const, partner: nextRecord };
}

export function deleteOpportunity(opportunityId: string) {
  const normalizedId = opportunityId.trim();
  const existing = getOpportunities().find((item) => item.id === normalizedId);
  if (!existing) return { status: "not_found" as const };

  const filteredStoredOpportunities = getStoredOpportunities().filter((item) => item.id !== normalizedId);
  const deletedIds = new Set(getDeletedOpportunityIds());
  deletedIds.add(normalizedId);

  setStoredOpportunities(filteredStoredOpportunities);
  setDeletedOpportunityIds([...deletedIds]);

  return { status: "deleted" as const, opportunity: existing };
}

export function deleteCustomer(customerId: string) {
  const normalizedId = customerId.trim();
  const existing = getCustomers().find((item) => item.id === normalizedId);
  if (!existing) return { status: "not_found" as const };

  const filteredStoredCustomers = getStoredCustomers().filter((item) => item.id !== normalizedId);
  const deletedIds = new Set(getDeletedCustomerIds());
  deletedIds.add(normalizedId);

  setStoredCustomers(filteredStoredCustomers);
  setDeletedCustomerIds([...deletedIds]);

  return { status: "deleted" as const, customer: existing };
}

export function deletePartner(partnerId: string) {
  const normalizedId = partnerId.trim();
  const existing = getPartners().find((item) => item.id === normalizedId);
  if (!existing) return { status: "not_found" as const };

  const filteredStoredPartners = getStoredPartners().filter((item) => item.id !== normalizedId);
  const deletedIds = new Set(getDeletedPartnerIds());
  deletedIds.add(normalizedId);

  setStoredPartners(filteredStoredPartners);
  setDeletedPartnerIds([...deletedIds]);

  return { status: "deleted" as const, partner: existing };
}
