"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { partners } from "@/lib/finding-data"

export default function FindingPartnersPage() {
  const router = useRouter()

  const partnerCards = useMemo(
    () =>
      [...partners].sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name, "ko")
        if (nameCompare !== 0) return nameCompare
        return a.id.localeCompare(b.id)
      }),
    [],
  )

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="협력사 현황" description="협력사 카드를 선택해 해당 협력사의 상세 정보를 확인합니다" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/finding?tab=partners">발굴</Link>
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
                  <CardTitle className="text-lg">협력사 카드 전체 보기</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{partnerCards.length}개 협력사</Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/finding?tab=partners">메인으로</Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  {partnerCards.map((partner) => (
                    <button
                      key={partner.id}
                      type="button"
                      className="min-h-[168px] rounded-xl border p-5 text-left transition-colors hover:bg-muted/50"
                      onClick={() => router.push(`/finding/partners/${partner.id}?tab=partners`)}
                    >
                      <div className="flex h-full flex-col justify-between">
                        <div>
                          <p className="line-clamp-2 text-lg font-semibold">{partner.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{partner.id}</p>
                        </div>
                        <div className="mt-5 text-sm text-muted-foreground">
                          <p>누적프로젝트건수 {partner.projects}건</p>
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
