"use client"

import { getBackendApiBaseUrl } from "@/lib/api-base-url"
import { buildAuthHeaders } from "@/lib/auth-session"
import { loadBackendFindingData, type FindingBackendData } from "@/lib/finding-backend"
import { type ProposalProductGroup, type ProposalRecord, type ProposalType } from "@/lib/bid-data"

type ApiResponse<T> = {
  result?: string
  data?: T | null
  errorCode?: string | null
  message?: string | null
}

type ApiPage<T> = {
  content?: T[]
}

type BackendProjectOpportunity = {
  id?: number
  opportunityCode?: string
  opportunityName?: string
  customerCompanyName?: string
  salesRepresentativeName?: string
  projectType?: string
}

type BackendProposalListItem = {
  proposalId?: number
  requestDate?: string
  customerCompanyName?: string
  opportunityName?: string
  projectType?: string
  proposalDeadline?: string
  proposalType?: string
  status?: string
}

type BackendProposalFile = {
  fileId?: number
  originalFileName?: string
  fileSize?: number
  presignedUrl?: string
}

type BackendProposalDetailItem = {
  proposalId?: number
  salesActivityRequestId?: number
  requestDate?: string
  requestUserName?: string
  customerCompanyCode?: string
  customerCompanyName?: string
  opportunityCode?: string
  opportunityName?: string
  projectType?: string
  proposalDeadline?: string
  proposalType?: string
  createdByName?: string
  status?: string
  files?: BackendProposalFile[]
}

type BackendProposalPrefillItem = {
  customerCompanyCode?: string
  customerCompanyName?: string
  projectOpportunityCode?: string
  projectOpportunityName?: string
  projectType?: string
  proposalType?: string
  proposalDeadLine?: string
  requestDate?: string
  requestUserName?: string
}

export type ProposalBackendDetail = {
  id: string
  requestId: string
  requestDate: string
  requestUserName: string
  customerCode: string
  customer: string
  opportunityCode: string
  opportunity: string
  proposalType: ProposalType
  productGroup: ProposalProductGroup | ""
  proposalDeadline: string
  salesRep: string
  contactName: string
  createdByName: string
  status: "작성 중" | "완료"
  fileIds: number[]
  files: { fileId: number; name: string; size: number; url: string }[]
}

export type ProposalBackendPrefill = {
  customerCode: string
  customerName: string
  opportunityCode: string
  opportunityName: string
  productGroup: ProposalProductGroup | ""
  proposalType: ProposalType
  requestDate: string
  proposalDeadline: string
  salesRep: string
}

export type ProposalSaveInput = {
  proposalId?: string
  requestId?: string
  customerCode: string
  customerName?: string
  opportunityCode: string
  opportunityName?: string
  projectOpportunityId?: number
  proposalType: ProposalType
  productGroup?: ProposalProductGroup | ""
  requestDate?: string
  proposalDeadline?: string
  salesRep?: string
  contactName?: string
  existingFileIds?: number[]
  files?: File[]
}

function parseApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  return response
    .json()
    .catch(() => null)
    .then((payload) => {
      const body = payload as ApiResponse<T> | null
      if (!response.ok) {
        throw new Error(body?.message || fallbackMessage)
      }
      if (body?.result !== "SUCCESS" || body.data == null) {
        throw new Error(body?.message || fallbackMessage)
      }
      return body.data
    })
}

function normalizeLookupText(value?: string | number | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.()/]/g, "")
}

function toDateString(value?: string) {
  if (!value) return ""
  return value.includes("T") ? value.slice(0, 10) : value.slice(0, 10)
}

function mapProposalTypeToFrontend(value?: string): ProposalType {
  if (value === "SI") return "SI 제안"
  return "자체 제안"
}

function mapProjectTypeToFrontend(value?: string): ProposalProductGroup | "" {
  const normalized = value?.trim().toUpperCase()
  if (normalized === "EMS" || normalized === "ITSM" || normalized === "WSS") {
    return normalized as ProposalProductGroup
  }
  if (normalized === "AUTOMATION") {
    return "Automation"
  }
  return ""
}

function mapStatusToFrontend(value?: string): "작성 중" | "완료" {
  if (value === "COMPLETED") return "완료"
  return "작성 중"
}

function normalizeProductGroup(value?: string): ProposalProductGroup | "" {
  const normalized = value?.trim().toUpperCase()
  if (normalized === "EMS" || normalized === "ITSM" || normalized === "AUTOMATION" || normalized === "WSS") {
    return normalized as ProposalProductGroup
  }
  return ""
}

