"use client"

import { getBackendApiBaseUrl } from "@/lib/api-base-url"
import { buildAuthHeaders } from "@/lib/auth-session"
import { currentUser } from "@/lib/current-user"
import { getCustomerByName, getOpportunitiesByCustomerName, normalizeCustomerKeyword } from "@/lib/finding-data"
import { getPrbs, getRfpAnalyses, replacePrbs, type PrbLineItem, type PrbRecord, type PrbStatus } from "@/lib/bid-data"

type ApiResponse<T> = {
  result?: string
  data?: T | null
  errorCode?: string | null
  message?: string | null
}

type BackendPage<T> = {
  content?: T[]
}

type BackendMyInfoResponse = {
  userId?: string
  name?: string
  email?: string
}

type BackendProjectOpportunity = {
  id?: number
  opportunityCode?: string
  opportunityName?: string
  customerCompanyName?: string
  projectType?: string
  productModules?: { productModule?: { productName?: string } }[]
}

type BackendPrbProjectInfo = {
  projectStartDate?: string
  projectEndDate?: string
  bidType?: string
  preSpecNoticeDate?: string
  officialNoticeDate?: string
  priceBiddingDatetime?: string
  proposalDeadlineDatetime?: string
  proposalPresentationDatetime?: string
  technicalEvalRatio?: number | string | null
  priceEvalRatio?: number | string | null
}

type BackendPrbProfitLossInfo = {
  totalProjectAmount?: number | string | null
  ourCompanyAmount?: number | string | null
  expectedWinRate?: number | string | null
  estimatedRevenue?: number | string | null
  estimatedOperatingProfit?: number | string | null
  estimatedProfitMargin?: number | string | null
}

type BackendPersonnelExpenseItem = {
  grade?: string
  inputManMonth?: number | string | null
  startDate?: string
  endDate?: string
  baseAmount?: number | string | null
  totalAmount?: number | string | null
}

type BackendProductCostItem = {
  productModuleId?: number
  productClass?: string
  productName?: string
  quantity?: number | null
  listPrice?: number | string | null
  itemProductCost?: number | string | null
}

type BackendPurchaseHumanResourceItem = {
  grade?: string
  inputManMonth?: number | string | null
  startDate?: string
  endDate?: string
  baseAmount?: number | string | null
  totalAmount?: number | string | null
}

type BackendPurchaseProductItem = {
  vendorName?: string
  productName?: string
  quantity?: number | null
  totalAmount?: number | string | null
}

type BackendGeneralOverheadExpenseItem = {
  majorCategory?: string
  minorCategory?: string
  detailsAndBasis?: string
  unitPrice?: number | string | null
  amount?: number | string | null
}

type BackendPrbResponse = {
  prbId?: number
  prbCode?: string
  createdAt?: string
  prbDate?: string
  status?: string
  maintenanceDescription?: string
  salesRepresentativeOpinion?: string
  totalCost?: number | string | null
  salesRepresentativeId?: string
  salesRepresentativeName?: string
  salesRepresentativeDepartmentName?: string
  projectOpportunityId?: number
  opportunityName?: string
  projectType?: string
  projectDescription?: string
  customerCompanyName?: string
  customerCompanyCategory?: string
  projectInfo?: BackendPrbProjectInfo
  profitLossInfo?: BackendPrbProfitLossInfo
  personnelExpenses?: {
    residentExpenses?: BackendPersonnelExpenseItem[]
    nonResidentExpenses?: BackendPersonnelExpenseItem[]
    totalAmount?: number | string | null
  }
  productCost?: {
    items?: BackendProductCostItem[]
    totalProductCost?: number | string | null
  }
  purchase?: {
    humanResources?: BackendPurchaseHumanResourceItem[]
    products?: BackendPurchaseProductItem[]
    totalPurchaseAmount?: number | string | null
  }
  overheadExpenses?: {
    items?: BackendGeneralOverheadExpenseItem[]
    totalAmount?: number | string | null
  }
  indirectExpenses?: {
    baseAmount?: number | string | null
    rate?: number | string | null
    amount?: number | string | null
  }
}

export type BackendPrbHistoryListItem = {
  historyId?: number
  version?: number
  prbCode?: string
  prbDate?: string
  createdAt?: string
}

