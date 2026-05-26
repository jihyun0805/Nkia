"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "@/hooks/use-toast"
import { useChatbotPrefill } from "@/lib/use-chatbot-prefill"
import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { WorkflowApprovalPanel } from "@/components/erp/workflow-approval-panel"
import { UserIdPicker } from "@/components/erp/user-id-picker"
import { getCustomers, getOpportunities, type CustomerRecord, type OpportunityRecord } from "@/lib/finding-data"
import {
  loadBackendBidResultHistoryRecord,
  loadBackendBidResultHistoryRecords,
  loadBackendBidResults,
  loadBackendBidResultDetailById,
  saveBackendBidResult,
  type BackendBidResultHistoryListItem,
} from "@/lib/bid-result-backend"
import { loadBackendProposals } from "@/lib/proposal-backend"
import { useBackendUsers } from "@/lib/use-backend-users"
import { resolveUserId } from "@/lib/user-utils"
import {
  type BidOutcome,
  type BidResultAnalysisSheet,
  type BidResultChecklistSection,
  type BidResultCompetitorScore,
  type BidResultRecord,
  type ProposalRecord,
} from "@/lib/bid-data"

type BidResultRegistrationFormProps = {
  proposalId?: string
  bidResultId?: string
}

type FormState = {
  proposalId: string
  customerCode: string
  opportunityCode: string
  bidDate: string
  result: BidOutcome
  amount: string
  competitor: string
  reason: string
  analysisSheet: BidResultAnalysisSheet
}

const outcomeOptions: BidOutcome[] = ["수주", "실주"]
const scoreOptions = ["1", "2", "3", "4", "5"]
const disclosureOptions = ["비공개", "공개"]

const checklistTemplate: BidResultChecklistSection[] = [
  {
    category: "고객",
    items: [
      { label: "사업 목표 및 성공 요인 분석이 충분했는가?", score: "", reason: "" },
      { label: "고객의 불편사항(pain point) 분석과 그에 대한 해결방안 제시가 충분했는가?", score: "", reason: "" },
      { label: "고객의 니즈 및 요구 사항을 정확하게 분석하였는가?", score: "", reason: "" },
      { label: "고객의 장기 비전 및 발전 계획을 충분히 반영했는가?", score: "", reason: "" },
    ],
  },
  {
    category: "경쟁사",
    items: [
      { label: "경쟁사의 제안 전략과 차별화 요소 분석이 충실했는가?", score: "", reason: "" },
      { label: "시장 환경 변화 또는 산업 규제나 정부 정책 이슈를 충실히 반영했는가?", score: "", reason: "" },
      { label: "당사는 경쟁사보다 고객사와 깊은 관계나 장기간의 레퍼런스를 보유하고 있는가?", score: "", reason: "" },
      { label: "고객이 당사를 경쟁사보다 선호하거나 우위에 있다고 판단했을 가능성이 있는가?", score: "", reason: "" },
    ],
  },
  {
    category: "제품 및 기술",
    items: [
      { label: "RFP의 핵심 기능 또는 요구사항을 완벽하게 충족하는가?", score: "", reason: "" },
      { label: "경쟁사 대비 당사 제품 또는 기술적 우위가 충분히 표현되었는가?", score: "", reason: "" },
      { label: "PM 및 주요 투입 인력 구성이 적절했는가?", score: "", reason: "" },
      { label: "리스크 식별과 그에 대한 대응 방안 제시가 충실했는가?", score: "", reason: "" },
    ],
  },
  {
    category: "제안서 및 제안 발표 자료",
    items: [
      { label: "제안서 및 제안 발표 자료는 핵심 내용을 충실히 담고 있는가?", score: "", reason: "" },
      { label: "제안서 및 제안 발표 자료는 가독성이 충분하고, 디자인적으로도 만족스러운가?", score: "", reason: "" },
      { label: "제안서 및 제안 발표 자료의 분량은 적절했는가?", score: "", reason: "" },
      { label: "제안서 및 제안 발표 자료 준비 과정에 충분한 시간과 자원을 투입했는가?", score: "", reason: "" },
    ],
  },
  {
    category: "제안 발표",
    items: [
      { label: "PM은 제안서 작성 개시 시점부터 제안서 작성 과정 전체에 참여했는가?", score: "", reason: "" },
      { label: "PM은 제안 발표 자료 작성 또는 수정 과정에 충분히 참여했는가?", score: "", reason: "" },
      { label: "PM은 RFP와 제안 내용을, 고객 및 경쟁사에 대해 충분히 이해했는가?", score: "", reason: "" },
      { label: "PM의 제안 발표 리허설은 충분히 이뤄졌는가?", score: "", reason: "" },
      { label: "PM은 준비한 것과 동일 수준 이상으로 제안 발표를 수행했는가?", score: "", reason: "" },
      { label: "PM은 고객의 질문에 적절하게 대응했는가?", score: "", reason: "" },
    ],
  },
  {
    category: "영업",
    items: [
      { label: "영업대표는 제안서 작성 과정 전체에 충분히 참여했는가?", score: "", reason: "" },
      { label: "영업대표와 고객과의 신뢰 관계 형성 및 커뮤니케이션은 충분했는가?", score: "", reason: "" },
      { label: "영업대표는 RFP와 제안 내용, 고객 및 경쟁사에 대해 충분히 이해했는가?", score: "", reason: "" },
      { label: "입찰 결과 발표 후 고객사의 평가 의견이나 피드백은 충실히 수집되었는가?", score: "", reason: "" },
    ],
  },
]