function findCustomerByBackendData(
  findingData: FindingBackendData,
  customerCompanyCode?: string,
  customerCompanyName?: string,
) {
  const normalizedCode = normalizeLookupText(customerCompanyCode)
  const normalizedName = normalizeLookupText(customerCompanyName)

  return findingData.customers.find((item) => {
    if (normalizedCode && normalizeLookupText(item.id) === normalizedCode) return true
    if (normalizedCode && normalizeLookupText(item.backendId) === normalizedCode) return true
    if (normalizedName && normalizeLookupText(item.name) === normalizedName) return true
    return false
  }) ?? null
}

function findOpportunityByBackendData(
  findingData: FindingBackendData,
  customerCompanyCode?: string,
  customerCompanyName?: string,
  opportunityCode?: string,
  opportunityName?: string,
) {
  const normalizedOpportunityCode = normalizeLookupText(opportunityCode)
  const normalizedOpportunityName = normalizeLookupText(opportunityName)
  const normalizedCustomerCode = normalizeLookupText(customerCompanyCode)
  const normalizedCustomerName = normalizeLookupText(customerCompanyName)

  return (
    findingData.opportunities.find((item) => {
      if (normalizedOpportunityCode && normalizeLookupText(item.id) === normalizedOpportunityCode) return true
      if (normalizedOpportunityCode && normalizeLookupText(item.backendId) === normalizedOpportunityCode) return true
      if (normalizedOpportunityName && normalizeLookupText(item.name) === normalizedOpportunityName) return true

      if (normalizedCustomerCode && normalizeLookupText(item.customerCode) === normalizedCustomerCode) {
        return Boolean(normalizedOpportunityName && normalizeLookupText(item.name) === normalizedOpportunityName)
      }

      if (normalizedCustomerName && normalizeLookupText(item.customer) === normalizedCustomerName) {
        return Boolean(normalizedOpportunityName && normalizeLookupText(item.name) === normalizedOpportunityName)
      }

      return false
    }) ?? null
  )
}

