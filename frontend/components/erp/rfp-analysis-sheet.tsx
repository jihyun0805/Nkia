"use client"

import type { ComponentProps, ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CustomerAutocomplete } from "@/components/erp/customer-autocomplete"
import { currentUser } from "@/lib/current-user"
import { getBidItem, getRfpAnalysisByRequestId, saveRfpAnalysis, type RfpAnalysisRecord, type RfpAnalysisStatus } from "@/lib/bid-data"
import type { ActivityRequestRecord } from "@/lib/activity-data"
import { getActivityRequests, notifyRfpAnalysisCompleted } from "@/lib/activity-request-workflow"
import { getCustomerByCode, getOpportunitiesByCustomerName, type CustomerRecord } from "@/lib/finding-data"
import { toast } from "@/hooks/use-toast"

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

const businessTypes = ["EMS", "ITSM", "Automation", "WSS"] as const
const proposalTypes = ["자체 제안", "SI 제안"] as const

const blankRequirementRow = (): RequirementRow => ({
  category: "",
  requirementCode: "",
  requirementTitle: "",
  requirementContent: "",
  supportStatus: "O",
  reviewNote: "",
  effort: "",
})

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

type SheetSource = Partial<RfpAnalysisRecord> & Partial<ActivityRequestRecord>

export function RfpAnalysisSheet({ requestId, title, blankMode = false }: RfpAnalysisSheetProps) {
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
  const [requirements, setRequirements] = useState<RequirementRow[]>(
    requestItem?.requirements?.length
      ? requestItem.requirements
      : shouldStartBlank
      ? [blankRequirementRow()]
      : [
          {
            category: "시스템 기능 요구사항",
            requirementCode: "REQ-001",
            requirementTitle: "통합 모니터링",
            requirementContent: "서버, 네트워크, 데이터베이스 및 애플리케이션을 통합 모니터링할 수 있어야 한다.",
            supportStatus: "O",
            reviewNote: "기본 기능으로 제공",
            effort: "0",
          },
          {
            category: "시스템 기능 요구사항",
            requirementCode: "REQ-002",
            requirementTitle: "분산 수집",
            requirementContent: "대규모 환경 확장을 고려한 분산 수집 구조를 지원할 수 있어야 한다.",
            supportStatus: "∆",
            reviewNote: "구성 변경 필요, Proxy 대신 클러스터 분산 수집 구조로 대응",
            effort: "5",
          },
          blankRequirementRow(),
        ],
  )

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
    : requestItem ? `${requestItem.customer} (${requestItem.customerCode})` : ""
  const opportunityDisplay = isStandalone
    ? selectedOpportunity ? `${selectedOpportunity.name} (${selectedOpportunity.id})` : ""
    : requestItem ? `${requestItem.opportunity} (${requestItem.opportunityCode})` : ""
  const analysisStatus = persistedAnalysis?.status ?? (activityRequestItem ? "접수" : (requestItem?.status ?? "분석중"))
  const salesRep = requestItem?.requester ?? ""
  const analyst = currentUser.name
  const requestDate = requestItem?.requestDate ?? requestItem?.receiveDate ?? ""

  const persistAnalysis = (status: RfpAnalysisStatus) => {
    const customerCode = isStandalone ? (selectedCustomer?.id ?? "") : (requestItem?.customerCode ?? "")
    const customerName = isStandalone ? (selectedCustomer?.name ?? selectedCustomerName) : (requestItem?.customer ?? "")
    const opportunityCode = isStandalone ? (selectedOpportunity?.id ?? "") : (requestItem?.opportunityCode ?? "")
    const opportunityName = isStandalone ? (selectedOpportunity?.name ?? "") : (requestItem?.opportunity ?? "")
    const linkedRequestId = activityRequestItem?.id ?? linkedSavedAnalysis?.requestId

    if (!customerCode || !opportunityCode || !customerName || !opportunityName) {
      toast({
        title: "기본정보 확인",
        description: "고객사와 사업기회를 먼저 선택해주십시오.",
      })
      return null
    }

    const wasCompleted = persistedAnalysis?.status === "완료"
    const saved = saveRfpAnalysis({
      id: bidRequestItem?.id ?? linkedSavedAnalysis?.id,
      requestId: linkedRequestId,
      customer: customerName,
      customerCode,
      opportunity: opportunityName,
      opportunityCode,
      requester: salesRep,
      analyst,
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
    })

    if (status === "완료" && !wasCompleted && linkedRequestId && salesRep) {
      notifyRfpAnalysisCompleted({
        requester: salesRep,
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
  }

  const handleModify = () => {
    persistAnalysis("분석중")
  }

  const handleDraftSave = () => {
    persistAnalysis("분석중")
  }

  const handleComplete = () => {
    persistAnalysis("완료")
  }

  const handleExcelExport = () => {
    const exportTarget = persistedAnalysis ?? persistAnalysis(analysisStatus === "완료" ? "완료" : "분석중")
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
      ["영업대표", salesRep],
      ["담당자", analyst],
      ["요청일", requestDate],
      ["상태", exportTarget.status],
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
                    <td class="label">${escapeHtml(label)}</td>
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-slate-50">
        <div className="flex items-center justify-between gap-4">
          <CardTitle>{title}</CardTitle>
          <Button variant="outline" onClick={handleExcelExport}>
            <Download className="mr-2 h-4 w-4" />
            엑셀 다운로드
          </Button>
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
                <BasicInfoRow label="영업대표" value={salesRep} />
                <BasicInfoRow label="담당자" value={analyst} />
              </tr>
              <tr>
                <BasicInfoRow label={requestItem?.id?.startsWith("REQ-") ? "활동요청 코드" : "요청일"} value={requestItem?.id?.startsWith("REQ-") ? requestItem.id : requestDate} />
                <BasicInfoRow label="상태" value={analysisStatus} />
              </tr>
              {requestItem?.id?.startsWith("REQ-") && (
                <tr>
                  <BasicInfoRow label="요청일" value={requestDate} />
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
          <Button variant="outline" onClick={handleModify}>수정</Button>
          <Button variant="outline" onClick={handleDraftSave}>임시저장</Button>
          <Button onClick={handleComplete}>완료</Button>
        </div>
      </CardContent>
    </Card>
  )
}
