"use client"

import type { ComponentProps, ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CustomerAutocomplete } from "@/components/erp/entity-customer-autocomplete"
import { UserIdPicker } from "@/components/erp/user-id-picker"
import {
  getBidItem,
  getRfpAnalysisByRequestId,
  subscribeRfpAnalysesUpdates,
  type RfpAnalysisRecord,
  type RfpAnalysisStatus,
} from "@/lib/bid-data"
import type { ActivityRequestRecord } from "@/lib/activity-data"
import { getActivityRequests, notifyRfpAnalysisCompleted } from "@/lib/activity-request-workflow"
import { currentUser } from "@/lib/current-user"
import {
  getCustomerByCode,
  getCustomerByName,
  getOpportunitiesByCustomerName,
  type CustomerRecord,
  type OpportunityRecord,
} from "@/lib/finding-data"
import { loadBackendProjectOpportunity, loadBackendProjectOpportunitiesByCustomer } from "@/lib/finding-backend"
import { createBackendRfpAnalysis, deleteBackendRfpAnalysis, loadBackendRfpAnalysis, loadBackendRfpAnalyses, updateBackendRfpAnalysis } from "@/lib/rfp-analysis-backend"
import { toast } from "@/hooks/use-toast"
import { useChatbotPrefill } from "@/lib/use-chatbot-prefill"
import { loadBackendUsers, type BackendUserSummary } from "@/lib/workflow-backend"

type RfpAnalysisSheetProps = {
  requestId?: string
  title: string
  blankMode?: boolean
}

type RequirementRow = {
  category: string
  requirementCode: string
  requirementTitle: string
  requirementContent: string
  supportStatus: "O" | "X" | "∆" | "?"
  reviewNote: string
  effort: string
}

const businessTypes = [
  "EMS",
  "ITSM",
  "Automation",
  "WSS",
  "DASHBOARD",
  "DATACENTER",
  "RCA",
  "DCA",
  "ITAM",
  "SUPPORTING_TOOLS",
  "CLOUD",
  "BSM",
  "E2E",
  "ETC",
] as const
const proposalTypes = ["자체 제안", "SI 제안"] as const
const analysisStatusOptions: RfpAnalysisStatus[] = ["접수", "분석중", "완료"]
function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}
const blankRequirementRow = (): RequirementRow => ({
  category: "",
  requirementCode: "",
  requirementTitle: "",
  requirementContent: "",
  supportStatus: "O",
  reviewNote: "",
  effort: "",
})

function buildDefaultRequirementRows() {
  return [
    {
      category: "시스템 기능 요구사항",
      requirementCode: "REQ-001",
      requirementTitle: "통합 모니터링",
      requirementContent: "서버, 네트워크, 데이터베이스 및 애플리케이션을 통합 모니터링할 수 있어야 한다.",
      supportStatus: "O" as const,
      reviewNote: "기본 기능으로 제공",
      effort: "0",
    },
    {
      category: "시스템 기능 요구사항",
      requirementCode: "REQ-002",
      requirementTitle: "분산 수집",
      requirementContent: "대규모 환경 확장을 고려한 분산 수집 구조를 지원할 수 있어야 한다.",
      supportStatus: "∆" as const,
      reviewNote: "구성 변경 필요, Proxy 대신 클러스터 분산 수집 구조로 대응",
      effort: "5",
    },
    blankRequirementRow(),
  ]
}

function requirementRowsSignature(rows: RequirementRow[]) {
  return rows
    .map((row) => [
      row.category,
      row.requirementCode,
      row.requirementTitle,
      row.requirementContent,
      row.supportStatus,
      row.reviewNote,
      row.effort,
    ].join("\u0001"))
    .join("\u0002")
}

function parseOpportunityDescription(description?: string | null) {
  const normalized = String(description ?? "").trim()
  if (!normalized || normalized === "-") {
    return {
      moduleName: "",
      issue: "",
      decisionInfo: "",
    }
  }

  try {
    const parsed = JSON.parse(normalized) as {
      moduleName?: string
      moduleNames?: string[]
      issue?: string
      decisionInfo?: string
    }
    if (parsed && typeof parsed === "object") {
      const moduleName = String(parsed.moduleName ?? "").trim()
      const moduleNames = Array.isArray(parsed.moduleNames)
        ? parsed.moduleNames.filter((value): value is string => typeof value === "string" && value.trim() !== "")
        : []
      return {
        moduleName: moduleName || moduleNames.join(", "),
        issue: String(parsed.issue ?? "").trim(),
        decisionInfo: String(parsed.decisionInfo ?? "").trim(),
      }
    }
  } catch {
    // Legacy opportunities may store description as plain text.
  }

  return {
    moduleName: "",
    issue: normalized,
    decisionInfo: "",
  }
}

function formatOpportunityAmount(value?: number | string | null) {
  if (value == null || value === "") return ""
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString("ko-KR") : ""
  }

  const normalized = value.trim()
  const parsed = Number(normalized)
  if (!Number.isNaN(parsed) && normalized.replace(/[,\s]/g, "") === String(parsed)) {
    return parsed.toLocaleString("ko-KR")
  }

  return normalized
}

