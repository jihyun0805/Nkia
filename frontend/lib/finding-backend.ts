"use client";

import { getBackendApiBaseUrl } from "@/lib/api-base-url";
import { buildAuthHeaders } from "@/lib/auth-session";
import type { CustomerContact, CustomerRecord, OpportunityRecord, PartnerRecord } from "@/lib/finding-data";

type ApiResponse<T> = {
  result?: string;
  success?: boolean;
  data?: T | null;
  errorCode?: string | null;
  message?: string | null;
};

type PageResponse<T> = {
  content?: T[];
};

export type BackendUserSummary = {
  id?: string;
  employeeNumber?: string;
  name?: string;
  email?: string;
};

type CompanySummaryResponse = {
  id?: number;
  companyType?: "CUSTOMER" | "PARTNER" | string;
  code?: string;
  name?: string;
  businessRegistrationNumber?: string;
  sector?: "PUBLIC" | "PRIVATE" | "OVERSEAS" | string;
  category?: "SI" | "SOLUTION" | "ETC" | string;
  address?: string;
  memo?: string;
};

type CompanyManagerSummaryResponse = {
  id?: number;
  companyId?: number;
  companyName?: string;
  name?: string;
  email?: string;
  mobilePhone?: string;
  officePhone?: string;
  department?: string;
  position?: string;
  role?: string;
  memo?: string;
};

export type ProjectOpportunitySummaryResponse = {
  id?: number;
  opportunityCode?: string;
  opportunityName?: string;
  stage?: string;
  projectType?: string;
  expectedBidDate?: string;
  expectedBudget?: number | string;
  customerCompanyId?: number;
  customerCompanyName?: string;
  salesRepresentativeId?: string;
  salesRepresentativeName?: string;
  createUserName?: string;
  description?: string;
  competitionStatus?: string;
  partnerCompanyIds?: number[];
  partnerCompanyNames?: string[];
  partnerCompanies?: Array<{
    id?: number;
    name?: string;
  }>;
  productModuleIds?: number[];
  productModuleNames?: string[];
  productModules?: Array<{
    id?: number;
    productName?: string;
  }>;
  rfpFileIds?: number[];
  rfpFileNames?: string[];
  rfpFileSizes?: number[];
  rfpFiles?: Array<{
    id?: number;
    originalFileName?: string;
    fileName?: string;
    size?: number;
  }>;
};

type OpportunityDisplayOverride = {
  competitionStatus?: string;
};

type CompanyDisplayOverride = {
  memo?: string;
};

type BackendProductModuleSummary = {
  id?: number;
  productName?: string;
};

type OrderReportSummaryResponse = {
  id?: number;
  projectOpportunityId?: number;
  projectName?: string;
  finalCustomerCompanyId?: number;
  finalCustomerCompanyName?: string;
};

export type FindingBackendData = {
  opportunities: OpportunityRecord[];
  customers: CustomerRecord[];
  partners: PartnerRecord[];
};

const opportunityDisplayOverrideStorageKey = "orbis.project-opportunity-display-overrides";
const rfpAttachmentSummaryStorageKey = "orbis.project-opportunity-rfp-summaries";

