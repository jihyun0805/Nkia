"use client"

import { useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import { BarChart3, Download, FileText, Loader2, PieChartIcon, Sparkles, Table2 } from "lucide-react"
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import remarkGfm from "remark-gfm"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createManagementReport,
  type ManagementReportRequest,
  type ManagementReportResponse,
  type ReportChart,
} from "@/lib/management-report-api"

type FilterOption = {
  value: string
  label: string
  values?: string[]
}

const BUSINESS_TYPE_OPTIONS: FilterOption[] = [
  { value: "EMS", label: "EMS" },
  { value: "ITSM", label: "ITG/ITSM" },
  { value: "DASHBOARD", label: "대시보드" },
  { value: "AIOTION", label: "AIOTION", values: ["DATACENTER", "RCA", "DCA"] },
  { value: "ITO", label: "ITO", values: ["ITAM"] },
  { value: "ETC", label: "기타", values: ["SUPPORTING_TOOLS", "CLOUD", "BSM", "E2E", "ETC"] },
]
const BUSINESS_TYPE_VALUES = uniqueOptionValues(BUSINESS_TYPE_OPTIONS)
const STATUS_OPTIONS: FilterOption[] = [
  { value: "FINDING", label: "발굴" },
  { value: "ACTIVITY", label: "활동" },
  { value: "BID", label: "입찰" },
  { value: "CONTRACT", label: "계약" },
  { value: "PROJECT", label: "사업" },
  { value: "MAINTENANCE", label: "유지보수" },
  { value: "POST_SALES", label: "사후영업" },
]
const STATUS_VALUES = uniqueOptionValues(STATUS_OPTIONS)
const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#64748b"]
const STAGE_COLORS: Record<string, string> = {
  FINDING: "#64748b",
  ACTIVITY: "#0891b2",
  BID: "#2563eb",
  CONTRACT: "#16a34a",
  PROJECT: "#7c3aed",
  MAINTENANCE: "#f59e0b",
  POST_SALES: "#dc2626",
}
const CUSTOMER_COLORS: Record<string, string> = {
  PUBLIC: "#2563eb",
  PRIVATE: "#16a34a",
  OVERSEAS: "#f59e0b",
  UNKNOWN: "#64748b",
}
const BUSINESS_TYPE_COLORS: Record<string, string> = {
  EMS: "#2563eb",
  ITSM: "#16a34a",
  DASHBOARD: "#f59e0b",
  AIOTION: "#7c3aed",
  ITO: "#0891b2",
  ETC: "#dc2626",
  UNKNOWN: "#64748b",
}

const METRIC_LABELS: Record<string, string> = {
  "Total opportunities": "전체 사업기회",
  "Total expected budget": "예상 사업비 합계",
  "Active or bid stage count": "진행/입찰 단계 건수",
  "Won or projectized count": "수주/사업화 건수",
}

const CHART_TITLES: Record<string, string> = {
  "Opportunities by stage": "단계별 사업기회",
  "Customer sector mix": "고객 구분 비중",
  "Expected budget by business type": "사업 유형별 예상 사업비",
}

const TABLE_TITLES: Record<string, string> = {
  "Stage portfolio summary": "단계별 사업기회 현황",
  "Top opportunities by expected budget": "예상 사업비 상위 사업기회",
}

const TABLE_COLUMNS: Record<string, string> = {
  Code: "코드",
  Count: "건수",
  Opportunity: "사업명",
  Customer: "고객사",
  Sector: "고객 구분",
  Stage: "단계",
  "Business Type": "사업 유형",
  "Expected Bid Date": "예상 입찰일",
  "Expected Budget": "예상 사업비",
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  PROJECT_OPPORTUNITY: "사업기회",
  SALES_ACTIVITY: "영업활동",
  QUOTATION: "견적",
  RFP: "RFP",
  RFP_ANALYSIS: "RFP 분석",
  PRB: "PRB",
  PRB_RESULT: "PRB 결과",
  BID_RESULT: "입찰 결과",
  WON: "수주",
  LOST: "실주",
  ORDER_REPORT: "수주 보고",
  CONTRACT: "계약",
  PROJECT: "프로젝트",
  PROJECT_RESULT_REPORT: "사업 결과",
  MAINTENANCE: "유지보수",
  MAINTENANCE_QUOTE: "유지보수 견적",
  CUSTOMER_SUPPORT: "고객지원",
  LICENSE: "라이선스",
  BILLING: "청구",
}

