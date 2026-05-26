"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { WorkflowApprovalPanel } from "@/components/erp/workflow-approval-panel"
import { UserIdPicker } from "@/components/erp/user-id-picker"
import { toast } from "@/hooks/use-toast"
import { adminApi } from "@/lib/api/admin-api"
import { notifyPrbApprovalRequested } from "@/lib/activity-request-workflow"
import {
  approvePrbStep,
  getPrbById,
  getPrbRevisionHistory,
  subscribePrbUpdates,
  type PrbApprovalStep,
  type PrbLineItem,
  type PrbRecord,
  type PrbStatus,
} from "@/lib/bid-data"
import { currentUser } from "@/lib/current-user"
import { loadBackendFindingData } from "@/lib/finding-backend"
import { type CustomerRecord, type OpportunityRecord } from "@/lib/finding-data"
import {
  deleteBackendPrb,
  loadBackendPrbDetailById,
  loadBackendPrbHistoryRecord,
  loadBackendPrbHistoryRecords,
  loadBackendPrbs,
  saveBackendPrb,
  type BackendPrbHistoryListItem,
} from "@/lib/prb-backend"
import { useBackendUsers } from "@/lib/use-backend-users"
import type { BackendUserSummary } from "@/lib/workflow-backend"
import { useChatbotPrefill } from "@/lib/use-chatbot-prefill"

type PrbRegistrationFormProps = {
  prbId?: string
  cloneFromId?: string
  documentOnly?: boolean
  readOnly?: boolean
  allowDelete?: boolean
  showWorkflowDetail?: boolean
}

type PrbFormState = {
  customerCode: string
  customer: string
  opportunityCode: string
  opportunity: string
  rfpAnalysisId: string
  proposalDeadline: string
  reviewer: string
  nextApprover: string
  salesRepresentativeId: string
  formData: Record<string, string>
  personnelItems: PrbLineItem[]
  productCostItems: PrbLineItem[]
  purchaseServiceItems: PrbLineItem[]
  purchaseProductItems: PrbLineItem[]
  expenseItems: PrbLineItem[]
}

const personnelRateMap: Record<string, string> = {
  "차/부장": "5,599,050",
  "과장": "3,965,700",
  "대리": "3,264,500",
  "사원": "2,538,000",
}
const expenseGroupRowSpans: Record<string, number> = {
  "제안": 10,
  "계약": 5,
  "이행": 11,
  "업무 환경": 8,
  "고객 관리": 2,
  "예비비 및 리스크 비용": 3,
}
const bidTypeOptions = [
  "자체 입찰 / 자체 평가",
  "조달 입찰 / 조달 평가",
  "조달 위탁 / 자체 평가",
] as const
const customerTypeOptions = ["공공", "민간", "해외"] as const

function today() {
  return new Date().toISOString().slice(0, 10)
}

function splitBusinessPeriod(value: string) {
  const [start = "", end = ""] = value.split("~").map((part) => part.trim())
  return { start, end }
}

function splitEvaluationRatio(value: string) {
  const [technical = "", price = ""] = value.split(":").map((part) => part.trim())
  return { technical, price }
}

function createRows(prefix: string, labels: string[], category?: string) {
  return labels.map((label, index) => ({
    id: `${prefix}-${index + 1}`,
    category: category ?? "",
    item: label,
    value: "",
    amount: "",
    note: "",
  }))
}

function createEmptyForm(): PrbFormState {
  return {
    customerCode: "",
    customer: "",
    opportunityCode: "",
    opportunity: "",
    rfpAnalysisId: "",
    proposalDeadline: "",
    reviewer: "",
    nextApprover: "",
    salesRepresentativeId: "",
    formData: {
      reportDate: today(),
      prbDate: today(),
      controlNumber: "",
      customerType: "",
      businessType: "",
      customerName: "",
      projectName: "",
      businessPeriod: "",
      businessPeriodStart: "",
      businessPeriodEnd: "",
      maintenance: "",
      businessOverview: "",
      salesLeader: "",
      salesDepartment: "",
      ownerDepartment: "",
      bidType: "",
      preliminaryNoticeDate: "",
      officialNoticeDate: "",
      priceBidDate: "",
      proposalDeadlineDate: "",
      proposalPresentationDate: "",
      evaluationRatio: "",
      totalBusinessAmount: "",
      companyBusinessAmount: "",
      expectedOrderRate: "0",
      estimatedRevenue: "",
      estimatedOperatingProfit: "",
      estimatedProfitRate: "",
      totalCost: "",
      laborCost: "",
      productCost: "",
      purchaseCost: "",
      expenseCost: "",
      indirectCost: "",
      indirectRate: "5",
      salesOpinion: "",
    },
    personnelItems: [
      ...createRows("resident", ["차/부장", "과장", "대리", "사원", "소계"], "상주").map((item) => ({
        ...item,
        value: item.item === "소계" ? "-" : "",
        amount: "-",
        note: "",
      })),
      ...createRows("nonresident", ["차/부장", "과장", "대리", "사원", "소계"], "비상주").map((item) => ({
        ...item,
        value: item.item === "소계" ? "-" : "",
        amount: "-",
        note: item.item === "소계" ? "" : "상주의 30%",
      })),
    ],
    productCostItems: createRows("product-cost", ["", "", "", "", "", ""], ""),
    purchaseServiceItems: createRows("purchase-service", ["특급", "고급", "중급", "초급", "소계"], "용역"),
    purchaseProductItems: createRows("purchase-product", ["", "", "", "", "", ""], "제품"),
    expenseItems: [
      ...createRows("expense-proposal", ["인건비", "사무실 임대료", "장비 임대료", "인쇄 및 제본", "PD 작업", "식대 및 기타", "수당", "보증금", "유찰 방지", "소계"], "제안"),
      ...createRows("expense-contract", ["계약이행 보증보험", "선급금 보증보험", "하자이행 보증보험", "인지대 기타", "소계"], "계약"),
      ...createRows("expense-execution", ["파견비", "워크샵", "교육", "야근/특근 수당", "야근 식대", "야근 교통비", "회식비", "의욕관리비", "출장비", "유지보수", "소계"], "이행"),
      ...createRows("expense-environment", ["사무실 임대료", "장비 임대료", "장비 구매비", "통신비", "관리비", "사무용품/소모품", "생수/커피 등", "소계"], "업무 환경"),
      ...createRows("expense-customer", ["영업/접대비", "소계"], "고객 관리"),
      ...createRows("expense-risk", ["예비비", "리스크 비용", "소계"], "예비비 및 리스크 비용"),
    ],
  }
}

