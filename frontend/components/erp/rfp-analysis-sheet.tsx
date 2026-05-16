"use client"

import type { ComponentProps, ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, Upload } from "lucide-react"
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
import { CustomerAutocomplete } from "@/components/erp/customer-autocomplete"
import {
  getBidItem,
  getRfpAnalysisByRequestId,
  subscribeRfpAnalysesUpdates,
  type RfpAnalysisRecord,
  type RfpAnalysisStatus,
} from "@/lib/bid-data"
import type { ActivityRequestRecord } from "@/lib/activity-data"
import { getActivityRequests, notifyRfpAnalysisCompleted } from "@/lib/activity-request-workflow"
import { getCustomerByCode, getCustomerByName, getOpportunitiesByCustomerName, type CustomerRecord } from "@/lib/finding-data"
import { createBackendRfpAnalysis, deleteBackendRfpAnalysis, loadBackendRfpAnalyses, updateBackendRfpAnalysis } from "@/lib/rfp-analysis-backend"
import { toast } from "@/hooks/use-toast"
import { useChatbotPrefill } from "@/lib/use-chatbot-prefill"

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

type ImportedBasicInfo = Partial<{
  customerDisplay: string
  opportunityDisplay: string
  businessType: string
  proposalType: string
  deliveryModule: string
  hardwareOwner: string
  amountScale: string
  projectPeriod: string
  businessPlace: string
  proposalDeadline: string
  salesRep: string
  analyst: string
  requestDate: string
  status: string
  majorContent: string
}>

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

const requirementHeaderAliases: Record<keyof RequirementRow, string[]> = {
  category: ["구분", "카테고리"],
  requirementCode: ["요구사항고유번호", "요구사항 고유번호", "요구사항번호", "요구사항 번호"],
  requirementTitle: ["요구사항명칭", "요구사항 명칭", "요구사항명", "요구사항 명"],
  requirementContent: ["요구사항내용", "요구사항 내용"],
  supportStatus: ["지원여부", "지원 여부"],
  reviewNote: ["검토 내용", "검토내용", "검토의견", "검토 의견"],
  effort: ["공수(M/D)", "공수", "공수(md)", "공수(m/d)"],
}

function normalizeHeader(value: string) {
  return value.replace(/\s+/g, "").trim().toLowerCase()
}

function normalizeCell(value: unknown) {
  return String(value ?? "").trim()
}

function findRequirementHeaderRow(rows: string[][]) {
  return rows.findIndex((row) => {
    const normalizedRow = row.map(normalizeHeader)
    return requirementHeaderAliases.category.some((header) => normalizedRow.includes(normalizeHeader(header)))
      && requirementHeaderAliases.requirementCode.some((header) => normalizedRow.includes(normalizeHeader(header)))
      && requirementHeaderAliases.requirementTitle.some((header) => normalizedRow.includes(normalizeHeader(header)))
  })
}

function buildRequirementColumnMap(headerRow: string[]) {
  const entries = Object.entries(requirementHeaderAliases).map(([field, aliases]) => {
    const index = headerRow.findIndex((cell) => aliases.some((alias) => normalizeHeader(cell) === normalizeHeader(alias)))
    return [field, index] as const
  })

  return Object.fromEntries(entries) as Record<keyof RequirementRow, number>
}

function parseRequirementRowsFromSheetRows(rows: string[][]) {
  const headerIndex = findRequirementHeaderRow(rows)
  if (headerIndex < 0) return []

  const headerRow = rows[headerIndex]
  const columnMap = buildRequirementColumnMap(headerRow)
  const dataRows = rows.slice(headerIndex + 1)

  return dataRows
    .map((row) => ({
      category: normalizeCell(row[columnMap.category]),
      requirementCode: normalizeCell(row[columnMap.requirementCode]),
      requirementTitle: normalizeCell(row[columnMap.requirementTitle]),
      requirementContent: normalizeCell(row[columnMap.requirementContent]),
      supportStatus: (["O", "X", "∆", "?"].includes(normalizeCell(row[columnMap.supportStatus])) ? normalizeCell(row[columnMap.supportStatus]) : "O") as RequirementRow["supportStatus"],
      reviewNote: normalizeCell(row[columnMap.reviewNote]),
      effort: normalizeCell(row[columnMap.effort]).replace(/[^\d.]/g, ""),
    }))
    .filter((row) =>
      [row.category, row.requirementCode, row.requirementTitle, row.requirementContent, row.reviewNote, row.effort].some(
        (value) => value !== "",
      ),
    )
}

