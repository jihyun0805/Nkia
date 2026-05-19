"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Search, Activity, FileText, Handshake, Briefcase, Wrench, ArrowRight, AlertCircle, Bell, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { StatCard } from "@/components/erp/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadAuthSession } from "@/lib/auth-session";
import { contractApi } from "@/lib/api/contract-api";
import { projectApi } from "@/lib/api/project-api";
import { getFreeMaintenanceList, getPaidMaintenanceList } from "@/lib/api/maintenance";
import { getSalesActivities } from "@/lib/api/generated/sales-activity/sales-activity";
import { getBackendApiBaseUrl } from "@/lib/api-base-url";
import { buildAuthHeaders } from "@/lib/auth-session";
import { useAlarmHistory } from "@/hooks/use-alarms";
import { getAlarmNavigationUrl, type AlarmResponse } from "@/lib/api/alarm";
import type { CachedAlarm } from "@/hooks/use-alarms";

type DashboardMetrics = {
  opportunityCount: number;
  activityCount: number;
  rfpCount: number;
  inProgressRfpCount: number;
  contractCount: number;
  projectCount: number;
  maintenanceCount: number;
  upcomingMaintenanceCount: number;
  monthlyContractAmount: number;
};

type DashboardStage = {
  id: string;
  label: string;
  metricKey: keyof DashboardMetrics;
  icon: LucideIcon;
  href: string;
  color: string;
};

type PageResponse<T> = {
  content?: T[];
  totalElements?: number;
};

type RfpSummaryResponse = {
  status?: string;
};

const pipelineStages: DashboardStage[] = [
  { id: "finding", label: "발굴", metricKey: "opportunityCount", icon: Search, href: "/finding", color: "bg-blue-500" },
  { id: "activity", label: "활동", metricKey: "activityCount", icon: Activity, href: "/activity", color: "bg-cyan-500" },
  { id: "bid", label: "입찰", metricKey: "rfpCount", icon: FileText, href: "/bid", color: "bg-amber-500" },
  { id: "contract", label: "계약", metricKey: "contractCount", icon: Handshake, href: "/contract", color: "bg-green-500" },
  { id: "project", label: "사업", metricKey: "projectCount", icon: Briefcase, href: "/project", color: "bg-purple-500" },
  { id: "maintenance", label: "유지보수", metricKey: "maintenanceCount", icon: Wrench, href: "/maintenance", color: "bg-orange-500" },
];

function formatCurrency(value: number) {
  return `₩${value.toLocaleString("ko-KR")}`;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isCurrentMonth(value?: string | null) {
  const date = parseDate(value);
  if (!date) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function isWithinDays(days: number, value?: string | null) {
  const date = parseDate(value);
  if (!date) return false;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { result?: string; data?: T | null; message?: string | null } | null;

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }

  if (payload?.result !== "SUCCESS" || payload.data == null) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload.data;
}

async function fetchPageCount(url: string, fallbackMessage: string) {
  const response = await fetch(url, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  });

  const payload = await parseJsonResponse<PageResponse<unknown>>(response, fallbackMessage);
  return payload.totalElements ?? payload.content?.length ?? 0;
}

async function fetchOpportunityCount() {
  return fetchPageCount(`${getBackendApiBaseUrl()}/project-opportunities?size=1`, "사업기회 목록을 불러오지 못했습니다.");
}

async function fetchRfpMetrics() {
  const response = await fetch(`${getBackendApiBaseUrl()}/rfp-analyze-results?size=2000`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  });

  const payload = await parseJsonResponse<PageResponse<RfpSummaryResponse>>(response, "입찰 데이터를 불러오지 못했습니다.");
  const rows = payload.content ?? [];

  return {
    total: payload.totalElements ?? rows.length,
    inProgress: rows.filter((item) => item.status !== "COMPLETED").length,
  };
}

function alarmTypeLabel(type: AlarmResponse["type"]): string {
  const labels: Record<string, string> = {
    BILLING_ISSUE_REQUEST: "세금계산서 발행",
    BILLING_COLLECTION_REQUEST: "수금 확인",
    FREE_MAINTENANCE_EXPIRY: "무상유지보수 만료",
    PAID_MAINTENANCE_EXPIRY: "유상유지보수 만료",
    CUSTOMER_SUPPORT_APPROVAL_REQUEST: "고객지원 결재",
    BILLING_APPROVAL_REQUEST: "세금계산서 결재",
    BILLING_APPROVED: "세금계산서 승인",
    BILLING_REJECTED: "세금계산서 반려",
    ORDER_REPORT_APPROVAL_REQUEST: "수주보고서 결재",
    CONTRACT_APPROVAL_REQUEST: "계약 결재",
  };
  return labels[type] ?? "알림";
}

