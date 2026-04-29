"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { toast } from "@/hooks/use-toast"
import {
  type ActivityCategory,
  activities,
  getActivityItemFields,
  getCategoryLabel,
  quotations,
  type ActivityRequestRecord,
} from "@/lib/activity-data"
import {
  approveActivityRequest,
  getActivityRequests,
  subscribeWorkflowUpdates,
} from "@/lib/activity-request-workflow"
import { currentUser } from "@/lib/current-user"

const fullWidthFieldLabels = ["주요 내용", "고객 관심 사항 / 이슈", "다음 할 일", "견적 비고", "요청 내용"]

export default function ActivityDetailPage() {
  const params = useParams<{ category: ActivityCategory; id: string }>()
  const [requests, setRequests] = useState<ActivityRequestRecord[]>([])

  useEffect(() => {
    const sync = () => setRequests(getActivityRequests())

    sync()
    return subscribeWorkflowUpdates(sync)
  }, [])

  const category = params.category
  const id = params.id

  const item = useMemo(() => {
    if (category === "activities") return activities.find((entry) => entry.id === id) ?? null
    if (category === "quotations") return quotations.find((entry) => entry.id === id) ?? null
    return requests.find((entry) => entry.id === id) ?? null
  }, [category, id, requests])

  if (!item) {
    return null
  }

  const categoryLabel = getCategoryLabel(category)
  const fields = getActivityItemFields(category, item)
  const isRequest = category === "requests"
  const requestItem = isRequest ? (item as ActivityRequestRecord) : null
  const canEditRequest = !requestItem || requestItem.requester === currentUser.name
  const listHref =
    category === "activities"
      ? `/activity/customers/${(item as { customerCode?: string }).customerCode ?? ""}`
      : "/activity"

  const handleApprove = () => {
    const approved = approveActivityRequest(id)
    if (!approved) return

    const approvedRequest = approved as ActivityRequestRecord

    toast({
      title: "접수 완료",
      description: `${approvedRequest.requester} 요청자에게 승인 알림을 전송했습니다.`,
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header
          title={`${categoryLabel} 상세`}
          description={`${categoryLabel} 건을 페이지에서 확인합니다`}
        />

        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/activity">활동</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{item.id}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader>
                <CardTitle>{categoryLabel} 상세</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {fields.map((field) => (
                    <div
                      key={field.label}
                      className={`space-y-2 ${fullWidthFieldLabels.includes(field.label) ? "md:col-span-2" : ""}`}
                    >
                      <Label>{field.label}</Label>
                      <Input readOnly value={field.value || "-"} />
                    </div>
                  ))}
                  {requestItem?.approvedAt && (
                    <div className="space-y-2">
                      <Label>승인일</Label>
                      <Input readOnly value={requestItem.approvedAt} />
                    </div>
                  )}
                  <div className="space-y-2 md:col-span-2">
                    <Label>첨부파일</Label>
                    <Input readOnly value="등록된 첨부파일이 없습니다." />
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href={listHref}>목록</Link>
                  </Button>
                  {requestItem && (
                    <Button variant="outline" asChild>
                      <Link href={`/activity/new/activities?requestId=${id}`}>활동 등록</Link>
                    </Button>
                  )}
                  {requestItem && requestItem.status !== "접수완료" && requestItem.receiver === currentUser.name && (
                    <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                      승인(접수)
                    </Button>
                  )}
                  {canEditRequest && (
                    <Button asChild className="bg-primary hover:bg-primary/90">
                      <Link href={`/activity/${category}/${id}/edit`}>수정</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
