"use client"

import { getBackendApiBaseUrl } from "@/lib/api-base-url"
import { buildAuthHeaders } from "@/lib/auth-session"
import { currentUser } from "@/lib/current-user"
import { getCustomerByName, getOpportunitiesByCustomerName } from "@/lib/finding-data"
import { getQuotations } from "@/lib/quotation-workflow"
import { type QuotationRecord } from "@/lib/activity-data"
import type {
  LaborItemCreateRequest,
  QuotationCreateRequest,
  QuotationResponse,
  SolutionItemCreateRequest,
  ApiResponseVoid,
} from "@/lib/api/generated/model"

type ApiResponse<T> = {
  result?: string
  data?: T | null
  errorCode?: string | null
  message?: string | null
}

type BackendQuotationListItem = {
  id?: number
  workflowId?: number
  quotationCode?: string
  projectOpportunityId?: number
  companyName?: string
  projectOpportunityName?: string
  quotationDate?: string
  consumerTotalPrice?: number
  supplyTotalPrice?: number
  laborTotalPrice?: number
  totalPrice?: number
  refNo?: string
  paymentCondition?: string
  note?: string
}

type BackendQuotationSolutionItem = {
  id?: number
  productModuleId?: number
  productName?: string
  productGroup?: string
  quantity?: number
  consumerPrice?: number
  consumerTotalPrice?: number
  supplyPrice?: number
  supplyTotalPrice?: number
  discountRate?: number
  freeSupply?: boolean
}

type BackendQuotationLaborItem = {
  id?: number
  laborType?: string
  unitPrice?: number
  manMonth?: number
  supplyPrice?: number
}

type BackendQuotationDetailItem = BackendQuotationListItem & {
  quotationSolutionItems?: BackendQuotationSolutionItem[]
  quotationLaborItems?: BackendQuotationLaborItem[]
}

type BackendProjectOpportunitySummary = {
  id?: number
  opportunityCode?: string
  opportunityName?: string
  customerCompanyName?: string
}

type BackendProductModuleSummary = {
  id?: number
  productGroup?: string
  productName?: string
}

type QuotationCreateInput = Omit<QuotationRecord, "id">

const QUOTATIONS_STORAGE_KEY = "orbis.quotations"
const QUOTATION_EVENT_NAME = "orbis-quotations-updated"

const LABOR_LABELS: Record<string, string> = {
  SPECIAL: "인건비 (특급)",
  HIGH: "인건비 (고급)",
  MIDDLE: "인건비 (중급)",
  LOW: "인건비 (초급)",
  EXPENSE: "제경비",
  TECH_FEE: "기술료",
}

const LABOR_TYPE_ALIASES: Record<string, string> = {
  특급: "SPECIAL",
  고급: "HIGH",
  중급: "MIDDLE",
  초급: "LOW",
  제경비: "EXPENSE",
  기술료: "TECH_FEE",
}

function isBrowser() {
  return typeof window !== "undefined"
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateString: string, days: number) {
  if (!dateString) return ""
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ""
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

async function parseApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage)
  }

  if (payload?.result !== "SUCCESS" || payload.data == null) {
    throw new Error(payload?.message || fallbackMessage)
  }

  return payload.data
}

async function parseVoidApiResponse(response: Response, fallbackMessage: string): Promise<void> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<null> | null

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage)
  }

  if (payload?.result !== "SUCCESS") {
    throw new Error(payload?.message || fallbackMessage)
  }
}

