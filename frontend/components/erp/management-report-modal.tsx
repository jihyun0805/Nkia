"use client"

import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { BarChart3, Download, FileText, Loader2, PieChartIcon, Sparkles, Table2 } from "lucide-react"

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
  { value: "BID", label: "입찰/제안" },
  { value: "CONTRACT", label: "계약/수주" },
  { value: "PROJECT", label: "사업" },
  { value: "MAINTENANCE", label: "유지보수" },
  { value: "POST_SALES", label: "사후영업" },
]
const STATUS_VALUES = uniqueOptionValues(STATUS_OPTIONS)
const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#64748b"]

const METRIC_LABELS: Record<string, string> = {
  "Total opportunities": "전체 사업기회",
  "Total expected budget": "예상 사업비 합계",
  "Average expected budget": "평균 예상 사업비",
  "Contract stage count": "계약 단계 건수",
}

const CHART_TITLES: Record<string, string> = {
  "Opportunities by stage": "단계별 사업기회",
  "Customer sector mix": "고객 구분 비중",
  "Expected budget by business type": "사업 유형별 예상 사업비",
}

const TABLE_TITLES: Record<string, string> = {
  "Top opportunities by expected budget": "예상 사업비 상위 사업기회",
}

const TABLE_COLUMNS: Record<string, string> = {
  Code: "코드",
  Opportunity: "사업명",
  Customer: "고객사",
  Sector: "고객 구분",
  Stage: "단계",
  "Business Type": "사업 유형",
  "Expected Bid Date": "예상 입찰일",
  "Expected Budget": "예상 사업비",
}

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
    reportType: "management",
    limit: 10,
    startAt: dateRange.startAt,
    endAt: dateRange.endAt,
    customerGroup: "PUBLIC",
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

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900")
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
                    <Label>시작일</Label>
                    <Input
                      type="date"
                      value={form.startAt ?? ""}
                      onChange={(event) => setField("startAt", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>종료일</Label>
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
                        <Badge variant="secondary">{statusLabel(report.reportStatus)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-6">{displayReportText(report)}</div>
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
                      <CardTitle className="text-base">근거 문서</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {report.evidences.length > 0 ? (
                        report.evidences.slice(0, 8).map((evidence, index) => (
                          <div key={`${evidence.sourceType}-${evidence.sourceId}-${index}`} className="rounded-md border p-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{evidence.sourceType}</Badge>
                              <span className="text-sm font-medium">{evidence.title || evidence.sourceId}</span>
                            </div>
                            {evidence.content && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{evidence.content}</p>}
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
  const data = chart.data.map((point) => ({
    label: VALUE_LABELS[point.label] ?? point.label,
    value: Number(point.value ?? 0),
  }))

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
                  {data.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            ) : (
              <BarChart data={data}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <Card className="md:col-span-2 xl:col-span-4">
      <CardContent className="p-8 text-center text-sm text-muted-foreground">{label}</CardContent>
    </Card>
  )
}

function statusLabel(status: string) {
  if (status === "good_report") return "생성 완료"
  if (status === "insufficient_evidence") return "근거 부족"
  if (status === "upstream_degraded") return "부분 생성"
  return status
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
          <strong>${escapeHtml(evidence.title || evidence.sourceId)}</strong>
          <span>${escapeHtml(evidence.sourceType)}</span>
          ${evidence.content ? `<p>${escapeHtml(evidence.content)}</p>` : ""}
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
          .meta { color: #4b5563; margin-bottom: 18px; }
          .filters { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; margin-bottom: 18px; }
          .filters div { margin: 2px 0; }
          .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px; }
          .metric { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
          .metric-label { color: #6b7280; font-size: 11px; }
          .metric-value { font-size: 18px; font-weight: 700; margin-top: 4px; }
          .report-body { white-space: pre-wrap; border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; }
          table { width: 100%; border-collapse: collapse; page-break-inside: avoid; }
          th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; font-weight: 700; }
          li { margin-bottom: 8px; }
          li span { color: #6b7280; margin-left: 8px; }
          li p { margin: 4px 0 0; color: #374151; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(report.title)}</h1>
        <div class="meta">상태: ${escapeHtml(statusLabel(report.reportStatus))}</div>
        <div class="filters">
          <div><strong>기간:</strong> ${escapeHtml(request.startAt)} ~ ${escapeHtml(request.endAt)}</div>
          <div><strong>고객 구분:</strong> ${escapeHtml(VALUE_LABELS[request.customerGroup ?? "ALL"] ?? request.customerGroup ?? "전체")}</div>
          <div><strong>사업 유형:</strong> ${escapeHtml(selectedLabels(request.businessTypes, BUSINESS_TYPE_OPTIONS))}</div>
          <div><strong>진행 단계:</strong> ${escapeHtml(selectedLabels(request.statuses, STATUS_OPTIONS))}</div>
        </div>
        <section class="metrics">${metrics}</section>
        <section>
          <h2>리포트</h2>
          <div class="report-body">${escapeHtml(displayReportText(report))}</div>
        </section>
        ${charts}
        ${tables}
        <section>
          <h2>근거 문서</h2>
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

function formatValue(value: string | number | null, unit?: string | null) {
  if (typeof value === "number") {
    const formatted = new Intl.NumberFormat("ko-KR").format(Math.round(value))
    if (unit === "KRW") return `${formatted}원`
    return unit && unit !== "count" ? `${formatted} ${unit}` : formatted
  }
  return `${value ?? "-"}${unit && unit !== "count" ? ` ${unit}` : ""}`
}
