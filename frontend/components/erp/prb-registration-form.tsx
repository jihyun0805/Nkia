"use client"

import { useEffect, useMemo, useState } from "react"
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
import { notifyPrbApprovalRequested } from "@/lib/activity-request-workflow"
import {
  approvePrbStep,
  getPrbById,
  getPrbRevisionHistory,
  getRfpAnalyses,
  savePrb,
  subscribePrbUpdates,
  type PrbApprovalStep,
  type PrbLineItem,
  type PrbRecord,
  type PrbStatus,
} from "@/lib/bid-data"
import { currentUser } from "@/lib/current-user"
import { getCustomers, getOpportunities } from "@/lib/finding-data"

type PrbRegistrationFormProps = {
  prbId?: string
  cloneFromId?: string
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
  formData: Record<string, string>
  personnelItems: PrbLineItem[]
  productCostItems: PrbLineItem[]
  purchaseServiceItems: PrbLineItem[]
  purchaseProductItems: PrbLineItem[]
  expenseItems: PrbLineItem[]
}

const reviewerOptions = ["영업팀장", "본부장", "사업본부장"]
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

function today() {
  return new Date().toISOString().slice(0, 10)
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
    reviewer: "본부장",
    nextApprover: "본부장",
    formData: {
      reportDate: today(),
      prbDate: today(),
      controlNumber: "",
      customerType: "",
      businessType: "",
      customerName: "",
      projectName: "",
      businessPeriod: "",
      maintenance: "",
      businessOverview: "",
      salesLeader: currentUser.name,
      salesDepartment: "영업 O팀",
      ownerDepartment: "연구O팀",
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
  className = "",
}: {
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  className?: string
}) {
  if (multiline) {
    return (
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`min-h-20 resize-none border-0 shadow-none focus-visible:ring-0 ${className}`}
      />
    )
  }

  return <Input value={value} onChange={(event) => onChange(event.target.value)} className={`border-0 shadow-none focus-visible:ring-0 ${className}`} />
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

