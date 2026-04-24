"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { StatCard } from "@/components/erp/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { currentUser } from "@/lib/current-user"
import { getWorkflowTasks, subscribeWorkflowUpdates, type WorkflowTask } from "@/lib/activity-request-workflow"
import {
  Search,
  Activity,
  FileText,
  Handshake,
  Briefcase,
  Wrench,
  ArrowRight,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react"

// 영업 파이프라인 단계
const pipelineStages = [
  { id: "finding", label: "발굴", count: 12, icon: Search, href: "/finding", color: "bg-blue-500" },
  { id: "activity", label: "활동", count: 12, icon: Activity, href: "/activity", color: "bg-cyan-500" },
  { id: "bid", label: "입찰", count: 5, icon: FileText, href: "/bid", color: "bg-amber-500" },
  { id: "contract", label: "계약", count: 3, icon: Handshake, href: "/contract", color: "bg-green-500" },
  { id: "project", label: "사업", count: 7, icon: Briefcase, href: "/project", color: "bg-purple-500" },
  { id: "maintenance", label: "유지보수", count: 15, icon: Wrench, href: "/maintenance", color: "bg-orange-500" },
]

// 최근 활동 내역
const recentActivities = [
  { id: 1, type: "meeting", customer: "삼성전자", content: "EMS 제안 미팅 완료", date: "2026-03-17", status: "completed" },
  { id: 2, type: "rfp", customer: "LG CNS", content: "RFP 분석 진행 중", date: "2026-03-16", status: "in-progress" },
  { id: 3, type: "contract", customer: "현대자동차", content: "계약서 검토 대기", date: "2026-03-15", status: "pending" },
  { id: 4, type: "demo", customer: "SK텔레콤", content: "제품 데모 예정", date: "2026-03-18", status: "scheduled" },
  { id: 5, type: "support", customer: "카카오", content: "고객 지원 요청 접수", date: "2026-03-17", status: "in-progress" },
]

// 알림
const alerts = [
  { id: 1, type: "warning", message: "삼성SDS 유지보수 종료 D-30", href: "/maintenance" },
  { id: 2, type: "info", message: "신규 사업기회 3건 등록됨", href: "/finding" },
  { id: 3, type: "warning", message: "LG전자 유상유지보수 계약 미체결", href: "/maintenance" },
]

export default function DashboardPage() {
  const [myTasks, setMyTasks] = useState<WorkflowTask[]>([])

  useEffect(() => {
    const sync = () => setMyTasks(getWorkflowTasks(currentUser.name))

    sync()
    return subscribeWorkflowUpdates(sync)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header 
          title="대시보드" 
          description="영업관리시스템 주요 현황을 한눈에 확인하세요"
        />
        
        <main className="flex-1 p-6 overflow-auto">
          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="이번 달 사업기회"
              value={28}
              change="+12% 전월 대비"
              changeType="positive"
              icon={Search}
            />
            <StatCard
              title="진행 중인 입찰"
              value={5}
              change="3건 제안 준비 중"
              changeType="neutral"
              icon={FileText}
            />
            <StatCard
              title="이번 달 수주"
              value="₩2.4억"
              change="+8% 전월 대비"
              changeType="positive"
              icon={Handshake}
            />
            <StatCard
              title="유지보수 종료 예정"
              value={7}
              change="3개월 이내"
              changeType="negative"
              icon={Wrench}
            />
          </div>

          {/* 알림 영역 */}
          {alerts.length > 0 && (
            <Card className="mb-6 border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <AlertCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 flex items-center gap-4 flex-wrap">
                    {alerts.map((alert) => (
                      <Link 
                        key={alert.id} 
                        href={alert.href}
                        className="text-sm hover:text-primary transition-colors flex items-center gap-2"
                      >
                        <span className={alert.type === "warning" ? "text-amber-600" : "text-foreground"}>
                          {alert.message}
                        </span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 영업 파이프라인 */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">영업관리 단계별 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                {pipelineStages.map((stage, index) => (
                  <Link 
                    key={stage.id}
                    href={stage.href}
                    className="flex-1 min-w-[120px]"
                  >
                    <div className="relative group">
                      <div className={`
                        p-4 rounded-lg border-2 border-transparent
                        hover:border-primary hover:shadow-md
                        transition-all duration-200 bg-card
                        flex flex-col items-center gap-2
                      `}>
                        <div className={`w-10 h-10 rounded-full ${stage.color} flex items-center justify-center`}>
                          <stage.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-sm">{stage.label}</p>
                          <p className="text-2xl font-bold text-foreground">{stage.count}</p>
                        </div>
                      </div>
                      {index < pipelineStages.length - 1 && (
                        <ArrowRight className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 최근 활동 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg font-semibold">최근 활동</CardTitle>
                <Link href="/activity">
                  <Button variant="ghost" size="sm" className="text-primary">
                    전체 보기 <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div 
                      key={activity.id}
                      className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                        ${activity.status === 'completed' ? 'bg-green-100 text-green-600' :
                          activity.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                          activity.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                          'bg-purple-100 text-purple-600'}
                      `}>
                        {activity.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> :
                         activity.status === 'scheduled' ? <Calendar className="w-4 h-4" /> :
                         <Clock className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{activity.customer}</span>
                          <Badge variant="secondary" className="text-xs">
                            {activity.type === 'meeting' ? '미팅' :
                             activity.type === 'rfp' ? 'RFP' :
                             activity.type === 'contract' ? '계약' :
                             activity.type === 'demo' ? '데모' : '지원'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{activity.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 나의 업무 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg font-semibold">나의 업무</CardTitle>
                <Link href="/workflow">
                  <Button variant="ghost" size="sm" className="text-primary">
                    전체 보기 <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {myTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={task.href}
                      className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className={`
                        w-2 h-2 rounded-full flex-shrink-0
                        ${task.statusLabel === '승인 필요' ? 'bg-red-500' : 'bg-green-500'}
                      `} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">활동일: {task.dueDate}</p>
                      </div>
                      <Badge 
                        variant={task.statusLabel === '승인 필요' ? 'destructive' : 'secondary'}
                        className={`text-xs ${
                          task.statusLabel === '승인 필요'
                            ? ''
                            : 'bg-green-100 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {task.statusLabel}
                      </Badge>
                    </Link>
                  ))}
                  {myTasks.length === 0 && (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      표시할 업무가 없습니다.
                    </div>
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
