"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type OrderReportResponse, type OrderReportHistoryListResponse, type OrderReportHistoryResponse, type VisitCycle, orderReportApi } from "@/lib/api/contract-api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { approveBackendWorkflow, rejectBackendWorkflow, loadBackendCurrentUserInfo, type BackendUserSummary } from "@/lib/workflow-backend";
import { useBackendUsers } from "@/lib/use-backend-users";
import { UserPicker } from "@/components/erp/user-picker";
import { emitAlarmUpdate } from "@/hooks/use-alarms";
import { getBackendApiBaseUrl } from "@/lib/api-base-url";
import { buildAuthHeaders } from "@/lib/auth-session";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

type WorkflowLineData = {
  stepOrder: number;
  stepName: string;
  approverName: string;
  approverPosition: string;
  status: string;
};

interface OrderReportDetailProps {
  report: OrderReportResponse;
  onRefresh?: () => void;
}

const parseNum = (val: string | number | undefined) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return val;
  const num = Number(val.toString().replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
};

const fmt = (num: number | null | undefined) => {
  if (num === null || num === undefined) return "0";
  return num.toLocaleString();
};

const cellBase = "px-2 py-1.5 text-sm min-h-[32px]";

const positionLevel = (pos: string | undefined): number => {
  const p = pos?.trim() ?? "";
  if (p === "HEAD_DIRECTOR" || p === "본부장") return 3;
  if (p === "TEAM_LEADER" || p === "팀장") return 2;
  if (p === "TEAM_MEMBER" || p === "팀원") return 1;
  return 0;
};

const cycleMap: Record<VisitCycle, string> = {
  MONTHLY: "매월",
  QUARTERLY: "분기",
  SEMI_ANNUAL: "반기",
  ANNUAL: "매년",
  AS_NEEDED: "수시",
};

const codeMap: Record<string, string> = {
  DIRECT: "직접수주",
  INDIRECT: "간접수주",
};

const typeMap: Record<string, string> = {
  NEW: "신규",
  RENEWAL: "갱신",
  MAINTENANCE_ONLY: "유지보수",
};