function AlarmRow({ alarm, showDismissedAt, onProcess, onDismiss }: { alarm: CachedAlarm; showDismissedAt?: boolean; onProcess?: () => void; onDismiss?: () => void }) {
  const url = getAlarmNavigationUrl(alarm.type, alarm.targetId);
  return (
    <div className={`flex items-start justify-between gap-4 rounded-lg border p-3 transition-colors ${alarm.dismissedAt ? "bg-muted/20 opacity-70" : alarm.isRead ? "bg-muted/30" : "bg-background"}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={alarm.isRead || alarm.dismissedAt ? "secondary" : "outline"} className="text-xs shrink-0">
            {alarmTypeLabel(alarm.type)}
          </Badge>
          {!alarm.isRead && !alarm.dismissedAt && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
          <span className="text-xs text-muted-foreground">{alarm.createdAt?.slice(0, 10)}</span>
          {showDismissedAt && alarm.dismissedAt && <span className="text-xs text-muted-foreground">· 완료 {alarm.dismissedAt.slice(0, 10)}</span>}
        </div>
        <p className="text-sm text-muted-foreground">{alarm.message}</p>
      </div>
      {(onProcess || onDismiss) && (
        <div className="flex items-center gap-2 shrink-0">
          {onProcess && url && (
            <Button size="sm" variant={alarm.isRead ? "ghost" : "outline"} onClick={onProcess}>
              처리하기
            </Button>
          )}
          {onDismiss && (
            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={onDismiss}>
              완료
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const TASKS_PER_PAGE = 3;

function MyTasksCard() {
  const router = useRouter();
  const { pending, completed, dismiss, dismissAll } = useAlarmHistory();
  const [showCompleted, setShowCompleted] = useState(false);
  const [page, setPage] = useState(0);

  if (pending.length === 0 && completed.length === 0) return null;

  const unreadCount = pending.filter((a) => !a.isRead).length;
  const totalPages = Math.max(1, Math.ceil(pending.length / TASKS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedPending = pending.slice(safePage * TASKS_PER_PAGE, safePage * TASKS_PER_PAGE + TASKS_PER_PAGE);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            나의 업무
            {unreadCount > 0 && <Badge className="text-xs">{unreadCount}건 미처리</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{pending.length}건 대기</Badge>
            {pending.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={dismissAll}>
                전체 완료
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pending.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">처리 대기 중인 업무가 없습니다.</p>}
          {pagedPending.map((alarm: CachedAlarm) => {
            const url = getAlarmNavigationUrl(alarm.type, alarm.targetId);
            return (
              <AlarmRow
                key={alarm.id}
                alarm={alarm}
                onProcess={
                  url
                    ? () => {
                        dismiss(alarm.id);
                        router.push(url);
                      }
                    : undefined
                }
                onDismiss={() => dismiss(alarm.id)}
              />
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {safePage + 1} / {totalPages}
              </span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {completed.length > 0 && (
            <div className="pt-1">
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full" onClick={() => setShowCompleted((v) => !v)}>
                {showCompleted ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                처리 완료 {completed.length}건 (30일간 보관)
              </button>
              {showCompleted && (
                <div className="space-y-2 mt-2">
                  {completed.map((alarm: CachedAlarm) => (
                    <AlarmRow key={alarm.id} alarm={alarm} showDismissedAt />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    opportunityCount: 0,
    activityCount: 0,
    rfpCount: 0,
    inProgressRfpCount: 0,
    contractCount: 0,
    projectCount: 0,
    maintenanceCount: 0,
    upcomingMaintenanceCount: 0,
    monthlyContractAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loadAuthSession()) {
      router.replace("/");
      return;
    }

    let cancelled = false;

    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);

      const [opportunityCountResult, activityResult, rfpResult, contractResult, projectResult, freeMaintenanceResult, paidMaintenanceResult] = await Promise.allSettled([
        fetchOpportunityCount(),
        getSalesActivities(),
        fetchRfpMetrics(),
        contractApi.getContracts(),
        projectApi.getProjects(),
        getFreeMaintenanceList(),
        getPaidMaintenanceList(),
      ]);

      if (cancelled) return;

      const opportunityCount = opportunityCountResult.status === "fulfilled" ? opportunityCountResult.value : 0;
      const activities = activityResult.status === "fulfilled" ? (activityResult.value.data ?? []) : [];
      const rfpMetrics = rfpResult.status === "fulfilled" ? rfpResult.value : { total: 0, inProgress: 0 };
      const contracts = contractResult.status === "fulfilled" ? (contractResult.value.data ?? []) : [];
      const projects = projectResult.status === "fulfilled" ? (projectResult.value.data ?? []) : [];
      const freeMaintenances = freeMaintenanceResult.status === "fulfilled" && freeMaintenanceResult.value.success ? (freeMaintenanceResult.value.data ?? []) : [];
      const paidMaintenances = paidMaintenanceResult.status === "fulfilled" && paidMaintenanceResult.value.success ? (paidMaintenanceResult.value.data ?? []) : [];

      const allMaintenances = [...freeMaintenances, ...paidMaintenances];
      const monthlyContractAmount = contracts.filter((item) => isCurrentMonth(item.contractDate)).reduce((sum, item) => sum + (item.contractAmount || 0), 0);

      const nextError =
        opportunityCountResult.status === "rejected"
          ? "발굴 데이터를 불러오지 못했습니다."
          : activityResult.status === "rejected"
            ? "활동 데이터를 불러오지 못했습니다."
            : rfpResult.status === "rejected"
              ? "입찰 데이터를 불러오지 못했습니다."
              : contractResult.status === "rejected"
                ? "계약 데이터를 불러오지 못했습니다."
                : projectResult.status === "rejected"
                  ? "사업 데이터를 불러오지 못했습니다."
                  : freeMaintenanceResult.status === "rejected" || paidMaintenanceResult.status === "rejected"
                    ? "유지보수 데이터를 불러오지 못했습니다."
                    : null;

      setMetrics({
        opportunityCount,
        activityCount: activities.length,
        rfpCount: rfpMetrics.total,
        inProgressRfpCount: rfpMetrics.inProgress,
        contractCount: contracts.length,
        projectCount: projects.length,
        maintenanceCount: allMaintenances.length,
        upcomingMaintenanceCount: allMaintenances.filter((item) => isWithinDays(90, item.endDate)).length,
        monthlyContractAmount,
      });
      setError(nextError);
      setLoading(false);
    };

    void fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header title="대시보드" description="영업관리시스템 주요 현황을 확인하세요" />

        <main className="flex-1 p-6 overflow-auto">
          {error && (
            <Card className="mb-6 border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 text-sm text-foreground">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="mb-6">
            <CardHeader className="px-4">
              <CardTitle className="text-xl font-semibold">영업관리 단계별 현황</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
                {pipelineStages.map((stage, index) => (
                  <Link key={stage.id} href={stage.href} className="flex-1 min-w-[100px]">
                    <div className="relative group">
                      <div className="flex flex-col items-center gap-1.5 rounded-lg border-2 border-transparent bg-card transition-all duration-200 hover:border-primary hover:shadow-md">
                        <div className={`flex h-15 w-15 items-center justify-center rounded-full ${stage.color}`}>
                          <stage.icon className="h-8 w-8 text-white" />
                        </div>
                        <div className="text-center">
                          <p className="text-s font-semibold">{stage.label}</p>
                          <p className="text-xl font-bold text-foreground">{loading ? "..." : metrics[stage.metricKey]}</p>
                        </div>
                      </div>
                      {index < pipelineStages.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="사업기회" value={loading ? "불러오는 중" : metrics.opportunityCount} changeType="neutral" icon={Search} />
            <StatCard title="진행 중인 입찰" value={loading ? "불러오는 중" : metrics.inProgressRfpCount} change="RFP 분석 완료 제외" changeType="neutral" icon={FileText} />
            <StatCard title="이번 달 수주" value={loading ? "불러오는 중" : formatCurrency(metrics.monthlyContractAmount)} changeType="neutral" icon={Handshake} />
            <StatCard title="유지보수 종료 예정" value={loading ? "불러오는 중" : metrics.upcomingMaintenanceCount} change="90일 이내 종료" changeType="neutral" icon={Wrench} />
          </div>

          <MyTasksCard />
        </main>
      </div>
    </div>
  );
}