async function fetchProposalList() {
  const response = await fetch(`${getBackendApiBaseUrl()}/proposals?size=2000`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<ApiPage<BackendProposalListItem>>(response, "제안서 목록을 불러오지 못했습니다.")
}

async function fetchProposalDetail(proposalId: number) {
  const response = await fetch(`${getBackendApiBaseUrl()}/proposals/${proposalId}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendProposalDetailItem>(response, "제안서 상세를 불러오지 못했습니다.")
}

async function fetchProjectOpportunities() {
  const response = await fetch(`${getBackendApiBaseUrl()}/project-opportunities?size=2000`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<ApiPage<BackendProjectOpportunity>>(response, "사업기회 목록을 불러오지 못했습니다.")
}

async function fetchProposalPrefill(salesActivityRequestId: number) {
  const response = await fetch(
    `${getBackendApiBaseUrl()}/proposals/pre-fill?salesActivityRequestId=${salesActivityRequestId}`,
    {
      headers: buildAuthHeaders(),
      credentials: "include",
      cache: "no-store",
    },
  )

  return parseApiResponse<BackendProposalPrefillItem>(response, "제안서 기본 정보를 불러오지 못했습니다.")
}

async function uploadProposalFile(file: File) {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${getBackendApiBaseUrl()}/files/upload?category=PROPOSAL`, {
    method: "POST",
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
    body: formData,
  })

  return parseApiResponse<number>(response, "제안서 첨부파일을 업로드하지 못했습니다.")
}

async function uploadProposalFiles(files: File[]) {
  const uploaded = await Promise.all(files.map((file) => uploadProposalFile(file)))
  return uploaded.filter((value): value is number => typeof value === "number")
}

async function resolveProjectOpportunityId(params: {
  projectOpportunityId?: number
  customerCode?: string
  customerName?: string
  opportunityCode?: string
  opportunityName?: string
}) {
  if (params.projectOpportunityId != null) {
    return params.projectOpportunityId
  }

  const opportunities = (await fetchProjectOpportunities()).content ?? []
  const normalizedCustomer = normalizeLookupText(params.customerName ?? params.customerCode)
  const normalizedOpportunityCode = normalizeLookupText(params.opportunityCode)
  const normalizedOpportunityName = normalizeLookupText(params.opportunityName)

  const matched = opportunities.find((item) => {
    if (normalizedOpportunityCode && normalizeLookupText(item.opportunityCode) === normalizedOpportunityCode) return true
    if (normalizedOpportunityName && normalizeLookupText(item.opportunityName) === normalizedOpportunityName) return true

    const opportunityCustomer = normalizeLookupText(item.customerCompanyName)
    if (normalizedCustomer && opportunityCustomer && opportunityCustomer === normalizedCustomer && normalizedOpportunityName) {
      return normalizeLookupText(item.opportunityName) === normalizedOpportunityName
    }

    return (
      normalizedCustomer &&
      normalizedOpportunityName &&
      opportunityCustomer === normalizedCustomer &&
      normalizeLookupText(item.opportunityName) === normalizedOpportunityName
    )
  })

  return matched?.id ?? null
}

function mapProposalSummary(item: BackendProposalListItem, index: number, findingData: FindingBackendData): ProposalRecord {
  const customer = findCustomerByBackendData(findingData, undefined, item.customerCompanyName)
  const opportunity = findOpportunityByBackendData(
    findingData,
    customer?.id ?? "",
    item.customerCompanyName,
    undefined,
    item.opportunityName,
  )
  const now = new Date().toISOString()

  return {
    id: String(item.proposalId ?? index + 1),
    requestId: String(item.proposalId ?? index + 1),
    customerCode: customer?.id ?? opportunity?.customerCode ?? "",
    customer: item.customerCompanyName ?? customer?.name ?? "-",
    opportunityCode: opportunity?.id ?? "",
    opportunity: item.opportunityName ?? opportunity?.name ?? "-",
    proposalType: mapProposalTypeToFrontend(item.proposalType),
    productGroup: normalizeProductGroup(item.projectType) || (opportunity?.product as ProposalProductGroup | undefined) || "EMS",
    requestDate: toDateString(item.requestDate),
    proposalDeadline: toDateString(item.proposalDeadline),
    salesRep: opportunity?.salesRep ?? "",
    contactName: customer?.contactName ?? customer?.contact ?? "",
    attachments: [],
    attachmentNames: [],
    createdAt: toDateString(item.requestDate) || now,
    updatedAt: now,
  }
}

function mapProposalDetail(item: BackendProposalDetailItem, findingData: FindingBackendData): ProposalBackendDetail {
  const customer = findCustomerByBackendData(findingData, item.customerCompanyCode, item.customerCompanyName)
  const opportunity = findOpportunityByBackendData(
    findingData,
    item.customerCompanyCode ?? customer?.id ?? "",
    item.customerCompanyName,
    item.opportunityCode,
    item.opportunityName,
  )
  const files = (item.files ?? [])
    .filter((file): file is Required<Pick<BackendProposalFile, "fileId" | "originalFileName" | "fileSize" | "presignedUrl">> =>
      typeof file.fileId === "number" &&
      typeof file.originalFileName === "string" &&
      typeof file.presignedUrl === "string" &&
      typeof file.fileSize === "number",
    )
    .map((file) => ({
      fileId: file.fileId,
      name: file.originalFileName,
      size: file.fileSize,
      url: file.presignedUrl,
    }))

  return {
    id: String(item.proposalId ?? ""),
    requestId: String(item.salesActivityRequestId ?? item.proposalId ?? ""),
    requestDate: toDateString(item.requestDate),
    requestUserName: item.requestUserName ?? "",
    customerCode: item.customerCompanyCode ?? customer?.id ?? opportunity?.customerCode ?? "",
    customer: item.customerCompanyName ?? customer?.name ?? "",
    opportunityCode: item.opportunityCode ?? opportunity?.id ?? "",
    opportunity: item.opportunityName ?? opportunity?.name ?? "",
    proposalType: mapProposalTypeToFrontend(item.proposalType),
    productGroup: normalizeProductGroup(item.projectType) || (opportunity?.product as ProposalProductGroup | undefined) || "",
    proposalDeadline: toDateString(item.proposalDeadline),
    salesRep: opportunity?.salesRep ?? item.createdByName ?? item.requestUserName ?? "",
    contactName: customer?.contactName ?? customer?.contact ?? item.requestUserName ?? "",
    createdByName: item.createdByName ?? "",
    status: mapStatusToFrontend(item.status),
    fileIds: files.map((file) => file.fileId),
    files,
  }
}

export async function loadBackendProposals() {
  const findingData = await loadBackendFindingData()
  const payload = await fetchProposalList()
  const records = (payload.content ?? []).map((item, index) => mapProposalSummary(item, index, findingData))
  return records
}

export async function loadBackendProposalDetailById(proposalId: string) {
  const numericId = Number.parseInt(proposalId, 10)
  if (Number.isNaN(numericId)) {
    throw new Error("제안서 ID가 올바르지 않습니다.")
  }

  const findingData = await loadBackendFindingData()
  const payload = await fetchProposalDetail(numericId)
  return mapProposalDetail(payload, findingData)
}

export async function loadBackendProposalPrefill(salesActivityRequestId: string | number) {
  const numericId =
    typeof salesActivityRequestId === "number"
      ? salesActivityRequestId
      : Number.parseInt(String(salesActivityRequestId), 10)

  if (Number.isNaN(numericId)) {
    throw new Error("활동 요청 ID가 올바르지 않습니다.")
  }

  const payload = await fetchProposalPrefill(numericId)
  return {
    customerCode: payload.customerCompanyCode ?? "",
    customerName: payload.customerCompanyName ?? "",
    opportunityCode: payload.projectOpportunityCode ?? "",
    opportunityName: payload.projectOpportunityName ?? "",
    productGroup: mapProjectTypeToFrontend(payload.projectType),
    proposalType: mapProposalTypeToFrontend(payload.proposalType),
    requestDate: toDateString(payload.requestDate),
    proposalDeadline: toDateString(payload.proposalDeadLine),
    salesRep: payload.requestUserName ?? "",
  } satisfies ProposalBackendPrefill
}

export async function saveBackendProposal(input: ProposalSaveInput) {
  const projectOpportunityId = await resolveProjectOpportunityId({
    projectOpportunityId: input.projectOpportunityId,
    customerCode: input.customerCode,
    customerName: input.customerName,
    opportunityCode: input.opportunityCode,
    opportunityName: input.opportunityName,
  })

  if (projectOpportunityId == null) {
    throw new Error("연결할 사업기회를 찾지 못했습니다.")
  }

  const uploadedFileIds = await uploadProposalFiles(input.files ?? [])
  const fileIds = Array.from(new Set([...(input.existingFileIds ?? []), ...uploadedFileIds]))
  const shouldComplete = fileIds.length > 0
  const salesActivityRequestId = (() => {
    if (!input.requestId) return undefined
    const parsed = Number.parseInt(input.requestId, 10)
    return Number.isNaN(parsed) ? undefined : parsed
  })()

  let proposalId = input.proposalId ? Number.parseInt(input.proposalId, 10) : undefined
  if (proposalId && !Number.isNaN(proposalId)) {
    const updateResponse = await fetch(`${getBackendApiBaseUrl()}/proposals/${proposalId}`, {
      method: "PUT",
      headers: {
        ...buildAuthHeaders(),
        "Content-Type": "application/json",
      },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        projectOpportunityId,
        salesActivityRequestId,
        status: shouldComplete ? "COMPLETED" : undefined,
        fileIds: fileIds.length > 0 ? fileIds : undefined,
      }),
    })

    await parseApiResponse<number>(updateResponse, "제안서를 저장하지 못했습니다.")
  } else {
    const createResponse = await fetch(`${getBackendApiBaseUrl()}/proposals`, {
      method: "POST",
      headers: {
        ...buildAuthHeaders(),
        "Content-Type": "application/json",
      },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        projectOpportunityId,
        salesActivityRequestId,
        fileIds: fileIds.length > 0 ? fileIds : undefined,
      }),
    })

    proposalId = await parseApiResponse<number>(createResponse, "제안서를 등록하지 못했습니다.")
    if (shouldComplete) {
      try {
        const updateResponse = await fetch(`${getBackendApiBaseUrl()}/proposals/${proposalId}`, {
          method: "PUT",
          headers: {
            ...buildAuthHeaders(),
            "Content-Type": "application/json",
          },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({
            projectOpportunityId,
            salesActivityRequestId,
            status: "COMPLETED",
            fileIds: fileIds.length > 0 ? fileIds : undefined,
          }),
        })

        await parseApiResponse<number>(updateResponse, "제안서를 저장하지 못했습니다.")
      } catch (error) {
        try {
          if (proposalId != null) {
            await deleteBackendProposal(String(proposalId))
          }
        } catch {
          // 생성 후 완료 처리 실패 시 정리는 시도만 하고, 원래 에러를 우선 반환한다.
        }
        throw error
      }
    }
  }
  await loadBackendProposals()
  return String(proposalId)
}

export async function deleteBackendProposal(proposalId: string) {
  const numericId = Number.parseInt(proposalId, 10)
  if (Number.isNaN(numericId)) {
    throw new Error("제안서 ID가 올바르지 않습니다.")
  }

  const response = await fetch(`${getBackendApiBaseUrl()}/proposals/${numericId}`, {
    method: "DELETE",
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  await parseApiResponse<null>(response, "제안서를 삭제하지 못했습니다.")
  await loadBackendProposals()
}