function collectNames<T extends { name?: string; productName?: string }>(
  directNames?: string[],
  nestedItems?: T[],
  nestedKey: "name" | "productName" = "name",
) {
  if (Array.isArray(directNames) && directNames.length > 0) {
    return directNames.filter((value): value is string => typeof value === "string" && value.trim() !== "")
  }

  if (!Array.isArray(nestedItems)) return []

  return nestedItems
    .map((item) => item[nestedKey])
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")
}

const requirementHeaderAliases: Record<keyof RequirementRow, string[]> = {
  category: ["구분", "카테고리"],
  requirementCode: ["요구사항고유번호", "요구사항 고유번호", "요구사항번호", "요구사항 번호"],
  requirementTitle: ["요구사항명칭", "요구사항 명칭", "요구사항명", "요구사항 명"],
  requirementContent: ["요구사항내용", "요구사항 내용"],
  supportStatus: ["지원여부", "지원 여부"],
  reviewNote: ["검토 내용", "검토내용", "검토의견", "검토 의견"],
  effort: ["공수(M/D)", "공수", "공수(md)", "공수(m/d)"],
}

function ExcelInput(props: ComponentProps<typeof Input>) {
  return <Input {...props} className={`h-10 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 ${props.className ?? ""}`} />
}

function ExcelTextarea(props: ComponentProps<typeof Textarea>) {
  return <Textarea {...props} className={`min-h-[84px] rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 ${props.className ?? ""}`} />
}

function ExcelSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: readonly string[]
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-none border-0 bg-transparent px-3 text-sm outline-none"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}

function BasicInfoRow({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children?: ReactNode
}) {
  return (
    <>
      <td className="w-40 border border-slate-400 bg-slate-100 px-3 py-2 text-sm font-semibold">{label}</td>
      <td className="border border-slate-400 bg-amber-50 p-0">{children ?? <ExcelInput value={value ?? ""} readOnly />}</td>
    </>
  )
}

type SheetSource = Partial<Omit<RfpAnalysisRecord, "status">> &
  Partial<Omit<ActivityRequestRecord, "status">> & {
    status?: string
  }

