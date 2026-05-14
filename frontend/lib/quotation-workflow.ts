"use client"

import { quotations, type QuotationRecord } from "@/lib/activity-data"
import { currentUser } from "@/lib/current-user"

const QUOTATIONS_STORAGE_KEY = "orbis.quotations"
const QUOTATION_EVENT_NAME = "orbis-quotations-updated"

function isBrowser() {
  return typeof window !== "undefined"
}

function cloneQuotations() {
  return quotations.map((item) => ({
    ...item,
    items: (item.items ?? []).map((entry) => ({ ...entry })),
    solutionRows: item.solutionRows?.map((entry) => ({ ...entry })) ?? [],
    customizingRows: item.customizingRows?.map((entry) => ({ ...entry })) ?? [],
    approvalFlow: item.approvalFlow ? { ...item.approvalFlow } : undefined,
    deletedAt: item.deletedAt,
    deletedBy: item.deletedBy,
    deletedVersions: item.deletedVersions?.slice() ?? [],
    changeHistory: item.changeHistory?.map((entry) => ({ ...entry })) ?? [],
    versionSnapshots: item.versionSnapshots?.map((entry) => ({
      ...entry,
      form: {
        ...(entry.form ?? {}),
        items: Array.isArray(entry.form?.items) ? entry.form.items.map((item) => ({ ...item })) : [],
        solutionRows: Array.isArray(entry.form?.solutionRows) ? entry.form.solutionRows.map((row) => ({ ...row })) : [],
        customizingRows: Array.isArray(entry.form?.customizingRows) ? entry.form.customizingRows.map((row) => ({ ...row })) : [],
        approvalFlow: entry.form?.approvalFlow ? { ...entry.form.approvalFlow } : undefined,
      },
    })) ?? [],
  }))
}