const defaultCompetitors: BidResultCompetitorScore[] = [
  { label: "당사", technicalScore: "", priceScore: "", totalScore: "" },
  { label: "경쟁사1", technicalScore: "", priceScore: "", totalScore: "" },
  { label: "경쟁사2", technicalScore: "", priceScore: "", totalScore: "" },
  { label: "경쟁사3", technicalScore: "", priceScore: "", totalScore: "" },
  { label: "경쟁사4", technicalScore: "", priceScore: "", totalScore: "" },
]

function createDefaultAnalysisSheet(): BidResultAnalysisSheet {
  return {
    bidOverviewCustomerName: "",
    bidOverviewProjectName: "",
    proposalProductModule: "",
    budget: "",
    bidAnnouncementDate: "",
    proposalSubmissionDeadline: "",
    proposalPresentationDate: "",
    externalPdRequired: "",
    salesLeaderName: "",
    pmName: "",
    proposalParticipants: "",
    keySuccessFactors: "",
    rfpIssues: "",
    proposalStrategy: "",
    scoreDisclosure: "비공개",
    technicalRatio: "",
    priceRatio: "",
    competitors: defaultCompetitors.map((item) => ({ ...item })),
    checklistSections: checklistTemplate.map((section) => ({
      category: section.category,
      items: section.items.map((item) => ({ ...item })),
    })),
  }
}

const emptyForm: FormState = {
  proposalId: "",
  customerCode: "",
  opportunityCode: "",
  bidDate: "",
  result: "수주",
  amount: "",
  competitor: "",
  reason: "",
  analysisSheet: createDefaultAnalysisSheet(),
}

function cloneAnalysisSheet(sheet?: BidResultAnalysisSheet | null) {
  if (!sheet) return createDefaultAnalysisSheet()

  const defaultSheet = createDefaultAnalysisSheet()

  return {
    ...defaultSheet,
    ...sheet,
    competitors: Array.isArray(sheet.competitors) && sheet.competitors.length > 0
      ? sheet.competitors.map((item, index) => ({
          label: item.label || defaultCompetitors[index]?.label || `경쟁사${index}`,
          technicalScore: item.technicalScore ?? "",
          priceScore: item.priceScore ?? "",
          totalScore: item.totalScore ?? "",
        }))
      : defaultSheet.competitors,
    checklistSections: Array.isArray(sheet.checklistSections) && sheet.checklistSections.length > 0
      ? sheet.checklistSections.map((section, sectionIndex) => ({
          category: section.category || checklistTemplate[sectionIndex]?.category || "",
          items: Array.isArray(section.items) && section.items.length > 0
            ? section.items.map((item, itemIndex) => ({
                label: item.label || checklistTemplate[sectionIndex]?.items[itemIndex]?.label || "",
                score: item.score ?? "",
                reason: item.reason ?? "",
              }))
            : (checklistTemplate[sectionIndex]?.items ?? []).map((item) => ({ ...item })),
        }))
      : defaultSheet.checklistSections,
  }
}

function getSectionSubtotal(section: BidResultChecklistSection) {
  return section.items.reduce((total, item) => total + Number.parseInt(item.score || "0", 10), 0)
}

function getOverallTotal(sections: BidResultChecklistSection[]) {
  return sections.reduce((total, section) => total + getSectionSubtotal(section), 0)
}

function getSectionMaxScore(section: BidResultChecklistSection) {
  return section.items.length * 5
}

function BidResultTableInput({
  value,
  onChange,
  readOnly = false,
  type = "text",
  placeholder,
}: {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <Input
      type={type}
      readOnly={readOnly}
      value={value}
      placeholder={placeholder}
      className="h-9 rounded-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
    />
  )
}

function BidResultTableTextarea({
  value,
  onChange,
  rows = 3,
}: {
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <Textarea
      rows={rows}
      value={value}
      className="min-h-0 resize-none rounded-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function BidResultCell({
  children,
  className = "",
  ...props
}: { children?: ReactNode; className?: string } & TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`border border-slate-400 align-middle ${className}`} {...props}>{children}</td>
}

function BidResultHeaderCell({
  children,
  className = "",
  ...props
}: { children?: ReactNode; className?: string } & ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={`border border-slate-400 bg-slate-100 px-2 py-2 text-center font-semibold ${className}`} {...props}>{children}</th>
}