type RfpAttachmentSummaryRecord = {
  opportunityId?: number;
  opportunityCode?: string;
  fileId?: number;
  name: string;
  size?: number;
  summary: string;
  updatedAt: string;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeResponseMessage<T>(response: Response, fallbackMessage: string): Promise<T> {
  return response
    .json()
    .catch(() => null)
    .then((payload) => {
      const body = payload as ApiResponse<T> | null;
      if (!response.ok) {
        throw new Error(body?.message || fallbackMessage);
      }
      const isSuccess = body?.result === "SUCCESS" || body?.success === true;
      if (!isSuccess || body?.data == null) {
        throw new Error(body?.message || fallbackMessage);
      }
      return body.data;
    });
}

function loadOpportunityDisplayOverrides() {
  if (!isBrowser()) return {} as Record<string, OpportunityDisplayOverride>;

  const stored = window.localStorage.getItem(opportunityDisplayOverrideStorageKey);
  if (!stored) return {} as Record<string, OpportunityDisplayOverride>;

  try {
    const parsed = JSON.parse(stored) as Record<string, OpportunityDisplayOverride>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveOpportunityDisplayOverrides(overrides: Record<string, OpportunityDisplayOverride>) {
  if (!isBrowser()) return;
  window.localStorage.setItem(opportunityDisplayOverrideStorageKey, JSON.stringify(overrides));
}

function setOpportunityDisplayOverride(opportunityCode?: string, override?: OpportunityDisplayOverride) {
  const normalizedCode = opportunityCode?.trim();
  if (!normalizedCode) return;

  const overrides = loadOpportunityDisplayOverrides();
  overrides[normalizedCode] = {
    ...overrides[normalizedCode],
    ...override,
  };
  saveOpportunityDisplayOverrides(overrides);
}

function getOpportunityDisplayOverride(opportunityCode?: string) {
  const normalizedCode = opportunityCode?.trim();
  if (!normalizedCode) return null;
  return loadOpportunityDisplayOverrides()[normalizedCode] ?? null;
}

function loadRfpAttachmentSummaryRecords() {
  if (!isBrowser()) return [] as RfpAttachmentSummaryRecord[];

  const stored = window.localStorage.getItem(rfpAttachmentSummaryStorageKey);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as RfpAttachmentSummaryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRfpAttachmentSummaryRecords(records: RfpAttachmentSummaryRecord[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(rfpAttachmentSummaryStorageKey, JSON.stringify(records));
}

function getRfpAttachmentSummary(params: {
  opportunityId?: number;
  opportunityCode?: string;
  fileId?: number;
  name?: string;
  size?: number;
}) {
  const opportunityCode = params.opportunityCode?.trim();
  const matched = loadRfpAttachmentSummaryRecords().find((record) => {
    const sameOpportunity =
      (params.opportunityId != null && record.opportunityId === params.opportunityId) ||
      (opportunityCode && record.opportunityCode === opportunityCode);
    if (!sameOpportunity) return false;
    if (params.fileId != null && record.fileId === params.fileId) return true;
    return Boolean(params.name && record.name === params.name && (params.size == null || record.size === params.size));
  });

  return matched?.summary ?? "";
}

export function saveRfpAttachmentSummariesForOpportunity(
  opportunity: Pick<ProjectOpportunitySummaryResponse, "id" | "opportunityCode">,
  attachments: Array<{ fileId?: number; name: string; size?: number; summary?: string }>,
) {
  const summarized = attachments
    .filter((attachment) => String(attachment.summary ?? "").trim())
    .map((attachment) => ({
      opportunityId: opportunity.id,
      opportunityCode: opportunity.opportunityCode,
      fileId: attachment.fileId,
      name: attachment.name,
      size: attachment.size,
      summary: String(attachment.summary).trim(),
      updatedAt: new Date().toISOString(),
    }));

  if (summarized.length === 0) return;

  const retained = loadRfpAttachmentSummaryRecords().filter((record) => {
    return !summarized.some((item) => {
      const sameOpportunity =
        (item.opportunityId != null && record.opportunityId === item.opportunityId) ||
        (item.opportunityCode && record.opportunityCode === item.opportunityCode);
      if (!sameOpportunity) return false;
      if (item.fileId != null && record.fileId === item.fileId) return true;
      return record.name === item.name && record.size === item.size;
    });
  });

  saveRfpAttachmentSummaryRecords([...retained, ...summarized]);
}

function normalizeLookupText(value?: string | number | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s\u00A0]+/g, "");
}

async function normalizeVoidResponse(response: Response, fallbackMessage: string): Promise<void> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<null> | null;

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }

  const isSuccess = payload?.result === "SUCCESS" || payload?.success === true;
  if (!isSuccess) {
    throw new Error(payload?.message || fallbackMessage);
  }
}

async function fetchList<T>(url: string, fallbackMessage: string) {
  const response = await fetch(url, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  });

  return normalizeResponseMessage<T>(response, fallbackMessage);
}

async function loadProductModules() {
  const payload = await fetchList<BackendProductModuleSummary[]>(
    `${getBackendApiBaseUrl()}/admin/product-modules`,
    "제품 모듈 목록을 불러오지 못했습니다.",
  );
  return Array.isArray(payload) ? payload : [];
}

function sectorLabel(value?: string) {
  if (value === "PUBLIC") return "공공";
  if (value === "PRIVATE") return "민간";
  if (value === "OVERSEAS") return "해외";
  return "-";
}