const EVIDENCE_FIELD_LABELS: Record<string, string> = {
  recent_activity_summary: "최근 활동",
  comprehensive_opinion: "종합 의견",
  customer_interest: "고객 관심사",
  issue: "이슈",
  next_activity: "다음 활동",
  meeting_date_time: "회의 일시",
  meeting_location: "회의 장소",
  opportunity_name: "사업기회",
  customer_name: "고객",
  business_type: "사업유형",
  project_type: "사업유형",
}

const EVIDENCE_SYSTEM_FIELDS = new Set([
  "created_at",
  "created_by",
  "deleted",
  "deleted_at",
  "deleted_by",
  "id",
  "updated_at",
  "updated_by",
])

const VALUE_LABELS: Record<string, string> = {
  ALL: "전체",
  PUBLIC: "공공",
  PRIVATE: "민간",
  OVERSEAS: "해외",
  UNKNOWN: "미분류",
  FINDING: "발굴",
  ACTIVITY: "활동",
  BID: "입찰",
  CONTRACT: "계약",
  PROJECT: "사업",
  MAINTENANCE: "유지보수",
  POST_SALES: "사후영업",
  ITSM: "ITG/ITSM",
  DASHBOARD: "대시보드",
  AIOTION: "AIOTION",
  DATACENTER: "AIOTION-DataCenter",
  RCA: "AIOTION-RCA",
  DCA: "AIOTION-DCA",
  ITO: "ITO",
  ITAM: "ITO",
  SUPPORTING_TOOLS: "보조도구",
  CLOUD: "Cloud",
  BSM: "BSM",
  E2E: "E2E",
  ETC: "기타",
}

function optionValues(option: FilterOption) {
  return option.values ?? [option.value]
}

