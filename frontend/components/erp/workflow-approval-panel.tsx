"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle2, Send, HelpCircle, FileCheck, Ban } from "lucide-react";
import { UserPicker } from "@/components/erp/user-picker";
import { loadBackendCurrentUserInfo, loadBackendUsers, approveBackendWorkflow, rejectBackendWorkflow, type BackendUserSummary } from "@/lib/workflow-backend";
import { getBackendApiBaseUrl } from "@/lib/api-base-url";
import { buildAuthHeaders } from "@/lib/auth-session";
import { contractApi, licenseApi } from "@/lib/api/contract-api";
import { submitMaintenance, submitCustomerSupportRequest } from "@/lib/api/maintenance";

type WorkflowLineData = {
  stepOrder: number;
  stepName: string;
  approverName: string;
  approverPosition: string;
  status: string;
};

interface WorkflowApprovalPanelProps {
  workflowId?: number | null;
  status?: string;
  targetId: number;
  domainType: "CONTRACT" | "LICENSE" | "MAINTENANCE" | "CUSTOMER_SUPPORT";
  onRefresh?: () => void;
}

const positionLevel = (pos: string | undefined): number => {
  const p = pos?.trim() ?? "";
  if (p === "HEAD_DIRECTOR" || p === "본부장") return 3;
  if (p === "TEAM_LEADER" || p === "팀장") return 2;
  if (p === "TEAM_MEMBER" || p === "팀원" || p === "담당자") return 1;
  return 0;
};

