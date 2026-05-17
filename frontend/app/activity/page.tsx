"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar as MonthCalendar } from "@/components/ui/calendar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FilterPopover } from "@/components/erp/filter-popover"
import { PageSearchForm } from "@/components/erp/page-search-form"
import { defaultFilterValues, filterRecords, type FilterValues, uniqueOptions } from "@/lib/filter-utils"
import { loadBackendActivityRecords } from "@/lib/sales-activity-backend"
import {
  type ActivityRecord,
  activityRequestStatusOptions,
  activityRequestTypeOptions,
  activityStatuses,
} from "@/lib/activity-data"
import { useEffect, useMemo, useState } from "react"
import { getActivityRequests, subscribeWorkflowUpdates } from "@/lib/activity-request-workflow"
import { loadBackendActivityRequests } from "@/lib/sales-activity-request-backend"
import { getQuotations, getQuotationDisplayStatus, subscribeQuotationUpdates } from "@/lib/quotation-workflow"
import { loadBackendQuotationRecords } from "@/lib/sales-quotation-backend"
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Plus,
  Users,
  FileText,
  Calendar,
} from "lucide-react"

const REQUEST_CALENDAR_OPEN_KEY = "orbis.activity.requests.calendar.open"
const ACTIVITY_ACTIVE_TAB_KEY = "orbis.activity.activeTab"
const REQUESTS_STORAGE_KEY = "orbis.activityRequests"
const NOTIFICATIONS_STORAGE_KEY = "orbis.workflowNotifications"
type ActivityTab = "activities" | "quotations" | "requests"

function isActivityTab(value: string | null): value is ActivityTab {
  return value === "activities" || value === "quotations" || value === "requests"
}

function getInitialActivityTab(): ActivityTab {
  if (typeof window === "undefined") return "activities"

  const tab = new URLSearchParams(window.location.search).get("tab")
  if (isActivityTab(tab)) return tab

  const savedTab = window.localStorage.getItem(ACTIVITY_ACTIVE_TAB_KEY)
  return isActivityTab(savedTab) ? savedTab : "activities"
}