function todayTimestamp() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hour = String(now.getHours()).padStart(2, "0")
  const minute = String(now.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day} ${hour}:${minute}`
}

function summarizeQuotationChanges(previous: QuotationRecord, next: QuotationRecord) {
  const changes: string[] = []

  if (previous.customer !== next.customer) changes.push("고객사")
  if (previous.opportunity !== next.opportunity) changes.push("사업명")
  if (previous.date !== next.date) changes.push("견적일자")
  if (previous.proposalType !== next.proposalType) changes.push("제안 유형")
  if (previous.productGroup !== next.productGroup) changes.push("제품군")
  if ((previous.paymentTerms ?? "") !== (next.paymentTerms ?? "")) changes.push("대금결제조건")
  if ((previous.contactName ?? "") !== (next.contactName ?? "")) changes.push("담당자")
  if ((previous.amount ?? "") !== (next.amount ?? "")) changes.push("합계금액")
  if ((previous.remarks ?? "") !== (next.remarks ?? "")) changes.push("특기사항")
  if ((previous.refNumber ?? "") !== (next.refNumber ?? "")) changes.push("Ref No")

  if (previous.items.length !== next.items.length) {
    changes.push("요약 항목")
  } else if (
    previous.items.some((item, index) => item.name !== next.items[index]?.name || item.amount !== next.items[index]?.amount)
  ) {
    changes.push("요약 항목")
  }

  if (previous.solutionSectionTitle !== next.solutionSectionTitle) changes.push("Solution 제목")
  if (previous.customizingSectionTitle !== next.customizingSectionTitle) changes.push("커스터마이징 제목")

  const previousSolutionRows = previous.solutionRows ?? []
  const nextSolutionRows = next.solutionRows ?? []
  if (previousSolutionRows.length !== nextSolutionRows.length) {
    changes.push("Solution 표")
  } else if (
    previousSolutionRows.some((row, index) =>
      Object.entries(row).some(([key, value]) => key !== "id" && value !== nextSolutionRows[index]?.[key as keyof typeof row]),
    )
  ) {
    changes.push("Solution 표")
  }

  const previousCustomizingRows = previous.customizingRows ?? []
  const nextCustomizingRows = next.customizingRows ?? []
  if (previousCustomizingRows.length !== nextCustomizingRows.length) {
    changes.push("커스터마이징 표")
  } else if (
    previousCustomizingRows.some((row, index) =>
      Object.entries(row).some(([key, value]) => key !== "id" && value !== nextCustomizingRows[index]?.[key as keyof typeof row]),
    )
  ) {
    changes.push("커스터마이징 표")
  }

  if (changes.length === 0) return "변경 사항 없음"
  return `${changes.join(", ")} 수정`
}

function createDefaultApprovalProcess() {
  return {
    overallStatus: "진행중" as const,
    currentStepIndex: 0,
    steps: [
      { label: "상신자", assignee: currentUser.name, status: "pending" as const },
      { label: "팀장", assignee: "팀장", status: "pending" as const },
      { label: "본부장", assignee: "본부장", status: "pending" as const },
      { label: "사업본부장", assignee: "사업본부장", status: "pending" as const },
      { label: "경영지원팀장", assignee: "경영지원팀장", status: "pending" as const },
      { label: "대표이사", assignee: "대표이사", status: "pending" as const },
    ],
  }
}

function canActOnStep(assignee: string) {
  return assignee === currentUser.name || assignee === currentUser.role
}

export function getQuotationDisplayStatus(record: QuotationRecord) {
  if (record.deletedAt) return "삭제"

  const snapshots = record.versionSnapshots ?? []
  if (snapshots.length > 0 && snapshots.every((snapshot) => (record.deletedVersions ?? []).includes(snapshot.version))) {
    return "삭제"
  }

  return record.status
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

function emitQuotationUpdate() {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(QUOTATION_EVENT_NAME))
}

function saveQuotations(records: QuotationRecord[]) {
  writeStorage(QUOTATIONS_STORAGE_KEY, records)
}

function nextQuotationId(records: QuotationRecord[]) {
  const max = records.reduce((acc, item) => {
    const current = Number.parseInt(item.id.split("-").at(-1) ?? "0", 10)
    return Number.isNaN(current) ? acc : Math.max(acc, current)
  }, 0)

  return `QT-2026-${String(max + 1).padStart(3, "0")}`
}

function normalizeQuotation(record: QuotationRecord): QuotationRecord {
  const items = Array.isArray(record.items) ? record.items : []
  const solutionRows = Array.isArray(record.solutionRows) ? record.solutionRows : []
  const customizingRows = Array.isArray(record.customizingRows) ? record.customizingRows : []
  const versionSnapshots = Array.isArray(record.versionSnapshots) ? record.versionSnapshots : []

  return {
    ...record,
    requestId: record.requestId,
    items: items.map((item, index) => ({
      ...item,
      id: item.id || `${record.id}-ITEM-${index + 1}`,
    })),
    solutionRows: solutionRows.map((item, index) => ({
      ...item,
      id: item.id || `${record.id}-SOLUTION-${index + 1}`,
    })),
    customizingRows: customizingRows.map((item, index) => ({
      ...item,
      id: item.id || `${record.id}-CUSTOM-${index + 1}`,
    })),
    approvalFlow: record.approvalFlow
      ? { ...record.approvalFlow }
      : {
          drafter: record.salesRep,
          firstApprover: "팀장",
          secondApprover: "본부장",
          secondApproverOptional: true,
          distributor: "없음",
          sharedWith: "권한 보유자",
        },
    approvalProcess: record.approvalProcess
      ? {
          overallStatus: record.approvalProcess.overallStatus,
          currentStepIndex: record.approvalProcess.currentStepIndex,
          steps: record.approvalProcess.steps.map((step) => ({ ...step })),
        }
      : createDefaultApprovalProcess(),
    deletedAt: record.deletedAt,
    deletedBy: record.deletedBy,
    changeHistory: (record.changeHistory ?? []).map((item) => ({ ...item })),
    deletedVersions: record.deletedVersions?.slice() ?? [],
    versionSnapshots: versionSnapshots.map((item) => ({
      ...item,
      form: item.form
        ? {
            ...item.form,
            items: Array.isArray(item.form.items) ? item.form.items.map((entry) => ({ ...entry })) : [],
            solutionRows: Array.isArray(item.form.solutionRows) ? item.form.solutionRows.map((entry) => ({ ...entry })) : [],
            customizingRows: Array.isArray(item.form.customizingRows) ? item.form.customizingRows.map((entry) => ({ ...entry })) : [],
            approvalFlow: item.form.approvalFlow ? { ...item.form.approvalFlow } : undefined,
          }
        : {
            ...createSnapshotForm({
              ...record,
              items,
              solutionRows,
              customizingRows,
              versionSnapshots: [],
              changeHistory: Array.isArray(record.changeHistory) ? record.changeHistory : [],
              deletedVersions: Array.isArray(record.deletedVersions) ? record.deletedVersions : [],
            }),
          },
    })),
  }
}

function createSnapshotForm(record: Omit<QuotationRecord, "id">): Omit<QuotationRecord, "id" | "changeHistory" | "versionSnapshots"> {
  const items = Array.isArray(record.items) ? record.items : []
  const solutionRows = Array.isArray(record.solutionRows) ? record.solutionRows : []
  const customizingRows = Array.isArray(record.customizingRows) ? record.customizingRows : []

  return {
    ...record,
    requestId: record.requestId,
    items: items.map((item) => ({ ...item })),
    solutionRows: solutionRows.map((item) => ({ ...item })),
    customizingRows: customizingRows.map((item) => ({ ...item })),
    approvalFlow: record.approvalFlow ? { ...record.approvalFlow } : undefined,
    approvalProcess: record.approvalProcess
      ? {
          overallStatus: record.approvalProcess.overallStatus,
          currentStepIndex: record.approvalProcess.currentStepIndex,
          steps: record.approvalProcess.steps.map((step) => ({ ...step })),
        }
      : undefined,
  }
}

export function getQuotations() {
  const storedRecords = readStorage<QuotationRecord[]>(QUOTATIONS_STORAGE_KEY, cloneQuotations())
  const hasLegacyMock = storedRecords.some((item) => item.id.startsWith("QT-2026-") || item.requestId?.startsWith("REQ-2026-") === true)

  if (hasLegacyMock && isBrowser()) {
    window.localStorage.removeItem(QUOTATIONS_STORAGE_KEY)
    return []
  }

  const records = storedRecords.map(normalizeQuotation)

  if (isBrowser()) {
    saveQuotations(records)
  }

  return records
}

export function createQuotation(input: Omit<QuotationRecord, "id">) {
  const records = getQuotations()
  const id = nextQuotationId(records)
  const created = normalizeQuotation({
    ...input,
    id,
    approvalFlow: input.approvalFlow ?? {
      drafter: input.salesRep,
      firstApprover: "팀장",
      secondApprover: "본부장",
      secondApproverOptional: true,
      distributor: "없음",
      sharedWith: "권한 보유자",
    },
    approvalProcess: input.approvalProcess ?? createDefaultApprovalProcess(),
    deletedAt: input.deletedAt,
    deletedBy: input.deletedBy,
    deletedVersions: input.deletedVersions?.slice() ?? [],
    changeHistory: [
      ...(input.changeHistory ?? []),
      {
        version: "v1",
        changedAt: todayTimestamp(),
        changedBy: input.salesRep,
        action: "created",
        summary: "견적서 최초 등록",
      },
    ],
    versionSnapshots: [
      {
        version: "v1",
        capturedAt: todayTimestamp(),
        form: createSnapshotForm(input),
      },
    ],
    items: input.items.map((item, index) => ({
      ...item,
      id: item.id || `${id}-ITEM-${index + 1}`,
    })),
  })

  saveQuotations([created, ...records])
  emitQuotationUpdate()
  return created
}

export function updateQuotation(id: string, input: Omit<QuotationRecord, "id">) {
  const records = getQuotations()
  let updatedRecord: QuotationRecord | null = null
  const current = records.find((item) => item.id === id) ?? null

  if (current?.deletedAt) return null

  const updated = records.map((item) => {
    if (item.id !== id) return item

    const normalizedInput = normalizeQuotation({
      ...input,
      id,
      items: input.items.map((entry, index) => ({
        ...entry,
        id: entry.id || `${id}-ITEM-${index + 1}`,
      })),
      approvalFlow: input.approvalFlow ?? current?.approvalFlow,
      approvalProcess: current?.approvalProcess ?? input.approvalProcess ?? createDefaultApprovalProcess(),
      deletedVersions: current?.deletedVersions ?? input.deletedVersions ?? [],
      changeHistory: current?.changeHistory ?? [],
    })
    const nextVersionNumber = (current?.versionSnapshots?.length ?? 0) + 1
    updatedRecord = normalizeQuotation({
      ...normalizedInput,
      changeHistory: [
        ...(current?.changeHistory ?? []),
        {
          version: `v${nextVersionNumber}`,
          changedAt: todayTimestamp(),
          changedBy: input.salesRep,
          action: "updated",
          summary: current ? summarizeQuotationChanges(current, normalizedInput) : "견적서 수정",
        },
      ],
      versionSnapshots: [
        ...(current?.versionSnapshots ?? []),
        {
          version: `v${nextVersionNumber}`,
          capturedAt: todayTimestamp(),
          form: createSnapshotForm(input),
        },
      ],
    })

    return updatedRecord
  })

  if (!updatedRecord) return null

  saveQuotations(updated)
  emitQuotationUpdate()
  return updatedRecord
}

export function deleteQuotation(id: string) {
  const records = getQuotations()
  let updatedRecord: QuotationRecord | null = null

  const updated = records.map((item) => {
    if (item.id !== id) return item
    if (item.deletedAt) {
      updatedRecord = item
      return item
    }

    updatedRecord = normalizeQuotation({
      ...item,
      deletedAt: todayTimestamp(),
      deletedBy: item.salesRep,
      changeHistory: [
        ...(item.changeHistory ?? []),
        {
          version: "전체삭제",
          changedAt: todayTimestamp(),
          changedBy: item.salesRep,
          action: "deleted",
          summary: "견적서 전체삭제",
        },
      ],
    })

    return updatedRecord
  })

  if (!updatedRecord) return false

  saveQuotations(updated)
  emitQuotationUpdate()
  return true
}

export function deleteQuotationVersion(id: string, version: string) {
  const records = getQuotations()
  let updatedRecord: QuotationRecord | null = null

  const updated = records.map((item) => {
    if (item.id !== id) return item

    const targetSnapshot = item.versionSnapshots?.find((snapshot) => snapshot.version === version) ?? null
    if (!targetSnapshot) {
      updatedRecord = item
      return item
    }

    if (item.deletedVersions?.includes(version)) {
      updatedRecord = item
      return item
    }

    const deletedSummary = `${version} 삭제`

    updatedRecord = normalizeQuotation({
      ...item,
      deletedVersions: [...(item.deletedVersions ?? []), version],
      changeHistory: [
        ...(item.changeHistory ?? []),
        {
          version,
          changedAt: todayTimestamp(),
          changedBy: item.salesRep,
          action: "deleted",
          summary: deletedSummary,
        },
      ],
    })

    return updatedRecord
  })

  if (!updatedRecord) return null

  saveQuotations(updated)
  emitQuotationUpdate()
  return updatedRecord
}

export function approveQuotationStep(id: string, note = "") {
  const records = getQuotations()
  let updatedRecord: QuotationRecord | null = null

  const updated = records.map((item) => {
    if (item.id !== id) return item
    if (!item.approvalProcess || item.approvalProcess.overallStatus !== "진행중") {
      updatedRecord = item
      return item
    }

    const step = item.approvalProcess.steps[item.approvalProcess.currentStepIndex]
    if (!step || !canActOnStep(step.assignee)) {
      updatedRecord = item
      return item
    }

    const approvalProcess = item.approvalProcess
    const nextSteps = approvalProcess.steps.map((currentStep, index) => {
      if (index < approvalProcess.currentStepIndex) {
        return { ...currentStep, status: "approved" as const }
      }
      if (index === approvalProcess.currentStepIndex) {
        return {
          ...currentStep,
          status: "approved" as const,
          actedAt: todayTimestamp(),
          actedBy: currentUser.name,
          note,
        }
      }
      return { ...currentStep }
    })

    const nextStepIndex = approvalProcess.currentStepIndex + 1
    const completed = nextStepIndex >= nextSteps.length

    updatedRecord = normalizeQuotation({
      ...item,
        approvalProcess: {
          overallStatus: completed ? "승인완료" : "진행중",
          currentStepIndex: completed ? nextSteps.length - 1 : nextStepIndex,
          steps: nextSteps,
        },
      status: completed ? "승인완료" : item.status,
      changeHistory: [
        ...(item.changeHistory ?? []),
        {
          version: `결재-${approvalProcess.currentStepIndex + 1}`,
          changedAt: todayTimestamp(),
          changedBy: currentUser.name,
          action: "updated",
          summary: `${step.label} 승인`,
        },
      ],
    })

    return updatedRecord
  })

  if (!updatedRecord) return null

  saveQuotations(updated)
  emitQuotationUpdate()
  return updatedRecord
}

export function rejectQuotationStep(id: string, note = "") {
  const records = getQuotations()
  let updatedRecord: QuotationRecord | null = null

  const updated = records.map((item) => {
    if (item.id !== id) return item
    if (!item.approvalProcess || item.approvalProcess.overallStatus !== "진행중") {
      updatedRecord = item
      return item
    }

    const step = item.approvalProcess.steps[item.approvalProcess.currentStepIndex]
    if (!step || !canActOnStep(step.assignee)) {
      updatedRecord = item
      return item
    }

    const approvalProcess = item.approvalProcess
    updatedRecord = normalizeQuotation({
      ...item,
      approvalProcess: {
        ...approvalProcess,
        overallStatus: "반려",
        steps: approvalProcess.steps.map((currentStep, index) =>
          index < approvalProcess.currentStepIndex
            ? { ...currentStep, status: "approved" as const }
            : index === approvalProcess.currentStepIndex
              ? {
                  ...currentStep,
                  status: "rejected" as const,
                  actedAt: todayTimestamp(),
                  actedBy: currentUser.name,
                  note,
                }
              : { ...currentStep },
        ),
      },
      status: "반려",
      changeHistory: [
        ...(item.changeHistory ?? []),
        {
          version: `결재-${approvalProcess.currentStepIndex + 1}`,
          changedAt: todayTimestamp(),
          changedBy: currentUser.name,
          action: "updated",
          summary: `${step.label} 반려`,
        },
      ],
    })

    return updatedRecord
  })

  if (!updatedRecord) return null

  saveQuotations(updated)
  emitQuotationUpdate()
  return updatedRecord
}

export function subscribeQuotationUpdates(callback: () => void) {
  if (!isBrowser()) return () => {}

  const handler = () => callback()
  window.addEventListener(QUOTATION_EVENT_NAME, handler)
  window.addEventListener("storage", handler)

  return () => {
    window.removeEventListener(QUOTATION_EVENT_NAME, handler)
    window.removeEventListener("storage", handler)
  }
}