function parseBasicInfoFromRows(rows: string[][]): ImportedBasicInfo {
  const sectionRowIndex = rows.findIndex((row) =>
    row.some((cell) => normalizeHeader(cell) === normalizeHeader("기본 정보")),
  )

  if (sectionRowIndex < 0) return {}

  const result: ImportedBasicInfo = {}

  const fieldMap: Record<string, keyof ImportedBasicInfo> = {
    고객사: "customerDisplay",
    사업명: "opportunityDisplay",
    "사업 구분": "businessType",
    "제안 형태": "proposalType",
    "납품 모듈": "deliveryModule",
    "H/W 제공 주체": "hardwareOwner",
    "금액 규모": "amountScale",
    예상사업기간: "projectPeriod",
    사업장소: "businessPlace",
    "제안서 접수마감일": "proposalDeadline",
    영업대표: "salesRep",
    담당자: "analyst",
    요청일: "requestDate",
    상태: "status",
    "주요사업내용(특이점)": "majorContent",
  }

  for (const row of rows.slice(sectionRowIndex + 1)) {
    const normalizedRow = row.map((cell) => normalizeCell(cell))
    if (normalizedRow.some((cell) => normalizeHeader(cell) === normalizeHeader("RFP 분석"))) {
      break
    }

    for (let index = 0; index < normalizedRow.length - 1; index += 2) {
      const label = normalizedRow[index]
      const value = normalizedRow[index + 1] ?? ""
      const targetField = fieldMap[label]
      if (targetField) {
        result[targetField] = value
      }
    }
  }

  return result
}

function extractCodeFromDisplay(value: string) {
  const match = value.match(/\(([A-Z]+-\d{4}-\d{3}|[A-Z]+-\d{3})\)\s*$/i)
  return match ? match[1] : ""
}

function extractNameFromDisplay(value: string) {
  return value.replace(/\s*\(([A-Z]+-\d{4}-\d{3}|[A-Z]+-\d{3})\)\s*$/i, "").trim()
}

function parseDelimitedLine(line: string, delimiter: "," | "\t") {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

function parseDelimitedTextRows(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "")

  if (lines.length === 0) return []

  const delimiter = lines.some((line) => line.includes("\t")) ? "\t" : ","
  return lines.map((line) => parseDelimitedLine(line, delimiter))
}

function parseHtmlTableRows(text: string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, "text/html")
  const rows = Array.from(doc.querySelectorAll("table tr"))
  if (rows.length === 0) return []

  return rows.map((row) =>
    Array.from(row.querySelectorAll("th, td")).map((cell) => normalizeCell(cell.textContent)),
  )
}

