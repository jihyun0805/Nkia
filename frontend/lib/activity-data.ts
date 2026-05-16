import type { StoredFileAttachment } from "@/lib/attachments"

export type ActivityCategory = "activities" | "quotations" | "requests"

export type ActivityAttachment = StoredFileAttachment

export type ActivityRecord = {
  id: string
  date: string
  requestId?: string
  projectOpportunityId?: number
  registrant?: string
  requester?: string
  requesterUserId?: string
  customerCode: string
  businessCode: string
  activityMode: string
  activityContent: string
  type?: string
  customer: string
  opportunity: string
  location: string
  attendees: string
  attendeeUserIds?: string[]
  content: string
  issues: string
  nextAction: string
  status: string
  attachments?: ActivityAttachment[]
}

export type QuotationRecord = {
  id: string
  workflowId?: number
  requestId?: string
  refNumber?: string
  date: string
  customerCode?: string
  opportunityCode?: string
  customer: string
  opportunity: string
  proposalType: "자체 제안" | "SI 제안"
  productGroup: "EMS" | "ITSM" | "Automation" | "WSS"
  salesRep: string
  paymentTerms?: string
  contactName?: string
  items: {
    id: string
    name: string
    amount: string
  }[]
  solutionSectionTitle?: string
  solutionRows?: {
    id: string
    rowNo: string
    category: string
    module: string
    quantity: string
    consumerUnitPrice: string
    consumerTotal: string
    supplyUnitPrice: string
    supplyTotal: string
    discountRate: string
    note: string
  }[]
  customizingSectionTitle?: string
  customizingRows?: {
    id: string
    rowNo: string
    item: string
    laborRate: string
    manMonth: string
    supplyAmount: string
  }[]
  templateText?: {
    headerBrand: string
    headerCompanyName: string
    documentTitle: string
    refLabel: string
    recipientSuffix: string
    introText: string
    quoteDateLabel: string
    paymentTermsLabel: string
    businessNameLabel: string
    totalAmountLabel: string
    totalAmountSuffix: string
    unitNote: string
    remarksTitle: string
    evidenceTitle: string
    supplierName: string
    addressLine1: string
    addressLine2: string
    ceoLabel: string
    ceoName: string
    telLabel: string
    tel: string
    faxLabel: string
    fax: string
    contactLabel: string
  }
  approvalFlow?: {
    drafter: string
    firstApprover: string
    secondApprover: string
    secondApproverOptional: boolean
    distributor: string
    sharedWith: string
  }
  approvalProcess?: {
    overallStatus: "진행중" | "승인완료" | "반려"
    currentStepIndex: number
    steps: {
      label: string
      assignee: string
      status: "pending" | "approved" | "rejected"
      actedAt?: string
      actedBy?: string
      note?: string
    }[]
  }
  deletedAt?: string
  deletedBy?: string
  deletedVersions?: string[]
  changeHistory?: {
    version: string
    changedAt: string
    changedBy: string
    action: "created" | "updated" | "deleted"
    summary: string
  }[]
  versionSnapshots?: {
    version: string
    capturedAt: string
    form: Omit<QuotationRecord, "id" | "changeHistory" | "versionSnapshots">
  }[]
  remarks?: string
  amount: string
  validity: string
  status: string
}

export type StandardPriceRecord = {
  id: string
  productClass: string
  productGroup: string
  productNumber: string
  productName: string
  licenseBase: string
  licenseUnit: string
  unitPrice: string
  discountRate: string
  proposalPrice: string
}

export type ActivityRequestRecord = {
  id: string
  title?: string
  salesActivityId?: string
  requestUserId?: string
  requestUserName?: string
  targetUserId?: string
  targetUserName?: string
  date: string
  requester: string
  receiver: string
  type: string
  customerCode?: string
  customer: string
  opportunityCode?: string
  opportunity: string
  content: string
  dueDate: string
  status: string
  approvedAt?: string
  lastAction?: "created" | "updated" | "approved"
  lastActionAt?: string
  attachments?: ActivityAttachment[]
}

export const activityModeOptions = [
  "이메일",
  "전화",
  "대면미팅",
  "영상회의",
  "기타",
]

export const activityContentOptions = [
  "상담",
  "제품소개",
  "데모",
  "PoC",
  "BMT",
  "자료 전달",
  "RFP 분석",
  "제안서 작성",
  "SI 제안서 작성",
  "기타",
]

export const activityRequestTypeOptions = [
  "제품소개",
  "데모",
  "PoC",
  "BMT",
  "자료 전달",
  "RFP 분석",
  "제안서 작성",
  "SI 제안서 작성",
  "기타",
]