function cloneForm(record: PrbRecord): PrbFormState {
  const base = createEmptyForm()
  return {
    customerCode: record.customerCode,
    customer: record.customer,
    opportunityCode: record.opportunityCode,
    opportunity: record.opportunity,
    rfpAnalysisId: record.rfpAnalysisId,
    proposalDeadline: record.proposalDeadline,
    reviewer: record.reviewer,
    nextApprover: record.nextApprover,
    salesRepresentativeId: record.salesRepresentativeId ?? "",
    formData: { ...base.formData, ...record.formData },
    personnelItems: record.personnelItems.length > 0 ? record.personnelItems : base.personnelItems,
    productCostItems: record.productItems.length > 0 ? record.productItems : base.productCostItems,
    purchaseServiceItems: record.purchaseItems.length > 0 ? record.purchaseItems.slice(0, 5) : base.purchaseServiceItems,
    purchaseProductItems: record.purchaseItems.length > 5 ? record.purchaseItems.slice(5) : base.purchaseProductItems,
    expenseItems: record.indirectItems.length > 0 ? record.indirectItems : base.expenseItems,
  }
}

function FieldInput({
  value,
  onChange,
  multiline = false,
  type = "text",
  className = "",
  readOnly = false,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  type?: "text" | "date"
  className?: string
  readOnly?: boolean
  placeholder?: string
}) {
  if (multiline) {
    return (
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`min-h-20 resize-none border-0 shadow-none focus-visible:ring-0 ${className}`}
      />
    )
  }

  return (
    <Input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`border-0 shadow-none focus-visible:ring-0 ${readOnly ? "bg-muted/30" : ""} ${className}`}
    />
  )
}

function SectionRow({ title }: { title: string }) {
  return (
    <tr>
      <th colSpan={8} className="bg-slate-200 px-3 py-2 text-left text-sm font-semibold">
        {title}
      </th>
    </tr>
  )
}

function resolveUserId(value: string, users: BackendUserSummary[]) {
  const normalized = value.trim()
  if (!normalized) return ""
  return users.find(
    (user) =>
      user.id === normalized ||
      user.employeeNumber === normalized ||
      user.name === normalized,
  )?.id ?? ""
}