function companyTypeLabel(value?: string) {
  if (value === "SI") return "SI";
  if (value === "SOLUTION") return "파트너";
  if (value === "ETC") return "기타";
  return "-";
}

export function mapCustomerSector(value: string) {
  if (value === "공공") return "PUBLIC";
  if (value === "민간") return "PRIVATE";
  if (value === "해외") return "OVERSEAS";
  return "PRIVATE";
}

export function mapPartnerCategory(value: string) {
  if (value === "SI") return "SI";
  if (value === "파트너") return "SOLUTION";
  if (value === "기타") return "ETC";
  return "ETC";
}

function mapOpportunityProductClass(value: string) {
  const normalized = value.trim().toUpperCase();
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
    return normalized;
  }
  return "ETC";
}

function parseExpectedBudget(value?: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return undefined;

  const compact = normalized.replace(/[,원\s]/g, "");
  const match = compact.match(/^(\d+(?:\.\d+)?)(억|만)?$/);
  if (match) {
    const amount = Number.parseFloat(match[1]);
    if (Number.isNaN(amount)) return undefined;
    if (match[2] === "억") return Math.round(amount * 100000000);
    if (match[2] === "만") return Math.round(amount * 10000);
    return amount;
  }

  const numeric = Number.parseFloat(compact);
  return Number.isNaN(numeric) ? undefined : numeric;
}

export function buildCompanyCode(prefix: "CUS" | "PTN") {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function buildOpportunityCode() {
  return `OPP-${Date.now().toString(36).toUpperCase()}`;
}

export function buildFallbackManagerEmail(companyCode: string, _name: string, index: number) {
  const normalizedCompany =
    companyCode
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") || "company";
  return `manager-${normalizedCompany}-${index + 1}@orbis.local`;
}

export function stageLabel(value?: string) {
  if (value === "FINDING") return "발굴";
  if (value === "PROMISING") return "유망";
  if (value === "PROGRESSING") return "진행중";
  return "-";
}

function parseOpportunityDescription(description?: string | null) {
  const normalized = String(description ?? "").trim();
  if (!normalized || normalized === "-") {
    return {
      moduleName: "",
      issue: "",
      decisionInfo: "",
    };
  }

  try {
    const parsed = JSON.parse(normalized) as {
      moduleName?: string
      issue?: string
      decisionInfo?: string
    }
    if (parsed && typeof parsed === "object") {
      const moduleName = String(parsed.moduleName ?? "").trim()
      const issue = String(parsed.issue ?? "").trim()
      const decisionInfo = String(parsed.decisionInfo ?? "").trim()
      if (moduleName || issue || decisionInfo) {
        return {
          moduleName,
          issue,
          decisionInfo,
        }
      }
    }
  } catch {
    // Fall back to the legacy free-form format below.
  }

  const blocks = normalized
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return {
      moduleName: "",
      issue: "",
      decisionInfo: "",
    };
  }

  if (blocks.length === 1) {
    return {
      moduleName: "",
      issue: blocks[0],
      decisionInfo: "",
    };
  }

  const moduleName = blocks[0];
  const decisionInfo = blocks[blocks.length - 1];
  const issueBlocks = blocks.slice(1, -1);

  while (issueBlocks.length > 0 && issueBlocks[0] === moduleName) {
    issueBlocks.shift();
  }

  while (issueBlocks.length > 0 && issueBlocks[issueBlocks.length - 1] === decisionInfo) {
    issueBlocks.pop();
  }

  return {
    moduleName,
    issue: issueBlocks.join("\n\n"),
    decisionInfo,
  };
}

function formatAmount(value?: number | string | null) {
  if (value == null) return "-";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("ko-KR") : "-";
  return value || "-";
}

function buildCustomerRecordCode(company?: CompanySummaryResponse) {
  return company?.code ?? (company?.id != null ? `CUS-${company.id}` : "")
}

function toContacts(managers: CompanyManagerSummaryResponse[]): CustomerContact[] {
  return managers
    .map((manager) => ({
      name: manager.name ?? "",
      position: manager.position ?? "",
      department: manager.department ?? "",
      email: manager.email ?? "",
      mobilePhone: manager.mobilePhone ?? "",
      landlinePhone: manager.officePhone ?? "",
      fax: "",
      duty: manager.role ?? "",
      memo: manager.memo ?? "",
    }))
    .filter((item) => item.name || item.mobilePhone || item.landlinePhone || item.email || item.department || item.position);
}