export const requestOptionalActivityContents = ["상담", "기타"]

export const activityRequestStatusOptions = [
  "요청",
  "접수완료",
]

export const activities: ActivityRecord[] = []

export const quotations: QuotationRecord[] = []

export const standardPriceRecords: StandardPriceRecord[] = []

export const standardPriceNotes = [
  "주1) 12개월간 제품 하자에 대해 무상 유지 보수 합니다.",
  "주2) 하자 외의 추가 요구 사항에 대해서는 Man/Day 50만원으로 산정 합니다.",
  "주3) 유상 유지보수는 계약 금액 대비 연간 12%입니다.",
]

export const activityRequests: ActivityRequestRecord[] = []

export const activityStatuses = [
  "완료",
  "진행중",
  "예정",
  "전달완료",
  "검토중",
  "수정요청",
  "접수대기",
  "삭제",
]

const ACTIVITIES_STORAGE_KEY = "orbis.activities"
const DELETED_ACTIVITY_IDS_STORAGE_KEY = "orbis.deleted-activity-ids"
const ACTIVITY_EVENT_NAME = "orbis-activities-updated"

function isBrowser() {
  return typeof window !== "undefined"
}

function cloneActivities() {
  return activities.map((item) => ({
    ...item,
    attachments: item.attachments?.map((attachment) => ({ ...attachment })) ?? [],
  }))
}

function readStorage<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback

  const stored = window.localStorage.getItem(key)
  if (!stored) return fallback

  try {
    return JSON.parse(stored) as T
  } catch {
    return fallback
  }
}

function writeStorage<T>(key: string, value: T) {
  if (!isBrowser()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function emitActivityUpdate() {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(ACTIVITY_EVENT_NAME))
}

function nextActivityId(records: ActivityRecord[]) {
  const max = records.reduce((acc, item) => {
    const current = Number.parseInt(item.id.split("-").at(-1) ?? "0", 10)
    return Number.isNaN(current) ? acc : Math.max(acc, current)
  }, 0)

  return `ACT-2026-${String(max + 1).padStart(3, "0")}`
}

function normalizeActivityRecord(record: ActivityRecord): ActivityRecord {
  return {
    ...record,
    attachments: Array.isArray(record.attachments)
      ? record.attachments.filter((attachment) => attachment && typeof attachment.id === "string" && typeof attachment.name === "string")
      : [],
  }
}

function saveActivities(records: ActivityRecord[]) {
  writeStorage(ACTIVITIES_STORAGE_KEY, records)
}

function getDeletedActivityIds() {
  if (!isBrowser()) return []

  const stored = window.localStorage.getItem(DELETED_ACTIVITY_IDS_STORAGE_KEY)
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored) as string[]
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []
  } catch {
    return []
  }
}

function isLegacyActivityMock(record: ActivityRecord) {
  return record.id.startsWith("ACT-2026-")
}

function setDeletedActivityIds(value: string[]) {
  if (!isBrowser()) return
  window.localStorage.setItem(DELETED_ACTIVITY_IDS_STORAGE_KEY, JSON.stringify(value))
}

export function getActivities() {
  const deletedIds = new Set(getDeletedActivityIds())
  const storedRecords = readStorage<ActivityRecord[]>(ACTIVITIES_STORAGE_KEY, cloneActivities())
  const hasLegacyMock = storedRecords.some(isLegacyActivityMock)

  if (hasLegacyMock && isBrowser()) {
    window.localStorage.removeItem(ACTIVITIES_STORAGE_KEY)
    window.localStorage.removeItem(DELETED_ACTIVITY_IDS_STORAGE_KEY)
  }

  const records = (hasLegacyMock ? cloneActivities() : storedRecords)
    .map(normalizeActivityRecord)
    .filter((item) => !deletedIds.has(item.id) && !isLegacyActivityMock(item))

  if (isBrowser()) {
    saveActivities(records)
  }

  return records
}

export function createActivity(input: Omit<ActivityRecord, "id">) {
  const records = getActivities()
  const created = normalizeActivityRecord({
    ...input,
    id: nextActivityId(records),
  })

  saveActivities([created, ...records])
  setDeletedActivityIds(getDeletedActivityIds().filter((item) => item !== created.id))
  emitActivityUpdate()
  return created
}

export function updateActivity(id: string, input: Omit<ActivityRecord, "id">) {
  const records = getActivities()
  let updatedRecord: ActivityRecord | null = null

  const updatedRecords = records.map((item) => {
    if (item.id !== id) return item

    updatedRecord = normalizeActivityRecord({
      ...item,
      ...input,
      id,
    })

    return updatedRecord
  })

  if (!updatedRecord) return null

  saveActivities(updatedRecords)
  setDeletedActivityIds(getDeletedActivityIds().filter((item) => item !== id))
  emitActivityUpdate()
  return updatedRecord
}

