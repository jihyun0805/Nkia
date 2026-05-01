"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { getCustomers } from "@/lib/finding-data"

export default function FindingCustomersPage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const customerCards = useMemo(
    () =>
      [...getCustomers()].sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name, "ko")
        if (nameCompare !== 0) return nameCompare
        return a.id.localeCompare(b.id)
      }),
    [],
  )

  if (!isMounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="고객사 현황" description="고객사 카드를 선택해 해당 고객사의 상세 정보를 확인합니다" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/finding?tab=customers">발굴</Link>
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
                      <Link href="/finding?tab=customers">메인으로</Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  {customerCards.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      className="min-h-[168px] rounded-xl border p-5 text-left transition-colors hover:bg-muted/50"
                      onClick={() => router.push(`/finding/customers/${customer.id}?tab=customers`)}
                    >
                      <div className="flex h-full flex-col justify-between">
                        <div>
                          <p className="line-clamp-2 text-lg font-semibold">{customer.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{customer.id}</p>
                        </div>
                        <div className="mt-5 text-sm text-muted-foreground">
                          <p>누적계약건수 {customer.contracts}건</p>
                        </div>
                      </div>
                    </button>
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