function firstContactName(managers: CompanyManagerSummaryResponse[]) {
  return managers[0]?.name ?? "-";
}

function firstContactPhone(managers: CompanyManagerSummaryResponse[]) {
  return managers[0]?.mobilePhone ?? managers[0]?.officePhone ?? "-";
}

function groupByCount<T>(items: T[], keyFn: (item: T) => number | string | undefined | null) {
  return items.reduce((map, item) => {
    const key = keyFn(item);
    if (key == null || key === "") return map;
    map.set(String(key), (map.get(String(key)) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
}

async function loadCompanies(type: "CUSTOMER" | "PARTNER") {
  const payload = await fetchList<PageResponse<CompanySummaryResponse>>(
    `${getBackendApiBaseUrl()}/companies?type=${type}&size=2000`,
    type === "CUSTOMER" ? "고객사 목록을 불러오지 못했습니다." : "협력사 목록을 불러오지 못했습니다.",
  );
  return payload.content ?? [];
}

async function findCompanyByCode(type: "CUSTOMER" | "PARTNER", code: string) {
  const normalizedCode = code.trim();
  if (!normalizedCode) return null;

  const companies = await loadCompanies(type);
  return companies.find((company) => company.code?.trim() === normalizedCode) ?? null;
}

async function loadCompanyManagers(companyId: number) {
  const payload = await fetchList<PageResponse<CompanyManagerSummaryResponse>>(`${getBackendApiBaseUrl()}/companies/${companyId}/managers?size=2000`, "회사 담당자 목록을 불러오지 못했습니다.");
  return payload.content ?? [];
}

async function loadUsers() {
  const payload = await fetchList<BackendUserSummary[]>(`${getBackendApiBaseUrl()}/user/search`, "사용자 목록을 불러오지 못했습니다.");
  return Array.isArray(payload) ? payload : [];
}

export async function loadBackendUsers() {
  const users = await loadUsers();
  return users
    .filter((user): user is Required<Pick<BackendUserSummary, "id" | "name">> & BackendUserSummary => Boolean(user.id && user.name))
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email ?? "",
      employeeNumber: user.employeeNumber ?? user.id ?? "",
    }));
}

async function loadProjectOpportunities() {
  const payload = await fetchList<PageResponse<ProjectOpportunitySummaryResponse>>(`${getBackendApiBaseUrl()}/project-opportunities?size=2000`, "사업기회 목록을 불러오지 못했습니다.");
  return payload.content ?? [];
}

export async function loadBackendProjectOpportunitiesByCustomer(companyId: number) {
  const payload = await fetchList<PageResponse<ProjectOpportunitySummaryResponse>>(
    `${getBackendApiBaseUrl()}/project-opportunities/customer/${companyId}?size=2000`,
    "고객사별 사업기회 목록을 불러오지 못했습니다.",
  );
  return payload.content ?? [];
}

export async function loadBackendProjectOpportunity(id: number) {
  const payload = await fetchList<ProjectOpportunitySummaryResponse>(
    `${getBackendApiBaseUrl()}/project-opportunities/${id}`,
    "사업기회 상세를 불러오지 못했습니다.",
  );
  return payload;
}

async function loadOrderReports() {
  return fetchList<OrderReportSummaryResponse[]>(`${getBackendApiBaseUrl()}/contract/order-reports`, "수주보고서 목록을 불러오지 못했습니다.");
}

export async function loadBackendFindingData(): Promise<FindingBackendData> {
  const [customerCompanies, partnerCompanies, projectOpportunities, orderReports] = await Promise.all([
    loadCompanies("CUSTOMER"),
    loadCompanies("PARTNER"),
    loadProjectOpportunities(),
    loadOrderReports(),
  ]);

  const customerManagers = await Promise.all(
    customerCompanies.map(async (company) => {
      if (!company.id) return [company.code ?? "", [] as CompanyManagerSummaryResponse[]] as const;
      const managers = await loadCompanyManagers(company.id);
      return [company.code ?? "", managers] as const;
    }),
  );

  const partnerManagers = await Promise.all(
    partnerCompanies.map(async (company) => {
      if (!company.id) return [company.code ?? "", [] as CompanyManagerSummaryResponse[]] as const;
      const managers = await loadCompanyManagers(company.id);
      return [company.code ?? "", managers] as const;
    }),
  );

  const customerManagersByCode = new Map(customerManagers);
  const partnerManagersByCode = new Map(partnerManagers);
  const customerOppCount = groupByCount(projectOpportunities, (item) => item.customerCompanyId);
  const customerContractCount = groupByCount(orderReports, (item) => item.finalCustomerCompanyId);

  const customerLookup = new Map(customerCompanies.map((company) => [company.id ?? -1, company] as const));
  const opportunities: OpportunityRecord[] = projectOpportunities.map((item, index) => {
    const parsedDescription = parseOpportunityDescription(item.description);
    const displayOverride = getOpportunityDisplayOverride(item.opportunityCode);
    const nestedPartnerCompanies = Array.isArray(item.partnerCompanies) ? item.partnerCompanies : [];
    const nestedProductModules = Array.isArray(item.productModules) ? item.productModules : [];
    const nestedRfpFiles = Array.isArray(item.rfpFiles) ? item.rfpFiles : [];
    const partnerCompanyIds = Array.isArray(item.partnerCompanyIds) && item.partnerCompanyIds.length > 0
      ? item.partnerCompanyIds.filter((value): value is number => typeof value === "number")
      : nestedPartnerCompanies
          .map((partner) => partner.id)
          .filter((value): value is number => typeof value === "number");
    const partnerCompanyNames = Array.isArray(item.partnerCompanyNames) && item.partnerCompanyNames.length > 0
      ? item.partnerCompanyNames.filter((value): value is string => typeof value === "string")
      : nestedPartnerCompanies
          .map((partner) => partner.name)
          .filter((value): value is string => typeof value === "string");
    const productModuleIds = Array.isArray(item.productModuleIds) && item.productModuleIds.length > 0
      ? item.productModuleIds.filter((value): value is number => typeof value === "number")
      : nestedProductModules
          .map((module) => module.id)
          .filter((value): value is number => typeof value === "number");
    const productModuleNames = Array.isArray(item.productModuleNames) && item.productModuleNames.length > 0
      ? item.productModuleNames.filter((value): value is string => typeof value === "string")
      : nestedProductModules
          .map((module) => module.productName)
          .filter((value): value is string => typeof value === "string");
    const rfpFileIds = Array.isArray(item.rfpFileIds) && item.rfpFileIds.length > 0
      ? item.rfpFileIds.filter((value): value is number => typeof value === "number")
      : nestedRfpFiles
          .map((file) => file.id)
          .filter((value): value is number => typeof value === "number");
    const rfpFileNames = Array.isArray(item.rfpFileNames) && item.rfpFileNames.length > 0
      ? item.rfpFileNames.filter((value): value is string => typeof value === "string")
      : nestedRfpFiles
          .map((file) => file.originalFileName ?? file.fileName)
          .filter((value): value is string => typeof value === "string");
    const rfpFileSizes = Array.isArray(item.rfpFileSizes) && item.rfpFileSizes.length > 0
      ? item.rfpFileSizes.filter((value): value is number => typeof value === "number")
      : nestedRfpFiles
          .map((file) => file.size)
          .filter((value): value is number => typeof value === "number");
    const partnerDisplay = partnerCompanyNames.length > 0 ? partnerCompanyNames.join(", ") : "-";
    const moduleDisplay = productModuleNames.length > 0 ? productModuleNames.join(", ") : parsedDescription.moduleName || "-";
    return {
      id: item.opportunityCode ?? String(item.id ?? `OPP-${index + 1}`),
      backendId: item.id,
      customerCompanyId: item.customerCompanyId,
      createdAt: "",
      createUserName: item.createUserName ?? "-",
      customerCode: item.customerCompanyId != null ? buildCustomerRecordCode(customerLookup.get(item.customerCompanyId)) : "",
      partnerCode: partnerCompanyIds.length > 0 ? partnerCompanyIds.map((partnerId) => String(partnerId)).join(", ") : "-",
      partnerCodes: partnerCompanyIds.map((partnerId) => String(partnerId)),
      name: item.opportunityName ?? "-",
      registrant: item.createUserName ?? "-",
      customer: item.customerCompanyName ?? "-",
      partner: partnerDisplay,
      partners: partnerCompanyNames,
      category: "-",
      product: item.projectType ? String(item.projectType) : "-",
      module: moduleDisplay,
      expectedAmount: formatAmount(item.expectedBudget),
      expectedDate: item.expectedBidDate ?? "-",
      issue: parsedDescription.issue || "-",
      competition: displayOverride?.competitionStatus?.trim() || item.competitionStatus || "-",
      decisionInfo: parsedDescription.decisionInfo || item.createUserName || "-",
      partnerType: "-",
      partnerContact: "-",
      partnerPhone: "-",
      status: stageLabel(item.stage),
      salesRepresentativeId: item.salesRepresentativeId ?? undefined,
      salesRep: item.salesRepresentativeName ?? item.createUserName ?? "-",
      partnerCompanyIds,
      partnerCompanyNames,
      productModuleIds,
      productModuleNames,
      rfpFileIds,
      rfpFileNames,
      rfpFileSizes,
      rfpAttachments: rfpFileIds.map((fileId, fileIndex) => ({
        id: String(fileId),
        name: rfpFileNames[fileIndex] ?? `첨부파일 ${fileIndex + 1}`,
        size: rfpFileSizes[fileIndex] ?? 0,
        contentType: "",
        dataUrl: "",
        summary: getRfpAttachmentSummary({
          opportunityId: item.id,
          opportunityCode: item.opportunityCode,
          fileId,
          name: rfpFileNames[fileIndex],
          size: rfpFileSizes[fileIndex],
        }),
        createdAt: "",
      })),
    };
  });

  const customers: CustomerRecord[] = customerCompanies.map((company) => {
    const managers = customerManagersByCode.get(company.code ?? "") ?? [];
    return {
      id: buildCustomerRecordCode(company),
      backendId: company.id,
      name: company.name ?? "-",
      category: sectorLabel(company.sector),
      opportunities: company.id != null ? (customerOppCount.get(String(company.id)) ?? 0) : 0,
      contracts: company.id != null ? (customerContractCount.get(String(company.id)) ?? 0) : 0,
      contact: firstContactName(managers),
      phone: firstContactPhone(managers),
      contacts: toContacts(managers),
      address: company.address ?? "",
      memo: company.memo ?? "",
      aliases: [company.code ?? "", company.name ?? ""].filter(Boolean),
      attachments: [],
      contactName: managers[0]?.name ?? "",
      position: managers[0]?.position ?? "",
      department: managers[0]?.department ?? "",
      email: managers[0]?.email ?? "",
      mobilePhone: managers[0]?.mobilePhone ?? "",
      landlinePhone: managers[0]?.officePhone ?? "",
    };
  });

  const partners: PartnerRecord[] = partnerCompanies.map((company) => {
    const managers = partnerManagersByCode.get(company.code ?? "") ?? [];
    const projectsCount = 0;
    return {
      id: company.code ?? `PTN-${company.id ?? ""}`,
      backendId: company.id,
      name: company.name ?? "-",
      type: companyTypeLabel(company.category),
      opportunities: 0,
      projects: projectsCount,
      contact: firstContactName(managers),
      phone: firstContactPhone(managers),
      contacts: toContacts(managers),
      address: company.address ?? "",
      memo: company.memo ?? "",
      attachments: [],
      contactName: managers[0]?.name ?? "",
      position: managers[0]?.position ?? "",
      department: managers[0]?.department ?? "",
      email: managers[0]?.email ?? "",
      mobilePhone: managers[0]?.mobilePhone ?? "",
      landlinePhone: managers[0]?.officePhone ?? "",
    };
  });

  return { opportunities, customers, partners };
}

export function canUseFindingBackend() {
  return isBrowser();
}

export async function loadBackendCompanyManagers(companyId: number) {
  return loadCompanyManagers(companyId);
}

export async function loadBackendCompany(companyId: number) {
  return fetchList<CompanySummaryResponse>(
    `${getBackendApiBaseUrl()}/companies/${companyId}`,
    "회사 상세를 불러오지 못했습니다.",
  );
}

export async function resolveSalesRepresentativeId(salesRepName: string) {
  const normalized = salesRepName.trim();
  if (!normalized) return null;

  const users = await loadUsers();
  const matched = users.find((user) => {
    const name = user.name?.trim();
    const employeeNumber = user.employeeNumber?.trim();
    return name === normalized || employeeNumber === normalized;
  });

  return matched?.id ?? null;
}

export async function createBackendCompany(input: {
  companyType: "CUSTOMER" | "PARTNER";
  code: string;
  name: string;
  businessRegistrationNumber: string;
  sector?: "PUBLIC" | "PRIVATE" | "OVERSEAS" | null;
  category?: "SI" | "SOLUTION" | "ETC" | null;
  address?: string;
  memo?: string;
}) {
  const response = await fetch(`${getBackendApiBaseUrl()}/companies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({
      companyType: input.companyType,
      code: input.code,
      name: input.name,
      businessRegistrationNumber: input.businessRegistrationNumber,
      sector: input.sector ?? null,
      category: input.category ?? null,
      address: input.address ?? null,
      memo: input.memo ?? null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<number> | null;
  const fallbackMessage = "회사를 등록하지 못했습니다.";

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }

  const isSuccess = payload?.result === "SUCCESS" || payload?.success === true;
  if (!isSuccess) {
    throw new Error(payload?.message || fallbackMessage);
  }

  if (typeof payload?.data === "number") {
    return payload.data;
  }

  const created = await findCompanyByCode(input.companyType, input.code);
  if (typeof created?.id === "number") {
    return created.id;
  }

  throw new Error("회사 등록은 완료됐지만 생성된 회사 ID를 확인하지 못했습니다.");
}

export async function updateBackendCompany(
  companyId: number,
  companyType: "CUSTOMER" | "PARTNER",
  input: {
    name: string;
    sector?: "PUBLIC" | "PRIVATE" | "OVERSEAS" | null;
    category?: "SI" | "SOLUTION" | "ETC" | null;
    address?: string;
    memo?: string;
  },
  companyCode?: string,
) {
  const response = await fetch(`${getBackendApiBaseUrl()}/companies/${companyId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({
      companyType,
      name: input.name,
      sector: input.sector ?? null,
      category: input.category ?? null,
      address: input.address ?? null,
      memo: input.memo ?? null,
    }),
  });

  await normalizeVoidResponse(response, "회사를 수정하지 못했습니다.");
  return true;
}

export async function createBackendCompanyManager(
  companyId: number,
  input: {
    name: string;
    email: string;
    mobilePhone?: string;
    officePhone?: string;
    department?: string;
    position?: string;
    role?: string;
    memo?: string;
  },
) {
  const response = await fetch(`${getBackendApiBaseUrl()}/companies/${companyId}/managers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      mobilePhone: input.mobilePhone ?? null,
      officePhone: input.officePhone ?? null,
      department: input.department ?? null,
      position: input.position ?? null,
      role: input.role ?? null,
      memo: input.memo ?? null,
    }),
  });

  return normalizeResponseMessage<number>(response, "담당자를 등록하지 못했습니다.");
}

export async function updateBackendCompanyManager(
  managerId: number,
  input: {
    name: string;
    mobilePhone?: string;
    officePhone?: string;
    department?: string;
    position?: string;
    role?: string;
    memo?: string;
  },
) {
  const response = await fetch(`${getBackendApiBaseUrl()}/companies/managers/${managerId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({
      name: input.name,
      mobilePhone: input.mobilePhone ?? null,
      officePhone: input.officePhone ?? null,
      department: input.department ?? null,
      position: input.position ?? null,
      role: input.role ?? null,
      memo: input.memo ?? null,
    }),
  });

  await normalizeVoidResponse(response, "담당자를 수정하지 못했습니다.");
  return true;
}

export async function deleteBackendCompanyManager(managerId: number) {
  const response = await fetch(`${getBackendApiBaseUrl()}/companies/managers/${managerId}`, {
    method: "DELETE",
    headers: buildAuthHeaders(),
    credentials: "include",
  });

  await normalizeVoidResponse(response, "담당자를 삭제하지 못했습니다.");
  return true;
}

async function uploadBackendRfpFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${getBackendApiBaseUrl()}/files/upload?category=RFP`, {
    method: "POST",
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
    body: formData,
  });

  return normalizeResponseMessage<number>(response, "RFP 첨부파일을 업로드하지 못했습니다.");
}

export async function uploadBackendRfpFiles(files: File[]) {
  const uploaded = await Promise.all(files.map((file) => uploadBackendRfpFile(file)));
  return uploaded.filter((value): value is number => typeof value === "number");
}

export async function loadBackendProductModules() {
  return loadProductModules();
}

export async function createBackendProjectOpportunity(input: {
  opportunityName: string;
  customerCompanyId: number;
  salesRepresentativeId: string;
  projectType: string;
  stage: string;
  expectedBidDate?: string;
  expectedBudget?: string;
  description?: string;
  competitionStatus?: string;
  partnerCompanyIds?: number[];
  productModuleIds?: number[];
  rfpFileIds?: number[];
}) {
  const response = await fetch(`${getBackendApiBaseUrl()}/project-opportunities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({
      opportunityCode: buildOpportunityCode(),
      opportunityName: input.opportunityName,
      stage: input.stage,
      projectType: mapOpportunityProductClass(input.projectType),
      salesRepresentativeId: input.salesRepresentativeId,
      expectedBidDate: input.expectedBidDate || null,
      expectedBudget: parseExpectedBudget(input.expectedBudget),
      description: input.description ?? null,
      competitionStatus: input.competitionStatus ?? null,
      customerCompanyId: input.customerCompanyId,
      partnerCompanyIds: input.partnerCompanyIds?.length ? input.partnerCompanyIds : null,
      productModuleIds: input.productModuleIds?.length ? input.productModuleIds : null,
      rfpFileIds: input.rfpFileIds?.length ? input.rfpFileIds : null,
    }),
  });

  const saved = await normalizeResponseMessage<ProjectOpportunitySummaryResponse>(response, "사업기회를 등록하지 못했습니다.");
  setOpportunityDisplayOverride(saved.opportunityCode, {
    competitionStatus: input.competitionStatus,
  });
  return saved;
}