export function PrbRegistrationForm({ prbId, cloneFromId, documentOnly = false, readOnly = false, allowDelete = false, showWorkflowDetail = true }: PrbRegistrationFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<PrbFormState>(createEmptyForm())
  const [status, setStatus] = useState<PrbStatus>("작성 중")
  const [popupMessage, setPopupMessage] = useState("")
  const [detailTab, setDetailTab] = useState("document")
  const [sourcePrb, setSourcePrb] = useState<PrbRecord | null>(null)
  const [revisionHistory, setRevisionHistory] = useState<PrbRecord[]>([])
  const [backendHistoryRecords, setBackendHistoryRecords] = useState<BackendPrbHistoryListItem[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null)
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<PrbRecord | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [productClasses, setProductClasses] = useState<string[]>([])
  const users = useBackendUsers()
  const selectedReviewerId = resolveUserId(form.reviewer, users)
  const businessPeriodParts = useMemo(
    () => splitBusinessPeriod(form.formData.businessPeriod),
    [form.formData.businessPeriod],
  )
  const evaluationRatioParts = useMemo(
    () => splitEvaluationRatio(form.formData.evaluationRatio),
    [form.formData.evaluationRatio],
  )
  const businessPeriodStart = form.formData.businessPeriodStart || businessPeriodParts.start
  const businessPeriodEnd = form.formData.businessPeriodEnd || businessPeriodParts.end
  const businessTypeOptions = useMemo(() => {
    const values = new Set<string>(productClasses)
    const current = form.formData.businessType.trim()
    if (current) values.add(current)
    return Array.from(values)
  }, [form.formData.businessType, productClasses])

  const handleCustomerSelection = (customerCode: string) => {
    const customer = customers.find((item) => item.id === customerCode) ?? null
    setForm((current) => ({
      ...current,
      customerCode: customer?.id ?? "",
      customer: customer?.name ?? "",
      opportunityCode: "",
      opportunity: "",
      rfpAnalysisId: "",
      formData: {
        ...current.formData,
        customerType: customer?.category ?? "",
        customerName: customer?.name ?? "",
        businessType: "",
        projectName: "",
        businessOverview: "",
      },
    }))
  }

  const handleOpportunitySelection = (opportunityCode: string) => {
    const opportunity = opportunities.find((item) => item.id === opportunityCode) ?? null
    const relatedCustomer = opportunity ? customers.find((item) => item.id === opportunity.customerCode) ?? null : null
    setForm((current) => ({
      ...current,
      customerCode: relatedCustomer?.id ?? current.customerCode,
      customer: relatedCustomer?.name ?? current.customer,
      opportunityCode: opportunity?.id ?? "",
      opportunity: opportunity?.name ?? "",
      rfpAnalysisId: "",
      formData: {
        ...current.formData,
        customerType: relatedCustomer?.category ?? current.formData.customerType,
        customerName: relatedCustomer?.name ?? current.formData.customerName,
        businessType: opportunity?.product ?? "",
        projectName: opportunity?.name ?? "",
        businessOverview: opportunity?.issue ?? "",
      },
    }))
  }

  useEffect(() => {
    let cancelled = false
    void loadBackendFindingData()
      .then((data) => {
        if (cancelled) return
        setCustomers(data.customers)
        setOpportunities(data.opportunities)
      })
      .catch(() => {
        if (cancelled) return
        setCustomers([])
        setOpportunities([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void adminApi
      .getProducts()
      .then((response) => {
        if (cancelled) return
        const classes = Array.isArray(response.data)
          ? Array.from(
              new Set(
                response.data
                  .map((item) => item.productClass?.trim() ?? "")
                  .filter((value): value is string => value !== ""),
              ),
            ).sort((a, b) => a.localeCompare(b))
          : []
        setProductClasses(classes)
      })
      .catch(() => {
        if (cancelled) return
        setProductClasses([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const applyRecord = (record: PrbRecord | null, draftStatus: PrbStatus | null = null) => {
      if (!record || cancelled) return
      setForm(cloneForm(record))
      setStatus(draftStatus ?? record.status)
      setSourcePrb(record)
      setRevisionHistory(getPrbRevisionHistory(record.id))
    }

    const sync = () => {
      if (prbId) {
        const record = getPrbById(prbId)
        applyRecord(record, null)
        return
      }

      if (cloneFromId) {
        const record = getPrbById(cloneFromId)
        applyRecord(record, "작성 중")
      }
    }

    void loadBackendPrbs()
      .then((records) => {
        if (cancelled) return
        if (prbId) {
          void loadBackendPrbDetailById(prbId)
            .then((record) => {
              applyRecord(record, null)
            })
            .catch(() => {
              const record = records.find((item) => item.id === prbId) ?? null
              applyRecord(record, null)
            })
          return
        }

        if (cloneFromId) {
          void loadBackendPrbDetailById(cloneFromId)
            .then((record) => {
              applyRecord(record, "작성 중")
            })
            .catch(() => {
              const record = records.find((item) => item.id === cloneFromId) ?? null
              applyRecord(record, "작성 중")
            })
        }
      })
      .catch(() => undefined)

    sync()
    const unsubscribe = subscribePrbUpdates(sync)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [cloneFromId, prbId])

  useEffect(() => {
    let cancelled = false

    if (!prbId) {
      setBackendHistoryRecords([])
      setSelectedHistoryId(null)
      setSelectedHistoryDetail(null)
      return () => {
        cancelled = true
      }
    }

    setBackendHistoryRecords([])
    setSelectedHistoryId(null)
    setSelectedHistoryDetail(null)

    void loadBackendPrbHistoryRecords(prbId)
      .then((records) => {
        if (!cancelled) {
          setBackendHistoryRecords(
            records
              .filter((record): record is BackendPrbHistoryListItem & { historyId: number; version: number } =>
                typeof record.historyId === "number" && typeof record.version === "number",
              )
              .sort((a, b) => (b.version ?? 0) - (a.version ?? 0)),
          )
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBackendHistoryRecords([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [prbId])

  useEffect(() => {
    let cancelled = false

    if (selectedHistoryId == null) {
      setSelectedHistoryDetail(null)
      if (sourcePrb) {
        setForm(cloneForm(sourcePrb))
        setStatus(sourcePrb.status)
      }
      return () => {
        cancelled = true
      }
    }

    void loadBackendPrbHistoryRecord(selectedHistoryId)
      .then((record) => {
        if (!cancelled) {
          setSelectedHistoryDetail(record)
          setForm(cloneForm(record))
          setStatus(record.status)
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
  }, [selectedHistoryId, sourcePrb])

  useEffect(() => {
    if (!users.length) return

    setForm((current) => {
      const next = { ...current, formData: { ...current.formData } }
      const nextReviewer = resolveUserId(next.reviewer, users)
      const nextSalesRep = resolveUserId(next.salesRepresentativeId || next.formData.salesLeader, users)
      let changed = false

      if (nextReviewer && nextReviewer !== next.reviewer) {
        next.reviewer = nextReviewer
        next.nextApprover = nextReviewer
        changed = true
      }

      if (nextSalesRep && nextSalesRep !== next.salesRepresentativeId) {
        next.salesRepresentativeId = nextSalesRep
        changed = true
      }

      if (!changed) return current
      return next
    })
  }, [users])

  // 챗봇 create_draft action (예: "X 사업기회 견적서랑 RFP 분석으로 PRB 보고서 작성해줘")
  // 으로 페이지가 열렸을 때 query param 의 chatbotPrefill_<slot> 값을 폼에 자동 반영.
  const { values: chatbotPrefillValues, hasPrefill: hasChatbotPrefill, clear: clearChatbotPrefill } = useChatbotPrefill()
  const prefillAppliedRef = useRef(false)

  useEffect(() => {
    if (!hasChatbotPrefill) return
    if (prefillAppliedRef.current) return
    if (prbId || cloneFromId) return  // 기존 PRB 로드 시 prefill 비활성
    prefillAppliedRef.current = true

    const slot = chatbotPrefillValues
    const summary: string[] = []
    const safeSet = (label: string, key: string, mapper?: (v: string) => void) => {
      if (!slot[key]) return
      if (mapper) mapper(slot[key])
      summary.push(`${label}: ${slot[key].slice(0, 30)}`)
    }

    // top-level 필드
    setForm((current) => {
      const next = { ...current, formData: { ...current.formData } }
      if (slot.customer_name) {
        next.customer = slot.customer_name
      }
      if (slot.opportunity_code) {
        next.opportunityCode = slot.opportunity_code
      }
      if (slot.opportunity_name) {
        next.opportunity = slot.opportunity_name
      }
      if (slot.submission_deadline) {
        next.proposalDeadline = slot.submission_deadline
        next.formData.proposalDeadlineDate = slot.submission_deadline
      }
      // formData 필드들
      if (slot.title) next.formData.projectName = slot.title
      if (slot.background) next.formData.businessOverview = slot.background
      if (slot.expected_win_rate) next.formData.expectedOrderRate = slot.expected_win_rate
      if (slot.sales_representative) next.formData.salesLeader = slot.sales_representative
      if (slot.decision_target) next.formData.decisionTarget = slot.decision_target
      if (slot.risk_summary) next.formData.riskSummary = slot.risk_summary
      if (slot.recommendation) next.formData.recommendation = slot.recommendation
      if (slot.decision_options) next.formData.decisionOptions = slot.decision_options
      if (slot.estimated_revenue) next.formData.estimatedRevenue = slot.estimated_revenue
      if (slot.estimated_profit_rate) next.formData.estimatedProfitRate = slot.estimated_profit_rate
      return next
    })

    // 슬롯 키별 요약
    for (const [k, v] of Object.entries(slot)) {
      if (v) summary.push(`${k}: ${String(v).slice(0, 20)}`)
    }

    if (summary.length > 0) {
      toast({
        title: "챗봇이 PRB 보고서 초안 슬롯 prefill",
        description: `${summary.slice(0, 6).join(" / ")}${summary.length > 6 ? " 외 " + (summary.length - 6) + "개" : ""} — 확인 후 저장하세요.`,
      })
    }
    const id = window.setTimeout(() => clearChatbotPrefill(), 100)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChatbotPrefill])

  const updateFormData = (key: string, value: string) => {
    setForm((current) => ({
      ...current,
      formData: { ...current.formData, [key]: value },
    }))
  }

  const updateRows = (
    key: keyof Pick<PrbFormState, "personnelItems" | "productCostItems" | "purchaseServiceItems" | "purchaseProductItems" | "expenseItems">,
    id: string,
    field: keyof PrbLineItem,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }))
  }

  const handleCustomerChange = (customerCode: string) => {
    handleCustomerSelection(customerCode)
  }

  const handleOpportunityChange = (opportunityCode: string) => {
    handleOpportunitySelection(opportunityCode)
  }

  const persist = async (nextStatus: PrbStatus) => {
    const firstApprovalPending = nextStatus === "검토 중"
    const businessPeriod = [form.formData.businessPeriodStart || businessPeriodStart, form.formData.businessPeriodEnd || businessPeriodEnd]
      .filter(Boolean)
      .join(" ~ ")
    if (!selectedReviewerId) {
      setPopupMessage("검토자를 선택하지 않았습니다. 검토자를 다시 선택해 주십시오.")
      return
    }
    const approvalSteps: PrbApprovalStep[] = [
      { key: "author", label: "작성자", assignee: "영업대표", status: "completed", completedAt: today() },
      { key: "firstApproval", label: "1차 승인", assignee: "팀장", status: firstApprovalPending ? "pending" : "waiting" },
      { key: "secondApproval", label: "2차 승인", assignee: "본부장", status: "waiting" },
      { key: "deploy", label: "배포", assignee: "권한 보유자", status: "waiting" },
      { key: "share", label: "공유", assignee: "권한 보유자", status: "waiting" },
    ]
    const saved = await saveBackendPrb({
      id: cloneFromId ? undefined : prbId,
      customerCode: form.customerCode,
      customer: form.customer || form.formData.customerName,
      opportunityCode: form.opportunityCode,
      opportunity: form.opportunity || form.formData.projectName,
      rfpAnalysisId: form.rfpAnalysisId,
      salesRepresentativeId: form.salesRepresentativeId,
      reviewerId: selectedReviewerId,
      author: currentUser.name,
      reviewer: form.reviewer,
      nextApprover: nextStatus === "검토 중" ? "팀장" : form.nextApprover,
      deployOwner: "배포 권한 보유자",
      shareOwner: "공유 권한 보유자",
      proposalDeadline: form.formData.proposalDeadlineDate,
      createdDate: form.formData.reportDate || today(),
      status: nextStatus,
      notificationsSent: nextStatus === "검토 중",
      approvalSteps,
      revisionGroupId: sourcePrb?.revisionGroupId ?? "",
      revisionNumber: sourcePrb && cloneFromId ? sourcePrb.revisionNumber + 1 : sourcePrb?.revisionNumber ?? 1,
      parentPrbId: cloneFromId ?? undefined,
      formData: {
        ...form.formData,
        businessPeriod,
      },
      salesItems: [],
      expenseItems: [],
      purchaseItems: [...form.purchaseServiceItems, ...form.purchaseProductItems],
      productItems: form.productCostItems,
      personnelItems: form.personnelItems,
      indirectItems: form.expenseItems,
      generalItems: [],
      approvalLines: [
        { role: "영업대표", name: form.formData.salesLeader || currentUser.name },
        { role: "팀장", name: "팀장" },
        { role: "본부장", name: "본부장" },
        { role: "배포", name: "권한 보유자" },
        { role: "공유", name: "권한 보유자" },
      ],
      attendeeOpinions: [form.formData.salesOpinion],
      version: "v1.0",
    })
    setSourcePrb(saved)
    setForm(cloneForm(saved))
    setStatus(saved.status)
    setSelectedHistoryId(null)
    setSelectedHistoryDetail(null)
    setRevisionHistory(getPrbRevisionHistory(saved.id))
    void loadBackendPrbHistoryRecords(saved.id)
      .then((records) => {
        setBackendHistoryRecords(
          records
            .filter((record): record is BackendPrbHistoryListItem & { historyId: number; version: number } =>
              typeof record.historyId === "number" && typeof record.version === "number",
            )
            .sort((a, b) => (b.version ?? 0) - (a.version ?? 0)),
        )
      })
      .catch(() => undefined)
    return saved
  }

  const handleDraft = async () => {
    try {
      if (prbId && sourcePrb?.status === "승인") {
        router.push(`/bid/new/prb?cloneFrom=${prbId}`)
        return
      }

      const saved = await persist("작성 중")
      router.push(`/bid/prb/${saved.id}`)
    } catch (error) {
      toast({
        title: "PRB 저장 실패",
        description: error instanceof Error ? error.message : "PRB를 저장하지 못했습니다.",
      })
    }
  }

  const handleComplete = async () => {
    try {
      const requiredSelections: Array<{ key: keyof Pick<PrbFormState, "customerCode" | "opportunityCode">; label: string }> = [
        { key: "customerCode", label: "고객사명(코드)" },
        { key: "opportunityCode", label: "사업기회(코드)" },
      ]

      const missing = requiredSelections.find((item) => !form[item.key])
      if (missing) {
        setPopupMessage(`${missing.label}이 선택되지 않았습니다. 선택 후 다시 시도해주십시오.`)
        return
      }

      const saved = await persist("검토 중")
      notifyPrbApprovalRequested({
        requester: currentUser.name,
        nextApprover: "팀장",
        prbId: saved.id,
        opportunity: form.opportunity || form.formData.projectName,
      })
      router.push(`/bid/prb/${saved.id}`)
    } catch (error) {
      toast({
        title: "PRB 결재 상신 실패",
        description: error instanceof Error ? error.message : "PRB를 저장하지 못했습니다.",
      })
    }
  }

  const handleDelete = async () => {
    if (!prbId) return

    try {
      await deleteBackendPrb(prbId)
      toast({
        title: "PRB 삭제 완료",
        description: "PRB 보고서가 삭제되었습니다.",
      })
      setIsDeleteOpen(false)
      router.push("/bid")
    } catch (error) {
      const message = error instanceof Error ? error.message : "PRB 보고서를 삭제하지 못했습니다."
      toast({
        title: "PRB 삭제 실패",
        description: message,
      })
    }
  }

  const pendingApprovalStep = sourcePrb?.approvalSteps.find((step) => step.status === "pending") ?? null
  const currentApprovalStepIndex = sourcePrb?.approvalSteps.findIndex((step) => step.status === "pending") ?? -1
  const activeApprovalStep =
    currentApprovalStepIndex !== undefined && currentApprovalStepIndex >= 0
      ? sourcePrb?.approvalSteps[currentApprovalStepIndex] ?? null
      : sourcePrb?.approvalSteps[sourcePrb.approvalSteps.length - 1] ?? null
  const prbApprovalOverallStatus =
    sourcePrb?.status === "승인"
      ? "승인완료"
      : pendingApprovalStep
        ? "진행중"
        : sourcePrb?.status ?? "작성 중"
  const workflowStatus = sourcePrb?.workflowStatus ?? (status === "작성 중" ? "결재 대기" : status === "검토 중" ? "결재중" : status === "승인" ? "승인 완료" : status === "반려" ? "반려" : "결재 대기")
  const workflowId = sourcePrb?.workflowId ?? null

  useEffect(() => {
    if (workflowId && detailTab === "approval") {
      setDetailTab("document")
    }
  }, [detailTab, workflowId])

  const canActOnApprovalStep = Boolean(pendingApprovalStep && prbId)
  const prbHistoryRows = backendHistoryRecords.map((item) => ({
    key: `backend:${item.historyId}`,
    historyId: item.historyId,
    versionLabel: `v${item.version ?? ""}`,
    documentDate: (item.prbDate ?? item.createdAt ?? "").slice(0, 10),
    documentCode: item.prbCode ?? String(item.historyId ?? ""),
  }))

  const handleApproveStep = () => {
    if (!prbId || !pendingApprovalStep) return

    const updated = approvePrbStep(prbId, currentUser.name)
    if (!updated) return

    const newlyPending = updated.approvalSteps.find((step) => step.status === "pending")
    if (pendingApprovalStep.key === "secondApproval") {
      notifyPrbApprovalRequested({
        requester: updated.author,
        nextApprover: updated.deployOwner,
        prbId: updated.id,
        opportunity: updated.opportunity,
        title: "PRB 등록 완료",
        message: `${updated.author}이 작성한 PRB 보고서가 등록되었습니다. 확인하여 주십시오.`,
      })
    } else if (newlyPending?.key === "secondApproval") {
      notifyPrbApprovalRequested({
        requester: updated.author,
        nextApprover: "본부장",
        prbId: updated.id,
        opportunity: updated.opportunity,
      })
    } else if (newlyPending?.key === "share") {
      notifyPrbApprovalRequested({
        requester: updated.author,
        nextApprover: updated.shareOwner,
        prbId: updated.id,
        opportunity: updated.opportunity,
        title: "PRB 공유 확인",
        message: `${updated.author}이 작성한 PRB 보고서가 등록되었습니다. 확인하여 주십시오.`,
      })
    }

    setSourcePrb(updated)
    setStatus(updated.status)
    setRevisionHistory(getPrbRevisionHistory(updated.id))
  }

  const reportTable = (
    <div className="rounded-md border border-r-0">
      <table className="w-full table-auto border-collapse text-sm [&_td]:border [&_th]:border [&_td]:whitespace-normal [&_th]:whitespace-normal">
        <tbody>
          <tr>
            <th colSpan={8} className="bg-white px-3 py-4 text-center text-xl font-bold">
              PRB 보고서
            </th>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2">작성일자</th>
            <td className="px-1 py-1"><FieldInput type="date" value={form.formData.reportDate} onChange={(value) => updateFormData("reportDate", value)} readOnly /></td>
            <th className="bg-slate-50 px-3 py-2">PRB 일자</th>
            <td className="px-1 py-1"><FieldInput type="date" value={form.formData.prbDate} onChange={(value) => updateFormData("prbDate", value)} /></td>
            <th className="bg-slate-50 px-3 py-2">관리번호</th>
            <td className="px-1 py-1"><FieldInput value={form.formData.controlNumber} onChange={(value) => updateFormData("controlNumber", value)} readOnly /></td>
            <th className="bg-slate-50 px-3 py-2">검토자</th>
            <td className="px-2 py-1">
              <UserIdPicker
                value={selectedReviewerId}
                users={users}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    reviewer: value,
                    nextApprover: value,
                  }))
                }
                placeholder="검토자를 선택해주세요."
              />
            </td>
          </tr>

          <SectionRow title="1. 사업 정보" />
          <tr>
            <th className="bg-slate-50 px-3 py-2 whitespace-nowrap min-w-[96px]">고객 구분</th>
            <td colSpan={3} className="px-1 py-1">
              <Select value={form.formData.customerType} onValueChange={(value) => updateFormData("customerType", value)}>
                <SelectTrigger className="w-full min-w-0 border-0 shadow-none focus:ring-0">
                  <SelectValue placeholder="고객 구분 선택" />
                </SelectTrigger>
                <SelectContent>
                  {customerTypeOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </td>
            <th className="bg-slate-50 px-3 py-2 whitespace-nowrap min-w-[96px]">사업 구분</th>
            <td colSpan={3} className="px-1 py-1">
              <div className="w-full">
                <Select value={form.formData.businessType} onValueChange={(value) => updateFormData("businessType", value)}>
                  <SelectTrigger className="w-full min-w-0 border-0 shadow-none focus:ring-0">
                    <SelectValue placeholder="제품분류 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessTypeOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </td>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2 whitespace-nowrap min-w-[96px]">고객명</th>
            <td colSpan={3} className="px-1 py-1">
              <Select value={form.customerCode} onValueChange={handleCustomerChange}>
                <SelectTrigger className="w-full min-w-0 border-0 shadow-none focus:ring-0">
                  <SelectValue placeholder="고객사 선택" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name} ({item.id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </td>
            <th className="bg-slate-50 px-3 py-2 whitespace-nowrap min-w-[96px]">사업명</th>
            <td colSpan={3} className="px-1 py-1">
              <Select value={form.opportunityCode} onValueChange={handleOpportunityChange}>
                <SelectTrigger className="w-full min-w-0 border-0 shadow-none focus:ring-0">
                  <SelectValue placeholder="사업기회 선택" />
                </SelectTrigger>
                <SelectContent>
                  {opportunities
                    .filter((item) => !form.customerCode || item.customerCode === form.customerCode)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name} ({item.id})</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </td>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2 whitespace-nowrap min-w-[96px]">사업 기간</th>
            <td colSpan={3} className="px-1 py-1">
              <div className="flex items-center gap-2">
                <FieldInput
                  type="date"
                  value={businessPeriodStart}
                  onChange={(value) => updateFormData("businessPeriodStart", value)}
                  className="w-full min-w-0"
                />
                <span className="shrink-0 text-sm text-muted-foreground">~</span>
                <FieldInput
                  type="date"
                  value={businessPeriodEnd}
                  onChange={(value) => updateFormData("businessPeriodEnd", value)}
                  className="w-full min-w-0"
                />
              </div>
            </td>
            <th className="bg-slate-50 px-3 py-2 whitespace-nowrap min-w-[96px]">유지보수</th>
            <td colSpan={3} className="px-1 py-1"><FieldInput value={form.formData.maintenance} onChange={(value) => updateFormData("maintenance", value)} /></td>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2 whitespace-nowrap min-w-[96px]">사업 개요</th>
            <td colSpan={7} className="px-1 py-1"><FieldInput value={form.formData.businessOverview} onChange={(value) => updateFormData("businessOverview", value)} multiline /></td>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2 whitespace-nowrap min-w-[96px]">영업대표</th>
            <td colSpan={3} className="px-1 py-1">
              <UserIdPicker
                value={form.salesRepresentativeId}
                users={users}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    salesRepresentativeId: value,
                    formData: {
                      ...current.formData,
                      salesLeader: users.find((user) => user.id === value)?.name ?? "",
                    },
                  }))
                }
                placeholder="영업대표를 선택해주세요."
              />
            </td>
            <th className="bg-slate-50 px-3 py-2 whitespace-nowrap min-w-[96px]">담당부서</th>
            <td colSpan={3} className="px-1 py-1">
              <UserIdPicker
                value={form.formData.ownerDepartment}
                users={users}
                onValueChange={(value) => updateFormData("ownerDepartment", value)}
                placeholder="담당부서를 선택해주세요."
              />
            </td>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2 whitespace-nowrap min-w-[96px]">입찰 구분</th>
            <td colSpan={7} className="px-1 py-1">
              <Select value={form.formData.bidType} onValueChange={(value) => updateFormData("bidType", value)}>
                <SelectTrigger className="w-full min-w-0 border-0 shadow-none focus:ring-0">
                  <SelectValue placeholder="입찰 구분 선택" />
                </SelectTrigger>
                <SelectContent>
                  {bidTypeOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </td>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2 whitespace-nowrap min-w-[96px]">사전 규격 공고일</th>
            <td colSpan={3} className="px-1 py-1"><FieldInput type="date" value={form.formData.preliminaryNoticeDate} onChange={(value) => updateFormData("preliminaryNoticeDate", value)} /></td>
            <th className="bg-slate-50 px-3 py-2 whitespace-nowrap min-w-[96px]">정식 공고 공고일</th>
            <td colSpan={3} className="px-1 py-1"><FieldInput type="date" value={form.formData.officialNoticeDate} onChange={(value) => updateFormData("officialNoticeDate", value)} /></td>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2 whitespace-nowrap min-w-[96px]">가격 투찰일</th>
            <td colSpan={3} className="px-1 py-1"><FieldInput type="date" value={form.formData.priceBidDate} onChange={(value) => updateFormData("priceBidDate", value)} /></td>
            <th className="bg-slate-50 px-3 py-2 whitespace-nowrap min-w-[96px]">제안서 마감일</th>
            <td colSpan={3} className="px-1 py-1"><FieldInput type="date" value={form.formData.proposalDeadlineDate} onChange={(value) => updateFormData("proposalDeadlineDate", value)} /></td>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2 whitespace-nowrap min-w-[96px]">제안 발표일</th>
            <td colSpan={3} className="px-1 py-1"><FieldInput type="date" value={form.formData.proposalPresentationDate} onChange={(value) => updateFormData("proposalPresentationDate", value)} /></td>
            <th className="bg-slate-50 px-3 py-2 whitespace-nowrap min-w-[96px]">기술 : 가격 평가 비율</th>
            <td colSpan={3} className="px-1 py-1">
              <div className="flex items-center gap-2">
                <FieldInput
                  value={evaluationRatioParts.technical}
                  onChange={(value) => {
                    const next = `${value.trim()} : ${evaluationRatioParts.price.trim()}`.trim()
                    updateFormData("evaluationRatio", next.replace(/^\s*:\s*$/, ""))
                  }}
                  className="flex-1"
                  placeholder="기술 비율"
                />
                <span className="shrink-0 px-1 text-sm font-medium text-muted-foreground">:</span>
                <FieldInput
                  value={evaluationRatioParts.price}
                  onChange={(value) => {
                    const next = `${evaluationRatioParts.technical.trim()} : ${value.trim()}`.trim()
                    updateFormData("evaluationRatio", next.replace(/^\s*:\s*$/, ""))
                  }}
                  className="flex-1"
                  placeholder="가격 평가 비율"
                />
              </div>
            </td>
          </tr>

          <SectionRow title="2. 손익 정보(단위 : 원, VAT별도)" />
          <tr>
            <th rowSpan={2} colSpan={2} className="bg-slate-50 px-3 py-2 text-center">사업 금액</th>
            <th className="bg-slate-50 px-3 py-2">전체</th>
            <td colSpan={2} className="px-1 py-1"><FieldInput value={form.formData.totalBusinessAmount} onChange={(value) => updateFormData("totalBusinessAmount", value)} className="text-right" /></td>
            <th className="bg-slate-50 px-3 py-2">당사</th>
            <td colSpan={2} className="px-1 py-1"><FieldInput value={form.formData.companyBusinessAmount} onChange={(value) => updateFormData("companyBusinessAmount", value)} className="text-right" /></td>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2">예상 수주율</th>
            <td colSpan={2} className="px-1 py-1"><FieldInput value={form.formData.expectedOrderRate} onChange={(value) => updateFormData("expectedOrderRate", value)} className="text-center" /></td>
            <th className="bg-slate-200 px-3 py-2 font-semibold">추정 매출액</th>
            <td colSpan={2} className="bg-slate-200 px-2 py-1 text-right font-semibold">-</td>
          </tr>
          <tr>
            <th colSpan={2} className="bg-slate-300 px-3 py-2 font-semibold">추정 영업 이익</th>
            <td colSpan={2} className="bg-slate-300 px-2 py-1 text-right font-semibold">-</td>
            <th colSpan={2} className="bg-slate-300 px-3 py-2 font-semibold">추정 이익율</th>
            <td colSpan={2} className="bg-slate-300 px-2 py-1 text-center font-semibold">#DIV/0!</td>
          </tr>
          <tr>
            <th colSpan={5} className="bg-slate-50 px-3 py-2">구분</th>
            <th colSpan={2} className="bg-slate-50 px-3 py-2">금액</th>
            <th className="bg-slate-50 px-3 py-2">비고</th>
          </tr>
          {[
            { label: "합계", key: "totalCost" },
            { label: "3. 인건비", key: "laborCost" },
            { label: "4. 제품 원가", key: "productCost" },
            { label: "5. 매입", key: "purchaseCost" },
            { label: "6. 제경비", key: "expenseCost" },
            { label: "7. 간접비", key: "indirectCost" },
          ].map((item, index) => (
            <tr key={item.key}>
              {index === 0 && (
                <td rowSpan={6} colSpan={2} className="bg-slate-50 px-2 py-1 text-center align-middle">비용</td>
              )}
              <td colSpan={3} className={`px-2 py-1 text-center ${index === 0 ? "font-semibold" : ""}`}>{item.label}</td>
              <td colSpan={2} className="px-2 py-1 text-right">-</td>
              <td className="px-2 py-1"></td>
            </tr>
          ))}

          <SectionRow title="3. 인건비(단위 : 원, VAT별도)" />
          <tr>
            <th className="bg-slate-50 px-3 py-2">구분</th>
            <th className="bg-slate-50 px-3 py-2">등급</th>
            <th className="bg-slate-50 px-3 py-2">투입량</th>
            <th className="bg-slate-50 px-3 py-2">투입 기간</th>
            <th className="bg-slate-50 px-3 py-2">기준 금액</th>
            <th className="bg-slate-50 px-3 py-2">금액</th>
            <th colSpan={2} className="bg-slate-50 px-3 py-2">비고</th>
          </tr>
          <tr>
            <td colSpan={2} className="bg-slate-50 px-2 py-1 text-center font-semibold">합계</td>
            <td className="px-2 py-1 text-center">-</td>
            <td></td>
            <td></td>
            <td className="px-4 py-1 text-right">-</td>
            <td colSpan={2}></td>
          </tr>
          {form.personnelItems.map((item, index) => {
            const isResidentStart = index === 0
            const isNonResidentStart = index === 5
            const fixedRate = personnelRateMap[item.item ?? ""] ?? ""
            const isSubtotal = item.item === "소계"

            return (
              <tr key={item.id}>
                {(isResidentStart || isNonResidentStart) && (
                  <td rowSpan={5} className="bg-slate-50 px-2 py-1 text-center align-middle">
                    {item.category}
                  </td>
                )}
                <td className="px-2 py-1 text-center">{item.item}</td>
                <td className="px-1 py-1">
                  <FieldInput value={item.value ?? ""} onChange={(value) => updateRows("personnelItems", item.id, "value", value)} className="text-center" />
                </td>
                <td className="px-1 py-1">
                  <FieldInput value={isSubtotal ? "" : item.category === "비상주" && !isSubtotal ? "" : item.note ?? ""} onChange={(value) => updateRows("personnelItems", item.id, "note", value)} className="text-center" />
                </td>
                <td className="px-2 py-1 text-right">{fixedRate}</td>
                <td className="px-1 py-1">
                  <FieldInput value={item.amount ?? ""} onChange={(value) => updateRows("personnelItems", item.id, "amount", value)} className="text-right" />
                </td>
                <td colSpan={2} className="px-2 py-1 text-center">{item.note ?? ""}</td>
              </tr>
            )
          })}

          <SectionRow title="4. 제품 원가(단위 : 원, VAT별도)" />
          <tr>
            <th className="bg-slate-50 px-3 py-2">구분</th>
            <th colSpan={2} className="bg-slate-50 px-3 py-2">모듈명</th>
            <th className="bg-slate-50 px-3 py-2">수량</th>
            <th className="bg-slate-50 px-3 py-2">List Price</th>
            <th colSpan={3} className="bg-slate-50 px-3 py-2">제품 원가(LP x 2%)</th>
          </tr>
          {form.productCostItems.map((item) => (
            <tr key={item.id}>
              <td className="px-2 py-1"></td>
              <td colSpan={2} className="px-1 py-1"><FieldInput value={item.item ?? ""} onChange={(value) => updateRows("productCostItems", item.id, "item", value)} /></td>
              <td className="px-1 py-1"><FieldInput value={item.value ?? ""} onChange={(value) => updateRows("productCostItems", item.id, "value", value)} /></td>
              <td className="px-1 py-1"><FieldInput value={item.note ?? ""} onChange={(value) => updateRows("productCostItems", item.id, "note", value)} /></td>
              <td colSpan={3} className="px-1 py-1"><FieldInput value={item.amount ?? ""} onChange={(value) => updateRows("productCostItems", item.id, "amount", value)} /></td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} className="bg-slate-50 px-2 py-1 text-center font-semibold">합계</td>
            <td className="px-2 py-1 text-center">-</td>
            <td colSpan={3} className="px-2 py-1 text-center">-</td>
          </tr>

          <SectionRow title="5. 매입(단위 : 원, VAT별도)" />
          <tr>
            <th className="bg-slate-50 px-3 py-2">구분</th>
            <th className="bg-slate-50 px-3 py-2">등급</th>
            <th className="bg-slate-50 px-3 py-2">투입량</th>
            <th className="bg-slate-50 px-3 py-2">투입 기간</th>
            <th className="bg-slate-50 px-3 py-2">기준 금액</th>
            <th className="bg-slate-50 px-3 py-2">금액</th>
            <th colSpan={2} className="bg-slate-50 px-3 py-2">비고</th>
          </tr>
          <tr>
            <td colSpan={5} className="bg-slate-50 px-2 py-1 text-center font-semibold">합계</td>
            <td className="px-2 py-1 text-center">-</td>
            <td colSpan={2}></td>
          </tr>
          {form.purchaseServiceItems.map((item, index) => (
            <tr key={item.id}>
              {index === 0 && (
                <td rowSpan={5} className="bg-slate-50 px-2 py-1 text-center align-middle">{item.category}</td>
              )}
              <td className="px-2 py-1 text-center">{item.item}</td>
              <td className="px-1 py-1"><FieldInput value={item.value ?? ""} onChange={(value) => updateRows("purchaseServiceItems", item.id, "value", value)} /></td>
              <td className="px-1 py-1"><FieldInput value={item.note ?? ""} onChange={(value) => updateRows("purchaseServiceItems", item.id, "note", value)} /></td>
              <td className="px-1 py-1"><FieldInput value={item.amount ?? ""} onChange={(value) => updateRows("purchaseServiceItems", item.id, "amount", value)} className="text-right" /></td>
              <td className="px-2 py-1 text-right">{item.item === "소계" ? "" : "-"}</td>
              <td colSpan={2} className="px-1 py-1"><FieldInput value={item.note ?? ""} onChange={(value) => updateRows("purchaseServiceItems", item.id, "note", value)} /></td>
            </tr>
          ))}
          <tr>
            <td rowSpan={8} className="bg-slate-50 px-2 py-1 text-center align-middle">제품</td>
            <th colSpan={2} className="bg-slate-50 px-3 py-2">업체명</th>
            <th colSpan={2} className="bg-slate-50 px-3 py-2">제품명</th>
            <th className="bg-slate-50 px-3 py-2">수량</th>
            <th className="bg-slate-50 px-3 py-2">금액</th>
            <th className="bg-slate-50 px-3 py-2">비고</th>
          </tr>
          {form.purchaseProductItems.map((item) => (
            <tr key={item.id}>
              <td colSpan={2} className="px-1 py-1"><FieldInput value={item.value ?? ""} onChange={(value) => updateRows("purchaseProductItems", item.id, "value", value)} /></td>
              <td colSpan={2} className="px-1 py-1"><FieldInput value={item.item ?? ""} onChange={(value) => updateRows("purchaseProductItems", item.id, "item", value)} /></td>
              <td className="px-1 py-1"><FieldInput value={item.note ?? ""} onChange={(value) => updateRows("purchaseProductItems", item.id, "note", value)} /></td>
              <td className="px-1 py-1"><FieldInput value={item.amount ?? ""} onChange={(value) => updateRows("purchaseProductItems", item.id, "amount", value)} /></td>
              <td className="px-1 py-1"></td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} className="bg-slate-50 px-2 py-1 text-center font-semibold">소계</td>
            <td colSpan={3}></td>
            <td className="px-2 py-1 text-center">-</td>
            <td></td>
          </tr>

          <SectionRow title="6. 제경비(단위 : 원, VAT별도)" />
          <tr>
            <th colSpan={2} className="bg-slate-50 px-3 py-2">구분</th>
            <th colSpan={2} className="bg-slate-50 px-3 py-2">내역 및 산출 근거</th>
            <th className="bg-slate-50 px-3 py-2">단가</th>
            <th className="bg-slate-50 px-3 py-2">금액</th>
            <th colSpan={2} className="bg-slate-50 px-3 py-2">비고</th>
          </tr>
          <tr>
            <td colSpan={5} className="bg-slate-50 px-2 py-1 text-center font-semibold">합계</td>
            <td className="px-2 py-1 text-center">-</td>
            <td colSpan={2}></td>
          </tr>
          {form.expenseItems.map((item, index) => {
            const showGroup = index === 0 || form.expenseItems[index - 1]?.category !== item.category

            return (
              <tr key={item.id}>
                {showGroup && (
                  <td rowSpan={expenseGroupRowSpans[item.category ?? ""]} className="bg-slate-50 px-2 py-1 text-center align-middle">
                    {item.category}
                  </td>
                )}
                <td className="px-2 py-1 text-center">{item.item}</td>
                <td colSpan={2} className="px-1 py-1"><FieldInput value={item.note ?? ""} onChange={(value) => updateRows("expenseItems", item.id, "note", value)} /></td>
                <td className="px-1 py-1"><FieldInput value={item.value ?? ""} onChange={(value) => updateRows("expenseItems", item.id, "value", value)} /></td>
                <td className="px-1 py-1">
                  {item.item === "소계" ? (
                    <div className="px-2 py-1 text-right">-</div>
                  ) : (
                    <FieldInput value={item.amount ?? ""} onChange={(value) => updateRows("expenseItems", item.id, "amount", value)} />
                  )}
                </td>
                <td colSpan={2} className="px-2 py-1 text-center"></td>
              </tr>
            )
          })}

          <SectionRow title="7. 간접비(단위 : 원, VAT별도)" />
          <tr>
            <th rowSpan={4} className="bg-slate-50 px-3 py-2">간접비</th>
            <th colSpan={2} className="bg-slate-50 px-3 py-2">총 비용 합계</th>
            <td></td>
            <td></td>
            <td className="px-2 py-1 text-right">-</td>
            <td colSpan={2}></td>
          </tr>
          <tr>
            <th colSpan={2} className="bg-slate-50 px-3 py-2">간접비 비율</th>
            <td></td>
            <td></td>
            <td className="px-1 py-1"><FieldInput value={form.formData.indirectRate} onChange={(value) => updateFormData("indirectRate", value)} className="text-center" /></td>
            <td colSpan={2}></td>
          </tr>
          <tr>
            <th colSpan={2} className="bg-slate-50 px-3 py-2">간접비</th>
            <td></td>
            <td></td>
            <td className="px-2 py-1 text-right">-</td>
            <td colSpan={2}></td>
          </tr>
          <tr>
            <th colSpan={2} className="bg-slate-50 px-3 py-2 font-semibold">합계</th>
            <td></td>
            <td></td>
            <td className="px-2 py-1 text-right">-</td>
            <td colSpan={2}></td>
          </tr>

          <SectionRow title="8. 영업대표 의견" />
          <tr>
            <td colSpan={8} className="px-1 py-1">
              <FieldInput value={form.formData.salesOpinion} onChange={(value) => updateFormData("salesOpinion", value)} multiline className="min-h-32" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  return (
    <>
      <Card>
        {!documentOnly && (
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>PRB 보고서</CardTitle>
            </div>
          </CardHeader>
        )}
        <CardContent className="space-y-6 p-4 md:p-6">
          {prbId && !documentOnly ? (
            <>
              <div className="rounded-md bg-muted px-3 py-2 text-sm font-medium">
                {workflowStatus}
              </div>
              <Tabs value={detailTab} onValueChange={setDetailTab} className="space-y-6">
                <TabsList>
                  <TabsTrigger value="document">PRB 보고서</TabsTrigger>
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
                          if (sourcePrb) {
                            setForm(cloneForm(sourcePrb))
                            setStatus(sourcePrb.status)
                          }
                        }}
                      >
                        현재 버전 보기
                      </Button>
                    </div>
                  )}
                  {reportTable}
                  {showWorkflowDetail && !selectedHistoryDetail && sourcePrb?.id != null && (
                    <WorkflowApprovalPanel
                      workflowId={workflowId}
                      status={workflowStatus}
                      targetId={Number(sourcePrb.id)}
                      domainType="PRB"
                      onRefresh={() => {
                        void loadBackendPrbs().then((records) => {
                          const latest = records.find((record) => record.id === prbId) ?? null
                          setSourcePrb(latest)
                          if (latest) {
                            setStatus(latest.status)
                          }
                        })
                      }}
                    />
                  )}
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  <div className="space-y-4">
                    {prbId && sourcePrb?.status === "승인" && (
                      <div className="flex justify-end">
                        <Button size="sm" variant="outline" onClick={() => router.push(`/bid/new/prb?cloneFrom=${prbId}`)}>
                          수정본 등록
                        </Button>
                      </div>
                    )}
                    <div className="rounded-lg border">
                      <table className="w-full table-fixed border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-100 text-center font-semibold">
                            <th className="border-b border-r px-3 py-3">버전</th>
                            <th className="border-b border-r px-3 py-3">PRB 일자</th>
                            <th className="border-b border-r px-3 py-3">PRB 코드</th>
                            <th className="border-b px-3 py-3">보기</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prbHistoryRows.length > 0 ? (
                            prbHistoryRows.map((entry) => (
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
                                아직 변경 이력이 없습니다.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            reportTable
          )}

          {!documentOnly && !readOnly && !selectedHistoryDetail && (
            <div className="flex justify-end gap-2 border-t pt-6">
              <Button variant="outline" asChild>
                <Link href={prbId ? `/bid/prb/${prbId}` : "/bid"}>취소</Link>
              </Button>
              {allowDelete && prbId && (
                <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
                  삭제
                </Button>
              )}
              <Button variant="outline" onClick={handleDraft}>수정</Button>
              <Button variant="secondary" onClick={handleDraft}>임시저장</Button>
              <Button onClick={handleComplete}>완료</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {!documentOnly && (
        <AlertDialog open={Boolean(popupMessage)} onOpenChange={(open) => !open && setPopupMessage("")}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>입력 확인</AlertDialogTitle>
              <AlertDialogDescription>{popupMessage}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setPopupMessage("")}>확인</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {!documentOnly && (
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>PRB 보고서를 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                삭제 후에는 PRB 상세 정보를 다시 확인할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