function writeStorage<T>(key: string, value: T) {
  if (!isBrowser()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function emitQuotationUpdate() {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(QUOTATION_EVENT_NAME))
}

function saveQuotations(records: QuotationRecord[]) {
  writeStorage(QUOTATIONS_STORAGE_KEY, records)
}

function loadLocalQuotationIndex() {
  return new Map(getQuotations().map((item) => [item.id, item]))
}

function normalizeNumber(value?: string | number | null) {
  if (typeof value === "number") return value
  if (!value) return 0
  const parsed = Number.parseFloat(String(value).replace(/[^\d.]/g, ""))
  return Number.isNaN(parsed) ? 0 : parsed
}

function normalizeInteger(value?: string | number | null, fallback = 1) {
  if (typeof value === "number") return Math.trunc(value) || fallback
  if (!value) return fallback
  const parsed = Number.parseInt(String(value).replace(/[^\d]/g, ""), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function mapLaborLabel(laborType?: string) {
  if (!laborType) return "기타"
  return LABOR_LABELS[laborType] ?? laborType
}

function inferLaborType(value?: string) {
  if (!value) return null
  const normalized = value.replace(/\s+/g, "")
  if (normalized.includes("특급")) return "SPECIAL"
  if (normalized.includes("고급")) return "HIGH"
  if (normalized.includes("중급")) return "MIDDLE"
  if (normalized.includes("초급")) return "LOW"
  if (normalized.includes("제경비")) return "EXPENSE"
  if (normalized.includes("기술료")) return "TECH_FEE"
  return LABOR_TYPE_ALIASES[normalized] ?? null
}

function createDefaultApprovalProcess(salesRep: string) {
  return {
    overallStatus: "진행중" as const,
    currentStepIndex: 0,
    steps: [
      { label: "상신자", assignee: salesRep || currentUser.name, status: "pending" as const },
      { label: "팀장", assignee: "팀장", status: "pending" as const },
      { label: "본부장", assignee: "본부장", status: "pending" as const },
      { label: "사업본부장", assignee: "사업본부장", status: "pending" as const },
      { label: "경영지원팀장", assignee: "경영지원팀장", status: "pending" as const },
      { label: "대표이사", assignee: "대표이사", status: "pending" as const },
    ],
  }
}

type BackendQuotationResponse = QuotationResponse & {
  workflowId?: number
  refNo?: string
  companyName?: string
  projectOpportunityName?: string
  quotationSolutionItems?: BackendQuotationSolutionItem[]
  quotationLaborItems?: BackendQuotationLaborItem[]
}

function normalizeProductGroup(value?: string) {
  const normalized = value?.trim().toUpperCase()
  if (normalized === "EMS" || normalized === "ITSM" || normalized === "AUTOMATION" || normalized === "WSS") {
    return normalized as QuotationRecord["productGroup"]
  }

  return "EMS"
}

function resolveSectionTitle(value: string | undefined, generatedSummary: string, fallback: string) {
  const title = value?.trim()
  if (!title || title === generatedSummary || title.length > 80) {
    return fallback
  }

  return title
}

function isLegacyLineSupplyPrice(item: BackendQuotationSolutionItem) {
  const quantity = item.quantity ?? 1
  return quantity > 1 && item.supplyPrice != null && item.consumerPrice != null && item.supplyPrice >= item.consumerPrice
}

function resolveSupplyUnitPrice(item: BackendQuotationSolutionItem) {
  const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1
  if (isLegacyLineSupplyPrice(item)) {
    return Math.round((item.supplyPrice ?? 0) / quantity)
  }

  return item.supplyPrice ?? Math.round((item.supplyTotalPrice ?? 0) / quantity)
}

function resolveSupplyLineTotal(item: BackendQuotationSolutionItem) {
  const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1
  if (isLegacyLineSupplyPrice(item)) {
    return item.supplyPrice ?? 0
  }

  return item.supplyTotalPrice ?? resolveSupplyUnitPrice(item) * quantity
}

function resolveDiscountRate(item: BackendQuotationSolutionItem) {
  const consumerUnitPrice = item.consumerPrice ?? 0
  const supplyUnitPrice = resolveSupplyUnitPrice(item)
  if (consumerUnitPrice <= 0 || supplyUnitPrice <= 0 || supplyUnitPrice >= consumerUnitPrice) {
    return 0
  }

  return Math.round(((consumerUnitPrice - supplyUnitPrice) / consumerUnitPrice) * 10000) / 100
}

async function fetchQuotationList() {
  const response = await fetch(`${getBackendApiBaseUrl()}/activity/quotations`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendQuotationListItem[]>(response, "견적서 목록을 불러오지 못했습니다.")
}

async function fetchQuotationDetail(id: number) {
  const response = await fetch(`${getBackendApiBaseUrl()}/activity/quotations/${id}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendQuotationResponse>(response, "견적서 상세를 불러오지 못했습니다.")
}

async function fetchProjectOpportunities() {
  const response = await fetch(`${getBackendApiBaseUrl()}/project-opportunities?size=2000`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  type Api = {
    result?: string
    data?: { content?: BackendProjectOpportunitySummary[] } | null
    message?: string | null
  }

  const payload = await parseApiResponse<Api["data"]>(response, "사업기회 목록을 불러오지 못했습니다.")
  return payload?.content ?? []
}

async function fetchProductModules() {
  const response = await fetch(`${getBackendApiBaseUrl()}/admin/product-modules`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  type Api = {
    result?: string
    data?: BackendProductModuleSummary[] | null
    message?: string | null
  }

  const payload = await parseApiResponse<Api["data"]>(response, "제품 모듈 목록을 불러오지 못했습니다.")
  return payload ?? []
}

function resolveProjectOpportunityIdFromList(params: {
  opportunities: BackendProjectOpportunitySummary[]
  customerName?: string
  opportunityName?: string
  opportunityCode?: string
}) {
  const normalizedCustomer = params.customerName?.trim()
  const normalizedOpportunity = params.opportunityName?.trim()
  const normalizedOpportunityCode = params.opportunityCode?.trim()

  const matched = params.opportunities.find((item) => {
    if (normalizedOpportunityCode && item.opportunityCode === normalizedOpportunityCode) {
      return true
    }

    return (
      normalizedCustomer != null &&
      normalizedOpportunity != null &&
      item.customerCompanyName?.trim() === normalizedCustomer &&
      item.opportunityName?.trim() === normalizedOpportunity
    )
  })

  return matched?.id ?? null
}

async function resolveProjectOpportunityId(params: {
  projectOpportunityId?: number
  customerName?: string
  opportunityName?: string
  opportunityCode?: string
}) {
  if (params.projectOpportunityId != null) {
    return params.projectOpportunityId
  }

  const opportunities = await fetchProjectOpportunities()
  return resolveProjectOpportunityIdFromList({
    opportunities,
    customerName: params.customerName,
    opportunityName: params.opportunityName,
    opportunityCode: params.opportunityCode,
  })
}

function mapBackendQuotationRecord(
  quotation: BackendQuotationDetailItem | BackendQuotationListItem,
  local: QuotationRecord | undefined,
): QuotationRecord {
  const date = quotation.quotationDate?.slice(0, 10) || local?.date || today()
  const solutionItems: BackendQuotationSolutionItem[] =
    "quotationSolutionItems" in quotation ? quotation.quotationSolutionItems ?? [] : []
  const laborItems: BackendQuotationLaborItem[] =
    "quotationLaborItems" in quotation ? quotation.quotationLaborItems ?? [] : []
  const solutionSummary = solutionItems.map((item: BackendQuotationSolutionItem) => item.productName).filter(Boolean).join(", ")
  const laborSummary = laborItems.map((item: BackendQuotationLaborItem) => mapLaborLabel(item.laborType)).filter(Boolean).join(", ")
  const localSolutionRows = solutionItems.length === 0 && local?.solutionRows?.length ? local.solutionRows : null
  const localCustomizingRows = laborItems.length === 0 && local?.customizingRows?.length ? local.customizingRows : null
  const solutionTotal = quotation.supplyTotalPrice ?? 0
  const laborTotal = quotation.laborTotalPrice ?? 0
  const solutionSectionTitle = resolveSectionTitle(local?.solutionSectionTitle, solutionSummary, "1) Solution Package")
  const customizingSectionTitle = resolveSectionTitle(local?.customizingSectionTitle, laborSummary, "2) 인건비-커스터마이징")

  return {
    id: String(quotation.id ?? local?.id ?? `QT-${Date.now()}`),
    workflowId: quotation.workflowId ?? local?.workflowId,
    requestId: local?.requestId,
    refNumber: quotation.refNo ?? quotation.quotationCode ?? local?.refNumber ?? "",
    date,
    customerCode:
      local?.customerCode ??
      getCustomerByName(quotation.companyName ?? "")?.id ??
      "",
    opportunityCode:
      local?.opportunityCode ??
      getOpportunitiesByCustomerName(quotation.companyName ?? "").find((item) => item.name === quotation.projectOpportunityName)?.id ??
      "",
    customer: quotation.companyName ?? local?.customer ?? "-",
    opportunity: quotation.projectOpportunityName ?? local?.opportunity ?? "-",
    proposalType: local?.proposalType ?? "자체 제안",
    productGroup: local?.productGroup ?? normalizeProductGroup(solutionItems[0]?.productGroup),
    salesRep: local?.salesRep ?? currentUser.name,
    paymentTerms: quotation.paymentCondition ?? local?.paymentTerms ?? "현금",
    contactName: local?.contactName ?? "",
    items: [
      {
        id: local?.items?.[0]?.id ?? `${String(quotation.id ?? local?.id ?? "QT")}-ITEM-1`,
        name: solutionSectionTitle,
        amount: String(solutionTotal),
      },
      {
        id: local?.items?.[1]?.id ?? `${String(quotation.id ?? local?.id ?? "QT")}-ITEM-2`,
        name: customizingSectionTitle,
        amount: String(laborTotal),
      },
    ],
    solutionSectionTitle,
    solutionRows:
      localSolutionRows ??
      solutionItems.map((item: BackendQuotationSolutionItem, index: number) => ({
        id: String(item.id ?? `${quotation.id ?? local?.id ?? "QT"}-SOLUTION-${index + 1}`),
        rowNo: String(index + 1),
        category: item.productGroup ?? "",
        module: item.productName ?? "",
        quantity: String(item.quantity ?? ""),
        consumerUnitPrice: String(item.consumerPrice ?? ""),
        consumerTotal: String(item.consumerTotalPrice ?? ""),
        supplyUnitPrice: String(resolveSupplyUnitPrice(item)),
        supplyTotal: String(resolveSupplyLineTotal(item)),
        discountRate: String(resolveDiscountRate(item)),
        note: item.freeSupply ? "무상" : "",
      })),
    customizingSectionTitle,
    customizingRows:
      localCustomizingRows ??
      laborItems.map((item: BackendQuotationLaborItem, index: number) => ({
        id: String(item.id ?? `${quotation.id ?? local?.id ?? "QT"}-LABOR-${index + 1}`),
        rowNo: String(index + 1),
        item: mapLaborLabel(item.laborType),
        laborRate: String(item.unitPrice ?? ""),
        manMonth: String(item.manMonth ?? ""),
        supplyAmount: String(item.supplyPrice ?? ""),
      })),
    templateText: local?.templateText,
    approvalFlow: local?.approvalFlow ?? {
      drafter: local?.salesRep ?? currentUser.name,
      firstApprover: "팀장",
      secondApprover: "본부장",
      secondApproverOptional: true,
      distributor: "없음",
      sharedWith: "권한 보유자",
    },
    approvalProcess: local?.approvalProcess ?? createDefaultApprovalProcess(local?.salesRep ?? currentUser.name),
    deletedAt: local?.deletedAt,
    deletedBy: local?.deletedBy,
    deletedVersions: local?.deletedVersions?.slice() ?? [],
    changeHistory: local?.changeHistory?.map((item) => ({ ...item })) ?? [],
    versionSnapshots: local?.versionSnapshots?.map((item) => ({
      ...item,
      form: {
        ...item.form,
        items: item.form.items.map((entry) => ({ ...entry })),
        solutionRows: item.form.solutionRows?.map((entry) => ({ ...entry })) ?? [],
        customizingRows: item.form.customizingRows?.map((entry) => ({ ...entry })) ?? [],
        approvalFlow: item.form.approvalFlow ? { ...item.form.approvalFlow } : undefined,
      },
    })) ?? [],
    remarks: local?.remarks ?? quotation.note ?? "",
    amount: String(quotation.totalPrice ?? local?.amount ?? solutionTotal + laborTotal),
    validity: local?.validity ?? addDays(date, 30),
    status: local?.status ?? "검토중",
  }
}

function saveMergedQuotations(records: QuotationRecord[]) {
  if (!isBrowser()) return
  saveQuotations(records)
  window.dispatchEvent(new Event(QUOTATION_EVENT_NAME))
}

function buildQuotationPayload(input: QuotationCreateInput, projectOpportunityId: number, productModules: BackendProductModuleSummary[]) {
  const productModuleLookup = new Map(
    productModules.flatMap((item) => {
      const keys = [item.productName, item.productName?.replace(/\s+/g, ""), item.productName?.toLowerCase()]
        .filter((value): value is string => Boolean(value))
      return keys.map((key) => [key, item.id ?? null] as const)
    }),
  )

  const quotationSolutionItems = (input.solutionRows ?? [])
    .map((row): SolutionItemCreateRequest | null => {
      const moduleName = row.module.trim()
      const productModuleId =
        productModuleLookup.get(moduleName) ??
        productModuleLookup.get(moduleName.replace(/\s+/g, "")) ??
        productModuleLookup.get(moduleName.toLowerCase()) ??
        null

      if (productModuleId == null) return null
      const quantity = normalizeInteger(row.quantity, 1)
      const supplyPrice = normalizeNumber(row.supplyUnitPrice) || Math.round(normalizeNumber(row.supplyTotal) / quantity)

      return {
        productModuleId,
        quantity,
        supplyPrice,
        discountRate: normalizeNumber(row.discountRate),
        freeSupply: supplyPrice <= 0,
      }
    })
    .filter((item): item is SolutionItemCreateRequest => Boolean(item))

  const quotationLaborItems = (input.customizingRows ?? [])
    .map((row): LaborItemCreateRequest | null => {
      const laborType = inferLaborType(row.item || row.laborRate)
      if (!laborType) return null

      return {
        laborType: laborType as LaborItemCreateRequest["laborType"],
        unitPrice: normalizeNumber(row.laborRate),
        manMonth: normalizeNumber(row.manMonth),
        supplyPrice: normalizeNumber(row.supplyAmount),
      }
    })
    .filter((item): item is LaborItemCreateRequest => Boolean(item))

  const payload: QuotationCreateRequest = {
    projectOpportunityId,
    quotationDate: input.date,
    paymentCondition: input.paymentTerms,
    note: input.remarks,
    quotationSolutionItems,
    quotationLaborItems,
  }

  return payload
}

function mergeAndSaveQuotation(quotation: BackendQuotationDetailItem | BackendQuotationListItem, localIndex: Map<string, QuotationRecord>) {
  const merged = mapBackendQuotationRecord(quotation, localIndex.get(String(quotation.id ?? "")))
  const records = [merged, ...Array.from(localIndex.values()).filter((item) => item.id !== merged.id)].sort((a, b) =>
    b.date.localeCompare(a.date),
  )
  saveMergedQuotations(records)
  return merged
}

export async function loadBackendQuotationRecords() {
  const localIndex = loadLocalQuotationIndex()
  const backendQuotations = await fetchQuotationList()

  const merged = await Promise.all(
    backendQuotations.map(async (item) => {
      if (item.id == null) {
        return null
      }

      const detail = await fetchQuotationDetail(item.id).catch(() => null)
      return mapBackendQuotationRecord(detail ?? item, localIndex.get(String(item.id)))
    }),
  )

  const records = merged
    .filter((item): item is QuotationRecord => Boolean(item))
    .sort((a, b) => b.date.localeCompare(a.date))

  saveMergedQuotations(records)
  return records
}

export async function createBackendQuotationRecord(input: QuotationCreateInput) {
  const projectOpportunityId = await resolveProjectOpportunityId({
    customerName: input.customer,
    opportunityName: input.opportunity,
    opportunityCode: input.opportunityCode,
  })

  if (projectOpportunityId == null) {
    throw new Error("선택한 고객사/사업기회를 백엔드에서 찾을 수 없습니다.")
  }

  const productModules = await fetchProductModules()
  const payload = buildQuotationPayload(input, projectOpportunityId, productModules)
  const response = await fetch(`${getBackendApiBaseUrl()}/activity/quotations`, {
    method: "POST",
    headers: {
      ...buildAuthHeaders(),
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  })

  const saved = await parseApiResponse<BackendQuotationResponse>(response, "견적서를 저장하지 못했습니다.")
  const localIndex = loadLocalQuotationIndex()
  const merged = mergeAndSaveQuotation(
    {
      id: saved.id,
      workflowId: saved.workflowId,
      quotationCode: saved.quotationCode,
      projectOpportunityId: saved.projectOpportunityId,
      quotationDate: saved.quotationDate,
      paymentCondition: saved.paymentCondition,
      consumerTotalPrice: saved.consumerTotalPrice,
      supplyTotalPrice: saved.supplyTotalPrice,
      laborTotalPrice: saved.laborTotalPrice,
      totalPrice: saved.totalPrice,
      note: saved.note,
      quotationSolutionItems: saved.quotationSolutionItems,
      quotationLaborItems: saved.quotationLaborItems,
      refNo: saved.refNo,
      companyName: saved.companyName,
      projectOpportunityName: saved.projectOpportunityName,
    },
    localIndex,
  )

  return merged
}

export async function updateBackendQuotationRecord(id: string, input: QuotationCreateInput) {
  const projectOpportunityId = await resolveProjectOpportunityId({
    customerName: input.customer,
    opportunityName: input.opportunity,
    opportunityCode: input.opportunityCode,
  })

  if (projectOpportunityId == null) {
    throw new Error("선택한 고객사/사업기회를 백엔드에서 찾을 수 없습니다.")
  }

  const productModules = await fetchProductModules()
  const payload = buildQuotationPayload(input, projectOpportunityId, productModules)
  const response = await fetch(`${getBackendApiBaseUrl()}/activity/quotations/${id}`, {
    method: "PUT",
    headers: {
      ...buildAuthHeaders(),
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  })

  const saved = await parseApiResponse<BackendQuotationResponse>(response, "견적서를 수정하지 못했습니다.")
  const localIndex = loadLocalQuotationIndex()
  return mergeAndSaveQuotation(
    {
      id: saved.id,
      workflowId: saved.workflowId,
      quotationCode: saved.quotationCode,
      projectOpportunityId: saved.projectOpportunityId,
      quotationDate: saved.quotationDate,
      paymentCondition: saved.paymentCondition,
      consumerTotalPrice: saved.consumerTotalPrice,
      supplyTotalPrice: saved.supplyTotalPrice,
      laborTotalPrice: saved.laborTotalPrice,
      totalPrice: saved.totalPrice,
      note: saved.note,
      quotationSolutionItems: saved.quotationSolutionItems,
      quotationLaborItems: saved.quotationLaborItems,
      refNo: saved.refNo,
      companyName: saved.companyName,
      projectOpportunityName: saved.projectOpportunityName,
    },
    localIndex,
  )
}

export async function deleteBackendQuotationRecord(id: string) {
  const response = await fetch(`${getBackendApiBaseUrl()}/activity/quotations/${id}`, {
    method: "DELETE",
    headers: buildAuthHeaders(),
    credentials: "include",
  })

  await parseVoidApiResponse(response, "견적서를 삭제하지 못했습니다.")

  const localIndex = loadLocalQuotationIndex()
  const remaining = Array.from(localIndex.values()).filter((item) => item.id !== id)
  saveMergedQuotations(remaining)
  return true
}