export async function updateBackendProjectOpportunity(
  id: number,
  input: {
    opportunityName: string;
    stage: string;
    projectType: string;
    salesRepresentativeId: string;
    customerCompanyId: number;
    expectedBidDate?: string;
    expectedBudget?: string;
    description?: string;
    competitionStatus?: string;
    partnerCompanyIds?: number[];
    productModuleIds?: number[];
    rfpFileIds?: number[];
  },
) {
  const response = await fetch(`${getBackendApiBaseUrl()}/project-opportunities/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({
      opportunityName: input.opportunityName,
      stage: input.stage,
      projectType: mapOpportunityProductClass(input.projectType),
      salesRepresentativeId: input.salesRepresentativeId,
      customerCompanyId: input.customerCompanyId,
      expectedBidDate: input.expectedBidDate || null,
      expectedBudget: parseExpectedBudget(input.expectedBudget),
      description: input.description ?? null,
      competitionStatus: input.competitionStatus ?? null,
      partnerCompanyIds: input.partnerCompanyIds?.length ? input.partnerCompanyIds : null,
      productModuleIds: input.productModuleIds?.length ? input.productModuleIds : null,
      rfpFileIds: input.rfpFileIds?.length ? input.rfpFileIds : null,
    }),
  });

  const saved = await normalizeResponseMessage<ProjectOpportunitySummaryResponse>(response, "사업기회를 수정하지 못했습니다.");
  setOpportunityDisplayOverride(saved.opportunityCode, {
    competitionStatus: input.competitionStatus,
  });
  return saved;
}

export async function deleteBackendProjectOpportunity(id: number) {
  const response = await fetch(`${getBackendApiBaseUrl()}/project-opportunities/${id}`, {
    method: "DELETE",
    headers: buildAuthHeaders(),
    credentials: "include",
  });

  await normalizeVoidResponse(response, "사업기회를 삭제하지 못했습니다.");
  return true;
}

export async function deleteBackendCompany(id: number) {
  const response = await fetch(`${getBackendApiBaseUrl()}/companies/${id}`, {
    method: "DELETE",
    headers: buildAuthHeaders(),
    credentials: "include",
  });

  await normalizeVoidResponse(response, "회사를 삭제하지 못했습니다.");
  return true;
}
