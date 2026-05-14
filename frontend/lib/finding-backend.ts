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

type UserSummaryResponse = {
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
};

type ProjectOpportunitySummaryResponse = {
  id?: number;
  opportunityCode?: string;
  opportunityName?: string;
  stage?: string;
  projectType?: string;
  expectedBidDate?: string;
  expectedBudget?: number | string;
  customerCompanyId?: number;
  customerCompanyName?: string;
  salesRepresentativeName?: string;
  createUserName?: string;
  description?: string;
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
  if (normalized === "EMS" || normalized === "ITSM") return normalized;
  if (normalized === "AUTOMATION" || normalized === "WSS") return "ETC";
  return "ETC";
}

function mapOpportunityStage(status?: string) {
  if (status === "진행중") return "ACTIVITY";
  if (status === "유망") return "BID";
  return "FINDING";
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

function stageLabel(value?: string) {
  if (value === "FINDING") return "발굴";
  if (value === "ACTIVITY") return "활동";
  if (value === "BID") return "입찰";
  if (value === "CONTRACT") return "계약";
  if (value === "PROJECT") return "사업";
  if (value === "MAINTENANCE") return "유지보수";
  if (value === "POST_SALES") return "사후영업";
  return "-";
}

function formatAmount(value?: number | string | null) {
  if (value == null) return "-";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("ko-KR") : "-";
  return value || "-";
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
      memo: "",
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

async function loadCompanyManagers(companyId: number) {
  const payload = await fetchList<PageResponse<CompanyManagerSummaryResponse>>(`${getBackendApiBaseUrl()}/companies/${companyId}/managers?size=2000`, "회사 담당자 목록을 불러오지 못했습니다.");
  return payload.content ?? [];
}

async function loadUsers() {
  const payload = await fetchList<PageResponse<UserSummaryResponse> | UserSummaryResponse[]>(`${getBackendApiBaseUrl()}/user`, "사용자 목록을 불러오지 못했습니다.");

  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.content ?? [];
}

async function loadProjectOpportunities() {
  const payload = await fetchList<PageResponse<ProjectOpportunitySummaryResponse>>(`${getBackendApiBaseUrl()}/project-opportunities?size=2000`, "사업기회 목록을 불러오지 못했습니다.");
  return payload.content ?? [];
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
    return {
      id: item.opportunityCode ?? String(item.id ?? `OPP-${index + 1}`),
      backendId: item.id,
      createdAt: "",
      customerCode: item.customerCompanyId != null ? (customerLookup.get(item.customerCompanyId)?.code ?? "") : "",
      partnerCode: "-",
      partnerCodes: [],
      name: item.opportunityName ?? "-",
      registrant: item.createUserName ?? "-",
      customer: item.customerCompanyName ?? "-",
      partner: "-",
      partners: [],
      category: "-",
      product: item.projectType ? String(item.projectType) : "-",
      module: item.projectType ? String(item.projectType) : "-",
      expectedAmount: formatAmount(item.expectedBudget),
      expectedDate: item.expectedBidDate ?? "-",
      issue: item.description ?? "-",
      competition: "-",
      decisionInfo: item.createUserName ?? "-",
      partnerType: "-",
      partnerContact: "-",
      partnerPhone: "-",
      status: stageLabel(item.stage),
      salesRep: item.salesRepresentativeName ?? item.createUserName ?? "-",
      rfpAttachments: [],
    };
  });

  const customers: CustomerRecord[] = customerCompanies.map((company) => {
    const managers = customerManagersByCode.get(company.code ?? "") ?? [];
    return {
      id: company.code ?? `CUS-${company.id ?? ""}`,
      backendId: company.id,
      name: company.name ?? "-",
      category: sectorLabel(company.sector),
      opportunities: company.id != null ? (customerOppCount.get(String(company.id)) ?? 0) : 0,
      contracts: company.id != null ? (customerContractCount.get(String(company.id)) ?? 0) : 0,
      contact: firstContactName(managers),
      phone: firstContactPhone(managers),
      contacts: toContacts(managers),
      address: company.address ?? "",
      memo: `진행중 사업기회 ${company.id != null ? (customerOppCount.get(String(company.id)) ?? 0) : 0}건 / 계약 ${company.id != null ? (customerContractCount.get(String(company.id)) ?? 0) : 0}건`,
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
      memo: `진행중 사업기회 0건 / 진행중 프로젝트 ${projectsCount}건`,
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
    }),
  });

  return normalizeResponseMessage<number>(response, "회사를 등록하지 못했습니다.");
}

export async function updateBackendCompany(
  companyId: number,
  input: {
    name: string;
    sector?: "PUBLIC" | "PRIVATE" | "OVERSEAS" | null;
    category?: "SI" | "SOLUTION" | "ETC" | null;
    address?: string;
  },
) {
  const response = await fetch(`${getBackendApiBaseUrl()}/companies/${companyId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({
      name: input.name,
      sector: input.sector ?? null,
      category: input.category ?? null,
      address: input.address ?? null,
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

export async function createBackendProjectOpportunity(input: {
  opportunityName: string;
  customerCompanyId: number;
  salesRepresentativeId: string;
  projectType: string;
  expectedBidDate?: string;
  expectedBudget?: string;
  description?: string;
  competitionStatus?: string;
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
      projectType: mapOpportunityProductClass(input.projectType),
      salesRepresentativeId: input.salesRepresentativeId,
      expectedBidDate: input.expectedBidDate || null,
      expectedBudget: parseExpectedBudget(input.expectedBudget),
      description: input.description ?? null,
      competitionStatus: input.competitionStatus ?? null,
      customerCompanyId: input.customerCompanyId,
    }),
  });

  return normalizeResponseMessage<ProjectOpportunitySummaryResponse>(response, "사업기회를 등록하지 못했습니다.");
}

export async function updateBackendProjectOpportunity(
  id: number,
  input: {
    opportunityName: string;
    stage: string;
    projectType: string;
    salesRepresentativeId: string;
    expectedBidDate?: string;
    expectedBudget?: string;
    description?: string;
    competitionStatus?: string;
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
      stage: mapOpportunityStage(input.stage),
      projectType: mapOpportunityProductClass(input.projectType),
      salesRepresentativeId: input.salesRepresentativeId,
      expectedBidDate: input.expectedBidDate || null,
      expectedBudget: parseExpectedBudget(input.expectedBudget),
      description: input.description ?? null,
      competitionStatus: input.competitionStatus ?? null,
    }),
  });

  return normalizeResponseMessage<ProjectOpportunitySummaryResponse>(response, "사업기회를 수정하지 못했습니다.");
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