export function WorkflowApprovalPanel({ workflowId, status, targetId, domainType, onRefresh }: WorkflowApprovalPanelProps) {
  const isDraft = status === "결재 대기" || !status;
  const isInProgress = status === "결재중";
  const isApproved = status === "승인 완료";
  const isRejected = status === "반려";

  const [users, setUsers] = useState<BackendUserSummary[]>([]);
  const [currentUser, setCurrentUser] = useState<{ userId?: string; name?: string } | null>(null);

  // 결재 상신 상태
  const [firstApprover, setFirstApprover] = useState<BackendUserSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 결재 처리 상태
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [needNextApprover, setNeedNextApprover] = useState<boolean | null>(null);
  const [currentStepOrder, setCurrentStepOrder] = useState<number | null>(null);
  const [isCurrentApprover, setIsCurrentApprover] = useState<boolean | null>(null);
  const [workflowLines, setWorkflowLines] = useState<WorkflowLineData[] | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [nextApprover, setNextApprover] = useState<BackendUserSummary | null>(null);

  // 사용자 정보 & 전체 사용자 목록 불러오기
  useEffect(() => {
    (async () => {
      try {
        const u = await loadBackendUsers();
        setUsers(u);
      } catch (err) {
        console.error("사용자 목록 로드 실패", err);
      }
    })();

    (async () => {
      try {
        const info = await loadBackendCurrentUserInfo();
        setCurrentUser(info);
      } catch (err) {
        console.error("현재 사용자 정보 로드 실패", err);
      }
    })();
  }, []);

  // 결재 정보 실시간 확인 (결재중 상태)
  useEffect(() => {
    if (!isInProgress || !workflowId || !currentUser?.userId) return;

    setNeedNextApprover(null);
    setCurrentStepOrder(null);
    setIsCurrentApprover(null);
    setWorkflowLines(null);

    const fetchWorkflowStatus = async () => {
      try {
        const res = await fetch(`${getBackendApiBaseUrl()}/admin/workflows/my/${currentUser.userId}`, {
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

        const matched = workflows.find((w) => w.id === workflowId);
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
        setIsCurrentApprover(!!currentUser.name && currentUser.name === activeLine?.approverName);
      } catch (e) {
        console.error("워크플로우 정보 조회 실패", e);
        setNeedNextApprover(true);
        setIsCurrentApprover(false);
      }
    };

    fetchWorkflowStatus();
  }, [workflowId, isInProgress, currentUser]);

  // 결재 상신 처리
  const handleStartWorkflow = async () => {
    if (!firstApprover?.id) {
      toast.error("1차 결재자를 지정해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      if (domainType === "CONTRACT") {
        res = await contractApi.submitContract(targetId, firstApprover.id);
      } else if (domainType === "LICENSE") {
        res = await licenseApi.submitLicense(targetId, firstApprover.id);
      } else if (domainType === "MAINTENANCE") {
        res = await submitMaintenance(targetId, firstApprover.id);
      } else if (domainType === "CUSTOMER_SUPPORT") {
        res = await submitCustomerSupportRequest(targetId, firstApprover.id);
      }

      toast.success("결재 상신이 완료되었습니다.");
      onRefresh?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "결재 상신에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 승인 처리
  const handleApprove = async () => {
    if (!workflowId) return;

    if (needNextApprover && !nextApprover?.id) {
      toast.error("다음 결재자를 선택해 주세요.");
      return;
    }

    // 포지션 레벨 검증
    if (needNextApprover && nextApprover) {
      const levelFilter = getNextApproverFilter(domainType, currentStepOrder ?? 1);
      if (!levelFilter(nextApprover)) {
        toast.error("지정된 직급 조건에 맞지 않는 결재자입니다.");
        return;
      }
    }

    setIsApproving(true);
    try {
      await approveBackendWorkflow(workflowId, {
        nextApproverId: nextApprover?.id ?? null,
        comment: approvalComment,
      });
      toast.success("결재가 정상적으로 승인되었습니다.");
      setApprovalComment("");
      setNextApprover(null);
      onRefresh?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "결재 승인 처리에 실패했습니다.");
    } finally {
      setIsApproving(false);
    }
  };

  // 반려 처리
  const handleReject = async () => {
    if (!workflowId) return;

    if (!approvalComment.trim()) {
      toast.error("반려 시 결재 의견(반려 사유)을 필수로 입력해 주세요.");
      return;
    }

    setIsRejecting(true);
    try {
      await rejectBackendWorkflow(workflowId, {
        comment: approvalComment,
      });
      toast.success("결재가 반려되었습니다.");
      setApprovalComment("");
      setNextApprover(null);
      onRefresh?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "결재 반려 처리에 실패했습니다.");
    } finally {
      setIsRejecting(false);
    }
  };

  // 첫 결재자 조건 계산
  const getFirstApproverFilter = () => {
    if (domainType === "CONTRACT" || domainType === "MAINTENANCE") {
      return (u: BackendUserSummary) => positionLevel(u.position) >= 2; // 팀장 이상
    }
    // LICENSE, CUSTOMER_SUPPORT
    return (u: BackendUserSummary) => positionLevel(u.position) >= 1; // 라이선스/고객지원 담당자 (팀원 이상)
  };

  const getFirstApproverLabel = () => {
    if (domainType === "CONTRACT" || domainType === "MAINTENANCE") return "1차 결재자 (팀장)";
    if (domainType === "LICENSE") return "1차 결재자 (라이선스 관리 담당자)";
    return "1차 결재자 (고객지원 담당자)";
  };

  const getFirstApproverPlaceholder = () => {
    if (domainType === "CONTRACT" || domainType === "MAINTENANCE") return "팀장을 선택하세요";
    if (domainType === "LICENSE") return "라이선스 관리 담당자를 선택하세요";
    return "고객지원 담당자를 선택하세요";
  };

  // 다음 결재자 조건 계산
  const getNextApproverFilter = (domain: string, step: number) => {
    if (domain === "CONTRACT" || domain === "MAINTENANCE") {
      if (step === 1) return (u: BackendUserSummary) => positionLevel(u.position) >= 3; // 본부장
      return (u: BackendUserSummary) => true; // 배포 및 공유 (제한 없음)
    } else {
      if (step === 1) return (u: BackendUserSummary) => positionLevel(u.position) >= 2; // 팀장
      if (step === 2) return (u: BackendUserSummary) => positionLevel(u.position) >= 3; // 본부장
      return (u: BackendUserSummary) => true; // 배포 및 공유 (제한 없음)
    }
  };

  const getNextApproverText = (domain: string, step: number) => {
    if (domain === "CONTRACT" || domain === "MAINTENANCE") {
      if (step === 1) return { label: "2차 결재자 (본부장)", placeholder: "본부장을 선택하세요", helper: "2차 결재자(본부장)를 지정해 주세요." };
      return { label: "배포 및 공유 담당자", placeholder: "담당자를 선택하세요", helper: "최종 완료 후 문서를 공유받을 담당자를 지정해 주세요." };
    } else {
      if (step === 1) return { label: "2차 결재자 (팀장)", placeholder: "팀장을 선택하세요", helper: "2차 결재자(팀장)를 지정해 주세요." };
      if (step === 2) return { label: "3차 결재자 (본부장)", placeholder: "본부장을 선택하세요", helper: "3차 결재자(본부장)를 지정해 주세요." };
      return { label: "배포 및 공유 담당자", placeholder: "담당자를 선택하세요", helper: "최종 완료 후 문서를 공유받을 담당자를 지정해 주세요." };
    }
  };

  const nextApproverMeta = currentStepOrder ? getNextApproverText(domainType, currentStepOrder) : null;

  return (
    <div className="mt-8 transition-all duration-300">
      {/* 1. 결재 승인 완료 상태 */}
      {isApproved && (
        <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 backdrop-blur-md shadow-lg shadow-emerald-500/5">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
          <CardHeader className="pb-3 pl-8">
            <CardTitle className="text-base flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400 font-semibold">
              <FileCheck className="w-5 h-5 text-emerald-500 animate-bounce" />
              결재 완료
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">본 문서가 최종 승인되었습니다. ERP 시스템에 안전하게 기록 및 배포되었습니다.</p>
          </CardHeader>
        </Card>
      )}

      {/* 2. 결재 반려 상태 */}
      {isRejected && (
        <Card className="relative overflow-hidden border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-amber-500/5 backdrop-blur-md shadow-lg shadow-rose-500/5">
          <div className="absolute top-0 left-0 w-2 h-full bg-rose-500" />
          <CardHeader className="pb-3 pl-8">
            <CardTitle className="text-base flex items-center gap-2.5 text-rose-700 dark:text-rose-400 font-semibold">
              <Ban className="w-5 h-5 text-rose-500" />
              결재 반려
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">결재가 반려되었습니다. 상신 의견 및 결재 이력을 참고하여 보완 후 재상신해주세요.</p>
          </CardHeader>
        </Card>
      )}

      {/* 3. 결재 대기 (DRAFT) 상태 */}
      {isDraft && (
        <Card className="relative overflow-hidden border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 backdrop-blur-md shadow-lg">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
          <CardHeader className="pb-3 pl-8">
            <CardTitle className="text-base flex items-center gap-2.5 text-blue-800 dark:text-blue-300 font-semibold">
              <Send className="w-4 h-4 text-blue-500" />
              결재 상신
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">지정된 직급 조건에 맞는 1차 결재자를 지정하고 상신을 완료하세요.</p>
          </CardHeader>
          <CardContent className="pl-8 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                {getFirstApproverLabel()} <span className="text-rose-500">*</span>
              </Label>
              <UserPicker value={firstApprover?.name ?? ""} users={users.filter(getFirstApproverFilter())} onSelect={setFirstApprover} placeholder={getFirstApproverPlaceholder()} />
            </div>
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleStartWorkflow}
                disabled={isSubmitting || !firstApprover?.id}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/10 active:scale-95 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    상신 처리 중...
                  </>
                ) : (
                  "결재 상신"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. 결재중 (PENDING) 상태 */}
      {isInProgress && workflowId && (
        <Card className="relative overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5 backdrop-blur-md shadow-lg">
          <div className="absolute top-0 left-0 w-2 h-full bg-amber-500" />
          <CardHeader className="pb-3 pl-8">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2.5 text-amber-800 dark:text-amber-300 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-amber-500" />
                결재 진행 중
              </CardTitle>
              {currentStepOrder && (
                <Badge variant="outline" className="text-amber-700 border-amber-400 dark:text-amber-300 dark:border-amber-700 bg-amber-500/10">
                  {currentStepOrder}차 결재 검토 중
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">상신된 워크플로우 결재가 진행 중입니다.</p>
          </CardHeader>
          <CardContent className="pl-8 space-y-5">
            {/* 결재 현황 스태퍼 */}
            {workflowLines && workflowLines.length > 0 && (
              <div className="border border-amber-500/10 rounded-lg p-4 bg-muted/30 backdrop-blur-sm space-y-3">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
                  <HelpCircle className="w-3.5 h-3.5" />
                  결재 라인 정보
                </p>
                <div className="space-y-2.5">
                  {workflowLines.map((line) => {
                    const isActive = line.stepOrder === currentStepOrder && line.status === "진행중";
                    return (
                      <div
                        key={line.stepOrder}
                        className={`flex items-center gap-3 text-sm p-2 rounded-md transition-all ${
                          isActive ? "bg-amber-500/10 border border-amber-500/20 shadow-sm" : "bg-transparent border border-transparent"
                        }`}
                      >
                        <span className="w-10 text-xs text-muted-foreground font-semibold shrink-0">{line.stepOrder}차 단계</span>
                        <span className="w-20 text-xs text-muted-foreground shrink-0 truncate">
                          {line.approverPosition === "HEAD_DIRECTOR" ? "본부장" : line.approverPosition === "TEAM_LEADER" ? "팀장" : line.approverPosition || "담당자"}
                        </span>
                        <span className={`flex-1 font-medium ${isActive ? "text-amber-800 dark:text-amber-300 font-semibold" : ""}`}>{line.approverName}</span>
                        <Badge
                          variant={line.status === "승인" ? "default" : line.status === "반려" ? "destructive" : line.status === "진행중" ? "secondary" : "outline"}
                          className={`text-xs ${
                            line.status === "승인"
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                              : line.status === "반려"
                                ? "bg-rose-500/10 text-rose-700 border-rose-500/20"
                                : line.status === "진행중"
                                  ? "bg-amber-500/20 text-amber-800 border-amber-500/30"
                                  : ""
                          }`}
                        >
                          {line.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isCurrentApprover === null ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                사용자 권한 상태 확인 중...
              </div>
            ) : !isCurrentApprover ? (
              <div className="rounded-lg bg-muted/40 border px-4 py-3.5 text-sm text-muted-foreground leading-relaxed">
                현재 <span className="font-semibold text-foreground">{currentStepOrder}차 결재 담당자</span>가 문서를 검토 중입니다. 검토 및 승인이 완료되면 다음 단계로 이관됩니다.
              </div>
            ) : (
              <>
                {needNextApprover === null ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    다음 단계 승인 사양 확인 중...
                  </div>
                ) : needNextApprover && nextApproverMeta ? (
                  <div className="space-y-2 border-t pt-4">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      {nextApproverMeta.label} <span className="text-rose-500">*</span>
                    </Label>
                    <UserPicker
                      value={nextApprover?.name ?? ""}
                      users={users.filter(getNextApproverFilter(domainType, currentStepOrder ?? 1))}
                      onSelect={setNextApprover}
                      placeholder={nextApproverMeta.placeholder}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{nextApproverMeta.helper}</p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    본 단계는 최종 승인 단계입니다. 승인 처리 시 즉시 결재가 완료되고 문서가 발행 및 배포됩니다.
                  </div>
                )}

                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="approvalComment" className="text-sm font-medium">
                    결재 의견 <span className="text-xs text-muted-foreground">(반려 처리 시 입력 필수)</span>
                  </Label>
                  <Textarea
                    id="approvalComment"
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    placeholder="결재 내용 검토 의견 또는 반려 사유를 상세하게 입력해 주세요."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleReject}
                    disabled={isRejecting || isApproving || needNextApprover === null}
                    className="border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-700 text-rose-600 active:scale-95 transition-all"
                  >
                    {isRejecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        반려 중...
                      </>
                    ) : (
                      "반려"
                    )}
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={isApproving || isRejecting || needNextApprover === null}
                    className="bg-amber-600 hover:bg-amber-700 text-white shadow-md active:scale-95 transition-all"
                  >
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
    </div>
  );
}