export function BidResultRegistrationForm({ proposalId, bidResultId }: BidResultRegistrationFormProps) {
  const router = useRouter()
  const users = useBackendUsers()
  const [proposals, setProposals] = useState<ProposalRecord[]>([])
  const [bidResults, setBidResults] = useState<BidResultRecord[]>([])
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [validationMessage, setValidationMessage] = useState("")
  const [existingResult, setExistingResult] = useState<BidResultRecord | null>(null)
  const [detailTab, setDetailTab] = useState("document")
  const [historyRecords, setHistoryRecords] = useState<BackendBidResultHistoryListItem[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null)
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<BidResultRecord | null>(null)

  useEffect(() => {
    if (detailTab === "approval") {
      setDetailTab("document")
    }
  }, [detailTab])

  // 챗봇 create_draft (bid_result) prefill
  const { values: chatbotPrefill, hasPrefill: hasChatbotPrefill, clear: clearChatbotPrefill } = useChatbotPrefill()
  const prefillAppliedRef = useRef(false)
  useEffect(() => {
    if (!hasChatbotPrefill || prefillAppliedRef.current) return
    if (bidResultId || proposalId) return
    prefillAppliedRef.current = true
    const slot = chatbotPrefill
    setForm((cur) => ({
      ...cur,
      customerCode: slot.customer_name || cur.customerCode,  // 코드가 따로 없으면 name 입력
      opportunityCode: slot.opportunity_code || cur.opportunityCode,
      bidDate: slot.submission_deadline || cur.bidDate,
      result: (slot.result_status as BidOutcome) || cur.result,
      amount: slot.result_amount || cur.amount,
      reason: slot.lessons_learned || slot.result_summary || cur.reason,
    }))
    const applied = Object.keys(slot).length
    if (applied > 0) {
      toast({ title: "챗봇이 입찰결과 초안 prefill", description: `${applied}개 슬롯 반영 — 확인 후 저장하세요.` })
    }
    const id = window.setTimeout(() => clearChatbotPrefill(), 100)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChatbotPrefill])

  useEffect(() => {
    setProposals([])
    void loadBackendProposals()
      .then((records) => setProposals(records))
      .catch(() => setProposals([]))

    setCustomers(getCustomers())
    setOpportunities(getOpportunities())
    void loadBackendBidResults()
      .then((records) => setBidResults(records))
      .catch(() => setBidResults([]))
  }, [])

  useEffect(() => {
    if (!bidResultId) {
      setExistingResult(null)
      return
    }

    let cancelled = false
    void loadBackendBidResultDetailById(bidResultId)
      .then((record) => {
        if (!cancelled) {
          setExistingResult(record)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setExistingResult(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [bidResultId])

  useEffect(() => {
    let cancelled = false

    if (!bidResultId) {
      setHistoryRecords([])
      setSelectedHistoryId(null)
      setSelectedHistoryDetail(null)
      return () => {
        cancelled = true
      }
    }

    setHistoryRecords([])
    setSelectedHistoryId(null)
    setSelectedHistoryDetail(null)

    void loadBackendBidResultHistoryRecords(bidResultId)
      .then((records) => {
        if (!cancelled) {
          setHistoryRecords(
            records
              .filter((record): record is BackendBidResultHistoryListItem & { historyId: number; version: number } =>
                typeof record.historyId === "number" && typeof record.version === "number",
              )
              .sort((a, b) => (b.version ?? 0) - (a.version ?? 0)),
          )
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryRecords([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [bidResultId])

  useEffect(() => {
    let cancelled = false

    if (selectedHistoryId == null) {
      setSelectedHistoryDetail(null)
      return () => {
        cancelled = true
      }
    }

    void loadBackendBidResultHistoryRecord(selectedHistoryId)
      .then((record) => {
        if (!cancelled) {
          setSelectedHistoryDetail(record)
          setForm({
            proposalId: record.proposalId,
            customerCode: record.customerCode,
            opportunityCode: record.opportunityCode,
            bidDate: record.bidDate,
            result: record.result,
            amount: record.amount,
            competitor: record.competitor,
            reason: record.reason,
            analysisSheet: cloneAnalysisSheet(record.analysisSheet),
          })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedHistoryDetail(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedHistoryId])

  const mergedExistingResult = existingResult

  const registeredProposalIds = useMemo(
    () =>
      new Set(
        bidResults
          .map((result) => result.proposalId)
          .filter((value): value is string => Boolean(value) && value !== mergedExistingResult?.proposalId),
      ),
    [bidResults, mergedExistingResult?.proposalId],
  )

  const availableProposals = useMemo(
    () => proposals.filter((proposal) => !registeredProposalIds.has(proposal.id) || proposal.id === mergedExistingResult?.proposalId),
    [mergedExistingResult?.proposalId, proposals, registeredProposalIds],
  )

  const availableCustomers = useMemo(() => {
    const proposalCustomerCodes = new Set(availableProposals.map((item) => item.customerCode))
    return customers.filter((customer) => proposalCustomerCodes.has(customer.id))
  }, [availableProposals, customers])

  const availableOpportunities = useMemo(() => {
    const baseList = form.customerCode
      ? opportunities.filter((item) => item.customerCode === form.customerCode)
      : opportunities

    const proposalOpportunityCodes = new Set(
      availableProposals
        .filter((proposal) => !form.customerCode || proposal.customerCode === form.customerCode)
        .map((proposal) => proposal.opportunityCode),
    )

    return baseList.filter((item) => proposalOpportunityCodes.has(item.id))
  }, [availableProposals, form.customerCode, opportunities])

  const matchingProposal = useMemo(
    () =>
      availableProposals.find(
        (item) =>
          item.id === form.proposalId &&
          item.customerCode === form.customerCode &&
          item.opportunityCode === form.opportunityCode,
      ) ?? null,
    [availableProposals, form.customerCode, form.opportunityCode, form.proposalId],
  )

  const salesLeaderUserId = resolveUserId(form.analysisSheet.salesLeaderName || matchingProposal?.salesRep || "", users)
  const pmUserId = resolveUserId(form.analysisSheet.pmName, users)

  useEffect(() => {
    if (mergedExistingResult) {
      setForm({
        proposalId: mergedExistingResult.proposalId,
        customerCode: mergedExistingResult.customerCode,
        opportunityCode: mergedExistingResult.opportunityCode,
        bidDate: mergedExistingResult.bidDate,
        result: mergedExistingResult.result,
        amount: mergedExistingResult.amount,
        competitor: mergedExistingResult.competitor,
        reason: mergedExistingResult.reason,
        analysisSheet: cloneAnalysisSheet(mergedExistingResult.analysisSheet),
      })
      return
    }

    if (proposalId) {
      const matchedProposal = availableProposals.find((item) => item.id === proposalId)
      if (!matchedProposal) return

      setForm((current) => ({
        ...current,
        proposalId: matchedProposal.id,
        customerCode: matchedProposal.customerCode,
        opportunityCode: matchedProposal.opportunityCode,
        bidDate: current.bidDate || matchedProposal.proposalDeadline,
        analysisSheet: {
          ...current.analysisSheet,
          bidOverviewCustomerName: matchedProposal.customer,
          bidOverviewProjectName: matchedProposal.opportunity,
          proposalProductModule: matchedProposal.productGroup,
          proposalSubmissionDeadline: matchedProposal.proposalDeadline,
          salesLeaderName: matchedProposal.salesRep,
        },
      }))
    }
  }, [availableProposals, mergedExistingResult, proposalId])

  const selectedCustomer = availableCustomers.find((item) => item.id === form.customerCode) ?? null
  const selectedOpportunity = availableOpportunities.find((item) => item.id === form.opportunityCode) ?? null

  useEffect(() => {
    setForm((current) => ({
      ...current,
      analysisSheet: {
        ...current.analysisSheet,
        bidOverviewCustomerName: selectedCustomer?.name ?? current.analysisSheet.bidOverviewCustomerName,
        bidOverviewProjectName: selectedOpportunity?.name ?? current.analysisSheet.bidOverviewProjectName,
      },
    }))
  }, [selectedCustomer?.name, selectedOpportunity?.name])

  const updateAnalysisField = <K extends keyof BidResultAnalysisSheet>(field: K, value: BidResultAnalysisSheet[K]) => {
    setForm((current) => ({
      ...current,
      analysisSheet: {
        ...current.analysisSheet,
        [field]: value,
      },
    }))
  }

  const updateCompetitorScore = (index: number, field: keyof BidResultCompetitorScore, value: string) => {
    setForm((current) => ({
      ...current,
      analysisSheet: {
        ...current.analysisSheet,
        competitors: current.analysisSheet.competitors.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      },
    }))
  }

  const updateChecklistItem = (sectionIndex: number, itemIndex: number, field: "score" | "reason", value: string) => {
    setForm((current) => ({
      ...current,
      analysisSheet: {
        ...current.analysisSheet,
        checklistSections: current.analysisSheet.checklistSections.map((section, currentSectionIndex) =>
          currentSectionIndex === sectionIndex
            ? {
                ...section,
                items: section.items.map((item, currentItemIndex) =>
                  currentItemIndex === itemIndex ? { ...item, [field]: value } : item,
                ),
              }
            : section,
        ),
      },
    }))
  }

  const applyProposal = (proposal: ProposalRecord) => {
    setForm((current) => ({
      ...current,
      proposalId: proposal.id,
      customerCode: proposal.customerCode,
      opportunityCode: proposal.opportunityCode,
      bidDate: current.bidDate || proposal.proposalDeadline,
      analysisSheet: {
        ...current.analysisSheet,
        bidOverviewCustomerName: proposal.customer,
        bidOverviewProjectName: proposal.opportunity,
        proposalProductModule: proposal.productGroup,
        proposalSubmissionDeadline: proposal.proposalDeadline,
        salesLeaderName: proposal.salesRep,
      },
    }))
  }

  const handleProposalChange = (nextProposalId: string) => {
    const proposal = availableProposals.find((item) => item.id === nextProposalId)
    if (!proposal) {
      setForm((current) => ({ ...current, proposalId: nextProposalId }))
      return
    }

    applyProposal(proposal)
  }

  const handleCustomerChange = (nextCustomerCode: string) => {
    const candidateProposals = availableProposals.filter((item) => item.customerCode === nextCustomerCode)
    const nextProposal =
      candidateProposals.find((item) => item.id === form.proposalId) ??
      candidateProposals.find((item) => item.opportunityCode === form.opportunityCode) ??
      null

    setForm((current) => ({
      ...current,
      customerCode: nextCustomerCode,
      proposalId: nextProposal?.id ?? current.proposalId,
      opportunityCode: nextProposal?.opportunityCode ?? current.opportunityCode,
    }))
  }

  const handleOpportunityChange = (nextOpportunityCode: string) => {
    const candidateProposal =
      availableProposals.find(
        (item) =>
          item.customerCode === (form.customerCode || item.customerCode) &&
          item.opportunityCode === nextOpportunityCode &&
          (!form.proposalId || item.id === form.proposalId),
      ) ??
      availableProposals.find(
        (item) =>
          (!form.customerCode || item.customerCode === form.customerCode) &&
          item.opportunityCode === nextOpportunityCode,
      ) ??
      null

    setForm((current) => ({
      ...current,
      opportunityCode: nextOpportunityCode,
      proposalId: candidateProposal?.id ?? current.proposalId,
      customerCode: candidateProposal?.customerCode ?? current.customerCode,
    }))
  }

  const handleComplete = async () => {
    if (!form.proposalId) {
      setValidationMessage("제안서 등록(코드)이 선택되지 않았습니다. 선택 후 다시 시도해주십시오.")
      return
    }
    if (!form.customerCode) {
      setValidationMessage("고객사(코드)가 선택되지 않았습니다. 선택 후 다시 시도해주십시오.")
      return
    }
    if (!form.opportunityCode) {
      setValidationMessage("사업기회(코드)가 선택되지 않았습니다. 선택 후 다시 시도해주십시오.")
      return
    }
    if (!matchingProposal) {
      setValidationMessage("선택한 제안서 등록(코드), 고객사(코드), 사업기회(코드)의 연계 정보가 올바르지 않습니다. 다시 선택해주십시오.")
      return
    }

    try {
      const saved = await saveBackendBidResult({
        id: bidResultId,
        proposalId: matchingProposal.id,
        requestId: matchingProposal.requestId,
        customerCode: matchingProposal.customerCode,
        customer: matchingProposal.customer,
        opportunityCode: matchingProposal.opportunityCode,
        opportunity: matchingProposal.opportunity,
        proposalType: matchingProposal.proposalType,
        productGroup: matchingProposal.productGroup,
        proposalDeadline: matchingProposal.proposalDeadline,
        salesRep: form.analysisSheet.salesLeaderName || matchingProposal.salesRep,
        bidDate: form.bidDate || matchingProposal.proposalDeadline,
        result: form.result,
        amount: form.amount,
        competitor: form.competitor,
        reason: form.reason,
        analysisSheet: {
          ...form.analysisSheet,
          bidOverviewCustomerName: matchingProposal.customer,
          bidOverviewProjectName: matchingProposal.opportunity,
          proposalProductModule: form.analysisSheet.proposalProductModule || matchingProposal.productGroup,
          proposalSubmissionDeadline: form.analysisSheet.proposalSubmissionDeadline || matchingProposal.proposalDeadline,
          salesLeaderName: form.analysisSheet.salesLeaderName || matchingProposal.salesRep,
        },
      })

      router.push(`/bid/result/${saved.id}`)
    } catch (error) {
      setValidationMessage(error instanceof Error ? error.message : "입찰 결과를 저장하지 못했습니다.")
    }
  }

  const historyRows = historyRecords.map((item) => ({
    key: `backend:${item.historyId}`,
    historyId: item.historyId,
    versionLabel: `v${item.version ?? ""}`,
    documentDate: (item.createdAt ?? "").slice(0, 10),
    documentCode: item.bidResultId != null ? String(item.bidResultId) : String(item.historyId ?? ""),
  }))
  const currentWorkflowSource = selectedHistoryDetail ?? existingResult
  const currentWorkflowStatus = currentWorkflowSource?.workflowStatus ?? "결재 대기"
  const currentWorkflowId = currentWorkflowSource?.workflowId ?? null
  const totalScore = getOverallTotal(form.analysisSheet.checklistSections)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{bidResultId ? "입찰 결과 수정" : "입찰 결과 등록"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md bg-muted px-3 py-2 text-sm font-medium">
            {currentWorkflowStatus}
          </div>
          <Tabs value={detailTab} onValueChange={setDetailTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="document">입찰결과</TabsTrigger>
              <TabsTrigger value="history">변경 이력</TabsTrigger>
            </TabsList>
            <TabsContent value="document" className="mt-0 space-y-6">
              {selectedHistoryDetail && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedHistoryId(null)
                      setSelectedHistoryDetail(null)
                      if (existingResult) {
                        setForm({
                          proposalId: existingResult.proposalId,
                          customerCode: existingResult.customerCode,
                          opportunityCode: existingResult.opportunityCode,
                          bidDate: existingResult.bidDate,
                          result: existingResult.result,
                          amount: existingResult.amount,
                          competitor: existingResult.competitor,
                          reason: existingResult.reason,
                          analysisSheet: cloneAnalysisSheet(existingResult.analysisSheet),
                        })
                      }
                    }}
                  >
                    현재 버전 보기
                  </Button>
                </div>
              )}
          <div className="overflow-x-auto">
            <table className="min-w-[1480px] table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[173px]" />
                <col className="w-[55px]" />
                <col className="w-[20px]" />
                <col className="w-[35px]" />
                <col className="w-[156px]" />
                <col className="w-[156px]" />
                <col className="w-[156px]" />
                <col className="w-[156px]" />
                <col className="w-[156px]" />
                <col className="w-[156px]" />
                <col className="w-[156px]" />
                <col className="w-[156px]" />
                <col className="w-[156px]" />
                <col className="w-[156px]" />
              </colgroup>
              <tbody>
                <tr>
                  <BidResultHeaderCell className="text-left text-xl" colSpan={14}>1. 입찰 개요</BidResultHeaderCell>
                </tr>
                <tr>
                  <BidResultHeaderCell className="w-[180px]">제안서 등록(코드)</BidResultHeaderCell>
                  <BidResultCell colSpan={13}>
                    <Select value={form.proposalId} onValueChange={handleProposalChange}>
                      <SelectTrigger className="h-9 rounded-none border-0 shadow-none focus:ring-0">
                        <SelectValue placeholder="제안서 코드를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProposals.map((proposal) => (
                          <SelectItem key={proposal.id} value={proposal.id}>
                            {proposal.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </BidResultCell>
                </tr>
                <tr>
                  <BidResultHeaderCell>고객사(코드)</BidResultHeaderCell>
                  <BidResultCell colSpan={13}>
                    <Select value={form.customerCode} onValueChange={handleCustomerChange}>
                      <SelectTrigger className="h-9 rounded-none border-0 shadow-none focus:ring-0">
                        <SelectValue placeholder="고객사 코드를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCustomers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </BidResultCell>
                </tr>
                <tr>
                  <BidResultHeaderCell>고객사명</BidResultHeaderCell>
                  <BidResultCell colSpan={13}>
                    <BidResultTableInput value={selectedCustomer?.name || matchingProposal?.customer || ""} readOnly />
                  </BidResultCell>
                </tr>
                <tr>
                  <BidResultHeaderCell>사업기회(코드)</BidResultHeaderCell>
                  <BidResultCell colSpan={13}>
                    <Select value={form.opportunityCode} onValueChange={handleOpportunityChange}>
                      <SelectTrigger className="h-9 rounded-none border-0 shadow-none focus:ring-0">
                        <SelectValue placeholder="사업기회 코드를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableOpportunities.map((opportunity) => (
                          <SelectItem key={opportunity.id} value={opportunity.id}>
                            {opportunity.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </BidResultCell>
                </tr>
                <tr>
                  <BidResultHeaderCell>사업명</BidResultHeaderCell>
                  <BidResultCell colSpan={13}>
                    <BidResultTableInput value={selectedOpportunity?.name || matchingProposal?.opportunity || ""} readOnly />
                  </BidResultCell>
                </tr>
                <tr>
                  <BidResultHeaderCell>제안 제품 모듈</BidResultHeaderCell>
                  <BidResultCell colSpan={13}>
                    <BidResultTableInput
                      value={form.analysisSheet.proposalProductModule || matchingProposal?.productGroup || ""}
                      onChange={(value) => updateAnalysisField("proposalProductModule", value)}
                    />
                  </BidResultCell>
                </tr>
                <tr>
                  <BidResultHeaderCell className="whitespace-nowrap">예산(VAT별도, 단위: 원)</BidResultHeaderCell>
                  <BidResultCell colSpan={13}>
                    <BidResultTableInput
                      value={form.analysisSheet.budget}
                      onChange={(value) => updateAnalysisField("budget", value)}
                    />
                  </BidResultCell>
                </tr>
                <tr>
                  <BidResultHeaderCell>입찰 공고일</BidResultHeaderCell>
                  <BidResultCell colSpan={13}>
                    <BidResultTableInput
                      type="date"
                      value={form.analysisSheet.bidAnnouncementDate}
                      onChange={(value) => updateAnalysisField("bidAnnouncementDate", value)}
                    />
                  </BidResultCell>
                </tr>
                <tr>
                  <BidResultHeaderCell>제안서 접수 마감일</BidResultHeaderCell>
                  <BidResultCell colSpan={13}>
                    <BidResultTableInput
                      type="date"
                      value={form.analysisSheet.proposalSubmissionDeadline || matchingProposal?.proposalDeadline || ""}
                      onChange={(value) => updateAnalysisField("proposalSubmissionDeadline", value)}
                    />
                  </BidResultCell>
                </tr>
                <tr>
                  <BidResultHeaderCell>제안발표일</BidResultHeaderCell>
                  <BidResultCell colSpan={13}>
                    <BidResultTableInput
                      type="date"
                      value={form.analysisSheet.proposalPresentationDate}
                      onChange={(value) => updateAnalysisField("proposalPresentationDate", value)}
                    />
                  </BidResultCell>
                </tr>
                <tr>
                  <BidResultHeaderCell>외부 PD 작업 여부</BidResultHeaderCell>
                  <BidResultCell colSpan={13}>
                    <BidResultTableInput
                      value={form.analysisSheet.externalPdRequired}
                      onChange={(value) => updateAnalysisField("externalPdRequired", value)}
                    />
                  </BidResultCell>
                </tr>

                <tr>
                  <BidResultHeaderCell className="text-left text-xl" colSpan={14}>2. 제안 개요</BidResultHeaderCell>
                </tr>
                <tr>
                  <BidResultHeaderCell>영업대표명</BidResultHeaderCell>
                  <BidResultCell colSpan={13}>
                    <UserIdPicker
                      value={salesLeaderUserId}
                      users={users}
                      onValueChange={(value) => {
                        const selectedUser = users.find((user) => user.id === value)
                        updateAnalysisField("salesLeaderName", selectedUser?.name ?? "")
                      }}
                      placeholder="영업대표를 선택하세요"
                    />
                  </BidResultCell>
                </tr>
                <tr>
                  <BidResultHeaderCell>PM명</BidResultHeaderCell>
                  <BidResultCell colSpan={13}>
                    <UserIdPicker
                      value={pmUserId}
                      users={users}
                      onValueChange={(value) => {
                        const selectedUser = users.find((user) => user.id === value)
                        updateAnalysisField("pmName", selectedUser?.name ?? "")
                      }}
                      placeholder="PM을 선택하세요"
                    />
                  </BidResultCell>
                </tr>
                <tr>
                  <BidResultHeaderCell>제안서 작성 참여자명</BidResultHeaderCell>
                  <BidResultCell colSpan={13}>
                    <BidResultTableInput
                      value={form.analysisSheet.proposalParticipants}
                      onChange={(value) => updateAnalysisField("proposalParticipants", value)}
                    />
                  </BidResultCell>
                </tr>
                <tr>
                  <BidResultHeaderCell>핵심 성공 요소</BidResultHeaderCell>
                  <BidResultCell colSpan={13}>
                    <BidResultTableTextarea
                      value={form.analysisSheet.keySuccessFactors}
                      onChange={(value) => updateAnalysisField("keySuccessFactors", value)}
                    />
                  </BidResultCell>
                </tr>
                <tr>
                  <BidResultHeaderCell>RFP 이슈 사항</BidResultHeaderCell>
                  <BidResultCell colSpan={13}>
                    <BidResultTableTextarea
                      value={form.analysisSheet.rfpIssues}
                      onChange={(value) => updateAnalysisField("rfpIssues", value)}
                    />
                  </BidResultCell>
                </tr>
                <tr>
                  <BidResultHeaderCell>제안 전략</BidResultHeaderCell>
                  <BidResultCell colSpan={13}>
                    <BidResultTableTextarea
                      value={form.analysisSheet.proposalStrategy}
                      onChange={(value) => updateAnalysisField("proposalStrategy", value)}
                    />
                  </BidResultCell>
                </tr>

                <tr>
                  <BidResultHeaderCell className="text-left text-xl" colSpan={14}>3. 입찰 결과</BidResultHeaderCell>
                </tr>
                <tr>
                  <BidResultHeaderCell className="whitespace-nowrap py-1">수주/실주 여부</BidResultHeaderCell>
                  <BidResultCell className="w-[180px] p-0" colSpan={3}>
                    <Select value={form.result} onValueChange={(value) => setForm((current) => ({ ...current, result: value as BidOutcome }))}>
                      <SelectTrigger className="h-8 rounded-none border-0 bg-transparent px-2 shadow-none focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {outcomeOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </BidResultCell>
                  <BidResultHeaderCell className="whitespace-nowrap py-1" colSpan={10}>기술:가격 비율</BidResultHeaderCell>
                </tr>
                <tr>
                  <BidResultHeaderCell className="whitespace-nowrap py-1">평가 결과</BidResultHeaderCell>
                  <BidResultCell className="w-[180px] max-w-[180px] p-0 align-top" colSpan={3} rowSpan={4}>
                    <div className="h-full px-2 py-0.5">
                      <Select value={form.analysisSheet.scoreDisclosure} onValueChange={(value) => updateAnalysisField("scoreDisclosure", value)}>
                        <SelectTrigger className="h-8 rounded-none border-0 bg-transparent px-0 shadow-none focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {disclosureOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </BidResultCell>
                  <BidResultCell className="p-0" colSpan={10} rowSpan={4}>
                    <table className="h-full w-full table-fixed border-collapse">
                      <tbody>
                        <tr>
                          {form.analysisSheet.competitors.map((competitor) => (
                            <BidResultHeaderCell className="py-1" key={`${competitor.label}-header-inner`}>
                              {competitor.label}
                            </BidResultHeaderCell>
                          ))}
                        </tr>
                        <tr>
                          {form.analysisSheet.competitors.map((competitor, index) => (
                            <BidResultCell className="p-0" key={`${competitor.label}-technical-inner`}>
                              <BidResultTableInput
                                value={competitor.technicalScore}
                                onChange={(value) => updateCompetitorScore(index, "technicalScore", value)}
                              />
                            </BidResultCell>
                          ))}
                        </tr>
                        <tr>
                          {form.analysisSheet.competitors.map((competitor, index) => (
                            <BidResultCell className="p-0" key={`${competitor.label}-price-inner`}>
                              <BidResultTableInput
                                value={competitor.priceScore}
                                onChange={(value) => updateCompetitorScore(index, "priceScore", value)}
                              />
                            </BidResultCell>
                          ))}
                        </tr>
                        <tr>
                          {form.analysisSheet.competitors.map((competitor, index) => (
                            <BidResultCell className="p-0" key={`${competitor.label}-total-inner`}>
                              <BidResultTableInput
                                value={competitor.totalScore || "0"}
                                onChange={(value) => updateCompetitorScore(index, "totalScore", value)}
                              />
                            </BidResultCell>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </BidResultCell>
                </tr>
                <tr>
                  <BidResultHeaderCell className="whitespace-nowrap py-1">기술평가 점수</BidResultHeaderCell>
                </tr>
                <tr>
                  <BidResultHeaderCell className="whitespace-nowrap py-1">가격평가 점수</BidResultHeaderCell>
                </tr>
                <tr>
                  <BidResultHeaderCell className="whitespace-nowrap py-1">합계</BidResultHeaderCell>
                </tr>

                <tr>
                  <BidResultHeaderCell className="text-left text-xl" colSpan={14}>4. 수주/실주 원인 분석</BidResultHeaderCell>
                </tr>
                <tr>
                  <BidResultHeaderCell className="w-[120px]">구분</BidResultHeaderCell>
                  <BidResultHeaderCell className="w-[640px]">체크리스트</BidResultHeaderCell>
                  <BidResultHeaderCell className="w-[205px] whitespace-nowrap">전혀 아니다<br />1점</BidResultHeaderCell>
                  <BidResultHeaderCell className="w-[205px] whitespace-nowrap">대체로 아니다<br />2점</BidResultHeaderCell>
                  <BidResultHeaderCell className="w-[205px] whitespace-nowrap">보통이다<br />3점</BidResultHeaderCell>
                  <BidResultHeaderCell className="w-[205px] whitespace-nowrap">대체로 그렇다<br />4점</BidResultHeaderCell>
                  <BidResultHeaderCell className="w-[205px] whitespace-nowrap">매우 그렇다<br />5점</BidResultHeaderCell>
                  <BidResultHeaderCell className="w-[100px]">점수</BidResultHeaderCell>
                  <BidResultHeaderCell colSpan={6}>평가 이유</BidResultHeaderCell>
                </tr>
                {form.analysisSheet.checklistSections.map((section, sectionIndex) => (
                  section.items.map((item, itemIndex) => (
                    <tr key={`${section.category}-${item.label}`}>
                      {itemIndex === 0 && (
                        <BidResultHeaderCell className="bg-white" rowSpan={section.items.length + 1}>
                          {section.category}
                        </BidResultHeaderCell>
                      )}
                      <BidResultCell className="whitespace-nowrap px-2 py-2 text-sm">{item.label}</BidResultCell>
                      <BidResultCell className="w-[120px] text-center">{item.score === "1" ? "●" : ""}</BidResultCell>
                      <BidResultCell className="w-[120px] text-center">{item.score === "2" ? "●" : ""}</BidResultCell>
                      <BidResultCell className="w-[120px] text-center">{item.score === "3" ? "●" : ""}</BidResultCell>
                      <BidResultCell className="w-[120px] text-center">{item.score === "4" ? "●" : ""}</BidResultCell>
                      <BidResultCell className="w-[120px] text-center">{item.score === "5" ? "●" : ""}</BidResultCell>
                      <BidResultCell>
                        <Select value={item.score} onValueChange={(value) => updateChecklistItem(sectionIndex, itemIndex, "score", value)}>
                          <SelectTrigger className="h-9 rounded-none border-0 shadow-none focus:ring-0">
                            <SelectValue placeholder="점수" />
                          </SelectTrigger>
                          <SelectContent>
                            {scoreOptions.map((option) => (
                              <SelectItem key={`${section.category}-${item.label}-${option}`} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </BidResultCell>
                      <BidResultCell colSpan={6}>
                        <BidResultTableTextarea
                          value={item.reason}
                          onChange={(value) => updateChecklistItem(sectionIndex, itemIndex, "reason", value)}
                          rows={2}
                        />
                      </BidResultCell>
                    </tr>
                  )).concat(
                    <tr key={`${section.category}-subtotal`}>
                      <BidResultCell className="bg-slate-50" colSpan={5} />
                      <BidResultCell className="bg-slate-50 px-2 py-2 text-center font-semibold">
                        소계
                      </BidResultCell>
                      <BidResultCell className="bg-slate-50 text-center font-semibold">
                        {getSectionSubtotal(section)}
                      </BidResultCell>
                      <BidResultCell className="bg-slate-50 text-center font-semibold" colSpan={6}>
                        {getSectionMaxScore(section)}
                      </BidResultCell>
                    </tr>,
                  )
                ))}
                <tr>
                  <BidResultCell className="bg-slate-100" colSpan={6} />
                  <BidResultCell className="bg-slate-100 px-2 py-3 text-center text-2xl font-bold">
                    합계
                  </BidResultCell>
                  <BidResultCell className="bg-slate-100 text-center text-2xl font-bold">
                    {totalScore}
                  </BidResultCell>
                  <BidResultCell className="bg-slate-100 px-3 text-center text-2xl font-bold" colSpan={6}>
                    만점: 130점
                  </BidResultCell>
                </tr>
              </tbody>
            </table>
          </div>

          {!selectedHistoryDetail && currentWorkflowSource?.id != null && (
            <WorkflowApprovalPanel
              workflowId={currentWorkflowId}
              status={currentWorkflowStatus}
              targetId={Number(currentWorkflowSource?.id ?? 0)}
              domainType="BID_RESULT"
              onRefresh={() => {
                void loadBackendBidResults().then((records) => {
                  setExistingResult(records.find((item) => item.id === bidResultId) ?? null)
                })
              }}
            />
          )}

            </TabsContent>
            <TabsContent value="history" className="mt-0">
              <div className="rounded-lg border">
                <table className="w-full table-fixed border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-center font-semibold">
                      <th className="border-b border-r px-3 py-3">버전</th>
                      <th className="border-b border-r px-3 py-3">등록일자</th>
                      <th className="border-b border-r px-3 py-3">입찰결과 코드</th>
                      <th className="border-b px-3 py-3">보기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.length > 0 ? (
                      historyRows.map((entry) => (
                        <tr key={entry.key}>
                          <td className="border-r border-t px-3 py-3 text-center">{entry.versionLabel}</td>
                          <td className="border-r border-t px-3 py-3 text-center">{entry.documentDate}</td>
                          <td className="border-r border-t px-3 py-3 text-center">{entry.documentCode}</td>
                          <td className="border-t px-3 py-3 text-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (typeof entry.historyId !== "number") return
                                setSelectedHistoryId(entry.historyId)
                                setDetailTab("document")
                              }}
                            >
                              보기
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                          변경 이력이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>

          {!selectedHistoryDetail && (
          <div className="flex justify-end gap-2 border-t pt-6">
            <Button variant="outline" asChild>
              <Link href={bidResultId ? `/bid/result/${bidResultId}` : "/bid"}>취소</Link>
            </Button>
            <Button onClick={handleComplete}>완료</Button>
          </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(validationMessage)} onOpenChange={(open) => { if (!open) setValidationMessage("") }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>입찰 결과 등록 확인</AlertDialogTitle>
            <AlertDialogDescription>{validationMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setValidationMessage("")}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