export function RfpAnalysisSheet({ requestId, title, blankMode = false }: RfpAnalysisSheetProps) {
  const router = useRouter()
  const [, setRefreshTick] = useState(0)
  const isBackendDetailMode = Boolean(requestId && !requestId.startsWith("REQ-"))
  const [backendDetailRecord, setBackendDetailRecord] = useState<RfpAnalysisRecord | null>(null)
  const activityRequestItem = requestId?.startsWith("REQ-")
    ? (getActivityRequests().find((item) => item.id === requestId) as ActivityRequestRecord | null)
    : null
  const bidRequestItem = !activityRequestItem && requestId
    ? (getBidItem("rfp", requestId) as RfpAnalysisRecord | null)
    : null
  const linkedSavedAnalysis = activityRequestItem && requestId ? getRfpAnalysisByRequestId(requestId) : null
  const requestItem: SheetSource | null = isBackendDetailMode
    ? backendDetailRecord
    : linkedSavedAnalysis ?? activityRequestItem ?? bidRequestItem
  const persistedAnalysis = isBackendDetailMode ? backendDetailRecord : linkedSavedAnalysis ?? bidRequestItem
  const isStandalone = blankMode && !requestId
  const shouldStartBlank = blankMode && !persistedAnalysis
  const initialCustomer = requestItem?.customerCode ? getCustomerByCode(requestItem.customerCode) : null
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(initialCustomer)
  const [selectedCustomerName, setSelectedCustomerName] = useState(initialCustomer?.name ?? "")
  const [backendUsers, setBackendUsers] = useState<BackendUserSummary[]>([])
  const [customerOpportunityOptions, setCustomerOpportunityOptions] = useState<OpportunityRecord[]>([])
  const [customerOpportunityLoading, setCustomerOpportunityLoading] = useState(false)
  const [selectedOpportunityCode, setSelectedOpportunityCode] = useState(requestItem?.opportunityCode ?? "")
  const linkedOpportunity = requestItem?.customer
    ? getOpportunitiesByCustomerName(requestItem.customer).find((item) => item.id === requestItem.opportunityCode) ?? null
    : null
  const [businessType, setBusinessType] = useState(linkedOpportunity?.product ?? requestItem?.businessType ?? (isBackendDetailMode ? "" : "EMS"))
  const [proposalType, setProposalType] = useState(
    linkedOpportunity
      ? (linkedOpportunity.partnerCode && linkedOpportunity.partnerCode !== "-" ? "SI 제안" : "자체 제안")
      : (requestItem?.proposalType ?? "SI 제안"),
  )
  const [deliveryModule, setDeliveryModule] = useState(shouldStartBlank ? "" : requestItem?.deliveryModule ?? "")
  const [hardwareOwner, setHardwareOwner] = useState(shouldStartBlank ? "" : requestItem?.hardwareOwner ?? "")
  const [majorContent, setMajorContent] = useState(shouldStartBlank ? "" : requestItem?.majorContent ?? "")
  const [amountScale, setAmountScale] = useState(shouldStartBlank ? "" : requestItem?.amountScale ?? "")
  const [projectPeriod, setProjectPeriod] = useState(shouldStartBlank ? "" : requestItem?.projectPeriod ?? "")
  const [businessPlace, setBusinessPlace] = useState(shouldStartBlank ? "" : requestItem?.businessPlace ?? "")
  const [proposalDeadline, setProposalDeadline] = useState(shouldStartBlank ? "" : requestItem?.proposalDeadline ?? requestItem?.dueDate ?? "")
  const [requestDate, setRequestDate] = useState(
    shouldStartBlank ? getTodayDateString() : requestItem?.requestDate ?? requestItem?.receiveDate ?? "",
  )
  const [analysisStatus, setAnalysisStatus] = useState<RfpAnalysisStatus>(
    (persistedAnalysis?.status ?? (activityRequestItem ? "접수" : (requestItem?.status ?? "분석중"))) as RfpAnalysisStatus,
  )
  const [analystId, setAnalystId] = useState(shouldStartBlank ? "" : requestItem?.assigneeId ?? "")
  const [requirements, setRequirements] = useState<RequirementRow[]>(
    requestItem?.requirements?.length
      ? requestItem.requirements
      : shouldStartBlank
      ? [blankRequirementRow()]
      : isBackendDetailMode
        ? []
        : buildDefaultRequirementRows(),
  )
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [backendDetailLoading, setBackendDetailLoading] = useState(false)
  const [backendDetailError, setBackendDetailError] = useState("")

  // 챗봇 create_draft (rfp_analysis) prefill — requestItem (= 기존 데이터 로드) 가 없을 때만 적용
  const { values: chatbotPrefill, hasPrefill: hasChatbotPrefill, clear: clearChatbotPrefill } = useChatbotPrefill()
  const prefillAppliedRef = useRef(false)
  useEffect(() => {
    if (!hasChatbotPrefill || prefillAppliedRef.current) return
    if (requestItem) return  // 기존 RFP 로드된 경우 prefill 비활성
    prefillAppliedRef.current = true
    const slot = chatbotPrefill
    if (slot.customer_name) setSelectedCustomerName(slot.customer_name)
    if (slot.opportunity_code) setSelectedOpportunityCode(slot.opportunity_code)
    if (slot.business_division) setBusinessType(slot.business_division)
    if (slot.proposal_type) setProposalType(slot.proposal_type as typeof proposalType)
    if (slot.delivery_module) setDeliveryModule(slot.delivery_module)
    if (slot.hardware_provider) setHardwareOwner(slot.hardware_provider)
    if (slot.business_overview) setMajorContent(slot.business_overview)
    if (slot.budget_size) setAmountScale(slot.budget_size)
    if (slot.expected_period) setProjectPeriod(slot.expected_period)
    if (slot.business_location) setBusinessPlace(slot.business_location)
    if (slot.submission_deadline) setProposalDeadline(slot.submission_deadline)
    if (slot.requested_at) setRequestDate(slot.requested_at)
    // requirements 는 JSON 으로 들어올 수 있음
    if (slot.requirements) {
      try {
        const arr = JSON.parse(slot.requirements)
        if (Array.isArray(arr) && arr.length > 0) {
          setRequirements(arr.map((row): RequirementRow => ({
            category: row.category || "",
            requirementCode: row.requirement_no || row.requirement_code || row.requirementCode || "",
            requirementTitle: row.requirement_name || row.requirement_title || row.requirementTitle || "",
            requirementContent: row.requirement_detail || row.requirement_content || row.requirementContent || "",
            supportStatus: (row.support_status || row.supportStatus || "O") as RequirementRow["supportStatus"],
            reviewNote: row.review_note || row.reviewNote || "",
            effort: row.effort || row.mandays || "",
          })))
        }
      } catch {
        // JSON 파싱 실패 — 무시
      }
    }
    const applied = Object.keys(slot).length
    if (applied > 0) {
      toast({ title: "챗봇이 RFP 분석 초안 prefill", description: `${applied}개 슬롯 반영 — 확인 후 저장하세요.` })
    }
    const id = window.setTimeout(() => clearChatbotPrefill(), 100)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChatbotPrefill, requestItem])

  const requestSyncSignature = requestItem
    ? [
        requestItem.id ?? "",
        requestItem.customerCode ?? "",
        requestItem.customer ?? "",
        requestItem.opportunityCode ?? "",
        requestItem.opportunity ?? "",
        requestItem.businessType ?? "",
        requestItem.proposalType ?? "",
        requestItem.deliveryModule ?? "",
        requestItem.hardwareOwner ?? "",
        requestItem.majorContent ?? "",
        requestItem.amountScale ?? "",
        requestItem.projectPeriod ?? "",
        requestItem.businessPlace ?? "",
        requestItem.proposalDeadline ?? "",
        requestItem.dueDate ?? "",
        requestItem.status ?? "",
        requestItem.requester ?? "",
        requestItem.analyst ?? "",
        requestItem.requestDate ?? "",
        requestItem.receiveDate ?? "",
        JSON.stringify(requestItem.requirements ?? []),
      ].join("|")
    : "none"

  useEffect(() => {
    const sync = () => setRefreshTick((value) => value + 1)
    sync()

    if (requestId && !requestId.startsWith("REQ-")) {
      setBackendDetailRecord(null)
      setBackendDetailLoading(true)
      setBackendDetailError("")
      void loadBackendRfpAnalysis(requestId)
        .then((record) => {
          setBackendDetailRecord(record)
        })
        .catch((error) => {
          setBackendDetailRecord(null)
          setBackendDetailError(error instanceof Error ? error.message : "RFP 분석 상세를 불러오지 못했습니다.")
        })
        .finally(() => {
          setBackendDetailLoading(false)
        })
    } else {
      void loadBackendRfpAnalyses().catch(() => undefined)
    }

    const unsubscribe = subscribeRfpAnalysesUpdates(sync)
    return () => unsubscribe()
  }, [requestId])

  useEffect(() => {
    void loadBackendUsers()
      .then((users) => {
        setBackendUsers(users)
      })
      .catch(() => {
        setBackendUsers([])
      })
  }, [])

  useEffect(() => {
    if (!requestItem) return

    const matchedCustomer = requestItem.customerCode
      ? getCustomerByCode(requestItem.customerCode)
      : requestItem.customer
        ? getCustomerByName(requestItem.customer)
        : null
    const linkedOpportunity =
      requestItem.customer && requestItem.opportunity
        ? getOpportunitiesByCustomerName(requestItem.customer).find((item) => item.name === requestItem.opportunity) ?? null
        : null

    const nextCustomerName = matchedCustomer?.name ?? requestItem.customer ?? ""
    const nextOpportunityCode = requestItem.opportunityCode ?? linkedOpportunity?.id ?? ""
    const nextBusinessType = linkedOpportunity?.product ?? requestItem.businessType ?? "EMS"
    const nextProposalType = linkedOpportunity
      ? (linkedOpportunity.partnerCode && linkedOpportunity.partnerCode !== "-" ? "SI 제안" : "자체 제안")
      : (requestItem.proposalType ?? "SI 제안")
    const nextDeliveryModule = requestItem.deliveryModule ?? ""
    const nextHardwareOwner = requestItem.hardwareOwner ?? ""
    const nextMajorContent = requestItem.majorContent ?? ""
    const nextAmountScale = requestItem.amountScale ?? ""
    const nextProjectPeriod = requestItem.projectPeriod ?? ""
    const nextBusinessPlace = requestItem.businessPlace ?? ""
    const nextProposalDeadline = requestItem.proposalDeadline ?? requestItem.dueDate ?? ""
    const nextAnalystId = requestItem.assigneeId ?? ""
    const nextRequestDate = requestItem.requestDate ?? requestItem.receiveDate ?? ""
    const nextAnalysisStatus = (requestItem.status ?? "분석중") as RfpAnalysisStatus
    const nextRequirements = requestItem.requirements?.length
      ? requestItem.requirements
      : shouldStartBlank
        ? [blankRequirementRow()]
        : buildDefaultRequirementRows()

    setSelectedCustomer((current) => (current?.id === matchedCustomer?.id ? current : matchedCustomer))
    setSelectedCustomerName((current) => (current === nextCustomerName ? current : nextCustomerName))
    setSelectedOpportunityCode((current) => (current === nextOpportunityCode ? current : nextOpportunityCode))
    setBusinessType((current) => (current === nextBusinessType ? current : nextBusinessType))
    setProposalType((current) => (current === nextProposalType ? current : nextProposalType))
    setDeliveryModule((current) => (current === nextDeliveryModule ? current : nextDeliveryModule))
    setHardwareOwner((current) => (current === nextHardwareOwner ? current : nextHardwareOwner))
    setMajorContent((current) => (current === nextMajorContent ? current : nextMajorContent))
    setAmountScale((current) => (current === nextAmountScale ? current : nextAmountScale))
    setProjectPeriod((current) => (current === nextProjectPeriod ? current : nextProjectPeriod))
    setBusinessPlace((current) => (current === nextBusinessPlace ? current : nextBusinessPlace))
    setProposalDeadline((current) => (current === nextProposalDeadline ? current : nextProposalDeadline))
    setRequestDate((current) => (current === nextRequestDate ? current : nextRequestDate))
    setAnalysisStatus((current) => (current === nextAnalysisStatus ? current : nextAnalysisStatus))
    setAnalystId((current) => (current === nextAnalystId ? current : nextAnalystId))
    setRequirements((current) => {
      if (requirementRowsSignature(current) === requirementRowsSignature(nextRequirements)) {
        return current
      }

      return nextRequirements
    })
  }, [requestSyncSignature, shouldStartBlank])

  useEffect(() => {
    let cancelled = false
    const customer = selectedCustomer

    if (!isStandalone || !customer?.backendId) {
      setCustomerOpportunityOptions([])
      setCustomerOpportunityLoading(false)
      return () => {
        cancelled = true
      }
    }

    setCustomerOpportunityLoading(true)
    void loadBackendProjectOpportunitiesByCustomer(customer.backendId)
      .then((options) => {
        if (cancelled) return
        setCustomerOpportunityOptions(
          options
            .map((item, index) => {
              const parsedDescription = parseOpportunityDescription(item.description)
              const partnerCompanyIds = Array.isArray(item.partnerCompanyIds) && item.partnerCompanyIds.length > 0
                ? item.partnerCompanyIds.filter((value): value is number => typeof value === "number")
                : Array.isArray(item.partnerCompanies)
                  ? item.partnerCompanies
                      .map((partner) => partner.id)
                      .filter((value): value is number => typeof value === "number")
                  : []
              const partnerCompanyNames = collectNames(item.partnerCompanyNames, item.partnerCompanies, "name")
              const productModuleIds = Array.isArray(item.productModuleIds) && item.productModuleIds.length > 0
                ? item.productModuleIds.filter((value): value is number => typeof value === "number")
                : Array.isArray(item.productModules)
                  ? item.productModules
                      .map((module) => module.id)
                      .filter((value): value is number => typeof value === "number")
                  : []
              const productModuleNames = collectNames(item.productModuleNames, item.productModules, "productName")
              const moduleDisplay = productModuleNames.join(", ") || parsedDescription.moduleName

              return {
                id: String(item.opportunityCode ?? item.id ?? `OPP-${index + 1}`),
                backendId: item.id,
                customerCompanyId: item.customerCompanyId,
                createdAt: "",
                createUserName: item.createUserName ?? "",
                customerCode: customer.id,
                partnerCode: partnerCompanyIds.length > 0 ? partnerCompanyIds.map((partnerId) => String(partnerId)).join(", ") : "-",
                name: item.opportunityName ?? "",
                registrant: item.createUserName ?? "",
                customer: item.customerCompanyName ?? customer.name ?? "",
                partner: partnerCompanyNames.length > 0 ? partnerCompanyNames.join(", ") : "-",
                partners: partnerCompanyNames,
                category: "",
                product: item.projectType ?? "",
                module: moduleDisplay,
                expectedAmount: formatOpportunityAmount(item.expectedBudget),
                expectedDate: item.expectedBidDate ?? "",
                issue: parsedDescription.issue,
                competition: item.competitionStatus ?? "",
                decisionInfo: parsedDescription.decisionInfo || item.salesRepresentativeName || item.createUserName || "",
                partnerType: "",
                partnerContact: "",
                partnerPhone: "",
                status: item.stage ?? "",
                salesRepresentativeId: item.salesRepresentativeId ?? undefined,
                salesRep: item.salesRepresentativeName ?? item.createUserName ?? "",
                partnerCompanyIds,
                partnerCompanyNames,
                productModuleIds,
                productModuleNames,
                rfpFileIds: Array.isArray(item.rfpFileIds)
                  ? item.rfpFileIds.filter((value): value is number => typeof value === "number")
                  : [],
                rfpFileNames: Array.isArray(item.rfpFileNames)
                  ? item.rfpFileNames.filter((value): value is string => typeof value === "string")
                  : [],
                rfpFileSizes: Array.isArray(item.rfpFileSizes)
                  ? item.rfpFileSizes.filter((value): value is number => typeof value === "number")
                  : [],
              }
            })
            .filter((item) => item.id.trim() !== "" && item.name.trim() !== ""),
        )
      })
      .catch(() => {
        if (cancelled) return
        setCustomerOpportunityOptions([])
      })
      .finally(() => {
        if (cancelled) return
        setCustomerOpportunityLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isStandalone, selectedCustomer?.backendId, selectedCustomer?.name])

  const totalEffort = useMemo(
    () => requirements.reduce((sum, row) => sum + (Number(row.effort) || 0), 0),
    [requirements],
  )

  const updateRequirement = (index: number, field: keyof RequirementRow, value: string) => {
    setRequirements((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    )
  }

  const addRequirementRow = () => {
    setRequirements((current) => [...current, blankRequirementRow()])
  }

  const selectedOpportunity = customerOpportunityOptions.find((item) => item.id === selectedOpportunityCode) ?? null
  const requesterDisplay = requestItem?.requester ?? currentUser.name
  const selectedAnalyst = backendUsers.find((user) => user.id === analystId) ?? null

  const applyOpportunityDefaults = (opportunity: OpportunityRecord) => {
    setBusinessType(opportunity.product ?? "")
    setProposalType(opportunity.partnerCode && opportunity.partnerCode !== "-" ? "SI 제안" : "자체 제안")
    setDeliveryModule(opportunity.module ?? "")
    setAmountScale(opportunity.expectedAmount && opportunity.expectedAmount !== "-" ? opportunity.expectedAmount : "")
    setProposalDeadline(opportunity.expectedDate && opportunity.expectedDate !== "-" ? opportunity.expectedDate.slice(0, 10) : "")
    setMajorContent(opportunity.issue && opportunity.issue !== "-" ? opportunity.issue : "")
    if (opportunity.salesRepresentativeId) {
      setAnalystId(opportunity.salesRepresentativeId)
    }
  }

  useEffect(() => {
    let cancelled = false

    if (!isStandalone) {
      return () => {
        cancelled = true
      }
    }

    if (!selectedOpportunity) {
      setBusinessType("")
      setProposalType("SI 제안")
      setDeliveryModule("")
      setAmountScale("")
      setProposalDeadline("")
      setMajorContent("")
      return () => {
        cancelled = true
      }
    }

    if (!selectedOpportunity.backendId) {
      applyOpportunityDefaults(selectedOpportunity)
      return () => {
        cancelled = true
      }
    }

    void loadBackendProjectOpportunity(selectedOpportunity.backendId)
      .then((detail) => {
        if (cancelled) return
        const parsedDescription = parseOpportunityDescription(detail.description)
        const productModuleNames = collectNames(detail.productModuleNames, detail.productModules, "productName")
        const moduleDisplay = productModuleNames.join(", ") || parsedDescription.moduleName

        setBusinessType(detail.projectType ?? "")
        setProposalType(
          (Array.isArray(detail.partnerCompanyIds) && detail.partnerCompanyIds.length > 0) ||
            (Array.isArray(detail.partnerCompanies) && detail.partnerCompanies.length > 0)
            ? "SI 제안"
            : "자체 제안",
        )
        setDeliveryModule(moduleDisplay)
        setAmountScale(formatOpportunityAmount(detail.expectedBudget))
        setProposalDeadline(detail.expectedBidDate?.slice(0, 10) ?? "")
        setMajorContent(parsedDescription.issue)
        if (detail.salesRepresentativeId) {
          setAnalystId(detail.salesRepresentativeId)
        }
      })
      .catch(() => {
        if (cancelled) return
        applyOpportunityDefaults(selectedOpportunity)
      })

    return () => {
      cancelled = true
    }
  }, [isStandalone, selectedOpportunity])
  const customerDisplay = isStandalone
    ? selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.id})` : selectedCustomerName
    : requestItem
      ? requestItem.customerCode
        ? `${requestItem.customer} (${requestItem.customerCode})`
        : requestItem.customer
      : ""
  const opportunityDisplay = isStandalone
    ? selectedOpportunity ? `${selectedOpportunity.name} (${selectedOpportunity.id})` : ""
    : requestItem
      ? requestItem.opportunityCode
        ? `${requestItem.opportunity} (${requestItem.opportunityCode})`
        : requestItem.opportunity
      : ""

  const persistAnalysis = async (status: RfpAnalysisStatus = analysisStatus) => {
    const customerName = isStandalone ? (selectedCustomer?.name ?? selectedCustomerName) : (requestItem?.customer ?? "")
    const opportunityName = isStandalone ? (selectedOpportunity?.name ?? "") : (requestItem?.opportunity ?? "")
    const customerCode = isStandalone
      ? (selectedCustomer?.id ?? getCustomerByName(selectedCustomerName)?.id ?? "")
      : (requestItem?.customerCode ?? getCustomerByName(requestItem?.customer ?? "")?.id ?? "")
    const opportunityCode = isStandalone
      ? (selectedOpportunity?.id ?? "")
      : (requestItem?.opportunityCode ?? getOpportunitiesByCustomerName(requestItem?.customer ?? "").find((item) => item.name === (requestItem?.opportunity ?? ""))?.id ?? "")
    const linkedRequestId = activityRequestItem?.id ?? linkedSavedAnalysis?.requestId

    if (!customerName || !opportunityName) {
      toast({
        title: "기본정보 확인",
        description: "고객사와 사업기회를 먼저 선택해주십시오.",
      })
      return null
    }

    const wasCompleted = persistedAnalysis?.status === "완료"
    const nextRecord = {
      id: bidRequestItem?.id ?? linkedSavedAnalysis?.id,
      requestId: linkedRequestId,
      projectOpportunityId: isStandalone ? selectedOpportunity?.backendId : requestItem?.projectOpportunityId,
      assigneeId: analystId,
      customer: customerName,
      customerCode,
      opportunity: opportunityName,
      opportunityCode,
      requester: requesterDisplay,
      analyst: selectedAnalyst?.name ?? currentUser.name,
      receiveDate: requestDate || new Date().toISOString().slice(0, 10),
      requestDate: requestDate || new Date().toISOString().slice(0, 10),
      dueDate: requestItem?.dueDate ?? proposalDeadline ?? new Date().toISOString().slice(0, 10),
      status,
      businessType,
      proposalType,
      deliveryModule,
      hardwareOwner,
      majorContent,
      amountScale,
      projectPeriod,
      businessPlace,
      proposalDeadline,
      requirements,
    }

    try {
      const saved = persistedAnalysis?.id
        ? await updateBackendRfpAnalysis(persistedAnalysis.id, nextRecord)
        : await createBackendRfpAnalysis(nextRecord)

      if (status === "완료" && !wasCompleted && linkedRequestId) {
        notifyRfpAnalysisCompleted({
          requester: requesterDisplay,
          customer: customerName,
          opportunity: opportunityName,
          requestId: linkedRequestId,
        })
      }

      toast({
        title: status === "완료" ? "RFP 분석 완료" : "RFP 분석 저장",
        description: status === "완료" ? "RFP 분석 상태가 완료로 반영되었습니다." : "RFP 분석 상태가 분석중으로 저장되었습니다.",
      })

      if (status === analysisStatusOptions[2]) {
        router.push("/bid?tab=rfp")
      }

      return saved
    } catch (error) {
      toast({
        title: "RFP 분석 저장 실패",
        description: error instanceof Error ? error.message : "RFP 분석을 저장하지 못했습니다.",
      })
      return null
    }
  }

  const handleModify = () => {
    void persistAnalysis("분석중")
  }

  const handleDraftSave = () => {
    void persistAnalysis("분석중")
  }

  const handleComplete = () => {
    void persistAnalysis("완료")
  }

  const handleDelete = async () => {
    if (!persistedAnalysis) return

    try {
      await deleteBackendRfpAnalysis(persistedAnalysis.id)
    } catch (error) {
      toast({
        title: "RFP 분석 삭제 실패",
        description: error instanceof Error ? error.message : "RFP 분석을 삭제하지 못했습니다.",
      })
      setIsDeleteOpen(false)
      return
    }

    toast({
      title: "RFP 분석 삭제 완료",
      description: `${persistedAnalysis.id} RFP 분석이 삭제되었습니다.`,
    })
    setIsDeleteOpen(false)
    router.push("/bid")
  }

  if (isBackendDetailMode && !backendDetailRecord && (backendDetailLoading || backendDetailError)) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-white">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {backendDetailLoading ? (
            <div className="border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              RFP 분석 상세를 불러오는 중입니다.
            </div>
          ) : (
            <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {backendDetailError}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-white">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {backendDetailLoading && (
          <div className="border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            RFP 분석 상세를 불러오는 중입니다.
          </div>
        )}
        {backendDetailError && (
          <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {backendDetailError}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full border-collapse">
            <tbody>
              <tr>
                <BasicInfoRow label="고객사">
                  {isStandalone ? (
                    <div className="px-2 py-1">
                    <CustomerAutocomplete
                      value={selectedCustomerName}
                      onSelect={(customer) => {
                        setSelectedCustomer(customer)
                        setSelectedCustomerName(customer?.name ?? "")
                        setSelectedOpportunityCode("")
                      }}
                        onValueChange={setSelectedCustomerName}
                        placeholder="고객사를 선택하세요"
                      />
                    </div>
                  ) : (
                    <ExcelInput value={customerDisplay} readOnly />
                  )}
                </BasicInfoRow>
                <BasicInfoRow label="사업명">
                  {isStandalone ? (
                    <Select
                      value={selectedOpportunityCode}
                      onValueChange={setSelectedOpportunityCode}
                      disabled={!selectedCustomer || customerOpportunityLoading}
                    >
                      <SelectTrigger className="h-10 rounded-none border-0 shadow-none focus:ring-0">
                        <SelectValue
                          placeholder={
                            !selectedCustomer
                              ? "고객사를 먼저 선택하세요"
                              : customerOpportunityLoading
                                ? "사업기회를 불러오는 중..."
                                : "사업기회를 선택하세요"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {customerOpportunityOptions.length > 0 ? (
                          customerOpportunityOptions.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              <div className="flex w-full min-w-0 items-center justify-between gap-3">
                                <span className="truncate">{item.name}</span>
                                <span className="shrink-0 text-xs text-muted-foreground">{item.id}</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__empty__" disabled>
                            {selectedCustomer
                              ? customerOpportunityLoading
                                ? "사업기회를 불러오는 중..."
                                : "해당 고객사의 사업기회가 없습니다."
                              : "고객사를 먼저 선택하세요"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <ExcelInput value={opportunityDisplay} readOnly />
                  )}
                </BasicInfoRow>
              </tr>
              <tr>
                <BasicInfoRow label="사업 구분">
                  <ExcelInput value={businessType} readOnly placeholder="" />
                </BasicInfoRow>
                <BasicInfoRow label="제안 형태">
                  <ExcelSelect value={proposalType} onChange={setProposalType} options={proposalTypes} />
                </BasicInfoRow>
              </tr>
              <tr>
                <BasicInfoRow label="납품 모듈">
                  <ExcelInput value={deliveryModule} onChange={(event) => setDeliveryModule(event.target.value)} placeholder="예: SMS, NMS" />
                </BasicInfoRow>
                <BasicInfoRow label="H/W 제공 주체">
                  <ExcelInput value={hardwareOwner} onChange={(event) => setHardwareOwner(event.target.value)} />
                </BasicInfoRow>
              </tr>
              <tr>
                <BasicInfoRow label="금액 규모">
                  <ExcelInput value={amountScale} onChange={(event) => setAmountScale(event.target.value)} />
                </BasicInfoRow>
                <BasicInfoRow label="예상사업기간">
                  <ExcelInput value={projectPeriod} onChange={(event) => setProjectPeriod(event.target.value)} />
                </BasicInfoRow>
              </tr>
              <tr>
                <BasicInfoRow label="사업장소">
                  <ExcelInput value={businessPlace} onChange={(event) => setBusinessPlace(event.target.value)} />
                </BasicInfoRow>
                <BasicInfoRow label="제안서 접수마감일">
                  <ExcelInput type="date" value={proposalDeadline} onChange={(event) => setProposalDeadline(event.target.value)} />
                </BasicInfoRow>
              </tr>
              <tr>
                <BasicInfoRow label="요청자">
                  <ExcelInput value={requesterDisplay} readOnly placeholder="로그인한 사용자 이름이 자동 표시됩니다." />
                </BasicInfoRow>
                <BasicInfoRow label="담당자">
                  <div className="px-2 py-1">
                    <UserIdPicker
                      value={analystId}
                      users={backendUsers}
                      onValueChange={setAnalystId}
                      placeholder="담당자를 선택해주세요."
                    />
                  </div>
                </BasicInfoRow>
              </tr>
              <tr>
                {requestItem?.id?.startsWith("REQ-") ? (
                  <BasicInfoRow label="활동요청 코드" value={requestItem.id} />
                ) : (
                  <BasicInfoRow label="요청일">
                    <ExcelInput type="date" value={requestDate} readOnly />
                  </BasicInfoRow>
                )}
                <BasicInfoRow label="상태">
                  {persistedAnalysis ? (
                    <Select value={analysisStatus} onValueChange={(value) => setAnalysisStatus(value as RfpAnalysisStatus)}>
                      <SelectTrigger className="h-10 rounded-none border-0 shadow-none focus:ring-0">
                        <SelectValue placeholder="상태를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {analysisStatusOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <ExcelInput value={analysisStatus} readOnly />
                  )}
                </BasicInfoRow>
              </tr>
              {requestItem?.id?.startsWith("REQ-") && (
                <tr>
                  <BasicInfoRow label="요청일">
                    <ExcelInput type="date" value={requestDate} readOnly />
                  </BasicInfoRow>
                  <BasicInfoRow label="연결 사업기회 코드" value={requestItem?.opportunityCode ?? "-"} />
                </tr>
              )}
              <tr>
                <td className="border border-slate-400 bg-slate-100 px-3 py-2 text-sm font-semibold">주요사업내용(특이점)</td>
                <td colSpan={3} className="border border-slate-400 bg-amber-50 p-0">
                  <ExcelTextarea value={majorContent} onChange={(event) => setMajorContent(event.target.value)} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="grid grid-cols-4 overflow-hidden rounded-sm border border-slate-400 text-center text-sm">
            <div className="border-r border-slate-400 bg-white px-5 py-2 font-semibold">O</div>
            <div className="border-r border-slate-400 bg-rose-100 px-5 py-2 font-semibold">X</div>
            <div className="border-r border-slate-400 bg-amber-100 px-5 py-2 font-semibold">∆</div>
            <div className="bg-sky-100 px-5 py-2 font-semibold">?</div>
            <div className="border-r border-t border-slate-400 bg-white px-4 py-2">기능제공</div>
            <div className="border-r border-t border-slate-400 bg-rose-50 px-4 py-2">기능 미제공</div>
            <div className="border-r border-t border-slate-400 bg-amber-50 px-4 py-2">기능 일부 제공, 개발 필요</div>
            <div className="border-t border-slate-400 bg-sky-50 px-4 py-2">요건 확인 필요</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full border-collapse">
            <thead>
              <tr className="bg-slate-200 text-sm font-semibold">
                <th className="w-16 border border-slate-400 px-2 py-3">연번</th>
                <th className="w-44 border border-slate-400 px-2 py-3">구분</th>
                <th className="w-32 border border-slate-400 px-2 py-3">요구사항고유번호</th>
                <th className="w-36 border border-slate-400 px-2 py-3">요구사항명칭</th>
                <th className="border border-slate-400 px-2 py-3">요구사항내용</th>
                <th className="w-20 border border-slate-400 px-2 py-3">지원여부</th>
                <th className="w-64 border border-slate-400 px-2 py-3">검토 내용</th>
                <th className="w-20 border border-slate-400 px-2 py-3">공수(M/D)</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((row, index) => (
                <tr key={`requirement-row-${index}`} className="align-top">
                  <td className="border border-slate-300 bg-slate-50 p-0 text-center">
                    <ExcelInput value={String(index + 1)} readOnly className="text-center font-semibold" />
                  </td>
                  <td className="border border-slate-300 p-0">
                    <ExcelInput value={row.category} onChange={(event) => updateRequirement(index, "category", event.target.value)} />
                  </td>
                  <td className="border border-slate-300 p-0">
                    <ExcelInput value={row.requirementCode} onChange={(event) => updateRequirement(index, "requirementCode", event.target.value)} />
                  </td>
                  <td className="border border-slate-300 p-0">
                    <ExcelInput value={row.requirementTitle} onChange={(event) => updateRequirement(index, "requirementTitle", event.target.value)} />
                  </td>
                  <td className="border border-slate-300 p-0">
                    <ExcelTextarea value={row.requirementContent} onChange={(event) => updateRequirement(index, "requirementContent", event.target.value)} className="min-h-[112px]" />
                  </td>
                  <td className="border border-slate-300 bg-white p-0">
                    <ExcelSelect value={row.supportStatus} onChange={(value) => updateRequirement(index, "supportStatus", value)} options={["O", "X", "∆", "?"]} />
                  </td>
                  <td className="border border-slate-300 p-0">
                    <ExcelTextarea value={row.reviewNote} onChange={(event) => updateRequirement(index, "reviewNote", event.target.value)} className="min-h-[112px]" />
                  </td>
                  <td className="border border-slate-300 p-0">
                    <ExcelInput value={row.effort} onChange={(event) => updateRequirement(index, "effort", event.target.value)} className="text-right" inputMode="decimal" />
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={7} className="border border-slate-400 bg-slate-100 px-3 py-3 text-right text-sm font-semibold">
                  공수 합계
                </td>
                <td className="border border-slate-400 bg-white px-3 py-3 text-right text-sm font-semibold">
                  {totalEffort.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-start">
          <Button className="rounded-none bg-red-600 px-6 hover:bg-red-700" onClick={addRequirementRow}>
            요구사항 추가
          </Button>
        </div>

        <div className="flex justify-end gap-2 border-t pt-6">
          {!blankMode && persistedAnalysis && (
            <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
              삭제
            </Button>
          )}
          <Button variant="outline" onClick={handleModify}>수정</Button>
          <Button variant="outline" onClick={handleDraftSave}>임시저장</Button>
          <Button onClick={handleComplete}>완료</Button>
        </div>
      </CardContent>
    </Card>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>RFP 분석을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제 후에는 RFP 분석 상세 정보를 다시 확인할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
