"use client"

import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  XCircle,
} from "lucide-react"

// 결재 대기 목록
const pendingApprovals = [
  {
    id: "APR-2026-0125",
    type: "수주보고",
    title: "현대해상 ITSM 구축 수주보고",
    requester: "이대리",
    requestDate: "2026-03-15",
    currentStep: "사업본부장",
    steps: ["상신자", "팀장", "본부장", "사업본부장", "경영지원팀장", "대표이사"],
    currentStepIndex: 3,
  },
  {
    id: "APR-2026-0126",
    type: "PRB",
    title: "국방부 ITSM PRB 검토",
    requester: "이대리",
    requestDate: "2026-03-16",
    currentStep: "본부장",
    steps: ["영업대표", "영업팀장", "본부장"],
    currentStepIndex: 2,
  },
]

// 내가 요청한 결재
const myRequests = [
  {
    id: "APR-2026-0120",
    type: "수주보고",
    title: "농협은행 통합 모니터링 시스템 수주보고",
    requestDate: "2026-03-05",
    status: "승인완료",
    approvedDate: "2026-03-08",
  },
  {
    id: "APR-2026-0118",
    type: "활동지원",
    title: "삼성전자 EMS 데모 지원 요청",
    requestDate: "2026-03-01",
    status: "승인완료",
    approvedDate: "2026-03-02",
  },
  {
    id: "APR-2026-0125",
    type: "수주보고",
    title: "현대해상 ITSM 구축 수주보고",
    requestDate: "2026-03-15",
    status: "진행중",
    approvedDate: "-",
  },
]

// 완료된 결재
const completedApprovals = [
  {
    id: "APR-2026-0120",
    type: "수주보고",
    title: "농협은행 통합 모니터링 시스템 수주보고",
    requester: "김영업",
    requestDate: "2026-03-05",
    approvedDate: "2026-03-08",
    result: "승인",
  },
  {
    id: "APR-2026-0115",
    type: "PRB",
    title: "삼성전자 EMS PRB 검토",
    requester: "김영업",
    requestDate: "2026-03-01",
    approvedDate: "2026-03-03",
    result: "승인",
  },
  {
    id: "APR-2026-0110",
    type: "견적서",
    title: "SK텔레콤 NMS 견적서",
    requester: "박과장",
    requestDate: "2026-02-25",
    approvedDate: "2026-02-26",
    result: "반려",
  },
]

export default function WorkflowPage() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header 
          title="워크플로우" 
          description="요청-접수-승인 절차를 관리합니다"
        />
        
        <main className="flex-1 p-6 overflow-auto">
          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">결재 대기</p>
                    <p className="text-3xl font-bold">{pendingApprovals.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">요청한 결재</p>
                    <p className="text-3xl font-bold">{myRequests.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">이번 달 승인</p>
                    <p className="text-3xl font-bold text-green-600">12</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">이번 달 반려</p>
                    <p className="text-3xl font-bold text-red-600">1</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="w-4 h-4" />
                결재 대기
                {pendingApprovals.length > 0 && (
                  <Badge className="bg-primary text-primary-foreground ml-1">{pendingApprovals.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="my-requests" className="gap-2">
                <FileText className="w-4 h-4" />
                내가 요청한 결재
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                완료된 결재
              </TabsTrigger>
            </TabsList>

            {/* 결재 대기 탭 */}
            <TabsContent value="pending">
              <div className="space-y-4">
                {pendingApprovals.map((approval) => (
                  <Card key={approval.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{approval.type}</Badge>
                            <span className="font-mono text-sm text-muted-foreground">{approval.id}</span>
                          </div>
                          <h3 className="text-lg font-semibold">{approval.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            요청자: {approval.requester} | 요청일: {approval.requestDate}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline">반려</Button>
                          <Button className="bg-primary hover:bg-primary/90">승인</Button>
                        </div>
                      </div>
                      
                      {/* 결재 진행 상태 */}
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t overflow-x-auto">
                        {approval.steps.map((step, idx) => (
                          <div key={idx} className="flex items-center">
                            <div className={`
                              px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                              ${idx < approval.currentStepIndex ? 'bg-green-100 text-green-700' :
                                idx === approval.currentStepIndex ? 'bg-primary text-primary-foreground' :
                                'bg-muted text-muted-foreground'}
                            `}>
                              {idx < approval.currentStepIndex && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                              {step}
                            </div>
                            {idx < approval.steps.length - 1 && (
                              <ArrowRight className="w-4 h-4 mx-2 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {pendingApprovals.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      대기 중인 결재가 없습니다.
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* 내가 요청한 결재 탭 */}
            <TabsContent value="my-requests">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">내가 요청한 결재 목록</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {myRequests.map((request) => (
                      <div 
                        key={request.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center
                            ${request.status === '승인완료' ? 'bg-green-100' :
                              request.status === '진행중' ? 'bg-blue-100' : 'bg-red-100'}
                          `}>
                            {request.status === '승인완료' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                             request.status === '진행중' ? <Clock className="w-5 h-5 text-blue-600" /> :
                             <XCircle className="w-5 h-5 text-red-600" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{request.type}</Badge>
                              <span className="font-mono text-sm text-muted-foreground">{request.id}</span>
                            </div>
                            <p className="font-medium">{request.title}</p>
                            <p className="text-sm text-muted-foreground">요청일: {request.requestDate}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            request.status === '승인완료' ? 'default' :
                            request.status === '진행중' ? 'secondary' : 'destructive'
                          }
                            className={
                              request.status === '승인완료' ? 'bg-green-100 text-green-700' :
                              request.status === '진행중' ? 'bg-blue-100 text-blue-700' : ''
                            }
                          >
                            {request.status}
                          </Badge>
                          {request.approvedDate !== '-' && (
                            <p className="text-sm text-muted-foreground mt-1">
                              완료일: {request.approvedDate}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 완료된 결재 탭 */}
            <TabsContent value="completed">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">완료된 결재 목록</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {completedApprovals.map((approval) => (
                      <div 
                        key={approval.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center
                            ${approval.result === '승인' ? 'bg-green-100' : 'bg-red-100'}
                          `}>
                            {approval.result === '승인' ? 
                              <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                              <XCircle className="w-5 h-5 text-red-600" />
                            }
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{approval.type}</Badge>
                              <span className="font-mono text-sm text-muted-foreground">{approval.id}</span>
                            </div>
                            <p className="font-medium">{approval.title}</p>
                            <p className="text-sm text-muted-foreground">
                              요청자: {approval.requester} | 요청일: {approval.requestDate}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={approval.result === '승인' ? 'default' : 'destructive'}
                            className={approval.result === '승인' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
                          >
                            {approval.result}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            처리일: {approval.approvedDate}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