type BackendPrbProjectInfoRequest = {
  projectStartDate?: string | null
  projectEndDate?: string | null
  bidType?: string | null
  preSpecNoticeDate?: string | null
  officialNoticeDate?: string | null
  priceBiddingDatetime?: string | null
  proposalDeadlineDatetime?: string | null
  proposalPresentationDatetime?: string | null
  technicalEvalRatio?: number | null
  priceEvalRatio?: number | null
}

type BackendPrbProfitLossRequest = {
  totalProjectAmount?: number | null
  ourCompanyAmount?: number | null
  expectedWinRate?: number | null
  estimatedOperatingProfit?: number | null
}

type BackendPrbCreateRequest = {
  projectOpportunityId: number
  salesRepresentativeId: string
  reviewerId: string
  prbDate: string
  maintenanceDescription?: string
  salesRepresentativeOpinion?: string
  indirectExpenseRate: number
  projectInfo?: BackendPrbProjectInfoRequest | null
  profitLossInfo?: BackendPrbProfitLossRequest | null
  residentExpenses?: Array<{
    grade?: string | null
    inputManMonth?: number | null
    startDate?: string | null
    endDate?: string | null
    baseAmount?: number | null
  }>
  nonResidentExpenses?: Array<{
    grade?: string | null
    inputManMonth?: number | null
    startDate?: string | null
    endDate?: string | null
    baseAmount?: number | null
  }>
  productCostItems?: Array<{
    productModuleId?: number | null
    productClass?: string | null
    productName?: string | null
    quantity?: number | null
    listPrice?: number | null
  }>
  purchaseHumanResources?: Array<{
    grade?: string | null
    inputManMonth?: number | null
    startDate?: string | null
    endDate?: string | null
    baseAmount?: number | null
  }>
  purchaseProducts?: Array<{
    vendorName?: string | null
    productName?: string | null
    quantity?: number | null
    totalAmount?: number | null
  }>
  overheadExpenses?: Array<{
    majorCategory?: string | null
    minorCategory?: string | null
    detailsAndBasis?: string | null
    unitPrice?: number | null
    amount?: number | null
  }>
}

const PRB_LIST_SIZE = 2000

function normalizeLookupText(value?: string | number | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.()/]/g, "")
}

function parseNumber(value?: string | number | null) {
  if (typeof value === "number") return value
  if (!value) return null
  const parsed = Number.parseFloat(String(value).replace(/[^\d.]/g, ""))
  return Number.isNaN(parsed) ? null : parsed
}

function formatNumber(value?: string | number | null) {
  const parsed = parseNumber(value)
  return parsed == null ? "" : String(parsed)
}

function formatDate(value?: string) {
  if (!value) return ""
  return value.slice(0, 10)
}

function parseApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  return response.json().then((payload: ApiResponse<T>) => {
    if (!response.ok || payload?.result !== "SUCCESS" || payload.data == null) {
      throw new Error(payload?.message || fallbackMessage)
    }

    return payload.data
  })
}

async function fetchCurrentUserId() {
  try {
    const response = await fetch(`${getBackendApiBaseUrl()}/user/me`, {
      headers: buildAuthHeaders(),
      credentials: "include",
      cache: "no-store",
    })

    const payload = await parseApiResponse<BackendMyInfoResponse>(response, "현재 사용자 정보를 불러오지 못했습니다.")
    return payload.userId ?? currentUser.id
  } catch {
    return currentUser.id
  }
}