function parseSpreadsheetXmlRows(text: string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, "application/xml")
  const rowNodes = Array.from(doc.getElementsByTagName("Row"))
  if (rowNodes.length === 0) return []

  return rowNodes.map((row) =>
    Array.from(row.getElementsByTagName("Cell")).map((cell) => {
      const dataNode = cell.getElementsByTagName("Data")[0]
      return normalizeCell(dataNode?.textContent)
    }),
  )
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
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
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [, setRefreshTick] = useState(0)
  const activityRequestItem = requestId?.startsWith("REQ-")
    ? (getActivityRequests().find((item) => item.id === requestId) as ActivityRequestRecord | null)
    : null
  const bidRequestItem = !activityRequestItem && requestId
    ? (getBidItem("rfp", requestId) as RfpAnalysisRecord | null)
    : null
  const linkedSavedAnalysis = activityRequestItem && requestId ? getRfpAnalysisByRequestId(requestId) : null
  const requestItem: SheetSource | null = linkedSavedAnalysis ?? activityRequestItem ?? bidRequestItem
  const persistedAnalysis = linkedSavedAnalysis ?? bidRequestItem
  const isStandalone = blankMode && !requestId
  const shouldStartBlank = blankMode && !persistedAnalysis
  const initialCustomer = requestItem?.customerCode ? getCustomerByCode(requestItem.customerCode) : null
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(initialCustomer)
  const [selectedCustomerName, setSelectedCustomerName] = useState(initialCustomer?.name ?? "")
  const standaloneOpportunityOptions = getOpportunitiesByCustomerName(selectedCustomerName)
  const [selectedOpportunityCode, setSelectedOpportunityCode] = useState(requestItem?.opportunityCode ?? "")
  const linkedOpportunity = requestItem?.customer
    ? getOpportunitiesByCustomerName(requestItem.customer).find((item) => item.id === requestItem.opportunityCode) ?? null
    : null
  const [businessType, setBusinessType] = useState(linkedOpportunity?.product ?? requestItem?.businessType ?? "EMS")
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
  const [requesterName, setRequesterName] = useState(shouldStartBlank ? "" : requestItem?.requester ?? "")
  const [analystName, setAnalystName] = useState(shouldStartBlank ? "" : requestItem?.analyst ?? "")
  const [requestDate, setRequestDate] = useState(shouldStartBlank ? "" : requestItem?.requestDate ?? requestItem?.receiveDate ?? "")
  const [analysisStatus, setAnalysisStatus] = useState<RfpAnalysisStatus>(
    (persistedAnalysis?.status ?? (activityRequestItem ? "접수" : (requestItem?.status ?? "분석중"))) as RfpAnalysisStatus,
  )
  const [requirements, setRequirements] = useState<RequirementRow[]>(
    requestItem?.requirements?.length
      ? requestItem.requirements
      : shouldStartBlank
      ? [blankRequirementRow()]
      : buildDefaultRequirementRows(),
  )
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

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
    if (slot.sales_representative) setRequesterName(slot.sales_representative)
    if (slot.manager) setAnalystName(slot.manager)
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

    void loadBackendRfpAnalyses().catch(() => undefined)

    const unsubscribe = subscribeRfpAnalysesUpdates(sync)
    return () => unsubscribe()
  }, [requestId])

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
    const nextRequesterName = requestItem.requester ?? ""
    const nextAnalystName = requestItem.analyst ?? ""
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
    setRequesterName((current) => (current === nextRequesterName ? current : nextRequesterName))
    setAnalystName((current) => (current === nextAnalystName ? current : nextAnalystName))
    setRequestDate((current) => (current === nextRequestDate ? current : nextRequestDate))
    setAnalysisStatus((current) => (current === nextAnalysisStatus ? current : nextAnalysisStatus))
    setRequirements((current) => {
      if (requirementRowsSignature(current) === requirementRowsSignature(nextRequirements)) {
        return current
      }

      return nextRequirements
    })
  }, [requestSyncSignature, shouldStartBlank])

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

  const selectedOpportunity = standaloneOpportunityOptions.find((item) => item.id === selectedOpportunityCode) ?? null

  useEffect(() => {
    if (!isStandalone || !selectedOpportunity) return

    setBusinessType(selectedOpportunity.product)
    setProposalType(selectedOpportunity.partnerCode && selectedOpportunity.partnerCode !== "-" ? "SI 제안" : "자체 제안")
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
      projectOpportunityId: requestItem?.projectOpportunityId,
      assigneeId: requestItem?.assigneeId,
      customer: customerName,
      customerCode,
      opportunity: opportunityName,
      opportunityCode,
      requester: requesterName,
      analyst: analystName,
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

      if (status === "완료" && !wasCompleted && linkedRequestId && requesterName) {
        notifyRfpAnalysisCompleted({
          requester: requesterName,
          customer: customerName,
          opportunity: opportunityName,
          requestId: linkedRequestId,
        })
      }

      toast({
        title: status === "완료" ? "RFP 분석 완료" : "RFP 분석 저장",
        description: status === "완료" ? "RFP 분석 상태가 완료로 반영되었습니다." : "RFP 분석 상태가 분석중으로 저장되었습니다.",
      })

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

  const handleExcelExport = async () => {
    const exportTarget = persistedAnalysis ?? (await persistAnalysis(analysisStatus === "완료" ? "완료" : "분석중"))
    if (!exportTarget) return

    const exportRequirements = requirements.filter((row) =>
      [row.category, row.requirementCode, row.requirementTitle, row.requirementContent, row.reviewNote, row.effort].some(
        (value) => value.trim() !== "",
      ),
    )
    const rows = exportRequirements.length > 0 ? exportRequirements : requirements
    const fileName = `${exportTarget.id}.xls`
    const basicInfoRows = [
      ["고객사", customerDisplay],
      ["사업명", opportunityDisplay],
      ["사업 구분", businessType],
      ["제안 형태", proposalType],
      ["납품 모듈", deliveryModule],
      ["H/W 제공 주체", hardwareOwner],
      ["금액 규모", amountScale],
      ["예상사업기간", projectPeriod],
      ["사업장소", businessPlace],
      ["제안서 접수마감일", proposalDeadline],
      ["요청자", requesterName],
      ["담당자", analystName],
      ["요청일", requestDate],
      ["상태", analysisStatus],
      ["주요사업내용(특이점)", majorContent],
    ]

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="utf-8" />
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #64748b; padding: 8px; vertical-align: top; }
            th { background: #e2e8f0; font-weight: 700; }
            .label { background: #f1f5f9; width: 180px; font-weight: 700; }
            .value { background: #fffbeb; }
            .section { background: #cbd5e1; font-size: 16px; font-weight: 700; text-align: left; }
          </style>
        </head>
        <body>
          <table>
            <tr><th class="section" colspan="2">기본 정보</th></tr>
            ${basicInfoRows
              .map(
                ([label, value]) => `
                  <tr>
                    <td class="label">${escapeHtml(String(label))}</td>
                    <td class="value">${escapeHtml(value || "")}</td>
                  </tr>
                `,
              )
              .join("")}
          </table>
          <br />
          <table>
            <tr><th class="section" colspan="8">RFP 분석</th></tr>
            <tr>
              <th>연번</th>
              <th>구분</th>
              <th>요구사항고유번호</th>
              <th>요구사항명칭</th>
              <th>요구사항내용</th>
              <th>지원여부</th>
              <th>검토 내용</th>
              <th>공수(M/D)</th>
            </tr>
            ${rows
              .map(
                (row, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(row.category)}</td>
                    <td>${escapeHtml(row.requirementCode)}</td>
                    <td>${escapeHtml(row.requirementTitle)}</td>
                    <td>${escapeHtml(row.requirementContent)}</td>
                    <td>${escapeHtml(row.supportStatus)}</td>
                    <td>${escapeHtml(row.reviewNote)}</td>
                    <td>${escapeHtml(row.effort)}</td>
                  </tr>
                `,
              )
              .join("")}
            <tr>
              <td colspan="7" style="text-align:right; font-weight:700; background:#f1f5f9;">공수 합계</td>
              <td style="font-weight:700;">${escapeHtml(totalEffort.toLocaleString())}</td>
            </tr>
          </table>
        </body>
      </html>
    `

    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast({
      title: "엑셀 다운로드",
      description: `${fileName} 파일을 다운로드했습니다.`,
    })
  }

  const handleImportButtonClick = () => {
    importInputRef.current?.click()
  }

  const handleExcelImport = async (file: File | undefined) => {
    if (!file) return

    try {
      const lowerName = file.name.toLowerCase()
      if (lowerName.endsWith(".xlsx")) {
        toast({
          title: "엑셀 임포트 안내",
          description: "현재는 .xlsx 대신 csv 또는 엑셀 2003 XML/HTML 형식 파일 임포트를 지원합니다.",
        })
        return
      }

      const text = await file.text()
      const normalizedRows = lowerName.endsWith(".csv") || lowerName.endsWith(".tsv") || lowerName.endsWith(".txt")
        ? parseDelimitedTextRows(text)
        : lowerName.endsWith(".xml")
          ? parseSpreadsheetXmlRows(text)
          : parseHtmlTableRows(text)
      const importedBasicInfo = parseBasicInfoFromRows(normalizedRows)
      const importedRequirements = parseRequirementRowsFromSheetRows(normalizedRows)

      if (importedRequirements.length === 0 && Object.keys(importedBasicInfo).length === 0) {
        toast({
          title: "엑셀 임포트 실패",
          description: "기본 정보 또는 RFP 분석영역 헤더를 찾지 못했습니다. 다운로드한 양식 또는 동일한 컬럼 구조를 확인해주십시오.",
        })
        return
      }

      if (importedBasicInfo.customerDisplay && isStandalone) {
        const importedCustomerCode = extractCodeFromDisplay(importedBasicInfo.customerDisplay)
        const importedCustomerName = extractNameFromDisplay(importedBasicInfo.customerDisplay)
        const matchedCustomer = importedCustomerCode
          ? getCustomerByCode(importedCustomerCode)
          : importedCustomerName
            ? ({
                id: "",
                name: importedCustomerName,
                category: "",
                opportunities: 0,
                contracts: 0,
                contact: "",
                phone: "",
              } as CustomerRecord)
            : null

        setSelectedCustomer(importedCustomerCode ? matchedCustomer : null)
        setSelectedCustomerName(importedCustomerName)
      }

      if (importedBasicInfo.opportunityDisplay && isStandalone) {
        const importedOpportunityCode = extractCodeFromDisplay(importedBasicInfo.opportunityDisplay)
        setSelectedOpportunityCode(importedOpportunityCode)
      }

      if (importedBasicInfo.businessType) setBusinessType(importedBasicInfo.businessType)
      if (importedBasicInfo.proposalType) setProposalType(importedBasicInfo.proposalType)
      if (importedBasicInfo.deliveryModule !== undefined) setDeliveryModule(importedBasicInfo.deliveryModule)
      if (importedBasicInfo.hardwareOwner !== undefined) setHardwareOwner(importedBasicInfo.hardwareOwner)
      if (importedBasicInfo.majorContent !== undefined) setMajorContent(importedBasicInfo.majorContent)
      if (importedBasicInfo.amountScale !== undefined) setAmountScale(importedBasicInfo.amountScale)
      if (importedBasicInfo.projectPeriod !== undefined) setProjectPeriod(importedBasicInfo.projectPeriod)
      if (importedBasicInfo.businessPlace !== undefined) setBusinessPlace(importedBasicInfo.businessPlace)
      if (importedBasicInfo.proposalDeadline !== undefined) setProposalDeadline(importedBasicInfo.proposalDeadline)
      if (importedBasicInfo.salesRep !== undefined) setRequesterName(importedBasicInfo.salesRep)
      if (importedBasicInfo.analyst !== undefined) setAnalystName(importedBasicInfo.analyst)
      if (importedBasicInfo.requestDate !== undefined) setRequestDate(importedBasicInfo.requestDate)
      if (importedBasicInfo.status !== undefined && analysisStatusOptions.includes(importedBasicInfo.status as RfpAnalysisStatus)) {
        setAnalysisStatus(importedBasicInfo.status as RfpAnalysisStatus)
      }

      if (importedRequirements.length > 0) {
        setRequirements(importedRequirements)
      }

      toast({
        title: "엑셀 임포트 완료",
        description:
          importedRequirements.length > 0
            ? `${importedRequirements.length}개 요구사항과 기본정보를 불러왔습니다.`
            : "기본정보를 불러왔습니다.",
      })
    } catch (error) {
      toast({
        title: "엑셀 임포트 실패",
        description: error instanceof Error ? error.message : "엑셀 파일을 읽는 중 오류가 발생했습니다.",
      })
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = ""
      }
    }
  }

  return (
    <>
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-white">
        <div className="flex items-center justify-between gap-4">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.tsv,.txt,.xml,.xls,.html"
              className="hidden"
              onChange={(event) => void handleExcelImport(event.target.files?.[0])}
            />
            <Button variant="outline" onClick={handleImportButtonClick}>
              <Upload className="mr-2 h-4 w-4" />
              엑셀 임포트
            </Button>
            <Button variant="outline" onClick={handleExcelExport}>
              <Download className="mr-2 h-4 w-4" />
              엑셀 다운로드
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
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
                    <Select value={selectedOpportunityCode} onValueChange={setSelectedOpportunityCode} disabled={!selectedCustomer}>
                      <SelectTrigger className="h-10 rounded-none border-0 shadow-none focus:ring-0">
                        <SelectValue placeholder={selectedCustomer ? "사업기회를 선택하세요" : "고객사를 먼저 선택하세요"} />
                      </SelectTrigger>
                      <SelectContent>
                        {standaloneOpportunityOptions.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <ExcelInput value={opportunityDisplay} readOnly />
                  )}
                </BasicInfoRow>
              </tr>
              <tr>
                <BasicInfoRow label="사업 구분">
                  <ExcelSelect value={businessType} onChange={setBusinessType} options={businessTypes} />
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
                  <ExcelInput value={requesterName} onChange={(event) => setRequesterName(event.target.value)} placeholder="요청자를 입력하세요" />
                </BasicInfoRow>
                <BasicInfoRow label="담당자">
                  <ExcelInput value={analystName} onChange={(event) => setAnalystName(event.target.value)} placeholder="담당자를 입력하세요" />
                </BasicInfoRow>
              </tr>
              <tr>
                {requestItem?.id?.startsWith("REQ-") ? (
                  <BasicInfoRow label="활동요청 코드" value={requestItem.id} />
                ) : (
                  <BasicInfoRow label="요청일">
                    <ExcelInput type="date" value={requestDate} onChange={(event) => setRequestDate(event.target.value)} />
                  </BasicInfoRow>
                )}
                <BasicInfoRow label="상태">
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
                </BasicInfoRow>
              </tr>
              {requestItem?.id?.startsWith("REQ-") && (
                <tr>
                  <BasicInfoRow label="요청일">
                    <ExcelInput type="date" value={requestDate} onChange={(event) => setRequestDate(event.target.value)} />
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