export function OrderReportDetail({ report: r, onRefresh }: OrderReportDetailProps) {
  const licenseDetails = r.licenses || [];
  const serviceDetails = r.services || [];
  const maintenanceDetails = r.maintenances || [];
  const otherSalesDetails = r.others || [];
  const purchaseDetails = r.purchases || [];
  const maintenanceOnlyItems = r.maintenanceOnlyItems || [];
  const router = useRouter();
  const users = useBackendUsers();

  const computedEmsMaintenanceSummary = maintenanceDetails.reduce((sum, m) => {
    const content = (m.content || "").toUpperCase();
    return content.includes("ITG") || content.includes("ITSM") ? sum : sum + (m.totalPrice || 0);
  }, 0);
  const computedItgMaintenanceSummary = maintenanceDetails.reduce((sum, m) => {
    const content = (m.content || "").toUpperCase();
    return content.includes("ITG") || content.includes("ITSM") ? sum + (m.totalPrice || 0) : sum;
  }, 0);

  const knownClasses = new Set(["EMS", "ITSM", "DASHBOARD", "DATACENTER", "RCA", "DCA", "ITAM"]);
  const computedOtherSummary =
    licenseDetails.reduce((sum, l) => {
      const cat = (l.productClass || "").toUpperCase();
      return cat && !knownClasses.has(cat) ? sum + (l.totalPrice || 0) : sum;
    }, 0) +
    (r.serviceTotal || 0) +
    (r.otherTotal || 0);

  // 백엔드는 ApprovalStatus.getDescription()을 반환
  const isDraft = r.status === "결재 대기";
  const isInProgress = r.status === "결재중";
  const isApproved = r.status === "승인 완료";
  const isRejected = r.status === "반려";

  // 삭제
  const [isDeleting, setIsDeleting] = useState(false);

  // 결재 상신
  const [firstApprover, setFirstApprover] = useState<BackendUserSummary | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // 결재 처리
  const [approvalComment, setApprovalComment] = useState("");
  const [nextApprover, setNextApprover] = useState<BackendUserSummary | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [needNextApprover, setNeedNextApprover] = useState<boolean | null>(null);
  const [currentStepOrder, setCurrentStepOrder] = useState<number | null>(null);
  const [isCurrentApprover, setIsCurrentApprover] = useState<boolean | null>(null);
  const [workflowLines, setWorkflowLines] = useState<WorkflowLineData[] | null>(null);

  // 변경 이력
  const [histories, setHistories] = useState<OrderReportHistoryListResponse[]>([]);
  const [historiesLoading, setHistoriesLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const [historyDetail, setHistoryDetail] = useState<OrderReportHistoryResponse | null>(null);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);

  // 워크플로우 정보 조회 (결재중 상태일 때만)
  useEffect(() => {
    if (!isInProgress || !r.workflowId) return;

    setNeedNextApprover(null);
    setCurrentStepOrder(null);
    setIsCurrentApprover(null);
    setWorkflowLines(null);

    (async () => {
      try {
        const userInfo = await loadBackendCurrentUserInfo();
        if (!userInfo.userId) {
          setNeedNextApprover(true);
          setIsCurrentApprover(false);
          return;
        }

        const res = await fetch(`${getBackendApiBaseUrl()}/admin/workflows/my/${userInfo.userId}`, {
          headers: buildAuthHeaders(),
          credentials: "include",
        });

        if (!res.ok) {
          setNeedNextApprover(true);
          setIsCurrentApprover(false);
          return;
        }

        const json = await res.json();
        const workflows: Array<{
          id: number;
          targetId: number;
          needNextApprover: boolean;
          currentStepOrder: number;
          lines: WorkflowLineData[];
        }> = json?.data ?? [];

        const matched = workflows.find((w) => w.id === r.workflowId);
        if (!matched) {
          setNeedNextApprover(true);
          setIsCurrentApprover(false);
          return;
        }

        const lines = matched.lines ?? [];
        setWorkflowLines(lines);
        setNeedNextApprover(matched.needNextApprover ?? false);
        setCurrentStepOrder(matched.currentStepOrder ?? null);

        const activeLine = lines.find((l) => l.stepOrder === matched.currentStepOrder && l.status === "진행중");
        setIsCurrentApprover(!!userInfo.name && userInfo.name === activeLine?.approverName);
      } catch {
        setNeedNextApprover(true);
        setIsCurrentApprover(false);
      }
    })();
  }, [r.workflowId, isInProgress]);

  // 이력 목록 조회
  useEffect(() => {
    setHistoriesLoading(true);
    orderReportApi
      .getOrderReportHistories(r.id)
      .then((res) => setHistories(res.data ?? []))
      .catch((e) => console.error("이력 로드 실패", e))
      .finally(() => setHistoriesLoading(false));
  }, [r.id]);

  // 이력 상세 조회
  useEffect(() => {
    if (selectedHistoryId == null) {
      setHistoryDetail(null);
      return;
    }
    setHistoryDetailLoading(true);
    orderReportApi
      .getOrderReportHistory(selectedHistoryId)
      .then((res) => setHistoryDetail(res.data ?? null))
      .catch((e) => {
        console.error("이력 상세 로드 실패", e);
        toast.error("이력 상세 정보를 불러오지 못했습니다.");
        setSelectedHistoryId(null);
      })
      .finally(() => setHistoryDetailLoading(false));
  }, [selectedHistoryId]);

  const handleSubmitReport = async () => {
    if (!firstApprover?.id) {
      toast.error("1차 결재자(팀장)를 선택해주세요.");
      return;
    }
    if (positionLevel(firstApprover.position) < 2) {
      toast.error("1차 결재자는 팀장 이상의 직급이어야 합니다. 팀장 또는 본부장을 선택해주세요.", { duration: 5000 });
      return;
    }
    setIsSubmittingReport(true);
    try {
      await orderReportApi.submitOrderReport(r.id, firstApprover.id);
      toast.success("결재 상신이 완료되었습니다.");
      emitAlarmUpdate();
      onRefresh?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "결재 상신에 실패했습니다.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleApprove = async () => {
    if (!r.workflowId) return;
    if (needNextApprover && !nextApprover?.id) {
      toast.error("다음 결재자를 선택해주세요.");
      return;
    }
    if (needNextApprover && nextApprover) {
      // Step 1 → next approver must be HEAD_DIRECTOR (본부장) for step 2
      if (currentStepOrder === 1 && positionLevel(nextApprover.position) < 3) {
        toast.error("2차 결재자는 본부장 이상의 직급이어야 합니다. 본부장을 선택해주세요.", { duration: 5000 });
        return;
      }
    }
    setIsApproving(true);
    try {
      await approveBackendWorkflow(r.workflowId, {
        nextApproverId: nextApprover?.id ?? null,
        comment: approvalComment,
      });
      toast.success("승인 처리되었습니다.");
      emitAlarmUpdate();
      setApprovalComment("");
      setNextApprover(null);
      onRefresh?.();
    } catch (error: any) {
      const msg: string = error?.message ?? "";
      // 직급 관련 에러인 경우 명확한 안내 메시지 표시
      const isPositionError = msg.includes("직급") || msg.includes("권한") || msg.includes("position") || msg.includes("POSITION") || msg.includes("forbidden") || msg.includes("Forbidden");
      toast.error(isPositionError ? `결재자 지정에 실패했습니다. 선택한 결재자의 직급이 해당 단계에 맞지 않습니다.\n(${msg})` : msg || "승인 처리에 실패했습니다.", { duration: 5000 });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!r.workflowId) return;
    if (!approvalComment.trim()) {
      toast.error("반려 사유를 입력해주세요.");
      return;
    }
    setIsRejecting(true);
    try {
      await rejectBackendWorkflow(r.workflowId, { comment: approvalComment });
      toast.success("반려 처리되었습니다.");
      emitAlarmUpdate();
      setApprovalComment("");
      onRefresh?.();
    } catch (error: any) {
      toast.error(error?.message || "반려에 실패했습니다.");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말로 이 수주보고서를 삭제하시겠습니까?")) return;
    setIsDeleting(true);
    try {
      await orderReportApi.deleteOrderReport(r.id);
      toast.success("수주보고서가 삭제되었습니다.");
      router.push("/contract");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "삭제에 실패했습니다.");
      setIsDeleting(false);
    }
  };

  const Col10 = () => (
    <colgroup>
      {Array.from({ length: 10 }).map((_, i) => (
        <col key={i} className="w-[10%]" />
      ))}
    </colgroup>
  );

  // 이력 상세 뷰
  if (selectedHistoryId !== null) {
    if (historyDetailLoading || !historyDetail) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>이력을 불러오는 중...</p>
        </div>
      );
    }

    const h = historyDetail;
    const hLicenseDetails = h.licenses || [];
    const hServiceDetails = h.services || [];
    const hMaintenanceDetails = h.maintenances || [];
    const hOtherSalesDetails = h.others || [];
    const hPurchaseDetails = h.purchases || [];
    const hMaintenanceOnlyItems = h.maintenanceOnlyItems || [];
    const hProjectName = h.projectName ?? "-";
    const hSavedAt = h.orderReportDate ? h.orderReportDate.replace("T", " ").slice(0, 16) : "-";

    const hKnownClasses = new Set(["EMS", "ITSM", "DASHBOARD", "DATACENTER", "RCA", "DCA", "ITAM"]);
    const hComputedEmsMaintenanceSummary = hMaintenanceDetails.reduce((sum: number, m: any) => {
      const content = (m.content || "").toUpperCase();
      return content.includes("ITG") || content.includes("ITSM") ? sum : sum + (m.totalPrice || 0);
    }, 0);
    const hComputedItgMaintenanceSummary = hMaintenanceDetails.reduce((sum: number, m: any) => {
      const content = (m.content || "").toUpperCase();
      return content.includes("ITG") || content.includes("ITSM") ? sum + (m.totalPrice || 0) : sum;
    }, 0);
    const hComputedOtherSummary =
      hLicenseDetails.reduce((sum: number, l: any) => {
        const cat = (l.productClass || "").toUpperCase();
        return cat && !hKnownClasses.has(cat) ? sum + (l.totalPrice || 0) : sum;
      }, 0) +
      (h.serviceTotal || 0) +
      (h.otherTotal || 0);

    return (
      <div className="space-y-6">
        {/* 이력 뷰 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">수주보고서 (이력 조회)</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {h.orderReportCode} · 버전 {h.version} · {hSavedAt}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              이력 v{h.version}
            </Badge>
            <Button variant="outline" onClick={() => setSelectedHistoryId(null)}>
              현재로 돌아가기
            </Button>
          </div>
        </div>

        {/* 수주보고서 본문 (read-only) */}
        <div className="bg-card rounded-lg border p-6 space-y-0">
          {/* 기본 정보 */}
          <table className="w-full border-collapse border border-black text-sm table-fixed bg-white">
            <Col10 />
            <tbody>
              <tr className="border-b border-black">
                <th className="bg-slate-100 border-r border-black py-2 font-semibold" colSpan={1}>
                  사업명
                </th>
                <td className={`${cellBase} text-center`} colSpan={9}>
                  {hProjectName}
                </td>
              </tr>
              <tr className="border-b border-black">
                <th className="bg-slate-100 border-r border-black py-2 font-semibold" colSpan={1}>
                  총 계약금액
                </th>
                <td className="bg-yellow-200 border-r border-black text-right px-2 py-1.5 text-sm font-bold text-blue-700" colSpan={9}>
                  ₩{fmt(h.totalAmount)}
                </td>
              </tr>
              <tr className="border-b border-black">
                <th className="bg-slate-100 border-r border-black py-2 font-semibold" colSpan={1}>
                  대금지급조건
                </th>
                <td className={`${cellBase} text-center`} colSpan={9}>
                  {h.paymentCondition || "-"}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 매출분류 */}
          <table className="w-full border-collapse border border-black text-sm text-center table-fixed -mt-[1px] bg-white">
            <Col10 />
            <tbody>
              <tr className="border-b border-black">
                <th className="bg-slate-100 border-r border-black py-2 font-semibold" rowSpan={2} colSpan={1}>
                  매출분류
                </th>
                <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                  EMS
                </th>
                <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                  {fmt(h.emsSummary)}
                </td>
                <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                  ITG
                </th>
                <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                  {fmt(h.itgSummary)}
                </td>
                <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                  대시보드
                </th>
                <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                  {fmt(h.dashboardSummary)}
                </td>
                <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                  AIOTION
                </th>
                <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                  {fmt(h.aiotionSummary)}
                </td>
                <th className="bg-slate-100 font-bold text-red-600 text-[10px] leading-tight border-l border-black" colSpan={1}>
                  검증
                  <br />
                  (0이정상)
                </th>
              </tr>
              <tr className="border-b border-black">
                <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                  EMS유지보수
                </th>
                <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                  {fmt(hComputedEmsMaintenanceSummary)}
                </td>
                <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                  ITG유지보수
                </th>
                <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                  {fmt(hComputedItgMaintenanceSummary)}
                </td>
                <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                  ITO
                </th>
                <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                  {fmt(h.itoSummary)}
                </td>
                <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                  기타
                </th>
                <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                  {fmt(hComputedOtherSummary)}
                </td>
                <td className="bg-red-50 text-center text-red-600 font-bold px-2 py-1.5 text-sm border-l border-black" colSpan={1}>
                  {fmt(
                    h.totalAmount -
                      (h.purchaseTotal || 0) -
                      (h.emsSummary + h.itgSummary + h.dashboardSummary + h.aiotionSummary + hComputedEmsMaintenanceSummary + hComputedItgMaintenanceSummary + h.itoSummary + hComputedOtherSummary),
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 계약 정보 */}
          <table className="w-full border-collapse border border-black text-sm table-fixed -mt-[1px] bg-white">
            <Col10 />
            <tbody>
              <tr className="border-b border-black">
                <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                  유형
                </th>
                <td className={`${cellBase} text-center border-r border-black`} colSpan={2}>
                  {typeMap[h.type] || h.type}
                </td>
                <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                  채널유무
                </th>
                <td className={`${cellBase} text-center border-r border-black`} colSpan={2}>
                  {h.channel ? "O" : "X"}
                </td>
                <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                  코드분류
                </th>
                <td className={`${cellBase} text-center`} colSpan={3}>
                  {codeMap[h.codeType] || h.codeType}
                </td>
              </tr>
              <tr className="border-b border-black">
                <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                  수행PM
                </th>
                <td className={`${cellBase} text-center`} colSpan={9}>
                  {h.pmName || "-"}
                </td>
              </tr>
              <tr className="border-b border-black">
                <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                  계약상대
                </th>
                <td className={`${cellBase} text-center border-r border-black`} colSpan={4}>
                  {h.contractCounterpartCompanyName || "-"}
                </td>
                <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                  최종고객사
                </th>
                <td className={`${cellBase} text-center`} colSpan={4}>
                  {h.finalCustomerCompanyName || "-"}
                </td>
              </tr>
              <tr className="border-b border-black">
                <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                  담당자
                </th>
                <td className={`${cellBase} text-center border-r border-black`} colSpan={4}>
                  {h.contractCounterpartManagerName || "-"}
                </td>
                <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                  담당자
                </th>
                <td className={`${cellBase} text-center`} colSpan={4}>
                  {h.finalCustomerManagerName || "-"}
                </td>
              </tr>
              <tr className="border-b border-black">
                <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={2}>
                  계약일자(발주일자)
                </th>
                <td className={`${cellBase} text-center border-r border-black`} colSpan={3}>
                  {h.contractDate || "-"}
                </td>
                <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1} rowSpan={2}>
                  계약기간
                </th>
                <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                  시작일
                </th>
                <td className={`${cellBase} text-center border-r border-black`} colSpan={2}>
                  {h.contractStartDate || "-"}
                </td>
                <td className="bg-yellow-200 text-center font-bold text-blue-700 px-2 py-1.5 text-sm" colSpan={1} rowSpan={2}>
                  {h.contractPeriodMonths}개월
                </td>
              </tr>
              <tr className="border-b border-black">
                <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={2}>
                  무상유지보수기간
                </th>
                <td className={`${cellBase} text-center border-r border-black`} colSpan={3}>
                  {h.freeMaintenancePeriodMonths ? `${h.freeMaintenancePeriodMonths}개월` : "해당없음"}
                </td>
                <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                  종료일
                </th>
                <td className={`${cellBase} text-center border-r border-black`} colSpan={2}>
                  {h.contractEndDate || "-"}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 사업범위 & 첨부서류 */}
          <table className="w-full border-collapse border border-black text-sm table-fixed -mt-[1px] bg-white">
            <Col10 />
            <tbody>
              <tr className="border-b border-black">
                <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                  사업범위
                </th>
                <td className="px-2 py-2 text-sm whitespace-pre-wrap leading-relaxed" colSpan={9}>
                  {h.scopeOfWork || "-"}
                </td>
              </tr>
              <tr className="border-b border-black">
                <th className="bg-slate-100 border-r border-black py-1.5 text-center font-semibold" colSpan={2} rowSpan={2}>
                  첨부서류
                </th>
                <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                  견적서
                </th>
                <td className={`${cellBase} text-center border-r border-black`} colSpan={1}>
                  {h.quotationProvided ? "O" : "X"}
                </td>
                <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                  계약서
                </th>
                <td className={`${cellBase} text-center border-r border-black`} colSpan={1}>
                  {h.contractProvided ? "O" : "X"}
                </td>
                <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                  발주서
                </th>
                <td className={`${cellBase} text-center border-r border-black`} colSpan={1}>
                  {h.purchaseOrderProvided ? "O" : "X"}
                </td>
                <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                  PRB보고서
                </th>
                <td className={`${cellBase} text-center`} colSpan={1}>
                  {h.prbReportProvided ? "O" : "X"}
                </td>
              </tr>
              <tr className="border-b border-black">
                <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                  기타서류
                </th>
                <td className={cellBase} colSpan={7}>
                  {h.additionalDocuments || "-"}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 유지보수 수주보고 표 */}
          {hMaintenanceOnlyItems.length > 0 && (
            <div className="pt-6 pb-6">
              <div className="text-sm font-bold text-purple-800 mb-1 mt-6">※ 유지보수 수주보고 시 작성</div>
              <table className="w-full border-collapse border border-black text-sm text-center table-fixed bg-white">
                <Col10 />
                <thead>
                  <tr className="bg-slate-100 border-b border-black">
                    <th className="border-r border-black py-1.5 font-semibold" colSpan={2}>
                      년도
                    </th>
                    <th className="border-r border-black py-1.5 font-semibold" colSpan={3}>
                      사업금액
                    </th>
                    <th className="border-r border-black py-1.5 font-semibold" colSpan={1}>
                      라이선스
                    </th>
                    <th className="border-r border-black py-1.5 font-semibold" colSpan={1}>
                      3rd
                    </th>
                    <th className="border-r border-black py-1.5 font-semibold" colSpan={1}>
                      용역
                    </th>
                    <th className="border-r border-black py-1.5 font-semibold" colSpan={1}>
                      유지보수
                    </th>
                    <th className="py-1.5 font-semibold" colSpan={1}>
                      요율
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hMaintenanceOnlyItems.map((item: any) => (
                    <tr key={item.id} className="border-b border-black">
                      <td className="border-r border-black px-2 py-1.5 text-center" colSpan={2}>
                        {item.year ? `${item.year}년` : "-"}
                      </td>
                      <td className="border-r border-black px-2 py-1.5 text-right font-semibold text-slate-700 bg-slate-50" colSpan={3}>
                        ₩{fmt(item.amount)}
                      </td>
                      <td className="border-r border-black px-2 py-1.5 text-right" colSpan={1}>
                        ₩{fmt(item.license)}
                      </td>
                      <td className="border-r border-black px-2 py-1.5 text-right" colSpan={1}>
                        ₩{fmt(item.thirdParty)}
                      </td>
                      <td className="border-r border-black px-2 py-1.5 text-right" colSpan={1}>
                        ₩{fmt(item.service)}
                      </td>
                      <td className="border-r border-black px-2 py-1.5 text-right" colSpan={1}>
                        ₩{fmt(item.maintenance)}
                      </td>
                      <td className="px-2 py-1.5 text-center" colSpan={1}>
                        {item.maintenanceRate ? `${item.maintenanceRate}%` : "-"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-yellow-200 font-bold border-b border-black">
                    <td className="border-r border-black py-2 text-center text-slate-700" colSpan={2}>
                      합계
                    </td>
                    <td className="border-r border-black px-2 py-1.5 text-right text-blue-700" colSpan={3}>
                      ₩{fmt(h.itemTotalAmount)}
                    </td>
                    <td className="border-r border-black px-2 py-1.5 text-right text-blue-700" colSpan={1}>
                      ₩{fmt(h.itemTotalLicense)}
                    </td>
                    <td className="border-r border-black px-2 py-1.5 text-right text-blue-700" colSpan={1}>
                      ₩{fmt(h.itemTotalThirdParty)}
                    </td>
                    <td className="border-r border-black px-2 py-1.5 text-right text-blue-700" colSpan={1}>
                      ₩{fmt(h.itemTotalService)}
                    </td>
                    <td className="border-r border-black px-2 py-1.5 text-right text-blue-700" colSpan={1}>
                      ₩{fmt(h.itemTotalMaintenance)}
                    </td>
                    <td className="px-2 py-1.5 text-center text-blue-700" colSpan={1}>
                      {h.itemTotalMaintenanceRate ? `${h.itemTotalMaintenanceRate.toFixed(2)}%` : "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 매출 세부 내역 */}
          <div className="space-y-8 mt-10">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 border-b-2 border-black pb-2 mb-4">매출</h2>
              <DetailTable
                title="▶ 라이선스"
                headers={[
                  { label: "제품분류", span: 1 },
                  { label: "제품군", span: 1 },
                  { label: "제품명", span: 3 },
                  { label: "수량", span: 1 },
                  { label: "단가", span: 2 },
                  { label: "소계", span: 2 },
                ]}
                rows={hLicenseDetails.map((d: any) => [
                  { value: d.productClass, span: 1, center: true },
                  { value: d.productGroup, span: 1, center: true },
                  { value: d.productName, span: 3 },
                  { value: fmt(d.quantity), span: 1, center: true },
                  { value: fmt(d.price), span: 2, right: true },
                  { value: fmt(d.totalPrice), span: 2, right: true, highlight: true },
                ])}
                total={h.licenseTotal}
              />
              <DetailTable
                title="▶ 용역"
                headers={[
                  { label: "내용", span: 5 },
                  { label: "M/M", span: 1 },
                  { label: "단가", span: 2 },
                  { label: "소계", span: 2 },
                ]}
                rows={hServiceDetails.map((d: any) => [
                  { value: d.content, span: 5 },
                  { value: fmt(d.manMonth), span: 1, center: true },
                  { value: fmt(d.price), span: 2, right: true },
                  { value: fmt(d.totalPrice), span: 2, right: true, highlight: true },
                ])}
                total={h.serviceTotal}
              />
              <DetailTable
                title="▶ 유지보수"
                headers={[
                  { label: "내용", span: 4 },
                  { label: "방문주기", span: 1 },
                  { label: "개월 수", span: 1 },
                  { label: "유지보수 금액(월)", span: 2 },
                  { label: "소계", span: 2 },
                ]}
                rows={hMaintenanceDetails.map((d: any) => [
                  { value: d.content, span: 4 },
                  { value: cycleMap[d.visitCycle as VisitCycle] || d.visitCycle, span: 1, center: true },
                  { value: fmt(d.month), span: 1, center: true },
                  { value: fmt(d.price), span: 2, right: true },
                  { value: fmt(d.totalPrice), span: 2, right: true, highlight: true },
                ])}
                total={h.maintenanceTotal}
              />
              <DetailTable
                title="▶ 기타 (3rd party H/W, S/W, Bypass 매출 등)"
                headers={[
                  { label: "내용", span: 5 },
                  { label: "수량", span: 1 },
                  { label: "단가", span: 2 },
                  { label: "소계", span: 2 },
                ]}
                rows={hOtherSalesDetails.map((d: any) => [
                  { value: d.content, span: 5 },
                  { value: fmt(d.quantity), span: 1, center: true },
                  { value: fmt(d.price), span: 2, right: true },
                  { value: fmt(d.totalPrice), span: 2, right: true, highlight: true },
                ])}
                total={h.otherTotal}
              />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 border-b-2 border-black pb-2 mb-4">매입</h2>
              <DetailTable
                title="▶ 매입 (VAT별도)"
                headers={[
                  { label: "내용", span: 5 },
                  { label: "수량", span: 1 },
                  { label: "단가", span: 2 },
                  { label: "소계", span: 2 },
                ]}
                rows={hPurchaseDetails.map((d: any) => [
                  { value: d.content, span: 5 },
                  { value: fmt(d.quantity), span: 1, center: true },
                  { value: fmt(d.price), span: 2, right: true },
                  { value: fmt(d.totalPrice), span: 2, right: true, highlight: true },
                ])}
                total={h.purchaseTotal}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setSelectedHistoryId(null)}>
            현재로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">수주보고서</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {r.orderReportCode} · {r.projectName} · {r.contractDate}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className={isApproved ? "bg-green-100 text-green-700" : isRejected ? "bg-red-100 text-red-700" : isInProgress ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}
          >
            {isApproved ? "승인완료" : isRejected ? "반려" : isInProgress ? "결재중" : "대기중"}
          </Badge>
          <span className="text-sm text-muted-foreground">PM: {r.pmName}</span>
        </div>
      </div>

      {/* 수주보고서 본문 */}
      <div className="bg-card rounded-lg border p-6 space-y-0">
        {/* 기본 정보 */}
        <table className="w-full border-collapse border border-black text-sm table-fixed bg-white">
          <Col10 />
          <tbody>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 font-semibold" colSpan={1}>
                사업명
              </th>
              <td className={`${cellBase} text-center`} colSpan={9}>
                {r.projectName}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 font-semibold" colSpan={1}>
                총 계약금액
              </th>
              <td className="bg-yellow-200 border-r border-black text-right px-2 py-1.5 text-sm font-bold text-blue-700" colSpan={8}>
                ₩{fmt(r.totalAmount)}
              </td>
              <td className="text-center font-semibold text-sm" colSpan={1}>
                ({r.vatType || "-"})
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 font-semibold" colSpan={1}>
                대금지급조건
              </th>
              <td className={`${cellBase} text-center`} colSpan={9}>
                {r.paymentCondition || "-"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 매출분류 */}
        <table className="w-full border-collapse border border-black text-sm text-center table-fixed -mt-[1px] bg-white">
          <Col10 />
          <tbody>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 font-semibold" rowSpan={2} colSpan={1}>
                매출분류
              </th>
              <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                EMS
              </th>
              <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                {fmt(r.emsSummary)}
              </td>
              <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                ITG
              </th>
              <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                {fmt(r.itgSummary)}
              </td>
              <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                대시보드
              </th>
              <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                {fmt(r.dashboardSummary)}
              </td>
              <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                AIOTION
              </th>
              <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                {fmt(r.aiotionSummary)}
              </td>
              <th className="bg-slate-100 font-bold text-red-600 text-[10px] leading-tight border-l border-black" colSpan={1}>
                검증
                <br />
                (0이정상)
              </th>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                EMS유지보수
              </th>
              <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                {fmt(computedEmsMaintenanceSummary)}
              </td>
              <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                ITG유지보수
              </th>
              <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                {fmt(computedItgMaintenanceSummary)}
              </td>
              <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                ITO
              </th>
              <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                {fmt(r.itoSummary)}
              </td>
              <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                기타
              </th>
              <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                {fmt(computedOtherSummary)}
              </td>
              <td className="bg-red-50 text-center text-red-600 font-bold px-2 py-1.5 text-sm border-l border-black" colSpan={1}>
                {fmt(
                  r.totalAmount -
                    (r.purchaseTotal || 0) -
                    (r.emsSummary + r.itgSummary + r.dashboardSummary + r.aiotionSummary + computedEmsMaintenanceSummary + computedItgMaintenanceSummary + r.itoSummary + computedOtherSummary),
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 계약 정보 */}
        <table className="w-full border-collapse border border-black text-sm table-fixed -mt-[1px] bg-white">
          <Col10 />
          <tbody>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                유형
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={2}>
                {typeMap[r.type] || r.type}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                채널유무
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={2}>
                {r.channel ? "O" : "X"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                코드분류
              </th>
              <td className={`${cellBase} text-center`} colSpan={3}>
                {codeMap[r.codeType] || r.codeType}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                수행PM
              </th>
              <td className={`${cellBase} text-center`} colSpan={9}>
                {r.pmName || "-"}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                계약상대
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={4}>
                {r.contractCounterpartCompanyName || "-"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                최종고객사
              </th>
              <td className={`${cellBase} text-center`} colSpan={4}>
                {r.finalCustomerCompanyName || "-"}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                담당자
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={4}>
                {r.contractCounterpartManagerName || "-"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                담당자
              </th>
              <td className={`${cellBase} text-center`} colSpan={4}>
                {r.finalCustomerManagerName || "-"}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                연락처
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={4}>
                {r.contractCounterpartPhone || "-"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                연락처
              </th>
              <td className={`${cellBase} text-center`} colSpan={4}>
                {r.finalCustomerPhone || "-"}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={2}>
                계약일자(발주일자)
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={3}>
                {r.contractDate || "-"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1} rowSpan={2}>
                계약기간
              </th>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                시작일
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={2}>
                {r.contractStartDate || "-"}
              </td>
              <td className="bg-yellow-200 text-center font-bold text-blue-700 px-2 py-1.5 text-sm" colSpan={1} rowSpan={2}>
                {r.contractPeriodMonths}개월
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={2}>
                무상유지보수기간
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={3}>
                {r.freeMaintenancePeriodMonths ? `${r.freeMaintenancePeriodMonths}개월` : "해당없음"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                종료일
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={2}>
                {r.contractEndDate || "-"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 사업범위 & 첨부서류 */}
        <table className="w-full border-collapse border border-black text-sm table-fixed -mt-[1px] bg-white">
          <Col10 />
          <tbody>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                사업범위
              </th>
              <td className="px-2 py-2 text-sm whitespace-pre-wrap leading-relaxed" colSpan={9}>
                {r.scopeOfWork || "-"}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-1.5 text-center font-semibold" colSpan={2} rowSpan={2}>
                첨부서류
              </th>
              <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                견적서
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={1}>
                {r.quotationProvided ? "O" : "X"}
              </td>
              <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                계약서
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={1}>
                {r.contractProvided ? "O" : "X"}
              </td>
              <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                발주서
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={1}>
                {r.purchaseOrderProvided ? "O" : "X"}
              </td>
              <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                PRB보고서
              </th>
              <td className={`${cellBase} text-center`} colSpan={1}>
                {r.prbReportProvided ? "O" : "X"}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                기타서류
              </th>
              <td className={cellBase} colSpan={7}>
                {r.additionalDocuments || "-"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 유지보수 수주보고 표 */}
        {maintenanceOnlyItems && maintenanceOnlyItems.length > 0 && (
          <div className="pt-6 pb-6">
            <div className="text-sm font-bold text-purple-800 mb-1 mt-6">※ 유지보수 수주보고 시 작성</div>
            <table className="w-full border-collapse border border-black text-sm text-center table-fixed bg-white">
              <Col10 />
              <thead>
                <tr className="bg-slate-100 border-b border-black">
                  <th className="border-r border-black py-1.5 font-semibold" colSpan={2}>
                    년도
                  </th>
                  <th className="border-r border-black py-1.5 font-semibold" colSpan={3}>
                    사업금액
                  </th>
                  <th className="border-r border-black py-1.5 font-semibold" colSpan={1}>
                    라이선스
                  </th>
                  <th className="border-r border-black py-1.5 font-semibold" colSpan={1}>
                    3rd
                  </th>
                  <th className="border-r border-black py-1.5 font-semibold" colSpan={1}>
                    용역
                  </th>
                  <th className="border-r border-black py-1.5 font-semibold" colSpan={1}>
                    유지보수
                  </th>
                  <th className="py-1.5 font-semibold" colSpan={1}>
                    요율
                  </th>
                </tr>
              </thead>
              <tbody>
                {maintenanceOnlyItems.map((item) => (
                  <tr key={item.id} className="border-b border-black">
                    <td className="border-r border-black px-2 py-1.5 text-center" colSpan={2}>
                      {item.year ? `${item.year}년` : "-"}
                    </td>
                    <td className="border-r border-black px-2 py-1.5 text-right font-semibold text-slate-700 bg-slate-50" colSpan={3}>
                      ₩{fmt(item.amount)}
                    </td>
                    <td className="border-r border-black px-2 py-1.5 text-right" colSpan={1}>
                      ₩{fmt(item.license)}
                    </td>
                    <td className="border-r border-black px-2 py-1.5 text-right" colSpan={1}>
                      ₩{fmt(item.thirdParty)}
                    </td>
                    <td className="border-r border-black px-2 py-1.5 text-right" colSpan={1}>
                      ₩{fmt(item.service)}
                    </td>
                    <td className="border-r border-black px-2 py-1.5 text-right" colSpan={1}>
                      ₩{fmt(item.maintenance)}
                    </td>
                    <td className="px-2 py-1.5 text-center" colSpan={1}>
                      {item.maintenanceRate ? `${item.maintenanceRate}%` : "-"}
                    </td>
                  </tr>
                ))}

                {/* 합계 행 */}
                <tr className="bg-yellow-200 font-bold border-b border-black">
                  <td className="border-r border-black py-2 text-center text-slate-700" colSpan={2}>
                    합계
                  </td>
                  <td className="border-r border-black px-2 py-1.5 text-right text-blue-700" colSpan={3}>
                    ₩{fmt(r.itemTotalAmount)}
                  </td>
                  <td className="border-r border-black px-2 py-1.5 text-right text-blue-700" colSpan={1}>
                    ₩{fmt(r.itemTotalLicense)}
                  </td>
                  <td className="border-r border-black px-2 py-1.5 text-right text-blue-700" colSpan={1}>
                    ₩{fmt(r.itemTotalThirdParty)}
                  </td>
                  <td className="border-r border-black px-2 py-1.5 text-right text-blue-700" colSpan={1}>
                    ₩{fmt(r.itemTotalService)}
                  </td>
                  <td className="border-r border-black px-2 py-1.5 text-right text-blue-700" colSpan={1}>
                    ₩{fmt(r.itemTotalMaintenance)}
                  </td>
                  <td className="px-2 py-1.5 text-center text-blue-700" colSpan={1}>
                    {r.itemTotalMaintenanceRate ? `${r.itemTotalMaintenanceRate.toFixed(2)}%` : "-"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 매출 세부 내역 */}
        <div className="space-y-8 mt-10">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 border-b-2 border-black pb-2 mb-4">매출</h2>

            {/* 라이선스 */}
            <DetailTable
              title="▶ 라이선스"
              headers={[
                { label: "제품분류", span: 1 },
                { label: "제품군", span: 1 },
                { label: "제품명", span: 3 },
                { label: "수량", span: 1 },
                { label: "단가", span: 2 },
                { label: "소계", span: 2 },
              ]}
              rows={licenseDetails.map((d) => [
                { value: d.productClass, span: 1, center: true },
                { value: d.productGroup, span: 1, center: true },
                { value: d.productName, span: 3 },
                { value: fmt(d.quantity), span: 1, center: true },
                { value: fmt(d.price), span: 2, right: true },
                { value: fmt(d.totalPrice), span: 2, right: true, highlight: true },
              ])}
              total={r.licenseTotal}
            />

            {/* 용역 */}
            <DetailTable
              title="▶ 용역"
              headers={[
                { label: "내용", span: 5 },
                { label: "M/M", span: 1 },
                { label: "단가", span: 2 },
                { label: "소계", span: 2 },
              ]}
              rows={serviceDetails.map((d) => [
                { value: d.content, span: 5 },
                { value: fmt(d.manMonth), span: 1, center: true },
                { value: fmt(d.price), span: 2, right: true },
                { value: fmt(d.totalPrice), span: 2, right: true, highlight: true },
              ])}
              total={r.serviceTotal}
            />

            {/* 유지보수 */}
            <DetailTable
              title="▶ 유지보수"
              headers={[
                { label: "내용", span: 4 },
                { label: "방문주기", span: 1 },
                { label: "개월 수", span: 1 },
                { label: "유지보수 금액(월)", span: 2 },
                { label: "소계", span: 2 },
              ]}
              rows={maintenanceDetails.map((d) => [
                { value: d.content, span: 4 },
                { value: cycleMap[d.visitCycle] || d.visitCycle, span: 1, center: true },
                { value: fmt(d.month), span: 1, center: true },
                { value: fmt(d.price), span: 2, right: true },
                { value: fmt(d.totalPrice), span: 2, right: true, highlight: true },
              ])}
              total={r.maintenanceTotal}
            />

            {/* 기타 매출 */}
            <DetailTable
              title="▶ 기타 (3rd party H/W, S/W, Bypass 매출 등)"
              headers={[
                { label: "내용", span: 5 },
                { label: "수량", span: 1 },
                { label: "단가", span: 2 },
                { label: "소계", span: 2 },
              ]}
              rows={otherSalesDetails.map((d) => [
                { value: d.content, span: 5 },
                { value: fmt(d.quantity), span: 1, center: true },
                { value: fmt(d.price), span: 2, right: true },
                { value: fmt(d.totalPrice), span: 2, right: true, highlight: true },
              ])}
              total={r.otherTotal}
            />
          </div>

          {/* 매입 */}
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 border-b-2 border-black pb-2 mb-4">매입</h2>
            <DetailTable
              title="▶ 매입 (VAT별도)"
              headers={[
                { label: "내용", span: 5 },
                { label: "수량", span: 1 },
                { label: "단가", span: 2 },
                { label: "소계", span: 2 },
              ]}
              rows={purchaseDetails.map((d) => [
                { value: d.content, span: 5 },
                { value: fmt(d.quantity), span: 1, center: true },
                { value: fmt(d.price), span: 2, right: true },
                { value: fmt(d.totalPrice), span: 2, right: true, highlight: true },
              ])}
              total={r.purchaseTotal}
            />
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/contract">목록으로 돌아가기</Link>
        </Button>
        <Button variant="outline" onClick={() => router.push(`/contract/orders/${r.id}/edit`)}>
          수정
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          삭제
        </Button>
      </div>

      {/* 결재 반려 알림 */}
      {isRejected && (
        <Card className="border-destructive dark:border-red-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              결재 반려
            </CardTitle>
            <p className="text-sm text-muted-foreground">수주보고서가 반려되었습니다. 내용을 수정 후 재상신해 주세요.</p>
          </CardHeader>
        </Card>
      )}

      {/* 결재 상신 패널 (대기 상태) */}
      {isDraft && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-blue-800 dark:text-blue-300">
              <CheckCircle2 className="w-4 h-4" />
              결재 상신
            </CardTitle>
            <p className="text-sm text-muted-foreground">1차 결재자(팀장)를 지정하고 결재를 상신하세요.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                1차 결재자 (팀장) <span className="text-destructive">*</span>
              </Label>
              <UserPicker value={firstApprover?.name ?? ""} users={users.filter((u) => positionLevel(u.position) >= 2)} onSelect={setFirstApprover} placeholder="팀장을 선택하세요" />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSubmitReport} disabled={isSubmittingReport || !firstApprover?.id}>
                {isSubmittingReport ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    상신 중...
                  </>
                ) : (
                  "결재 상신"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 결재 처리 패널 (결재중 상태) */}
      {isInProgress && r.workflowId && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <CheckCircle2 className="w-4 h-4" />
                결재 처리
              </CardTitle>
              {currentStepOrder && (
                <Badge variant="outline" className="text-amber-700 border-amber-400 dark:text-amber-300 dark:border-amber-700">
                  {currentStepOrder}차 결재 진행 중
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">결재 요청이 접수되었습니다.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 결재 현황 */}
            {workflowLines && workflowLines.length > 0 && (
              <div className="border rounded-md p-3 space-y-2">
                <p className="text-xs text-muted-foreground mb-2">결재 현황</p>
                {workflowLines.map((line) => (
                  <div key={line.stepOrder} className="flex items-center gap-3 text-sm">
                    <span className="w-8 text-xs text-muted-foreground shrink-0">{line.stepOrder}차</span>
                    <span className="w-16 text-xs text-muted-foreground shrink-0">{line.approverPosition}</span>
                    <span className="flex-1 font-medium">{line.approverName}</span>
                    <Badge variant={line.status === "승인" ? "default" : line.status === "반려" ? "destructive" : line.status === "진행중" ? "secondary" : "outline"} className="text-xs">
                      {line.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {isCurrentApprover === null ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                결재 단계 확인 중...
              </div>
            ) : !isCurrentApprover ? (
              <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">현재 {currentStepOrder}차 결재 담당자가 검토 중입니다. 검토 완료 후 다음 단계로 진행됩니다.</div>
            ) : (
              <>
                {needNextApprover === null ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    결재 단계 확인 중...
                  </div>
                ) : needNextApprover ? (
                  <div className="space-y-2">
                    <Label>
                      다음 결재자{" "}
                      <span className="text-xs text-muted-foreground font-normal">{currentStepOrder === 1 ? "(본부장 선택)" : currentStepOrder === 2 ? "(배포·공유 권한자 선택)" : ""}</span>{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <UserPicker
                      value={nextApprover?.name ?? ""}
                      users={currentStepOrder === 1 ? users.filter((u) => positionLevel(u.position) >= 3) : users}
                      onSelect={setNextApprover}
                      placeholder={currentStepOrder === 1 ? "본부장을 선택하세요" : "다음 결재자를 선택하세요"}
                    />
                    <p className="text-xs text-muted-foreground">{currentStepOrder === 1 ? "2차 결재자(본부장)를 지정해주세요." : "배포·공유 담당자를 지정해주세요."}</p>
                  </div>
                ) : (
                  <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-300">
                    최종 결재 단계입니다. 승인 시 결재가 완료됩니다.
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="approvalComment">결재 의견 (반려 시 필수)</Label>
                  <Textarea id="approvalComment" value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} placeholder="결재 의견을 입력해 주세요." rows={3} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="destructive" onClick={handleReject} disabled={isRejecting || isApproving || needNextApprover === null}>
                    {isRejecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        반려 중...
                      </>
                    ) : (
                      "반려"
                    )}
                  </Button>
                  <Button onClick={handleApprove} disabled={isApproving || isRejecting || needNextApprover === null}>
                    {isApproving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        승인 중...
                      </>
                    ) : (
                      "승인"
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 변경 이력 */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">변경 이력</CardTitle>
            <Badge variant="secondary">{historiesLoading ? "..." : `${histories.length}건`}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {historiesLoading ? (
            <div className="flex justify-center items-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              불러오는 중...
            </div>
          ) : histories.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 변경 이력이 없습니다.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>버전</TableHead>
                  <TableHead>수주보고코드</TableHead>
                  <TableHead>저장일시</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {histories.map((history) => (
                  <TableRow key={history.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedHistoryId(history.id)}>
                    <TableCell>
                      <Badge variant="outline">v{history.version}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{history.orderReportCode}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{history.orderReportDate ? history.orderReportDate.replace("T", " ").slice(0, 16) : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* 공통 세부내역 테이블 서브 컴포넌트 */
type HeaderDef = { label: string; span: number };
type CellDef = { value: string; span: number; center?: boolean; right?: boolean; highlight?: boolean };

function DetailTable({ title, headers, rows, total }: { title: string; headers: HeaderDef[]; rows: CellDef[][]; total: number }) {
  return (
    <div className="mb-6">
      <div className="text-sm font-bold text-slate-800 mb-1 mt-6">{title}</div>
      <table className="w-full border-collapse border border-black text-sm text-center table-fixed bg-white">
        <colgroup>
          {Array.from({ length: 10 }).map((_, i) => (
            <col key={i} className="w-[10%]" />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-slate-100 border-b border-black">
            {headers.map((h, i) => (
              <th key={i} className="border-r border-black py-1.5 last:border-r-0" colSpan={h.span}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr className="border-b border-black">
              <td colSpan={10} className="py-3 text-muted-foreground">
                등록된 내역이 없습니다
              </td>
            </tr>
          )}
          {rows.map((cells, ri) => (
            <tr key={ri} className="border-b border-black">
              {cells.map((c, ci) => (
                <td
                  key={ci}
                  colSpan={c.span}
                  className={`border-r border-black last:border-r-0 px-2 py-1.5 text-sm ${c.center ? "text-center" : ""} ${c.right ? "text-right" : ""} ${
                    c.highlight ? "bg-orange-50 font-semibold text-slate-600" : ""
                  }`}
                >
                  {c.value}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-yellow-200 font-bold border-b border-black">
            <td className="border-r border-black p-2 text-center text-slate-700" colSpan={8}>
              합계
            </td>
            <td className="p-2 text-right font-bold text-blue-700" colSpan={2}>
              {fmt(total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
