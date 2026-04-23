"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { defaultFilterValues, filterRecords, type FilterValues, uniqueOptions } from "@/lib/filter-utils"
import { activityRequestStatusOptions, activityRequestTypeOptions, activityRequests, activities, activityStatuses, quotations } from "@/lib/activity-data"
import { useState } from "react"
import {
  Plus,
  Search,
  Mail,
  Phone,
  Users,
  FileText,
  Calendar,
} from "lucide-react"

export default function ActivityPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<FilterValues>(defaultFilterValues)
  const [activeTab, setActiveTab] = useState<"activities" | "quotations" | "requests">("activities")
  const activityFieldOptions = activeTab === "activities"
    ? [
      { key: "customer", label: "고객사", options: uniqueOptions(activities, (item) => item.customer) },
      { key: "opportunity", label: "사업기회", options: uniqueOptions(activities, (item) => item.opportunity) },
      { key: "type", label: "활동구분", options: uniqueOptions(activities, (item) => item.type) },
      { key: "location", label: "장소", options: uniqueOptions(activities, (item) => item.location) },
    ]
    : activeTab === "quotations"
      ? [
        { key: "product", label: "제품", options: uniqueOptions(quotations, (item) => item.product) },
        { key: "customer", label: "고객사", options: uniqueOptions(quotations, (item) => item.customer) },
      ]
      : [
        { key: "type", label: "요청유형", options: activityRequestTypeOptions },
        { key: "requester", label: "요청자", options: uniqueOptions(activityRequests, (item) => item.requester) },
        { key: "customer", label: "고객사", options: uniqueOptions(activityRequests, (item) => item.customer) },
      ]

  const filteredActivities = filterRecords(activities, filters, {
    owner: (item) => item.attendees,
    date: (item) => item.date,
    fields: {
      customer: (item) => item.customer,
      opportunity: (item) => item.opportunity,
      type: (item) => item.type,
      location: (item) => item.location,
    },
  }).filter((item) =>
    [item.customer, item.opportunity, item.type, item.location, item.attendees, item.content, item.issues, item.nextAction]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  )

  const filteredQuotations = filterRecords(quotations, filters, {
    status: (item) => item.status,
    date: (item) => item.date,
    fields: { product: (item) => item.product, customer: (item) => item.customer },
  }).filter((item) =>
    [item.id, item.customer, item.opportunity, item.product]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  )

  const filteredRequests = filterRecords(activityRequests, filters, {
    status: (item) => item.status,
    owner: (item) => item.receiver,
    date: (item) => item.date,
    fields: { type: (item) => item.type, requester: (item) => item.requester, customer: (item) => item.customer },
  }).filter((item) =>
    [item.id, item.requester, item.receiver, item.customer, item.content]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  )

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
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="검색..."
                    className="w-64 pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <FilterPopover
                  title="영업활동"
                  statusOptions={activeTab === "requests" ? activityRequestStatusOptions : activityStatuses}
                  value={filters}
                  onApply={setFilters}
                  ownerLabel={activeTab === "activities" ? "참석자" : "담당자"}
                  fieldOptions={activityFieldOptions}
                  showStatusFilter={activeTab !== "activities"}
                />
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <Link href={`/activity/new/${activeTab}`}>
                    <Plus className="mr-2 w-4 h-4" />
                    {activeTab === "activities" ? "활동 등록" : activeTab === "quotations" ? "견적 등록" : "활동요청 등록"}
                  </Link>
                </Button>
              </div>
            </div>

            <TabsContent value="activities">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">활동 현황</CardTitle>
                    <Badge variant="secondary">{filteredActivities.length}건</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[15%]">고객사</TableHead>
                        <TableHead className="w-[22%]">사업기회</TableHead>
                        <TableHead className="w-[100px]">활동일</TableHead>
                        <TableHead className="w-[120px]">활동구분</TableHead>
                        <TableHead className="w-[15%]">장소</TableHead>
                        <TableHead className="w-[14%]">참석자</TableHead>
                        <TableHead>주요내용</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredActivities.map((activity) => (
                        <TableRow
                          key={activity.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/activity/activities/${activity.id}`)}
                        >
                          <TableCell className="font-medium">{activity.customer}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{activity.opportunity}</TableCell>
                          <TableCell>{activity.date}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              {activity.type === "이메일" && <Mail className="w-3 h-3" />}
                              {activity.type === "전화" && <Phone className="w-3 h-3" />}
                              {activity.type === "대면미팅" && <Users className="w-3 h-3" />}
                              {activity.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">{activity.location}</TableCell>
                          <TableCell className="max-w-[140px] truncate">{activity.attendees}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{activity.content}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
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
                          <TableCell>{quote.product}</TableCell>
                          <TableCell className="text-right font-medium">₩{quote.amount}</TableCell>
                          <TableCell>{quote.validity}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                quote.status === "전달완료" ? "default" :
                                quote.status === "검토중" ? "secondary" : "outline"
                              }
                              className={
                                quote.status === "전달완료" ? "bg-green-100 text-green-700 hover:bg-green-100" :
                                quote.status === "검토중" ? "bg-blue-100 text-blue-700 hover:bg-blue-100" :
                                "bg-amber-100 text-amber-700 hover:bg-amber-100"
                              }
                            >
                              {quote.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests">
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
                        <TableHead>요청유형</TableHead>
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
                          <TableCell>
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
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