export function PrbRegistrationForm({ prbId, cloneFromId }: PrbRegistrationFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<PrbFormState>(createEmptyForm())
  const [status, setStatus] = useState<PrbStatus>("작성 중")
  const [popupMessage, setPopupMessage] = useState("")
  const [detailTab, setDetailTab] = useState("document")
  const [sourcePrb, setSourcePrb] = useState<PrbRecord | null>(null)
  const [revisionHistory, setRevisionHistory] = useState<PrbRecord[]>([])

  const customers = useMemo(() => getCustomers(), [])
  const opportunities = useMemo(() => getOpportunities(), [])
  const rfpAnalyses = useMemo(() => getRfpAnalyses(), [])

  useEffect(() => {
    const sync = () => {
      if (prbId) {
        const record = getPrbById(prbId)
        if (!record) return
        setForm(cloneForm(record))
        setStatus(record.status)
        setSourcePrb(record)
        setRevisionHistory(getPrbRevisionHistory(record.id))
        return
      }

      if (cloneFromId) {
        const record = getPrbById(cloneFromId)
        if (!record) return
        setForm(cloneForm(record))
        setStatus("작성 중")
        setSourcePrb(record)
        setRevisionHistory(getPrbRevisionHistory(record.id))
      }
    }

    sync()
    return subscribePrbUpdates(sync)
  }, [cloneFromId, prbId])

  const availableRfpAnalyses = rfpAnalyses.filter(
    (item) =>
      (!form.customerCode || item.customerCode === form.customerCode) &&
      (!form.opportunityCode || item.opportunityCode === form.opportunityCode),
  )

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
    const customer = customers.find((item) => item.id === customerCode)
    setForm((current) => ({
      ...current,
      customerCode,
      customer: customer?.name ?? "",
      opportunityCode: "",
      opportunity: "",
      rfpAnalysisId: "",
      formData: {
        ...current.formData,
        customerName: customer?.name ?? "",
      },
    }))
  }

  const handleOpportunityChange = (opportunityCode: string) => {
    const opportunity = opportunities.find((item) => item.id === opportunityCode)
    setForm((current) => ({
      ...current,
      opportunityCode,
      opportunity: opportunity?.name ?? "",
      rfpAnalysisId: "",
      formData: {
        ...current.formData,
        projectName: opportunity?.name ?? "",
      },
    }))
  }

  const handleRfpChange = (rfpAnalysisId: string) => {
    const rfp = rfpAnalyses.find((item) => item.id === rfpAnalysisId)
    setForm((current) => ({
      ...current,
      rfpAnalysisId,
      proposalDeadline: rfp?.dueDate ?? current.proposalDeadline,
      formData: {
        ...current.formData,
        proposalDeadlineDate: rfp?.dueDate ?? current.formData.proposalDeadlineDate,
      },
    }))
  }

  const persist = (nextStatus: PrbStatus) => {
    const firstApprovalPending = nextStatus === "검토 중"
    const approvalSteps: PrbApprovalStep[] = [
      { key: "author", label: "작성자", assignee: "영업대표", status: "completed", completedAt: today() },
      { key: "firstApproval", label: "1차 승인", assignee: "팀장", status: firstApprovalPending ? "pending" : "waiting" },
      { key: "secondApproval", label: "2차 승인", assignee: "본부장", status: "waiting" },
      { key: "deploy", label: "배포", assignee: "권한 보유자", status: "waiting" },
      { key: "share", label: "공유", assignee: "권한 보유자", status: "waiting" },
    ]
    const saved = savePrb({
      id: cloneFromId ? undefined : prbId,
      customerCode: form.customerCode,
      customer: form.customer || form.formData.customerName,
      opportunityCode: form.opportunityCode,
      opportunity: form.opportunity || form.formData.projectName,
      rfpAnalysisId: form.rfpAnalysisId,
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
      formData: form.formData,
      salesItems: [],
      expenseItems: [],
      purchaseItems: [...form.purchaseServiceItems, ...form.purchaseProductItems],
      productItems: form.productCostItems,
      personnelItems: form.personnelItems,
      indirectItems: form.expenseItems,
      generalItems: [],
      approvalLines: [
        { role: "영업대표", name: currentUser.name },
        { role: "팀장", name: "팀장" },
        { role: "본부장", name: "본부장" },
        { role: "배포", name: "권한 보유자" },
        { role: "공유", name: "권한 보유자" },
      ],
      attendeeOpinions: [form.formData.salesOpinion],
      version: "v1.0",
    })

    setStatus(saved.status)
    return saved
  }

  const handleDraft = () => {
    if (prbId && sourcePrb?.status === "승인") {
      router.push(`/bid/new/prb?cloneFrom=${prbId}`)
      return
    }

    const saved = persist("작성 중")
    router.push(`/bid/prb/${saved.id}`)
  }

  const handleComplete = () => {
    const requiredSelections: Array<{ key: keyof Pick<PrbFormState, "customerCode" | "opportunityCode" | "rfpAnalysisId">; label: string }> = [
      { key: "customerCode", label: "고객사명(코드)" },
      { key: "opportunityCode", label: "사업기회(코드)" },
      { key: "rfpAnalysisId", label: "RFP 분석 결과(코드)" },
    ]

    const missing = requiredSelections.find((item) => !form[item.key])
    if (missing) {
      setPopupMessage(`${missing.label}이 선택되지 않았습니다. 선택 후 다시 시도해주십시오.`)
      return
    }

    const saved = persist("검토 중")
    notifyPrbApprovalRequested({
      requester: currentUser.name,
      nextApprover: "팀장",
      prbId: saved.id,
      opportunity: form.opportunity || form.formData.projectName,
    })
    router.push(`/bid/prb/${saved.id}`)
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
  const canActOnApprovalStep = Boolean(pendingApprovalStep && prbId)
  const prbHistoryRows = revisionHistory.map((item) => ({
    id: item.id,
    version: `PRB ${item.revisionNumber}차`,
    changedAt: item.createdDate,
    changedBy: item.author,
    status: item.status,
    summary: item.revisionNumber === 1 ? "PRB 최초 등록" : `PRB ${item.revisionNumber}차 수정본 등록`,
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
    <div className="overflow-x-auto rounded-md border border-r-0">
      <table className="min-w-[1180px] border-collapse text-sm [&_td]:border [&_th]:border">
        <tbody>
          <tr>
            <th colSpan={8} className="bg-white px-3 py-4 text-center text-xl font-bold">
              PRB 보고서
            </th>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2">작성일자</th>
            <td className="px-1 py-1"><FieldInput value={form.formData.reportDate} onChange={(value) => updateFormData("reportDate", value)} /></td>
            <th className="bg-slate-50 px-3 py-2">PRB 일자</th>
            <td className="px-1 py-1"><FieldInput value={form.formData.prbDate} onChange={(value) => updateFormData("prbDate", value)} /></td>
            <th className="bg-slate-50 px-3 py-2">관리번호</th>
            <td className="px-1 py-1"><FieldInput value={form.formData.controlNumber} onChange={(value) => updateFormData("controlNumber", value)} /></td>
            <th className="bg-slate-50 px-3 py-2">검토자</th>
            <td className="px-2 py-1">
              <Select value={form.nextApprover} onValueChange={(value) => setForm((current) => ({ ...current, reviewer: value, nextApprover: value }))}>
                <SelectTrigger className="border-0 shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reviewerOptions.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </td>
          </tr>

          <SectionRow title="1. 사업 정보" />
          <tr>
            <th className="bg-slate-50 px-3 py-2">고객 구분</th>
            <td className="px-2 py-1 text-center">신규</td>
            <td className="px-2 py-1 text-center">기존</td>
            <th className="bg-slate-50 px-3 py-2">사업 구분</th>
            <td className="px-2 py-1 text-center">설치/납품</td>
            <td className="px-2 py-1 text-center">개발</td>
            <td className="px-2 py-1 text-center">SI</td>
            <td className="px-2 py-1 text-center">ITO</td>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2">고객명</th>
            <td colSpan={3} className="px-1 py-1">
              <Select value={form.customerCode} onValueChange={handleCustomerChange}>
                <SelectTrigger className="border-0 shadow-none focus:ring-0">
                  <SelectValue placeholder="고객사 선택" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name} ({item.id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </td>
            <th className="bg-slate-50 px-3 py-2">사업명</th>
            <td colSpan={3} className="px-1 py-1">
              <Select value={form.opportunityCode} onValueChange={handleOpportunityChange}>
                <SelectTrigger className="border-0 shadow-none focus:ring-0">
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
            <th className="bg-slate-50 px-3 py-2">사업 기간</th>
            <td colSpan={3} className="px-1 py-1"><FieldInput value={form.formData.businessPeriod} onChange={(value) => updateFormData("businessPeriod", value)} /></td>
            <th className="bg-slate-50 px-3 py-2">유지보수</th>
            <td colSpan={3} className="px-1 py-1"><FieldInput value={form.formData.maintenance} onChange={(value) => updateFormData("maintenance", value)} /></td>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2">사업 개요</th>
            <td colSpan={7} className="px-1 py-1"><FieldInput value={form.formData.businessOverview} onChange={(value) => updateFormData("businessOverview", value)} multiline /></td>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2">영업대표</th>
            <td className="px-1 py-1"><FieldInput value={form.formData.salesLeader} onChange={(value) => updateFormData("salesLeader", value)} className="text-center" /></td>
            <td colSpan={2} className="px-1 py-1"><FieldInput value={form.formData.salesDepartment} onChange={(value) => updateFormData("salesDepartment", value)} className="text-center" /></td>
            <th className="bg-slate-50 px-3 py-2">담당부서</th>
            <td className="px-1 py-1"><FieldInput value={form.formData.ownerDepartment} onChange={(value) => updateFormData("ownerDepartment", value)} className="text-center" /></td>
            <td colSpan={2} className="px-2 py-1 text-center">{status}</td>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2">입찰 구분</th>
            <td colSpan={2} className="px-2 py-1 text-center">자체 입찰 / 자체 평가</td>
            <td colSpan={2} className="px-2 py-1 text-center">조달 입찰 / 조달 평가</td>
            <td colSpan={3} className="px-2 py-1 text-center">조달 위탁 / 자체 평가</td>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2">사전 규격 공고일</th>
            <td colSpan={3} className="px-1 py-1"><FieldInput value={form.formData.preliminaryNoticeDate} onChange={(value) => updateFormData("preliminaryNoticeDate", value)} /></td>
            <th className="bg-slate-50 px-3 py-2">정식 공고 공고일</th>
            <td colSpan={3} className="px-1 py-1"><FieldInput value={form.formData.officialNoticeDate} onChange={(value) => updateFormData("officialNoticeDate", value)} /></td>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2">가격 투찰일</th>
            <td colSpan={3} className="px-1 py-1"><FieldInput value={form.formData.priceBidDate} onChange={(value) => updateFormData("priceBidDate", value)} /></td>
            <th className="bg-slate-50 px-3 py-2">제안서 마감일</th>
            <td colSpan={3} className="px-1 py-1"><FieldInput value={form.formData.proposalDeadlineDate} onChange={(value) => updateFormData("proposalDeadlineDate", value)} /></td>
          </tr>
          <tr>
            <th className="bg-slate-50 px-3 py-2">제안 발표일</th>
            <td colSpan={3} className="px-1 py-1"><FieldInput value={form.formData.proposalPresentationDate} onChange={(value) => updateFormData("proposalPresentationDate", value)} /></td>
            <th className="bg-slate-50 px-3 py-2">기술 : 가격 평가 비율</th>
            <td colSpan={3} className="px-1 py-1"><FieldInput value={form.formData.evaluationRatio} onChange={(value) => updateFormData("evaluationRatio", value)} /></td>
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
            <td className="px-2 py-1 text-center">-</td>
            <td></td>
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
            <td></td>
            <td className="px-2 py-1 text-center">-</td>
            <td colSpan={2} className="px-2 py-1 text-center">-</td>
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
            <td></td>
            <td className="px-2 py-1 text-center">-</td>
            <td></td>
          </tr>
          {form.purchaseServiceItems.map((item, index) => (
            <tr key={item.id}>
              {index === 0 && (
                <td rowSpan={5} className="bg-slate-50 px-2 py-1 text-center align-middle">{item.category}</td>
              )}
              <td className="px-2 py-1 text-center">{item.item}</td>
              <td className="px-1 py-1"><FieldInput value={item.value ?? ""} onChange={(value) => updateRows("purchaseServiceItems", item.id, "value", value)} /></td>
              <td className="px-1 py-1"><FieldInput value={item.note ?? ""} onChange={(value) => updateRows("purchaseServiceItems", item.id, "note", value)} /></td>
              <td className="px-2 py-1 text-right">{item.item === "소계" ? "" : "-"}</td>
              <td className="px-1 py-1"><FieldInput value={item.amount ?? ""} onChange={(value) => updateRows("purchaseServiceItems", item.id, "amount", value)} className="text-right" /></td>
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
            <td></td>
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
                <td className="px-1 py-1"><FieldInput value={item.amount ?? ""} onChange={(value) => updateRows("expenseItems", item.id, "amount", value)} /></td>
                <td colSpan={2} className="px-2 py-1 text-center">{item.item === "소계" ? "-" : ""}</td>
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
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>PRB 보고서</CardTitle>
            <div className="rounded-md bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">PRB 현황: {status}</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-4 md:p-6">
          {prbId ? (
            <Tabs value={detailTab} onValueChange={setDetailTab} className="space-y-6">
              <TabsList>
                <TabsTrigger value="document">PRB 보고서</TabsTrigger>
                <TabsTrigger value="approval">결재 프로세스</TabsTrigger>
                <TabsTrigger value="history">변경 이력</TabsTrigger>
              </TabsList>

              <TabsContent value="document" className="mt-0 space-y-6">
                {reportTable}
              </TabsContent>

              <TabsContent value="approval" className="mt-0">
                <div className="space-y-6 rounded-lg border p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    {(sourcePrb?.approvalSteps ?? []).map((step, index) => {
                      const isCurrent = index === currentApprovalStepIndex
                      const isDone = currentApprovalStepIndex >= 0 ? index < currentApprovalStepIndex : step.status === "completed"

                      return (
                        <div key={`${step.label}-${index}`} className="flex items-center gap-3">
                          <div
                            className={[
                              "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                              isDone
                                ? "bg-green-100 text-green-700"
                                : isCurrent
                                  ? "bg-amber-100 text-amber-800 ring-2 ring-amber-400"
                                  : "bg-slate-100 text-slate-500",
                            ].join(" ")}
                          >
                            {step.label}
                          </div>
                          {index < (sourcePrb?.approvalSteps.length ?? 0) - 1 && (
                            <span className="text-2xl text-muted-foreground">→</span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>현재 단계</Label>
                      <Input readOnly value={activeApprovalStep?.label ?? "-"} />
                    </div>
                    <div className="space-y-2">
                      <Label>담당자</Label>
                      <Input readOnly value={activeApprovalStep?.assignee ?? "-"} />
                    </div>
                    <div className="space-y-2">
                      <Label>결재 상태</Label>
                      <Input readOnly value={prbApprovalOverallStatus} />
                    </div>
                    <div className="space-y-2">
                      <Label>내부 처리</Label>
                      <Input
                        readOnly
                        value={
                          canActOnApprovalStep
                            ? `${currentUser.name} 님이 현재 단계 승인/확인을 처리할 수 있습니다.`
                            : "현재 처리할 단계가 없거나 담당자만 처리할 수 있습니다."
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      className="bg-primary hover:bg-primary/90"
                      disabled={!canActOnApprovalStep}
                      onClick={handleApproveStep}
                    >
                      {pendingApprovalStep?.key === "deploy"
                        ? "배포 확인"
                        : pendingApprovalStep?.key === "share"
                          ? "공유 확인"
                          : pendingApprovalStep
                            ? `${pendingApprovalStep.label} 승인`
                            : "승인 완료"}
                    </Button>
                  </div>
                </div>
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
                          <th className="border-b border-r px-3 py-3">변경일시</th>
                          <th className="border-b border-r px-3 py-3">변경자</th>
                          <th className="border-b border-r px-3 py-3">상태</th>
                          <th className="border-b border-r px-3 py-3">내용</th>
                          <th className="border-b px-3 py-3">보기</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prbHistoryRows.length > 0 ? (
                          prbHistoryRows.map((entry, index) => (
                            <tr key={`${entry.version}-${entry.changedAt}-${index}`}>
                              <td className="border-r border-t px-3 py-3 text-center">{entry.version}</td>
                              <td className="border-r border-t px-3 py-3 text-center">{entry.changedAt}</td>
                              <td className="border-r border-t px-3 py-3 text-center">{entry.changedBy}</td>
                              <td className="border-r border-t px-3 py-3 text-center">{entry.status}</td>
                              <td className="border-r border-t px-3 py-3">{entry.summary}</td>
                              <td className="border-t px-3 py-3 text-center">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setDetailTab("document")
                                    if (entry.id !== prbId) {
                                      router.push(`/bid/prb/${entry.id}`)
                                    }
                                  }}
                                >
                                  보기
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
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
          ) : (
            reportTable
          )}

          <div className="flex justify-end gap-2 border-t pt-6">
            <Button variant="outline" asChild>
              <Link href={prbId ? `/bid/prb/${prbId}` : "/bid"}>취소</Link>
            </Button>
            <Button variant="outline" onClick={handleDraft}>수정</Button>
            <Button variant="secondary" onClick={handleDraft}>임시저장</Button>
            <Button onClick={handleComplete}>완료</Button>
          </div>
        </CardContent>
      </Card>

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
    </>
  )
}