export default function ActivityPage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [filters, setFilters] = useState<FilterValues>(defaultFilterValues)
  const [searchTerm, setSearchTerm] = useState("")
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<ActivityTab>(getInitialActivityTab)
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([])
  const [activityRequests, setActivityRequests] = useState<ReturnType<typeof getActivityRequests>>([])
  const [quotationRecords, setQuotationRecords] = useState<ReturnType<typeof getQuotations>>([])
  const [month, setMonth] = useState(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isPreferenceReady, setIsPreferenceReady] = useState(false)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const saved = window.localStorage.getItem(REQUEST_CALENDAR_OPEN_KEY)
    if (saved) {
      setIsCalendarOpen(saved === "true")
    }

    setIsPreferenceReady(true)
  }, [])

  const activeQuotationRecords = useMemo(
    () => quotationRecords.filter((item) => !item.deletedAt),
    [quotationRecords],
  )

  useEffect(() => {
    let cancelled = false

    loadBackendActivityRecords()
      .then((records) => {
        if (!cancelled) {
          setActivityRecords(records)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActivityRecords([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const sync = () => {
      if (!cancelled) {
        setActivityRequests(getActivityRequests())
      }
    }

    loadBackendActivityRequests()
      .then((requests) => {
        if (!cancelled) {
          setActivityRequests(requests)
        }
      })
      .catch(() => {
        sync()
      })

    const unsubscribe = subscribeWorkflowUpdates(sync)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const sync = () => {
      if (!cancelled) {
        setQuotationRecords(getQuotations())
      }
    }

    loadBackendQuotationRecords()
      .then(() => sync())
      .catch(() => sync())

    const unsubscribe = subscribeQuotationUpdates(sync)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!isPreferenceReady) return
    window.localStorage.setItem(REQUEST_CALENDAR_OPEN_KEY, String(isCalendarOpen))
  }, [isCalendarOpen, isPreferenceReady])

  useEffect(() => {
    if (!isPreferenceReady) return
    window.localStorage.setItem(ACTIVITY_ACTIVE_TAB_KEY, activeTab)
  }, [activeTab, isPreferenceReady])

  const activityFieldOptions = activeTab === "activities"
    ? [
      { key: "customer", label: "고객사", options: uniqueOptions(activityRecords, (item) => item.customer) },
      { key: "opportunity", label: "사업기회", options: uniqueOptions(activityRecords, (item) => item.opportunity) },
      { key: "activityMode", label: "활동형태", options: uniqueOptions(activityRecords, (item) => item.activityMode) },
      { key: "activityContent", label: "활동내용", options: uniqueOptions(activityRecords, (item) => item.activityContent) },
      { key: "location", label: "장소", options: uniqueOptions(activityRecords, (item) => item.location) },
    ]
    : activeTab === "quotations"
      ? [
        { key: "product", label: "제품", options: uniqueOptions(activeQuotationRecords, (item) => item.items.map((entry) => entry.name).join(", ")) },
        { key: "customer", label: "고객사", options: uniqueOptions(activeQuotationRecords, (item) => item.customer) },
      ]
      : [
        { key: "type", label: "요청유형", options: activityRequestTypeOptions },
        { key: "requester", label: "요청자", options: uniqueOptions(activityRequests, (item) => item.requester) },
        { key: "customer", label: "고객사", options: uniqueOptions(activityRequests, (item) => item.customer) },
      ]

  const normalizedSearchTerm = appliedSearchTerm.trim().toLowerCase()
  const matchesSearch = (values: Array<string | number | null | undefined>) => {
    if (!normalizedSearchTerm) return true
    return values
      .filter((value) => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearchTerm)
  }

  const filteredActivities = filterRecords(activityRecords, filters, {
    owner: (item) => item.attendees,
    date: (item) => item.date,
    fields: {
      customer: (item) => item.customer,
      opportunity: (item) => item.opportunity,
      activityMode: (item) => item.activityMode,
      activityContent: (item) => item.activityContent,
      location: (item) => item.location,
    },
  }).filter((item) =>
    matchesSearch([
      item.id,
      item.customerCode,
      item.customer,
      item.opportunity,
      item.activityMode,
      item.activityContent,
      item.location,
      item.attendees,
    ]),
  )

  const filteredQuotations = filterRecords(activeQuotationRecords, filters, {
    status: (item) => getQuotationDisplayStatus(item),
    date: (item) => item.date,
    fields: { product: (item) => item.items.map((entry) => entry.name).join(", "), customer: (item) => item.customer },
  }).filter((item) =>
    matchesSearch([
      item.id,
      item.customer,
      item.opportunity,
      item.items.map((entry) => entry.name).join(", "),
      item.amount,
      item.validity,
      getQuotationDisplayStatus(item),
    ]),
  )

  const filteredRequests = filterRecords(activityRequests, filters, {
    status: (item) => item.status,
    owner: (item) => item.receiver,
    date: (item) => item.date,
    fields: { type: (item) => item.type, requester: (item) => item.requester, customer: (item) => item.customer },
  })
    .filter((item) =>
      matchesSearch([
        item.id,
        item.type,
        item.requester,
        item.receiver,
        item.customer,
        item.opportunity,
        item.status,
        item.date,
        item.dueDate,
      ]),
    )
    .sort((a, b) => b.date.localeCompare(a.date))

  const completedActivityRequests = useMemo(
    () =>
      activityRequests
        .filter((item) => item.status === "접수완료")
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [activityRequests],
  )

  const monthlyCompletedRequests = useMemo(
    () =>
      completedActivityRequests.filter((item) => {
        const activityDate = new Date(`${item.dueDate}T00:00:00`)
        return (
          activityDate.getFullYear() === month.getFullYear() &&
          activityDate.getMonth() === month.getMonth()
        )
      }),
    [completedActivityRequests, month],
  )

  useEffect(() => {
    if (!selectedCalendarDate && monthlyCompletedRequests.length > 0) {
      setSelectedCalendarDate(new Date(`${monthlyCompletedRequests[0].dueDate}T00:00:00`))
    }
  }, [monthlyCompletedRequests, selectedCalendarDate])

  const completedRequestDates = useMemo(
    () => completedActivityRequests.map((item) => new Date(`${item.dueDate}T00:00:00`)),
    [completedActivityRequests],
  )

  const activityCustomerCards = useMemo(() => {
    const today = new Date()
    const recentThreshold = new Date(today)
    recentThreshold.setMonth(recentThreshold.getMonth() - 1)

    return Array.from(
      filteredActivities.reduce((map, activity) => {
        const existing = map.get(activity.customer) ?? {
          customer: activity.customer,
          customerCode: activity.customerCode,
          count: 0,
          recentCount: 0,
          latestActivityDate: "",
        }

        existing.count += 1
        if (new Date(`${activity.date}T00:00:00`) >= recentThreshold) {
          existing.recentCount += 1
        }
        if (!existing.latestActivityDate || activity.date > existing.latestActivityDate) {
          existing.latestActivityDate = activity.date
        }

        map.set(activity.customer, existing)
        return map
      }, new Map<string, { customer: string; customerCode: string; count: number; recentCount: number; latestActivityDate: string }>()),
    )
      .map(([, value]) => value)
      .sort((a, b) => {
        if (a.latestActivityDate !== b.latestActivityDate) {
          return b.latestActivityDate.localeCompare(a.latestActivityDate)
        }
        return a.customer.localeCompare(b.customer)
      })
  }, [filteredActivities])

  const previewActivityCustomerCards = useMemo(
    () => activityCustomerCards.slice(0, 10),
    [activityCustomerCards],
  )

  if (!isMounted) {
    return null
  }

  const handleResetRequests = () => {
    window.localStorage.removeItem(REQUESTS_STORAGE_KEY)
    window.localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY)
    window.localStorage.removeItem(REQUEST_CALENDAR_OPEN_KEY)
    window.localStorage.removeItem(ACTIVITY_ACTIVE_TAB_KEY)
    window.location.reload()
  }

  const formatAmount = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "0"
    if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value).toLocaleString("ko-KR") : "0"

    const normalized = value.replace(/[^\d]/g, "")
    return Number.parseInt(normalized || "0", 10).toLocaleString("ko-KR")
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header
          title="활동"
          description="영업활동 내역, 견적, 활동 요청을 통합 관리합니다"
        />

        <main className="flex-1 overflow-auto p-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "activities" | "quotations" | "requests")} className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="activities" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  활동 현황
                </TabsTrigger>
                <TabsTrigger value="quotations" className="gap-2">
                  <FileText className="w-4 h-4" />
                  견적 관리
                </TabsTrigger>
                <TabsTrigger value="requests" className="gap-2">
                  <Users className="w-4 h-4" />
                  활동 요청
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <PageSearchForm
                  value={searchTerm}
                  onChange={setSearchTerm}
                  onSearch={() => setAppliedSearchTerm(searchTerm)}
                />
                <FilterPopover
                  title="영업활동"
                  statusOptions={activeTab === "requests" ? activityRequestStatusOptions : activityStatuses}
                  value={filters}
                  onApply={setFilters}
                  ownerLabel={activeTab === "activities" ? "참석자" : "담당자"}
                  fieldOptions={activityFieldOptions}
                  showStatusFilter={activeTab !== "activities"}
                />
                {activeTab === "requests" && (
                  <Button variant="outline" onClick={handleResetRequests}>
                    초기화
                  </Button>
                )}
                {activeTab === "quotations" && (
                  <Button asChild className="bg-primary hover:bg-primary/90">
                    <Link href="/activity/standard-pricing">
                      <Plus className="mr-2 w-4 h-4" />
                      표준가격표 등록
                    </Link>
                  </Button>
                )}
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <Link href={`/activity/new/${activeTab}`}>
                    <Plus className="mr-2 w-4 h-4" />
                    {activeTab === "activities" ? "활동 등록" : activeTab === "quotations" ? "견적 등록" : "활동요청 등록"}
                  </Link>
                </Button>
              </div>
            </div>

            <TabsContent value="activities">
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">고객사별 활동 현황</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{activityCustomerCards.length}개 고객사</Badge>
                        <Button variant="outline" size="sm" asChild>
                          <Link href="/activity/customers">전체 보기</Link>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {previewActivityCustomerCards.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        {previewActivityCustomerCards.map((customer) => (
                          <Link
                            key={customer.customer}
                            className={`min-h-[168px] rounded-xl border p-5 text-left transition-colors ${
                              "hover:bg-muted/50"
                            }`}
                            href={`/activity/customers/${customer.customerCode}`}
                          >
                            <div className="flex h-full flex-col justify-between">
                              <div>
                                <p className="line-clamp-2 text-lg font-semibold">{customer.customer}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{customer.customerCode}</p>
                              </div>
                              <div className="mt-5 text-sm text-muted-foreground">
                                <p>최근1개월활동건수 {customer.recentCount}건</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        조건에 맞는 고객사 활동이 없습니다.
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>
            </TabsContent>

            <TabsContent value="quotations">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">견적서 목록</CardTitle>
                    <Badge variant="secondary">{filteredQuotations.length}건</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">작성일</TableHead>
                        <TableHead>고객사</TableHead>
                        <TableHead>사업기회</TableHead>
                        <TableHead>제품</TableHead>
                        <TableHead className="text-right">금액</TableHead>
                        <TableHead>유효기간</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuotations.map((quote) => (
                        <TableRow
                          key={quote.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/activity/quotations/${quote.id}`)}
                        >
                          <TableCell>{quote.date}</TableCell>
                          <TableCell className="font-medium">{quote.customer}</TableCell>
                          <TableCell>{quote.opportunity}</TableCell>
                          <TableCell>{quote.items.map((entry) => entry.name).join(", ")}</TableCell>
                          <TableCell className="text-right font-medium">₩{formatAmount(quote.amount)}</TableCell>
                          <TableCell>{quote.validity}</TableCell>
                          <TableCell>
                            {(() => {
                              const displayStatus = getQuotationDisplayStatus(quote)
                              return (
                            <Badge
                              variant={
                                displayStatus === "전달완료" ? "default" :
                                displayStatus === "검토중" ? "secondary" :
                                displayStatus === "삭제" ? "destructive" : "outline"
                              }
                              className={
                                displayStatus === "전달완료" ? "bg-green-100 text-green-700 hover:bg-green-100" :
                                displayStatus === "검토중" ? "bg-blue-100 text-blue-700 hover:bg-blue-100" :
                                displayStatus === "삭제" ? "bg-red-100 text-red-700 hover:bg-red-100" :
                                "bg-amber-100 text-amber-700 hover:bg-amber-100"
                              }
                            >
                              {displayStatus}
                            </Badge>
                              )
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests">
              <div className="space-y-6">
              <Collapsible open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">월 단위 캘린더</CardTitle>
                        <p className="text-sm text-muted-foreground">접수완료된 영업 활동요청을 활동일 기준으로 표시합니다</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                          <CalendarDays className="w-4 h-4" />
                          {monthlyCompletedRequests.length}건
                        </Badge>
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            {isCalendarOpen ? "캘린더 숨기기" : "캘린더 보기"}
                            {isCalendarOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
                        <div className="overflow-x-auto">
                          <MonthCalendar
                            month={month}
                            onMonthChange={setMonth}
                            modifiers={{
                              completedRequestDate: completedRequestDates,
                              ...(selectedCalendarDate ? { activeRequestDate: [selectedCalendarDate] } : {}),
                            }}
                            modifiersClassNames={{
                              completedRequestDate:
                                "bg-primary text-primary-foreground rounded-md hover:bg-primary hover:text-primary-foreground",
                              activeRequestDate: "ring-2 ring-primary ring-offset-2",
                            }}
                            onDayClick={(day, modifiers, event) => {
                              event.preventDefault()
                            }}
                            className="rounded-lg border"
                          />
                        </div>
                        <div className="space-y-3">
                          {monthlyCompletedRequests.map((request) => (
                            <button
                              key={request.id}
                              type="button"
                              className={`w-full rounded-lg border p-4 text-left transition-colors ${
                                selectedCalendarDate?.toISOString().slice(0, 10) === request.dueDate
                                  ? "border-primary bg-primary/5"
                                  : "hover:bg-muted/50"
                              }`}
                              onClick={() => {
                                setSelectedCalendarDate(new Date(`${request.dueDate}T00:00:00`))
                                setMonth(new Date(`${request.dueDate}T00:00:00`))
                              }}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-medium">{request.customer}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {request.dueDate} | {request.type} | 요청자 {request.requester} | 담당자 {request.receiver}
                                  </p>
                                </div>
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">접수완료</Badge>
                              </div>
                            </button>
                          ))}
                          {monthlyCompletedRequests.length === 0 && (
                            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                              선택한 월에 접수완료된 영업 활동요청이 없습니다.
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">활동요청현황</CardTitle>
                    <Badge variant="secondary">{filteredRequests.length}건</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">요청일</TableHead>
                        <TableHead className="text-center">요청유형</TableHead>
                        <TableHead>요청자</TableHead>
                        <TableHead>담당자</TableHead>
                        <TableHead>고객사</TableHead>
                        <TableHead>활동일</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((req) => (
                        <TableRow
                          key={req.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/activity/requests/${req.id}`)}
                        >
                          <TableCell>{req.date}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{req.type}</Badge>
                          </TableCell>
                          <TableCell>{req.requester}</TableCell>
                          <TableCell className="font-medium">{req.receiver}</TableCell>
                          <TableCell>{req.customer}</TableCell>
                          <TableCell>{req.dueDate}</TableCell>
                          <TableCell>
                            <Badge
                              variant={req.status === "접수완료" ? "default" : "secondary"}
                              className={req.status === "접수완료" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}
                            >
                              {req.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