export function deleteActivity(id: string) {
  const records = getActivities()
  const existing = records.find((item) => item.id === id)
  if (!existing) return { status: "not_found" as const }

  const filtered = records.filter((item) => item.id !== id)
  const deletedIds = new Set(getDeletedActivityIds())
  deletedIds.add(id)

  saveActivities(filtered)
  setDeletedActivityIds([...deletedIds])
  emitActivityUpdate()

  return { status: "deleted" as const, activity: existing }
}

export function subscribeActivityUpdates(listener: () => void) {
  if (!isBrowser()) return () => {}

  window.addEventListener(ACTIVITY_EVENT_NAME, listener)
  window.addEventListener("storage", listener)
  return () => {
    window.removeEventListener(ACTIVITY_EVENT_NAME, listener)
    window.removeEventListener("storage", listener)
  }
}

export function getCategoryLabel(category: ActivityCategory) {
  switch (category) {
    case "activities":
      return "영업활동"
    case "quotations":
      return "견적"
    case "requests":
      return "활동 요청"
  }
}

export function getActivityItem(category: ActivityCategory, id: string) {
  switch (category) {
    case "activities":
      return getActivities().find((item) => item.id === id) ?? null
    case "quotations":
      return quotations.find((item) => item.id === id) ?? null
    case "requests":
      return activityRequests.find((item) => item.id === id) ?? null
  }
}

export function getActivityItemFields(category: ActivityCategory, item: any) {
  switch (category) {
    case "activities":
      return [
        { label: "고객사", value: item.customer },
        { label: "고객사 코드", value: item.customerCode ?? "-" },
        { label: "사업기회", value: item.opportunity },
        { label: "사업기회 코드", value: item.businessCode ?? "-" },
        { label: "활동일", value: item.date },
        { label: "활동형태", value: item.activityMode ?? "-" },
        { label: "활동내용", value: item.activityContent ?? "-" },
        { label: "요청자", value: item.requester ?? "-" },
        { label: "등록자", value: item.registrant ?? "-" },
        { label: "활동요청ID", value: item.requestId ?? "-" },
        { label: "장소", value: item.location },
        { label: "참석자", value: item.attendees },
        { label: "주요 내용", value: item.content },
        { label: "고객 관심 사항 / 이슈", value: item.issues },
        { label: "다음 할 일", value: item.nextAction },
      ]
    case "quotations":
      return [
        { label: "견적일", value: item.date },
        { label: "고객사", value: item.customer },
        { label: "고객사 코드", value: item.customerCode ?? "-" },
        { label: "사업기회", value: item.opportunity },
        { label: "사업기회 코드", value: item.opportunityCode ?? "-" },
        { label: "제안 유형", value: item.proposalType },
        { label: "제품군", value: item.productGroup },
        { label: "영업대표", value: item.salesRep },
        { label: "제품", value: item.items?.map((entry: { name: string }) => entry.name).join(", ") || "-" },
        { label: "견적 금액", value: item.amount },
        { label: "유효기간", value: item.validity },
        { label: "견적 비고", value: item.remarks ?? "-" },
      ]
    case "requests":
      return [
        { label: "제목", value: item.title ?? "-" },
        { label: "연결 영업활동ID", value: item.salesActivityId ?? "-" },
        { label: "요청자 ID", value: item.requestUserId ?? "-" },
        { label: "요청자명", value: item.requestUserName ?? "-" },
        { label: "담당자 ID", value: item.targetUserId ?? "-" },
        { label: "담당자명", value: item.targetUserName ?? "-" },
        { label: "요청일", value: item.date },
        { label: "요청 유형", value: item.type },
        { label: "요청자", value: item.requester },
        { label: "담당자", value: item.receiver },
        { label: "고객사", value: item.customer },
        { label: "고객사 코드", value: item.customerCode ?? "-" },
        { label: "사업기회", value: item.opportunity || "미확인" },
        { label: "사업기회 코드", value: item.opportunityCode || "-" },
        { label: "활동일", value: item.dueDate },
        { label: "상태", value: item.status },
        { label: "요청 내용", value: item.content },
      ]
  }
}

export function getActivityDisplayType(item: Pick<ActivityRecord, "activityMode" | "activityContent" | "type">) {
  const mode = item.activityMode?.trim()
  const content = item.activityContent?.trim()

  if (mode && content) return `${mode} / ${content}`
  return content || mode || item.type || "-"
}
