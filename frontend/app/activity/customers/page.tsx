"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getActivities } from "@/lib/activity-data"
import { loadBackendActivityRecords } from "@/lib/sales-activity-backend"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

export default function ActivityCustomersPage() {
  const [activityRecords, setActivityRecords] = useState<ReturnType<typeof getActivities>>([])
  const today = new Date()
  const recentThreshold = new Date(today)
  recentThreshold.setMonth(recentThreshold.getMonth() - 1)

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
          setActivityRecords(getActivities())
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const customerCards = useMemo(() => Array.from(
    activityRecords.reduce((map, activity) => {
      const existing = map.get(activity.customerCode) ?? {
        customer: activity.customer,
        customerCode: activity.customerCode,
        recentCount: 0,
        latestActivityDate: "",
      }

      if (new Date(`${activity.date}T00:00:00`) >= recentThreshold) {
        existing.recentCount += 1
      }
      if (!existing.latestActivityDate || activity.date > existing.latestActivityDate) {
        existing.latestActivityDate = activity.date
      }

      map.set(activity.customerCode, existing)
      return map
    }, new Map<string, { customer: string; customerCode: string; recentCount: number; latestActivityDate: string }>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => {
      if (a.latestActivityDate !== b.latestActivityDate) {
        return b.latestActivityDate.localeCompare(a.latestActivityDate)
      }
      return a.customer.localeCompare(b.customer)
    }), [activityRecords, recentThreshold])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="고객사별 활동 현황" description="고객사 카드를 선택해 해당 고객사의 활동 이력을 확인합니다" />
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
                  <BreadcrumbPage>전체 보기</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">고객사 카드 전체 보기</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{customerCards.length}개 고객사</Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/activity">메인으로</Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  {customerCards.map((customer) => (
                    <Link
                      key={customer.customerCode}
                      href={`/activity/customers/${customer.customerCode}`}
                      className="min-h-[168px] rounded-xl border p-5 text-left transition-colors hover:bg-muted/50"
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
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