function uniqueOptionValues(options: FilterOption[]) {
  return Array.from(new Set(options.flatMap(optionValues)))
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getDefaultDateRange() {
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setFullYear(startDate.getFullYear() - 1)

  return {
    startAt: formatDateInputValue(startDate),
    endAt: formatDateInputValue(endDate),
  }
}

function createDefaultRequest(): ManagementReportRequest {
  const dateRange = getDefaultDateRange()
  return {
    query: "선택한 조건에 해당하는 사업기회 현황, 주요 리스크, 대응 방안, 경영진 의사결정 포인트를 요약해줘",
    title: "사업기회 경영 리포트",
    reportType: "management",
    limit: 10,
    startAt: dateRange.startAt,
    endAt: dateRange.endAt,
    customerGroup: "ALL",
    businessTypes: [],
    statuses: [],
    visualization: {
      includeMetrics: true,
      includeCharts: true,
      includeTables: true,
      chartTypes: ["bar", "pie"],
    },
  }
}

export function ManagementReportModal() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ManagementReportRequest>(() => createDefaultRequest())
  const [report, setReport] = useState<ManagementReportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const metrics = useMemo(() => report?.metrics ?? [], [report])

  const setField = <K extends keyof ManagementReportRequest>(key: K, value: ManagementReportRequest[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const toggleOption = (field: "businessTypes" | "statuses", option: FilterOption) => {
    const valuesToToggle = optionValues(option)
    setForm((current) => {
      const values = current[field] ?? []
      const isSelected = valuesToToggle.every((value) => values.includes(value))
      return {
        ...current,
        [field]: isSelected
          ? values.filter((value) => !valuesToToggle.includes(value))
          : Array.from(new Set([...values, ...valuesToToggle])),
      }
    })
  }

  const toggleAllValues = (field: "businessTypes" | "statuses", values: string[]) => {
    setForm((current) => {
      const selected = current[field] ?? []
      const isAllSelected = values.every((value) => selected.includes(value))
      return {
        ...current,
        [field]: isAllSelected ? [] : values,
      }
    })
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const dateRange = getDefaultDateRange()
      const payload: ManagementReportRequest = {
        ...form,
        customerGroup: form.customerGroup === "ALL" ? undefined : form.customerGroup,
        startAt: form.startAt || dateRange.startAt,
        endAt: form.endAt || dateRange.endAt,
      }
      setReport(await createManagementReport(payload))
    } catch (err) {
      setError(err instanceof Error ? err.message : "리포트 생성에 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setReport(null)
      setError(null)
      setIsLoading(false)
    }
  }

  const handleSavePdf = () => {
    if (!report) return

    const printWindow = window.open("", "_blank", "width=1200,height=900")
    if (!printWindow) {
      setError("PDF 저장 창을 열 수 없습니다. 브라우저 팝업 차단 설정을 확인해 주세요.")
      return
    }

    printWindow.document.write(buildReportPrintHtml(report, form))
    printWindow.document.close()
    printWindow.focus()
    window.setTimeout(() => {
      printWindow.print()
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          경영 리포트
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[94vh] w-[96vw] max-w-none overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            경영 리포트
          </DialogTitle>
          <DialogDescription>
            조건별 데이터와 근거 문서를 기반으로 리포트를 생성합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(94vh-96px)] overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">리포트 조건</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>시작일 (예상 입찰일 기준)</Label>
                    <Input
                      type="date"
                      value={form.startAt ?? ""}
                      onChange={(event) => setField("startAt", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>종료일 (예상 입찰일 기준)</Label>
                    <Input
                      type="date"
                      value={form.endAt ?? ""}
                      onChange={(event) => setField("endAt", event.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>고객 구분</Label>
                    <Select value={form.customerGroup ?? "ALL"} onValueChange={(value) => setField("customerGroup", value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">전체</SelectItem>
                        <SelectItem value="PUBLIC">공공</SelectItem>
                        <SelectItem value="PRIVATE">민간</SelectItem>
                        <SelectItem value="OVERSEAS">해외</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <FilterGroup
                  title="사업 유형"
                  options={BUSINESS_TYPE_OPTIONS}
                  selected={form.businessTypes}
                  onToggle={(option) => toggleOption("businessTypes", option)}
                  onSelectAll={() => toggleAllValues("businessTypes", BUSINESS_TYPE_VALUES)}
                />
                <FilterGroup
                  title="진행 단계"
                  options={STATUS_OPTIONS}
                  selected={form.statuses}
                  onToggle={(option) => toggleOption("statuses", option)}
                  onSelectAll={() => toggleAllValues("statuses", STATUS_VALUES)}
                />

                <Button className="w-full gap-2" onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  리포트 생성
                </Button>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {metrics.length > 0 ? (
                  metrics.map((metric) => (
                    <Card key={metric.label}>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">{METRIC_LABELS[metric.label] ?? metric.label}</p>
                        <p className="mt-2 text-2xl font-semibold">{formatValue(metric.value, metric.unit)}</p>
                        {metric.description && <p className="mt-1 text-xs text-muted-foreground">{metric.description}</p>}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <EmptyState label="리포트를 생성하면 주요 지표가 표시됩니다." />
                )}
              </div>

              {report && (
                <>
                  <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                    {report.charts.map((chart) => (
                      <ChartCard key={chart.title} chart={chart} />
                    ))}
                  </div>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">{report.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={handleSavePdf}>
                          <Download className="h-4 w-4" />
                          PDF 저장
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ManagementReportMarkdown content={displayReportText(report)} />
                    </CardContent>
                  </Card>

                  {report.tables.map((table) => (
                    <Card key={table.title}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Table2 className="h-4 w-4 text-primary" />
                          {TABLE_TITLES[table.title] ?? table.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {table.columns.map((column) => (
                                <TableHead key={column}>{TABLE_COLUMNS[column] ?? column}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {table.rows.map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                  <TableCell key={cellIndex}>{displayValue(cell)}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ))}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">검색된 근거 문서</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {report.evidences.length > 0 ? (
                        report.evidences.slice(0, 8).map((evidence, index) => (
                          <div key={`${evidence.sourceType}-${evidence.sourceId}-${index}`} className="rounded-md border p-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{SOURCE_TYPE_LABELS[evidence.sourceType] ?? evidence.sourceType}</Badge>
                              <span className="text-sm font-medium">{evidenceTitle(evidence)}</span>
                            </div>
                            {evidence.content && (
                              <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                                {evidenceSummary(evidence)}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">표시할 근거 문서가 없습니다.</p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FilterGroup({
  title,
  options,
  selected,
  onToggle,
  onSelectAll,
}: {
  title: string
  options: FilterOption[]
  selected: string[]
  onToggle: (option: FilterOption) => void
  onSelectAll: () => void
}) {
  const values = uniqueOptionValues(options)
  const isAllSelected = values.every((value) => selected.includes(value))

  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
        <label className="flex h-11 items-center gap-2 rounded-md border px-3 text-sm">
          <Checkbox checked={isAllSelected} onCheckedChange={onSelectAll} />
          <span className="truncate">전체</span>
        </label>
        {options.map((option) => {
          const optionValueList = optionValues(option)
          return (
            <label key={option.value} className="flex h-11 items-center gap-2 rounded-md border px-3 text-sm">
              <Checkbox
                checked={optionValueList.every((value) => selected.includes(value))}
                onCheckedChange={() => onToggle(option)}
              />
              <span className="truncate">{option.label}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function ChartCard({ chart }: { chart: ReportChart }) {
  const data = chart.data.map((point, index) => ({
    key: point.label,
    label: VALUE_LABELS[point.label] ?? point.label,
    value: Number(point.value ?? 0),
    fill: chartColor(chart.title, point.label, index),
  }))
  const isBudgetChart = chart.title === "Expected budget by business type"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {chart.type === "pie" ? <PieChartIcon className="h-4 w-4 text-primary" /> : <BarChart3 className="h-4 w-4 text-primary" />}
          {CHART_TITLES[chart.title] ?? chart.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {chart.type === "pie" ? (
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="label" outerRadius={96} label>
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                />
              </PieChart>
            ) : (
              <BarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: isBudgetChart ? 36 : 8 }}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis
                  width={isBudgetChart ? 92 : 42}
                  tick={{ fontSize: 12 }}
                  tickFormatter={isBudgetChart ? formatChartAxisValue : undefined}
                />
                <Tooltip formatter={(value) => displayValue(value)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function chartColor(title: string, key: string, index: number) {
  if (title === "Opportunities by stage") return STAGE_COLORS[key] ?? COLORS[index % COLORS.length]
  if (title === "Customer sector mix") return CUSTOMER_COLORS[key] ?? COLORS[index % COLORS.length]
  if (title === "Expected budget by business type") return BUSINESS_TYPE_COLORS[key] ?? COLORS[index % COLORS.length]
  return COLORS[index % COLORS.length]
}

function EmptyState({ label }: { label: string }) {
  return (
    <Card className="md:col-span-2 xl:col-span-4">
      <CardContent className="p-8 text-center text-sm text-muted-foreground">{label}</CardContent>
    </Card>
  )
}

function ManagementReportMarkdown({ content }: { content: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-4 text-sm leading-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="mb-3 mt-7 border-b pb-2 text-base font-semibold text-foreground first:mt-0">{children}</h2>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-7 border-b pb-2 text-base font-semibold text-foreground first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => <h3 className="mb-2 mt-5 text-sm font-semibold text-foreground">{children}</h3>,
          p: ({ children }) => <p className="mb-3 text-muted-foreground last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-5 text-muted-foreground">{children}</ul>,
          ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1 pl-5 text-muted-foreground">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          table: ({ children }) => (
            <div className="mb-4 mt-2 overflow-x-auto rounded-md border bg-background">
              <Table>{children}</Table>
            </div>
          ),
          thead: ({ children }) => <TableHeader>{children}</TableHeader>,
          tbody: ({ children }) => <TableBody>{children}</TableBody>,
          tr: ({ children }) => <TableRow>{children}</TableRow>,
          th: ({ children }) => <TableHead>{children}</TableHead>,
          td: ({ children }) => <TableCell>{children}</TableCell>,
        }}
      >
        {normalizeReportMarkdown(content)}
      </ReactMarkdown>
    </div>
  )
}

function normalizeReportMarkdown(content: string) {
  let normalized = unwrapMarkdownFence(content).replace(/\r\n?/g, "\n").trim()

  const newlineCount = (normalized.match(/\n/g) ?? []).length
  const escapedNewlineCount = (normalized.match(/\\n/g) ?? []).length
  if (newlineCount <= 1 && escapedNewlineCount > 2) {
    normalized = normalized.replace(/\\n/g, "\n").trim()
  }

  const lines = normalized.split("\n")
  const converted = lines.map((line, index) => {
    const trimmed = line.trim()
    if (/^#{1,6}\s+/.test(trimmed) || isMarkdownTableLine(trimmed) || /^[-*]\s+/.test(trimmed)) {
      return line
    }

    const numberedHeading = trimmed.match(/^(\d{1,2})\.\s+(.+)$/)
    const nextTextLine = lines.slice(index + 1).find((nextLine) => nextLine.trim())
    const isConsecutiveOrderedList = Boolean(nextTextLine?.trim().match(/^\d{1,2}\.\s+/))
    const looksLikeReportSection = /(현황|분석|리스크|판단|권고|액션|포트폴리오|성과|요약|이슈|전망|계획|진단|종합|근거)/.test(
      numberedHeading?.[2] ?? "",
    )
    if (numberedHeading && looksLikeReportSection && !isConsecutiveOrderedList) {
      return `## ${numberedHeading[1]}. ${numberedHeading[2]}`
    }

    return line
  })

  return converted.join("\n")
}

function isMarkdownTableStart(lines: string[], index: number) {
  return (
    isMarkdownTableRow(lines[index]) &&
    isMarkdownTableSeparator(lines[index + 1])
  )
}

function isMarkdownTableLine(line: string | undefined) {
  return isMarkdownTableRow(line) || isMarkdownTableSeparator(line)
}

function isMarkdownTableRow(line: string | undefined) {
  const trimmed = line?.trim() ?? ""
  return trimmed.includes("|") && !isMarkdownTableSeparator(trimmed)
}

function isMarkdownTableSeparator(line: string | undefined) {
  const trimmed = line?.trim() ?? ""
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(trimmed)
}

function parseMarkdownTable(lines: string[]) {
  return lines
    .filter((line) => !isMarkdownTableSeparator(line))
    .map((line) =>
      line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    )
}

function renderInlineMarkdownHtml(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`
      }
      return escapeHtml(part)
    })
    .join("")
}

function renderMarkdownHtml(content: string) {
  const lines = normalizeReportMarkdown(content).split(/\r?\n/)
  const parts: string[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index].trim()
    if (!line) {
      index += 1
      continue
    }

    if (isMarkdownTableStart(lines, index)) {
      const tableLines = []
      while (index < lines.length && isMarkdownTableLine(lines[index])) {
        tableLines.push(lines[index].trim())
        index += 1
      }
      const rows = parseMarkdownTable(tableLines)
      const [header, ...body] = rows
      const head = header
        ? `<thead><tr>${header.map((cell) => `<th>${renderInlineMarkdownHtml(cell)}</th>`).join("")}</tr></thead>`
        : ""
      const bodyRows = body
        .map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdownHtml(cell)}</td>`).join("")}</tr>`)
        .join("")
      parts.push(`<div class="md-table"><table>${head}<tbody>${bodyRows}</tbody></table></div>`)
      continue
    }

    if (isMarkdownTableSeparator(line)) {
      index += 1
      continue
    }

    if (line.startsWith("# ")) {
      parts.push(`<h2>${renderInlineMarkdownHtml(line.replace(/^#\s+/, ""))}</h2>`)
      index += 1
      continue
    }

    if (line.startsWith("## ")) {
      parts.push(`<h2>${renderInlineMarkdownHtml(line.replace(/^##\s+/, ""))}</h2>`)
      index += 1
      continue
    }

    if (line.startsWith("### ")) {
      parts.push(`<h3>${renderInlineMarkdownHtml(line.replace(/^###\s+/, ""))}</h3>`)
      index += 1
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      const items = []
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""))
        index += 1
      }
      parts.push(`<ul>${items.map((item) => `<li>${renderInlineMarkdownHtml(item)}</li>`).join("")}</ul>`)
      continue
    }

    const paragraphs = [line]
    index += 1
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^#{1,6}\s+/.test(lines[index].trim()) &&
      !/^[-*]\s+/.test(lines[index].trim()) &&
      !lines[index].trim().startsWith("|")
    ) {
      paragraphs.push(lines[index].trim())
      index += 1
    }
    parts.push(`<p>${renderInlineMarkdownHtml(paragraphs.join(" "))}</p>`)
  }

  return parts.join("\n")
}

function unwrapMarkdownFence(content: string) {
  let trimmed = content.trim()
  const fullFenceMatch = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i)
  if (fullFenceMatch) return fullFenceMatch[1].trim()

  const firstFenceMatch = trimmed.match(/```(?:markdown|md)?\s*\n([\s\S]*?)\n```/i)
  if (firstFenceMatch) return firstFenceMatch[1].trim()

  trimmed = trimmed.replace(/^```(?:markdown|md)?\s*/i, "").replace(/\s*```$/i, "")
  return trimmed
}

function evidenceTitle(evidence: { sourceType: string; sourceId: string; title?: string | null; metadata?: Record<string, unknown> | null }) {
  const metadataTitle = firstMetadataText(evidence.metadata, [
    "rootOpportunityName",
    "opportunityName",
    "projectName",
    "maintenanceName",
    "customerName",
  ])
  const title = cleanEvidenceText(metadataTitle || evidence.title || "")
  if (title && title !== evidence.sourceId && !/^\d+$/.test(title)) return title

  const label = SOURCE_TYPE_LABELS[evidence.sourceType] ?? evidence.sourceType
  return `${label} #${evidence.sourceId}`
}

function evidenceSummary(evidence: { content?: string | null }) {
  const content = cleanEvidenceText(evidence.content ?? "")
  if (!content) return ""

  const entries = extractEvidenceFields(content)
    .filter((entry) => !EVIDENCE_SYSTEM_FIELDS.has(entry.key))
    .filter((entry) => entry.value.length > 0)
    .slice(0, 4)

  if (entries.length > 0) {
    return entries
      .map((entry) => `${EVIDENCE_FIELD_LABELS[entry.key] ?? toReadableFieldLabel(entry.key)}: ${entry.value}`)
      .join(" / ")
  }

  return stripRawEvidenceFields(content)
}

function extractEvidenceFields(content: string) {
  const fieldPattern = /(?:^|\s)([A-Za-z][A-Za-z0-9_]{1,40}):\s*/g
  const matches = Array.from(content.matchAll(fieldPattern))
  return matches.map((match, index) => {
    const key = match[1]
    const valueStart = (match.index ?? 0) + match[0].length
    const valueEnd = index + 1 < matches.length ? matches[index + 1].index ?? content.length : content.length
    return {
      key,
      value: cleanEvidenceText(content.slice(valueStart, valueEnd)),
    }
  })
}

function stripRawEvidenceFields(content: string) {
  return cleanEvidenceText(
    content
      .replace(/^제목:\s*/u, "")
      .replace(/\s+[A-Za-z][A-Za-z0-9_]{1,40}:\s*/g, " / ")
      .split(" / ")
      .filter((part) => {
        const key = part.split(":")[0]?.trim()
        return key && !EVIDENCE_SYSTEM_FIELDS.has(key)
      })
      .join(" / "),
  )
}

function cleanEvidenceText(value: string) {
  return value
    .replace(/^제목:\s*/u, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .trim()
}

function toReadableFieldLabel(key: string) {
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function firstMetadataText(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!metadata) return null
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function displayReportText(report: ManagementReportResponse) {
  if (report.reportStatus === "insufficient_evidence") {
    return "선택한 조건에 해당하는 근거 데이터가 부족해 리포트를 생성할 수 없습니다. 기간, 고객 구분, 사업 유형, 진행 단계 조건을 조정한 뒤 다시 생성해 주세요."
  }
  return report.report
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function selectedLabels(values?: string[], options?: FilterOption[]) {
  if (!values || values.length === 0) return "전체"
  if (!options) return values.map((value) => VALUE_LABELS[value] ?? value).join(", ")

  const selected = new Set(values)
  const labels: string[] = []
  for (const option of options) {
    const optionValueList = optionValues(option)
    if (optionValueList.every((value) => selected.has(value))) {
      labels.push(option.label)
      optionValueList.forEach((value) => selected.delete(value))
    }
  }

  selected.forEach((value) => labels.push(VALUE_LABELS[value] ?? value))
  return labels.join(", ")
}

function buildReportPrintHtml(report: ManagementReportResponse, request: ManagementReportRequest) {
  const reportHtml = renderMarkdownHtml(displayReportText(report))
  const metrics = (report.metrics ?? [])
    .map(
      (metric) => `
        <div class="metric">
          <div class="metric-label">${escapeHtml(METRIC_LABELS[metric.label] ?? metric.label)}</div>
          <div class="metric-value">${escapeHtml(formatValue(metric.value, metric.unit))}</div>
        </div>
      `,
    )
    .join("")

  const charts = (report.charts ?? [])
    .map((chart) => {
      const rows = chart.data
        .map(
          (point) => `
            <tr>
              <td>${escapeHtml(VALUE_LABELS[point.label] ?? point.label)}</td>
              <td>${escapeHtml(displayValue(point.value))}</td>
            </tr>
          `,
        )
        .join("")

      return `
        <section>
          <h2>${escapeHtml(CHART_TITLES[chart.title] ?? chart.title)}</h2>
          <table>
            <thead><tr><th>구분</th><th>값</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="2">데이터 없음</td></tr>'}</tbody>
          </table>
        </section>
      `
    })
    .join("")

  const tables = (report.tables ?? [])
    .map((table) => {
      const headers = table.columns.map((column) => `<th>${escapeHtml(TABLE_COLUMNS[column] ?? column)}</th>`).join("")
      const rows = table.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(displayValue(cell))}</td>`).join("")}</tr>`)
        .join("")

      return `
        <section>
          <h2>${escapeHtml(TABLE_TITLES[table.title] ?? table.title)}</h2>
          <table>
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows || `<tr><td colspan="${table.columns.length}">데이터 없음</td></tr>`}</tbody>
          </table>
        </section>
      `
    })
    .join("")

  const evidences = (report.evidences ?? [])
    .slice(0, 8)
    .map(
      (evidence) => `
        <li>
          <strong>${escapeHtml(evidenceTitle(evidence))}</strong>
          <span>${escapeHtml(SOURCE_TYPE_LABELS[evidence.sourceType] ?? evidence.sourceType)}</span>
          ${evidence.content ? `<p>${escapeHtml(evidenceSummary(evidence))}</p>` : ""}
        </li>
      `,
    )
    .join("")

  return `
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(report.title)}</title>
        <style>
          @page { size: A4; margin: 16mm; }
          body { color: #111827; font-family: Arial, "Malgun Gothic", sans-serif; font-size: 12px; line-height: 1.6; }
          h1 { font-size: 22px; margin: 0 0 8px; }
          h2 { font-size: 15px; margin: 24px 0 8px; }
          .filters { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; margin-bottom: 18px; }
          .filters div { margin: 2px 0; }
          .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px; }
          .metric { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
          .metric-label { color: #6b7280; font-size: 11px; }
          .metric-value { font-size: 18px; font-weight: 700; margin-top: 4px; }
          .report-body { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; }
          .report-body h2 { border-bottom: 1px solid #d1d5db; padding-bottom: 5px; }
          .report-body h3 { font-size: 13px; margin: 16px 0 6px; }
          .report-body p { margin: 6px 0; color: #374151; }
          .report-body ul { margin: 6px 0 12px; padding-left: 18px; }
          .report-body .md-table { margin: 8px 0 14px; }
          table { width: 100%; border-collapse: collapse; break-inside: auto; page-break-inside: auto; }
          thead { display: table-header-group; }
          tbody { display: table-row-group; }
          tr { break-inside: avoid; page-break-inside: avoid; }
          th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; font-weight: 700; }
          li { margin-bottom: 8px; }
          li span { color: #6b7280; margin-left: 8px; }
          li p { margin: 4px 0 0; color: #374151; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(report.title)}</h1>
        <div class="filters">
          <div><strong>기간:</strong> ${escapeHtml(request.startAt)} ~ ${escapeHtml(request.endAt)} (예상 입찰일 기준)</div>
          <div><strong>고객 구분:</strong> ${escapeHtml(VALUE_LABELS[request.customerGroup ?? "ALL"] ?? request.customerGroup ?? "전체")}</div>
          <div><strong>사업 유형:</strong> ${escapeHtml(selectedLabels(request.businessTypes, BUSINESS_TYPE_OPTIONS))}</div>
          <div><strong>진행 단계:</strong> ${escapeHtml(selectedLabels(request.statuses, STATUS_OPTIONS))}</div>
        </div>
        <section class="metrics">${metrics}</section>
        <section>
          <h2>리포트</h2>
          <div class="report-body">${reportHtml}</div>
        </section>
        ${charts}
        ${tables}
        <section>
          <h2>검색된 근거 문서</h2>
          <ul>${evidences || "<li>표시할 근거 문서가 없습니다.</li>"}</ul>
        </section>
      </body>
    </html>
  `
}

function displayValue(value: unknown) {
  if (typeof value === "number") return new Intl.NumberFormat("ko-KR").format(Math.round(value))
  if (typeof value === "string") return VALUE_LABELS[value] ?? value
  return String(value ?? "")
}

function formatChartAxisValue(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numberValue)) return String(value ?? "")
  if (Math.abs(numberValue) >= 100000000) return `${new Intl.NumberFormat("ko-KR").format(Math.round(numberValue / 100000000))}억`
  if (Math.abs(numberValue) >= 10000) return `${new Intl.NumberFormat("ko-KR").format(Math.round(numberValue / 10000))}만`
  return new Intl.NumberFormat("ko-KR").format(Math.round(numberValue))
}

function formatValue(value: string | number | null, unit?: string | null) {
  if (typeof value === "number") {
    const formatted = new Intl.NumberFormat("ko-KR").format(Math.round(value))
    if (unit === "KRW") return `${formatted}원`
    return unit && unit !== "count" ? `${formatted} ${unit}` : formatted
  }
  return `${value ?? "-"}${unit && unit !== "count" ? ` ${unit}` : ""}`
}
