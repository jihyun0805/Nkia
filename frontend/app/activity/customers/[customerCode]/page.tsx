"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { type ActivityRecord, getActivityDisplayType } from "@/lib/activity-data"
import { loadBackendActivityRecords } from "@/lib/sales-activity-backend"
import { getCustomerByCode, normalizeCustomerKeyword } from "@/lib/finding-data"
import { loadBackendFindingData } from "@/lib/finding-backend"
import type { CustomerRecord } from "@/lib/finding-data"
import { Mail, Phone, Users } from "lucide-react"

const activitiesPerPage = 10

function customerKeywordMatches(value: string | undefined, target: string) {
  const normalizedValue = normalizeCustomerKeyword(value ?? "")
  const normalizedTarget = normalizeCustomerKeyword(target)
  return Boolean(normalizedValue) && normalizedValue === normalizedTarget
}

export default function ActivityCustomerDetailPage() {
  const params = useParams<{ customerCode: string }>()
  const router = useRouter()
  const customerCode = params.customerCode
  const [page, setPage] = useState(1)
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([])
  const [customer, setCustomer] = useState<CustomerRecord | null>(null)

  const displayCustomer =
    customer ?? {
      id: customerCode,
      name: customerCode,
      category: "-",
      opportunities: 0,
      contracts: 0,
      contact: "-",
      phone: "-",
    }

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

    loadBackendFindingData()
      .then((data) => {
        if (cancelled) return
        setCustomer(data.customers.find((item) => item.id === customerCode) ?? null)
      })
      .catch(() => {
        if (cancelled) return
        setCustomer(getCustomerByCode(customerCode))
      })

    return () => {
      cancelled = true
    }
  }, [customerCode])

  const customerActivities = useMemo(
    () => {
      const normalizedCustomerName = normalizeCustomerKeyword(displayCustomer.name)

      return activityRecords
        .filter((activity) => {
          if (customerKeywordMatches(activity.customerCode, customerCode)) return true
          if (customerKeywordMatches(activity.customer, displayCustomer.name)) return true
          if (normalizedCustomerName && normalizeCustomerKeyword(activity.customer) === normalizedCustomerName) return true
          return false
        })
        .sort((a, b) => b.date.localeCompare(a.date))
    },
    [activityRecords, customerCode, displayCustomer.name],
  )
  const totalPages = Math.max(1, Math.ceil(customerActivities.length / activitiesPerPage))
  const paginatedActivities = useMemo(() => {
    const startIndex = (page - 1) * activitiesPerPage
    return customerActivities.slice(startIndex, startIndex + activitiesPerPage)
  }, [customerActivities, page])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${displayCustomer.name} 활동 현황`} description="고객사 하위의 모든 활동 이력을 최신순으로 확인합니다" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/activity">활동</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{displayCustomer.name}</BreadcrumbPage>
                  </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">활동 목록</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {displayCustomer.name} / {displayCustomer.id}
                    </p>
                  </div>
                  <Badge variant="secondary">{customerActivities.length}건</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[16%]">고객사</TableHead>
                      <TableHead className="w-[24%]">사업기회</TableHead>
                      <TableHead className="w-[100px]">활동일</TableHead>
                      <TableHead className="w-[180px]">활동구분</TableHead>
                      <TableHead className="w-[14%]">등록자</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedActivities.map((activity) => (
                      <TableRow
                        key={activity.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/activity/activities/${activity.id}`)}
                      >
                        <TableCell className="font-medium">{activity.customer}</TableCell>
                        <TableCell className="max-w-[220px] truncate">{activity.opportunity}</TableCell>
                        <TableCell>{activity.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {activity.activityMode === "이메일" && <Mail className="w-3 h-3" />}
                            {activity.activityMode === "전화" && <Phone className="w-3 h-3" />}
                            {activity.activityMode === "대면미팅" && <Users className="w-3 h-3" />}
                            {activity.activityMode === "영상회의" && <Users className="w-3 h-3" />}
                            {getActivityDisplayType(activity)}
                          </Badge>
                        </TableCell>
                        <TableCell>{activity.registrant ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {customerActivities.length === 0
                      ? "0건"
                      : `${(page - 1) * activitiesPerPage + 1}-${Math.min(page * activitiesPerPage, customerActivities.length)} / ${customerActivities.length}건`}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page === 1}
                    >
                      이전
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={page === totalPages}
                    >
                      다음
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