async function fetchProjectOpportunities() {
  const response = await fetch(`${getBackendApiBaseUrl()}/project-opportunities?size=${PRB_LIST_SIZE}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  const payload = await parseApiResponse<BackendPage<BackendProjectOpportunity>>(response, "사업기회 목록을 불러오지 못했습니다.")
  return payload.content ?? []
}

async function fetchPrbList() {
  const response = await fetch(`${getBackendApiBaseUrl()}/prbs?size=${PRB_LIST_SIZE}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  const payload = await parseApiResponse<BackendPage<BackendPrbResponse>>(response, "PRB 목록을 불러오지 못했습니다.")
  return payload.content ?? []
}

async function fetchPrbHistoryList(prbId: string) {
  const response = await fetch(`${getBackendApiBaseUrl()}/prbs/${prbId}/histories`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendPrbHistoryListItem[]>(response, "PRB 변경 이력을 불러오지 못했습니다.")
}

async function fetchPrbHistoryDetail(historyId: number) {
  const response = await fetch(`${getBackendApiBaseUrl()}/prbs/histories/${historyId}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendPrbResponse & { historyId?: number; version?: number }>(response, "PRB 변경 이력 상세를 불러오지 못했습니다.")
}

async function resolveAssigneeIdFromInput(input: PrbRecord) {
  return input.salesRepresentativeId?.trim() ?? ""
}

function mapBidTypeToDisplay(value?: string) {
  if (value === "SELF_BID_SELF_EVAL") return "자체 입찰 / 자체 평가"
  if (value === "PROCUREMENT_BID_PROCUREMENT_EVAL") return "조달 입찰 / 조달 평가"
  if (value === "PROCUREMENT_ENTRUST_SELF_EVAL") return "조달 위탁 / 자체 평가"
  return value ?? ""
}

function mapGradeToLabel(value?: string) {
  if (value === "SPECIAL") return "차/부장"
  if (value === "ADVANCED") return "과장"
  if (value === "INTERMEDIATE") return "대리"
  if (value === "BEGINNER") return "사원"
  return value ?? ""
}

function mapProjectTypeToBusinessType(value?: string) {
  return value ?? "EMS"
}

function mapBidTypeToBackend(value?: string) {
  if (value === "자체 입찰 / 자체 평가") return "SELF_BID_SELF_EVAL"
  if (value === "조달 입찰 / 조달 평가") return "PROCUREMENT_BID_PROCUREMENT_EVAL"
  if (value === "조달 위탁 / 자체 평가") return "PROCUREMENT_ENTRUST_SELF_EVAL"
  return value || null
}

function mapGradeToBackend(value?: string) {
  if (!value) return null
  if (value === "특급" || value === "차/부장") return "SPECIAL"
  if (value === "고급" || value === "과장") return "ADVANCED"
  if (value === "중급" || value === "대리") return "INTERMEDIATE"
  if (value === "초급" || value === "사원") return "BEGINNER"
  return value
}

function parseDateRange(value?: string) {
  if (!value || !value.includes("~")) return {}
  const [start, end] = value.split("~").map((part) => part.trim()).filter(Boolean)
  return {
    startDate: start || null,
    endDate: end || null,
  }
}

function mapFormDate(value?: string) {
  if (!value) return null
  return value.slice(0, 10)
}

function mapDateTime(value?: string) {
  if (!value) return null
  return value.includes("T") ? value : `${value}T00:00:00`
}

function buildEvaluationRatio(value?: string) {
  if (!value || !value.includes(":")) return {}
  const [technical, price] = value.split(":").map((part) => Number.parseFloat(part.trim()))
  return {
    technicalEvalRatio: Number.isFinite(technical) ? technical : null,
    priceEvalRatio: Number.isFinite(price) ? price : null,
  }
}

function mapPersonnelPayload(items: PrbLineItem[] | undefined) {
  return (items ?? [])
    .filter((item) => item.item && item.item !== "소계")
    .map((item) => {
      const range = parseDateRange(item.note)
      return {
        grade: mapGradeToBackend(item.item),
        inputManMonth: parseNumber(item.value),
        startDate: range.startDate,
        endDate: range.endDate,
        baseAmount: parseNumber(item.amount),
      }
    })
    .filter((item) => item.grade !== null || item.inputManMonth !== null || item.baseAmount !== null)
}

function mapProductCostPayload(items: PrbLineItem[] | undefined) {
  return (items ?? [])
    .filter((item) => item.item || item.value || item.note || item.amount)
    .map((item) => ({
      productModuleId: null,
      productClass: item.category || null,
      productName: item.item || null,
      quantity: item.value ? Number.parseInt(item.value, 10) || null : null,
      listPrice: parseNumber(item.note),
    }))
}

function mapPurchaseHumanResourcePayload(items: PrbLineItem[] | undefined) {
  return (items ?? [])
    .filter((item) => item.item && item.item !== "소계")
    .map((item) => {
      const range = parseDateRange(item.note)
      return {
        grade: mapGradeToBackend(item.item),
        inputManMonth: parseNumber(item.value),
        startDate: range.startDate,
        endDate: range.endDate,
        baseAmount: parseNumber(item.amount),
      }
    })
    .filter((item) => item.grade !== null || item.inputManMonth !== null || item.baseAmount !== null)
}

function mapPurchaseProductPayload(items: PrbLineItem[] | undefined) {
  return (items ?? [])
    .filter((item) => item.item || item.value || item.note || item.amount)
    .map((item) => ({
      vendorName: item.value || null,
      productName: item.item || null,
      quantity: item.note ? Number.parseInt(item.note, 10) || null : null,
      totalAmount: parseNumber(item.amount),
    }))
}

function mapOverheadPayload(items: PrbLineItem[] | undefined) {
  return (items ?? [])
    .filter((item) => item.item && item.item !== "소계")
    .map((item) => ({
      majorCategory: item.category || null,
      minorCategory: item.item || null,
      detailsAndBasis: item.note || null,
      unitPrice: parseNumber(item.value),
      amount: parseNumber(item.amount),
    }))
}

function mapProjectInfoPayload(input: PrbRecord) {
  const businessPeriod = input.formData.businessPeriod || ""
  const [startDate, endDate] = businessPeriod.split("~").map((part) => part.trim()).filter(Boolean)
  const ratio = buildEvaluationRatio(input.formData.evaluationRatio)
  const hasValues =
    startDate ||
    endDate ||
    input.formData.bidType ||
    input.formData.preliminaryNoticeDate ||
    input.formData.officialNoticeDate ||
    input.formData.priceBidDate ||
    input.formData.proposalDeadlineDate ||
    input.formData.proposalPresentationDate ||
    ratio.technicalEvalRatio != null ||
    ratio.priceEvalRatio != null

  if (!hasValues) return null

  return {
    projectStartDate: mapFormDate(startDate),
    projectEndDate: mapFormDate(endDate),
    bidType: mapBidTypeToBackend(input.formData.bidType),
    preSpecNoticeDate: mapFormDate(input.formData.preliminaryNoticeDate),
    officialNoticeDate: mapFormDate(input.formData.officialNoticeDate),
    priceBiddingDatetime: mapDateTime(input.formData.priceBidDate),
    proposalDeadlineDatetime: mapDateTime(input.formData.proposalDeadlineDate),
    proposalPresentationDatetime: mapDateTime(input.formData.proposalPresentationDate),
    technicalEvalRatio: ratio.technicalEvalRatio,
    priceEvalRatio: ratio.priceEvalRatio,
  }
}

function mapProfitLossPayload(input: PrbRecord) {
  const hasValues =
    input.formData.totalBusinessAmount ||
    input.formData.companyBusinessAmount ||
    input.formData.expectedOrderRate ||
    input.formData.estimatedOperatingProfit

  if (!hasValues) return null

  return {
    totalProjectAmount: parseNumber(input.formData.totalBusinessAmount),
    ourCompanyAmount: parseNumber(input.formData.companyBusinessAmount),
    expectedWinRate: parseNumber(input.formData.expectedOrderRate),
    estimatedOperatingProfit: parseNumber(input.formData.estimatedOperatingProfit),
  }
}

function buildCreateRequest(
  input: PrbRecord,
  projectOpportunityId: number,
  salesRepresentativeId: string,
  reviewerId: string,
): BackendPrbCreateRequest {
  return {
    projectOpportunityId,
    salesRepresentativeId,
    reviewerId,
    prbDate: mapFormDate(input.formData.prbDate) ?? mapFormDate(input.createdDate) ?? mapFormDate(new Date().toISOString()) ?? "",
    maintenanceDescription: input.formData.maintenance || input.formData.businessOverview || "",
    salesRepresentativeOpinion: input.formData.salesOpinion || "",
    indirectExpenseRate: parseNumber(input.formData.indirectRate) ?? 0,
    projectInfo: mapProjectInfoPayload(input),
    profitLossInfo: mapProfitLossPayload(input),
    residentExpenses: mapPersonnelPayload(input.personnelItems.filter((item) => item.category === "상주")),
    nonResidentExpenses: mapPersonnelPayload(input.personnelItems.filter((item) => item.category === "비상주")),
    productCostItems: mapProductCostPayload(input.productItems),
    purchaseHumanResources: mapPurchaseHumanResourcePayload(input.purchaseItems.slice(0, 5)),
    purchaseProducts: mapPurchaseProductPayload(input.purchaseItems.slice(5)),
    overheadExpenses: mapOverheadPayload(input.expenseItems),
  }
}

async function resolveProjectOpportunityId(input: PrbRecord, opportunityLookup: Map<string, BackendProjectOpportunity>) {
  if (input.projectOpportunityId != null) {
    return input.projectOpportunityId
  }

  const rfp = input.rfpAnalysisId ? getRfpAnalyses().find((item) => item.id === input.rfpAnalysisId) ?? null : null
  if (rfp?.projectOpportunityId != null) {
    return rfp.projectOpportunityId
  }

  const normalizedOpportunityCode = normalizeLookupText(input.opportunityCode)
  const normalizedCustomerName = normalizeLookupText(input.customer)
  const normalizedOpportunityName = normalizeLookupText(input.opportunity)

  const matched = [...opportunityLookup.values()].find((item) => {
    if (input.projectOpportunityId != null && item.id === input.projectOpportunityId) return true
    if (normalizedOpportunityCode && normalizeLookupText(item.opportunityCode) === normalizedOpportunityCode) return true
    if (normalizedOpportunityName && normalizeLookupText(item.opportunityName) === normalizedOpportunityName) return true
    if (normalizedCustomerName && normalizedOpportunityCode &&
      normalizeLookupText(item.customerCompanyName) === normalizedCustomerName &&
      normalizeLookupText(item.opportunityCode) === normalizedOpportunityCode
    ) {
      return true
    }
    if (
      normalizedCustomerName &&
      normalizedOpportunityName &&
      normalizeLookupText(item.customerCompanyName) === normalizedCustomerName &&
      normalizeLookupText(item.opportunityName) === normalizedOpportunityName
    ) {
      return true
    }

    return false
  })

  return matched?.id ?? null
}

function buildRfpLookup() {
  const analyses = getRfpAnalyses()
  const byProjectOpportunityId = new Map<number, string>()
  const byOpportunityCode = new Map<string, string>()
  const byCustomerOpportunity = new Map<string, string>()

  for (const item of analyses) {
    if (item.projectOpportunityId != null) {
      byProjectOpportunityId.set(item.projectOpportunityId, item.id)
    }
    if (item.opportunityCode) {
      byOpportunityCode.set(normalizeLookupText(item.opportunityCode), item.id)
    }
    if (item.customerCode && item.opportunityCode) {
      byCustomerOpportunity.set(
        `${normalizeLookupText(item.customerCode)}|${normalizeLookupText(item.opportunityCode)}`,
        item.id,
      )
    }
    if (item.customer && item.opportunity) {
      byCustomerOpportunity.set(
        `${normalizeLookupText(item.customer)}|${normalizeLookupText(item.opportunity)}`,
        item.id,
      )
    }
  }

  return { byProjectOpportunityId, byOpportunityCode, byCustomerOpportunity }
}

function mapPersonnelItems(category: string, items?: BackendPersonnelExpenseItem[]) {
  return (items ?? []).map((item, index) => ({
    id: `${category.toLowerCase()}-${index + 1}`,
    category,
    item: mapGradeToLabel(item.grade),
    value: formatNumber(item.inputManMonth),
    amount: formatNumber(item.totalAmount),
    note: item.startDate && item.endDate ? `${formatDate(item.startDate)} ~ ${formatDate(item.endDate)}` : "",
  }))
}

function mapProductCostItems(items?: BackendProductCostItem[]) {
  return (items ?? []).map((item, index) => ({
    id: `product-cost-${index + 1}`,
    category: item.productClass ?? "",
    item: item.productName ?? "",
    value: item.quantity == null ? "" : String(item.quantity),
    amount: formatNumber(item.itemProductCost),
    note: formatNumber(item.listPrice),
  }))
}

function mapPurchaseServiceItems(items?: BackendPurchaseHumanResourceItem[]) {
  return (items ?? []).map((item, index) => ({
    id: `purchase-service-${index + 1}`,
    category: "용역",
    item: mapGradeToLabel(item.grade),
    value: formatNumber(item.inputManMonth),
    amount: formatNumber(item.totalAmount),
    note: item.startDate && item.endDate ? `${formatDate(item.startDate)} ~ ${formatDate(item.endDate)}` : "",
  }))
}

function mapPurchaseProductItems(items?: BackendPurchaseProductItem[]) {
  return (items ?? []).map((item, index) => ({
    id: `purchase-product-${index + 1}`,
    category: "제품",
    item: item.productName ?? "",
    value: item.vendorName ?? "",
    amount: formatNumber(item.totalAmount),
    note: item.quantity == null ? "" : String(item.quantity),
  }))
}

function mapOverheadItems(items?: BackendGeneralOverheadExpenseItem[]) {
  return (items ?? []).map((item, index) => ({
    id: `expense-${index + 1}`,
    category: item.majorCategory ?? "",
    item: item.minorCategory ?? "",
    value: formatNumber(item.unitPrice),
    amount: formatNumber(item.amount),
    note: item.detailsAndBasis ?? "",
  }))
}

function mapBackendPrbRecord(
  item: BackendPrbResponse,
  opportunityLookup: Map<string, BackendProjectOpportunity>,
  rfpLookup: ReturnType<typeof buildRfpLookup>,
  local?: PrbRecord | undefined,
): PrbRecord {
  const linkedOpportunity = item.projectOpportunityId != null ? opportunityLookup.get(String(item.projectOpportunityId)) : undefined
  const customerName =
    linkedOpportunity?.customerCompanyName ?? item.customerCompanyName ?? local?.customer ?? ""
  const opportunityName =
    linkedOpportunity?.opportunityName ?? item.opportunityName ?? local?.opportunity ?? ""
  const opportunityCode =
    linkedOpportunity?.opportunityCode ??
    local?.opportunityCode ??
    (customerName && opportunityName
      ? getOpportunitiesByCustomerName(customerName).find((opportunity) => normalizeCustomerKeyword(opportunity.name) === normalizeCustomerKeyword(opportunityName))?.id ?? ""
      : "")
  const customerCode =
    local?.customerCode ?? getCustomerByName(customerName)?.id ?? ""
  const rfpAnalysisId =
    local?.rfpAnalysisId ??
    (linkedOpportunity?.id != null ? rfpLookup.byProjectOpportunityId.get(linkedOpportunity.id) : undefined) ??
    (opportunityCode ? rfpLookup.byOpportunityCode.get(normalizeLookupText(opportunityCode)) : undefined) ??
    (customerCode && opportunityCode
      ? rfpLookup.byCustomerOpportunity.get(`${normalizeLookupText(customerCode)}|${normalizeLookupText(opportunityCode)}`)
      : undefined) ??
    (customerName && opportunityName
      ? rfpLookup.byCustomerOpportunity.get(`${normalizeLookupText(customerName)}|${normalizeLookupText(opportunityName)}`)
      : undefined) ??
    ""

  const projectInfo = item.projectInfo
  const profitLossInfo = item.profitLossInfo
  const personnelRows = [
    ...mapPersonnelItems("상주", item.personnelExpenses?.residentExpenses),
    ...mapPersonnelItems("비상주", item.personnelExpenses?.nonResidentExpenses),
  ]

  return {
    id: String(item.prbId ?? local?.id ?? `PRB-${Date.now()}`),
    projectOpportunityId: item.projectOpportunityId ?? linkedOpportunity?.id ?? local?.projectOpportunityId,
    salesRepresentativeId: item.salesRepresentativeId ?? local?.salesRepresentativeId,
    customerCode,
    customer: customerName,
    opportunityCode,
    opportunity: opportunityName,
    rfpAnalysisId: rfpAnalysisId || local?.rfpAnalysisId || "",
    author: item.salesRepresentativeName ?? local?.author ?? currentUser.name,
    reviewer: local?.reviewer ?? "",
    nextApprover: local?.nextApprover ?? item.salesRepresentativeDepartmentName ?? "본부장",
    deployOwner: local?.deployOwner ?? "배포 권한 보유자",
    shareOwner: local?.shareOwner ?? "공유 권한 보유자",
    proposalDeadline: formatDate(projectInfo?.proposalDeadlineDatetime) || local?.proposalDeadline || "",
    createdDate: formatDate(item.createdAt) || local?.createdDate || formatDate(item.prbDate) || "",
    status: (item.status ?? local?.status ?? "작성 중") as PrbStatus,
    notificationsSent: local?.notificationsSent ?? false,
    approvalSteps: local?.approvalSteps ?? [],
    revisionGroupId: local?.revisionGroupId ?? `PRB-GROUP-${String(item.prbId ?? Date.now())}`,
    revisionNumber: local?.revisionNumber ?? 1,
    parentPrbId: local?.parentPrbId,
    formData: {
      reportDate: formatDate(item.createdAt) || formatDate(item.prbDate) || local?.formData?.reportDate || "",
      prbDate: formatDate(item.prbDate) || local?.formData?.prbDate || "",
      controlNumber: item.prbCode ?? local?.formData?.controlNumber ?? "",
      customerType: item.customerCompanyCategory ?? local?.formData?.customerType ?? "",
      businessType: mapProjectTypeToBusinessType(item.projectType ?? linkedOpportunity?.projectType ?? local?.formData?.businessType),
      customerName,
      projectName: opportunityName,
      businessPeriod:
        projectInfo?.projectStartDate || projectInfo?.projectEndDate
          ? `${formatDate(projectInfo.projectStartDate)} ~ ${formatDate(projectInfo.projectEndDate)}`
          : local?.formData?.businessPeriod ?? "",
      maintenance: item.maintenanceDescription ?? local?.formData?.maintenance ?? "",
      businessOverview: item.projectDescription ?? local?.formData?.businessOverview ?? "",
      salesLeader: item.salesRepresentativeName ?? local?.formData?.salesLeader ?? currentUser.name,
      salesDepartment: item.salesRepresentativeDepartmentName ?? local?.formData?.salesDepartment ?? "",
      ownerDepartment: local?.formData?.ownerDepartment ?? "",
      bidType: mapBidTypeToDisplay(projectInfo?.bidType ?? local?.formData?.bidType ?? ""),
      preliminaryNoticeDate: formatDate(projectInfo?.preSpecNoticeDate) || local?.formData?.preliminaryNoticeDate || "",
      officialNoticeDate: formatDate(projectInfo?.officialNoticeDate) || local?.formData?.officialNoticeDate || "",
      priceBidDate: formatDate(projectInfo?.priceBiddingDatetime) || local?.formData?.priceBidDate || "",
      proposalDeadlineDate: formatDate(projectInfo?.proposalDeadlineDatetime) || local?.formData?.proposalDeadlineDate || "",
      proposalPresentationDate: formatDate(projectInfo?.proposalPresentationDatetime) || local?.formData?.proposalPresentationDate || "",
      evaluationRatio:
        [projectInfo?.technicalEvalRatio, projectInfo?.priceEvalRatio].some((value) => value != null)
          ? `${formatNumber(projectInfo?.technicalEvalRatio)} : ${formatNumber(projectInfo?.priceEvalRatio)}`
          : local?.formData?.evaluationRatio ?? "",
      totalBusinessAmount: formatNumber(profitLossInfo?.totalProjectAmount) || local?.formData?.totalBusinessAmount || "",
      companyBusinessAmount: formatNumber(profitLossInfo?.ourCompanyAmount) || local?.formData?.companyBusinessAmount || "",
      expectedOrderRate: formatNumber(profitLossInfo?.expectedWinRate) || local?.formData?.expectedOrderRate || "",
      estimatedRevenue: formatNumber(profitLossInfo?.estimatedRevenue) || local?.formData?.estimatedRevenue || "",
      estimatedOperatingProfit: formatNumber(profitLossInfo?.estimatedOperatingProfit) || local?.formData?.estimatedOperatingProfit || "",
      estimatedProfitRate: formatNumber(profitLossInfo?.estimatedProfitMargin) || local?.formData?.estimatedProfitRate || "",
      totalCost: formatNumber(item.totalCost) || local?.formData?.totalCost || "",
      laborCost: formatNumber(item.personnelExpenses?.totalAmount) || local?.formData?.laborCost || "",
      productCost: formatNumber(item.productCost?.totalProductCost) || local?.formData?.productCost || "",
      purchaseCost: formatNumber(item.purchase?.totalPurchaseAmount) || local?.formData?.purchaseCost || "",
      expenseCost: formatNumber(item.overheadExpenses?.totalAmount) || local?.formData?.expenseCost || "",
      indirectCost: formatNumber(item.indirectExpenses?.amount) || local?.formData?.indirectCost || "",
      indirectRate: formatNumber(item.indirectExpenses?.rate) || local?.formData?.indirectRate || "5",
      salesOpinion: item.salesRepresentativeOpinion ?? local?.formData?.salesOpinion ?? "",
    },
    salesItems: [],
    expenseItems: mapOverheadItems(item.overheadExpenses?.items),
    purchaseItems: [...mapPurchaseServiceItems(item.purchase?.humanResources), ...mapPurchaseProductItems(item.purchase?.products)],
    productItems: mapProductCostItems(item.productCost?.items),
    personnelItems: personnelRows,
    indirectItems: [],
    generalItems: [],
    approvalLines: local?.approvalLines ?? [
      { role: "영업대표", name: item.salesRepresentativeName ?? currentUser.name },
      { role: "팀장", name: "팀장" },
      { role: "본부장", name: item.salesRepresentativeDepartmentName ?? "본부장" },
      { role: "배포", name: "권한 보유자" },
      { role: "공유", name: "권한 보유자" },
    ],
    attendeeOpinions: local?.attendeeOpinions ?? ["", "", ""],
    version: local?.version ?? "v1.0",
    createdAt: item.createdAt ?? local?.createdAt ?? new Date().toISOString(),
    updatedAt: local?.updatedAt ?? item.createdAt ?? new Date().toISOString(),
  }
}

async function loadOpportunityLookup() {
  const opportunities = await fetchProjectOpportunities()
  return new Map(
    opportunities
      .filter((item) => item.id != null)
      .map((item) => [String(item.id), item] as const),
  )
}

export async function loadBackendPrbs() {
  const [opportunityLookup, prbs] = await Promise.all([
    loadOpportunityLookup(),
    fetchPrbList(),
  ])

  const localLookup = new Map(getPrbs().map((item) => [item.id, item]))
  const rfpLookup = buildRfpLookup()

  const records = prbs.map((item) =>
    mapBackendPrbRecord(
      item,
      opportunityLookup,
      rfpLookup,
      localLookup.get(String(item.prbId ?? "")),
    ),
  )

  replacePrbs(records)
  return records
}

export async function loadBackendPrbHistoryRecords(prbId: string) {
  return fetchPrbHistoryList(prbId)
}

export async function loadBackendPrbHistoryRecord(historyId: number) {
  const [opportunityLookup, detail] = await Promise.all([
    loadOpportunityLookup(),
    fetchPrbHistoryDetail(historyId),
  ])
  const rfpLookup = buildRfpLookup()
  return mapBackendPrbRecord(detail, opportunityLookup, rfpLookup, undefined)
}

async function buildSaveRequest(input: Omit<PrbRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const opportunityLookup = await loadOpportunityLookup()
  const projectOpportunityId = await resolveProjectOpportunityId(input as PrbRecord, opportunityLookup)
  if (projectOpportunityId == null) {
    throw new Error("선택한 고객사/사업기회를 백엔드에서 찾을 수 없습니다.")
  }

  const salesRepresentativeId = await resolveAssigneeIdFromInput(input as PrbRecord)
  const reviewerId = (input as PrbRecord).reviewer?.trim() ?? ""

  return {
    projectOpportunityId,
    salesRepresentativeId,
    reviewerId,
    request: buildCreateRequest(input as PrbRecord, projectOpportunityId, salesRepresentativeId, reviewerId),
  }
}

export async function saveBackendPrb(input: Omit<PrbRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const local = input.id ? getPrbs().find((item) => item.id === input.id) ?? null : null
  const payload = await buildSaveRequest(input)
  const hasNumericId = Boolean(input.id && Number.isFinite(Number(input.id)))
  const response = await fetch(
    hasNumericId ? `${getBackendApiBaseUrl()}/prbs/${input.id}` : `${getBackendApiBaseUrl()}/prbs`,
    {
      method: hasNumericId ? "PUT" : "POST",
      headers: {
        ...buildAuthHeaders(),
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload.request),
    },
  )

  const saved = await parseApiResponse<BackendPrbResponse>(response, "PRB 저장에 실패했습니다.")
  const opportunityLookup = await loadOpportunityLookup()
  const rfpLookup = buildRfpLookup()
  const merged = mapBackendPrbRecord(saved, opportunityLookup, rfpLookup, {
    ...(input as PrbRecord),
    id: String(saved.prbId ?? input.id ?? `PRB-${Date.now()}`),
    projectOpportunityId: payload.projectOpportunityId,
    salesRepresentativeId: payload.salesRepresentativeId,
    createdAt: local?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as PrbRecord)
  const next = [merged, ...getPrbs().filter((item) => item.id !== merged.id && item.id !== input.id)]
  replacePrbs(next)
  return merged
}

export async function deleteBackendPrb(id: string) {
  const response = await fetch(`${getBackendApiBaseUrl()}/prbs/${id}`, {
    method: "DELETE",
    headers: buildAuthHeaders(),
    credentials: "include",
  })

  await parseApiResponse<Record<string, unknown>>(response, "PRB 삭제에 실패했습니다.")
  replacePrbs(getPrbs().filter((item) => item.id !== id))
  return true
}
