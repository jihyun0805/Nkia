"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Search, Activity, FileText, Handshake, Briefcase, Wrench, ArrowRight, AlertCircle } from "lucide-react";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { StatCard } from "@/components/erp/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadAuthSession } from "@/lib/auth-session";
import { contractApi } from "@/lib/api/contract-api";
import { projectApi } from "@/lib/api/project-api";
import { getFreeMaintenanceList, getPaidMaintenanceList } from "@/lib/api/maintenance";
import { getSalesActivities } from "@/lib/api/generated/sales-activity/sales-activity";
import { getBackendApiBaseUrl } from "@/lib/api-base-url";
import { buildAuthHeaders } from "@/lib/auth-session";

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

      const [
        opportunityCountResult,
        activityResult,
        rfpResult,
        contractResult,
        projectResult,
        freeMaintenanceResult,
        paidMaintenanceResult,
      ] = await Promise.allSettled([
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
      const activities = activityResult.status === "fulfilled" ? activityResult.value.data ?? [] : [];
      const rfpMetrics = rfpResult.status === "fulfilled" ? rfpResult.value : { total: 0, inProgress: 0 };
      const contracts = contractResult.status === "fulfilled" ? contractResult.value.data ?? [] : [];
      const projects = projectResult.status === "fulfilled" ? projectResult.value.data ?? [] : [];
      const freeMaintenances = freeMaintenanceResult.status === "fulfilled" && freeMaintenanceResult.value.success ? freeMaintenanceResult.value.data ?? [] : [];
      const paidMaintenances = paidMaintenanceResult.status === "fulfilled" && paidMaintenanceResult.value.success ? paidMaintenanceResult.value.data ?? [] : [];

      const allMaintenances = [...freeMaintenances, ...paidMaintenances];
      const monthlyContractAmount = contracts
        .filter((item) => isCurrentMonth(item.contractDate))
        .reduce((sum, item) => sum + (item.contractAmount || 0), 0);

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
        <Header title="대시보드" description="영업관리시스템 주요 현황을 백엔드 데이터 기준으로 확인하세요" />

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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="사업기회"
              value={loading ? "불러오는 중" : metrics.opportunityCount}
              change="백엔드 총건수"
              changeType="neutral"
              icon={Search}
            />
            <StatCard
              title="진행 중인 입찰"
              value={loading ? "불러오는 중" : metrics.inProgressRfpCount}
              change="RFP 분석 완료 제외"
              changeType="neutral"
              icon={FileText}
            />
            <StatCard
              title="이번 달 수주"
              value={loading ? "불러오는 중" : formatCurrency(metrics.monthlyContractAmount)}
              change="계약 백엔드 기준"
              changeType="neutral"
              icon={Handshake}
            />
            <StatCard
              title="유지보수 종료 예정"
              value={loading ? "불러오는 중" : metrics.upcomingMaintenanceCount}
              change="90일 이내 종료"
              changeType="neutral"
              icon={Wrench}
            />
          </div>

          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">영업관리 단계별 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                {pipelineStages.map((stage, index) => (
                  <Link key={stage.id} href={stage.href} className="flex-1 min-w-[120px]">
                    <div className="relative group">
                      <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-transparent bg-card p-4 transition-all duration-200 hover:border-primary hover:shadow-md">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${stage.color}`}>
                          <stage.icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold">{stage.label}</p>
                          <p className="text-2xl font-bold text-foreground">{loading ? "..." : metrics[stage.metricKey]}</p>
                        </div>
                      </div>
                      {index < pipelineStages.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
