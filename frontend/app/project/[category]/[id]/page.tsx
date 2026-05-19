"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, FileText, Download, Upload, CheckCircle2 } from "lucide-react";
import { projectApi, type ProjectDetailResponse, type BillingDetailResponse, uploadBillingInvoiceFile, ProjectHistoryDetailResponse, ProjectHistoryListResponse, type BillingHistoryListResponse, type BillingHistoryDetailResponse } from "@/lib/api/project-api";
import { emitAlarmUpdate } from "@/hooks/use-alarms";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { approveBackendWorkflow, rejectBackendWorkflow, loadBackendCurrentUserInfo, type BackendUserSummary } from "@/lib/workflow-backend";
import { getBackendApiBaseUrl } from "@/lib/api-base-url";
import { buildAuthHeaders } from "@/lib/auth-session";
import { useBackendUsers } from "@/lib/use-backend-users";
import { UserPicker } from "@/components/erp/user-picker";
import { customInstance } from "@/lib/api/customAxios";

type Category = "results" | "billingAndCollection";

type WorkflowLineData = {
  stepOrder: number;
  stepName: string;
  approverName: string;
  approverPosition: string;
  status: string;
};

// 사업 상세 뷰
function ProjectDetail({ id }: { id: number }) {
  const router = useRouter();
  const [data, setData] = useState<ProjectDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 변경 이력 상태
  const [histories, setHistories] = useState<ProjectHistoryListResponse[]>([]);
  const [historiesLoading, setHistoriesLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const [historyData, setHistoryData] = useState<ProjectHistoryDetailResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    projectApi
      .getProject(id)
      .then((res) => setData(res.data))
      .catch(() => setError("사업 정보를 불러오는 데 실패했습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setHistoriesLoading(true);
    projectApi
      .getProjectHistories(id)
      .then((res) => setHistories(res.data ?? []))
      .catch((e) => console.error("히스토리를 불러오는 데 실패했습니다.", e))
      .finally(() => setHistoriesLoading(false));
  }, [id]);

  useEffect(() => {
    if (selectedHistoryId == null) {
      setHistoryData(null);
      return;
    }
    setHistoryLoading(true);
    projectApi
      .getProjectHistory(selectedHistoryId)
      .then((res) => setHistoryData(res.data))
      .catch((e) => console.error("히스토리 상세 정보를 불러오는 데 실패했습니다.", e))
      .finally(() => setHistoryLoading(false));
  }, [selectedHistoryId]);

  const handleDelete = async () => {
    if (!confirm("사업을 삭제하시겠습니까?")) return;
    try {
      await projectApi.deleteProject(id);
      router.push("/project");
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "-";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;

      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const h = String(date.getHours()).padStart(2, "0");
      const min = String(date.getMinutes()).padStart(2, "0");
      const s = String(date.getSeconds()).padStart(2, "0");

      return `${y}-${m}-${d} ${h}:${min}:${s}`;
    } catch {
      return isoString;
    }
  };

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "데이터를 찾을 수 없습니다."} />;

  // 히스토리 상세 로딩
  if (selectedHistoryId != null && (historyLoading || !historyData)) {
    return <LoadingState />;
  }

  // 히스토리가 활성화된 경우: 이력 스냅샷 정보 출력
  if (selectedHistoryId != null && historyData) {
    const historyFields = [
      { label: "사업번호", value: historyData.pjtNumber },
      { label: "사업명", value: historyData.pjtName },
      { label: "고객사", value: historyData.customerName },
      {
        label: "사업금액",
        value: historyData.totalAmount != null ? `₩${historyData.totalAmount.toLocaleString()}` : null,
      },
      { label: "사업개시일", value: historyData.startDate },
      { label: "사업완료일", value: historyData.endDate },
      { label: "PM", value: historyData.pmName },
      { label: "영업대표", value: historyData.salesRepName },
    ];

    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>사업 상세 이력</CardTitle>
            <p className="text-xs text-muted-foreground">이력 저장일시: {formatDate(historyData.savedAt)}</p>
          </div>
          <Badge variant={historyData.resultReport ? "default" : "outline"}>{historyData.resultReport ? "결과보고 완료" : "결과보고 미등록"}</Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {historyFields.map((f) => (
              <div key={f.label}>
                <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
                <p className="font-medium">{f.value ?? "-"}</p>
              </div>
            ))}
          </div>

          {/* 결과보고서 */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-2">결과보고서 (이력 시점)</p>
            {historyData.resultReport ? (
              <div className="flex items-center gap-3 bg-muted/50 rounded-md p-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium flex-1">{historyData.resultReport.fileName}</span>
                <span className="text-xs text-muted-foreground">{(historyData.resultReport.fileSize / 1024).toFixed(1)} KB</span>
                <a href={historyData.resultReport.fileUrl} download>
                  <Button size="sm" variant="ghost">
                    <Download className="w-4 h-4 mr-1" />
                    다운로드
                  </Button>
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">첨부된 결과보고서가 없습니다.</p>
            )}
          </div>

          {/* 관련 문서 */}
          <div className="border-t pt-4 flex gap-4 text-sm">
            {historyData.orderReportId && (
              <Link href={`/contract/orders/${historyData.orderReportId}`} className="text-blue-600 hover:underline">
                수주보고서 바로가기
              </Link>
            )}
            {historyData.contractId && (
              <Link href={`/contract/contracts/${historyData.contractId}`} className="text-blue-600 hover:underline">
                계약서 바로가기
              </Link>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" asChild>
              <Link href="/project?tab=results">목록으로</Link>
            </Button>
            <Button variant="secondary" onClick={() => setSelectedHistoryId(null)}>
              현재 상세로 돌아가기
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 기본 상태: 현재 사업 상세 정보 + 하단에 히스토리 목록 출력
  const fields = [
    { label: "사업번호", value: data.pjtNumber },
    { label: "사업명", value: data.pjtName },
    { label: "고객사", value: data.customerName },
    {
      label: "사업금액",
      value: data.totalAmount != null ? `₩${data.totalAmount.toLocaleString()}` : null,
    },
    { label: "사업개시일", value: data.startDate },
    { label: "사업완료일", value: data.endDate },
    { label: "PM", value: data.pmName },
    { label: "영업대표", value: data.salesRepName },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>사업 상세</CardTitle>
          <Badge variant={data.resultReport ? "default" : "outline"}>{data.resultReport ? "결과보고 완료" : "결과보고 미등록"}</Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.label}>
                <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
                <p className="font-medium">{f.value ?? "-"}</p>
              </div>
            ))}
          </div>

          {/* 결과보고서 */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-2">결과보고서</p>
            {data.resultReport ? (
              <div className="flex items-center gap-3 bg-muted/50 rounded-md p-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium flex-1">{data.resultReport.fileName}</span>
                <span className="text-xs text-muted-foreground">{(data.resultReport.fileSize / 1024).toFixed(1)} KB</span>
                <a href={data.resultReport.fileUrl} download>
                  <Button size="sm" variant="ghost">
                    <Download className="w-4 h-4 mr-1" />
                    다운로드
                  </Button>
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">첨부된 결과보고서가 없습니다.</p>
            )}
          </div>

          {/* 관련 문서 */}
          <div className="border-t pt-4 flex gap-4 text-sm">
            {data.orderReportId && (
              <Link href={`/contract/orders/${data.orderReportId}`} className="text-blue-600 hover:underline">
                수주보고서 바로가기
              </Link>
            )}
            {data.contractId && (
              <Link href={`/contract/contracts/${data.contractId}`} className="text-blue-600 hover:underline">
                계약서 바로가기
              </Link>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              삭제
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/project?tab=results">목록으로</Link>
              </Button>
              <Button asChild>
                <Link href={`/project/results/${id}/edit`}>수정</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 변경 이력 카드 */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">변경 이력</CardTitle>
            <Badge variant="secondary">{histories.length}건</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {historiesLoading ? (
            <div className="flex justify-center items-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              불러오는 중...
            </div>
          ) : histories.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 변경 이력이 없습니다.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>변경일시</TableHead>
                  <TableHead>고객사</TableHead>
                  <TableHead>사업명</TableHead>
                  <TableHead className="text-right">사업금액</TableHead>
                  <TableHead>사업개시일</TableHead>
                  <TableHead>사업완료일</TableHead>
                  <TableHead>PM</TableHead>
                  <TableHead>영업대표</TableHead>
                  <TableHead className="text-center">결과보고</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {histories.map((history) => (
                  <TableRow key={history.historyId} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedHistoryId(history.historyId)}>
                    <TableCell className="text-xs text-muted-foreground font-medium">{formatDate(history.savedAt)}</TableCell>
                    <TableCell>{history.customerName ?? "-"}</TableCell>
                    <TableCell className="font-medium max-w-[150px] truncate">{history.projectName ?? "-"}</TableCell>
                    <TableCell className="text-right font-medium">{history.totalAmount != null ? `₩${history.totalAmount.toLocaleString()}` : "-"}</TableCell>
                    <TableCell className="text-sm">{history.startDate ?? "-"}</TableCell>
                    <TableCell className="text-sm">{history.endDate ?? "-"}</TableCell>
                    <TableCell>{history.pmName ?? "-"}</TableCell>
                    <TableCell>{history.salesRepresentativeName ?? "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={history.hasResultReport ? "default" : "outline"}>{history.hasResultReport ? "완료" : "미등록"}</Badge>
                    </TableCell>
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

// 청구 상세 뷰
function BillingDetail({ id }: { id: number }) {
  const router = useRouter();
  const users = useBackendUsers();
  const [data, setData] = useState<BillingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 결재 처리 상태
  const [approvalComment, setApprovalComment] = useState("");
  const [nextApprover, setNextApprover] = useState<BackendUserSummary | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  // null = 로딩 중, true = 다음 결재자 필요, false = 최종 단계
  const [needNextApprover, setNeedNextApprover] = useState<boolean | null>(null);
  // 현재 결재 단계 (1, 2, 3)
  const [currentStepOrder, setCurrentStepOrder] = useState<number | null>(null);
  // null = 로딩 중, true = 현재 사용자가 결재자, false = 아님
  const [isCurrentApprover, setIsCurrentApprover] = useState<boolean | null>(null);
  // 워크플로우 라인 목록 (결재 현황 표시용)
  const [workflowLines, setWorkflowLines] = useState<WorkflowLineData[] | null>(null);
  // null = 로딩 중, true = 현재 사용자가 세금계산서 발행 담당자(1차 결재자)
  const [isInvoiceManager, setIsInvoiceManager] = useState<boolean | null>(null);

  // 인보이스 이미지 URL
  const [invoiceImageUrl, setInvoiceImageUrl] = useState<string | null>(null);

  // 세금계산서 발행 처리 상태
  const [issuedAt, setIssuedAt] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [issuing, setIssuing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 수금 처리 상태
  const [collectedAt, setCollectedAt] = useState("");
  const [collecting, setCollecting] = useState(false);

  // 변경 이력 상태
  const [histories, setHistories] = useState<BillingHistoryListResponse[]>([]);
  const [historiesLoading, setHistoriesLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const [historyData, setHistoryData] = useState<BillingHistoryDetailResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyInvoiceImageUrl, setHistoryInvoiceImageUrl] = useState<string | null>(null);

  const fetchHistories = () => {
    setHistoriesLoading(true);
    projectApi
      .getBillingHistories(id)
      .then((res) => setHistories(res.data ?? []))
      .catch((e) => console.error("히스토리를 불러오는 데 실패했습니다.", e))
      .finally(() => setHistoriesLoading(false));
  };

  const loadData = () => {
    setLoading(true);
    projectApi
      .getBilling(id)
      .then((res) => setData(res.data))
      .catch(() => setError("청구 정보를 불러오는 데 실패했습니다."))
      .finally(() => setLoading(false));
    fetchHistories();
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (selectedHistoryId == null) {
      setHistoryData(null);
      return;
    }
    setHistoryLoading(true);
    projectApi
      .getBillingHistory(selectedHistoryId)
      .then((res) => setHistoryData(res.data))
      .catch((e) => console.error("히스토리 상세 정보를 불러오는 데 실패했습니다.", e))
      .finally(() => setHistoryLoading(false));
  }, [selectedHistoryId]);

  useEffect(() => {
    if (!historyData?.invoiceImageId) {
      setHistoryInvoiceImageUrl(null);
      return;
    }
    customInstance<{ code: number; message: string; data: string }>({
      url: `/files/${historyData.invoiceImageId}/view`,
      method: "GET",
    })
      .then((res) => setHistoryInvoiceImageUrl(res.data))
      .catch(() => setHistoryInvoiceImageUrl(null));
  }, [historyData?.invoiceImageId]);

  // 인보이스 이미지 presigned URL 조회
  useEffect(() => {
    if (!data?.invoiceImageId) {
      setInvoiceImageUrl(null);
      return;
    }
    customInstance<{ code: number; message: string; data: string }>({
      url: `/files/${data.invoiceImageId}/view`,
      method: "GET",
    })
      .then((res) => setInvoiceImageUrl(res.data))
      .catch(() => setInvoiceImageUrl(null));
  }, [data?.invoiceImageId]);

  // 결재/발행 처리에 필요한 워크플로우 정보 조회
  useEffect(() => {
    if (!data) return;

    const isPending = data.approvalStatus === "PENDING" && data.workflowId !== null;
    const isApproved = data.status === "APPROVED";

    setNeedNextApprover(null);
    setCurrentStepOrder(null);
    setIsCurrentApprover(null);
    setWorkflowLines(null);
    setIsInvoiceManager(null);

    if (!isPending && !isApproved) return;

    (async () => {
      try {
        const userInfo = await loadBackendCurrentUserInfo();
        if (!userInfo.userId) {
          if (isPending) {
            setNeedNextApprover(true);
            setIsCurrentApprover(false);
          }
          if (isApproved) setIsInvoiceManager(false);
          return;
        }

        const res = await fetch(`${getBackendApiBaseUrl()}/admin/workflows/my/${userInfo.userId}`, {
          headers: buildAuthHeaders(),
          credentials: "include",
        });

        if (!res.ok) {
          if (isPending) {
            setNeedNextApprover(true);
            setIsCurrentApprover(false);
          }
          if (isApproved) setIsInvoiceManager(false);
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

        // PENDING: workflowId로 매칭 (진행 중인 워크플로우)
        // APPROVED: targetId(청구 ID)로 매칭 (완료된 워크플로우)
        const matched = isPending ? workflows.find((w) => w.id === data.workflowId) : workflows.find((w) => w.targetId === id);

        if (!matched) {
          if (isPending) {
            setNeedNextApprover(true);
            setIsCurrentApprover(false);
          }
          if (isApproved) setIsInvoiceManager(false);
          return;
        }

        const lines = matched.lines ?? [];
        setWorkflowLines(lines);

        // 1차 결재자 = 세금계산서 발행 담당자(invoiceManager)
        const firstLine = lines.find((l) => l.stepOrder === 1);
        if (isApproved) {
          setIsInvoiceManager(!!userInfo.name && userInfo.name === firstLine?.approverName);
        }

        if (isPending) {
          setNeedNextApprover(matched.needNextApprover ?? false);
          setCurrentStepOrder(matched.currentStepOrder ?? null);

          // 현재 진행 중인 라인의 담당자 확인
          const activeLine = lines.find((l) => l.stepOrder === matched.currentStepOrder && l.status === "진행중");
          setIsCurrentApprover(!!userInfo.name && userInfo.name === activeLine?.approverName);
        }
      } catch {
        if (isPending) {
          setNeedNextApprover(true);
          setIsCurrentApprover(false);
        }
        if (isApproved) setIsInvoiceManager(false);
      }
    })();
  }, [data?.workflowId, data?.approvalStatus, data?.status, id]);

  // 결재 승인
  const handleApprove = async () => {
    if (!data || !data.workflowId) return;
    const workflowId = data.workflowId;
    if (needNextApprover && !nextApprover?.id) {
      alert("다음 결재자를 선택해주세요.");
      return;
    }
    setIsApproving(true);
    try {
      await approveBackendWorkflow(workflowId, {
        nextApproverId: nextApprover?.id ?? null,
        comment: approvalComment,
      });
      alert("승인 처리되었습니다.");
      emitAlarmUpdate();
      setApprovalComment("");
      setNextApprover(null);
      loadData();
    } catch (err: any) {
      alert(err?.message ?? "승인 처리에 실패했습니다.");
    } finally {
      setIsApproving(false);
    }
  };

  // 결재 반려
  const handleReject = async () => {
    if (!data || !data.workflowId) return;
    const workflowId = data.workflowId;
    if (!approvalComment.trim()) {
      alert("반려 사유를 입력해주세요.");
      return;
    }
    setIsRejecting(true);
    try {
      await rejectBackendWorkflow(workflowId, { comment: approvalComment });
      alert("반려 처리되었습니다.");
      emitAlarmUpdate();
      setApprovalComment("");
      loadData();
    } catch (err: any) {
      alert(err?.message ?? "반려 처리에 실패했습니다.");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDelete = async () => {
    if (!data) return;
    if (data.status !== "REQUESTED") {
      alert("최종 결재 승인된 청구 건은 삭제할 수 없습니다.");
      return;
    }
    if (!confirm("청구 정보를 삭제하시겠습니까?")) return;
    try {
      await projectApi.deleteBilling(id);
      router.push("/project?tab=billingAndCollection");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "삭제에 실패했습니다.";
      alert(msg);
    }
  };

  // 세금계산서 발행 처리
  const handleIssue = async () => {
    if (!issuedAt) {
      alert("세금계산서 발행일을 입력해주세요.");
      return;
    }

    setIssuing(true);
    try {
      let invoiceImageId: number | null = null;
      if (invoiceFile) {
        invoiceImageId = await uploadBillingInvoiceFile(invoiceFile);
      }

      await projectApi.issueBilling(id, { issuedAt, invoiceImageId });
      alert("세금계산서 발행 처리가 완료되었습니다.");
      emitAlarmUpdate();
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "발행 처리에 실패했습니다.";
      alert(msg);
    } finally {
      setIssuing(false);
    }
  };

  // 수금 처리
  const handleCollect = async () => {
    if (!collectedAt) {
      alert("수금일을 입력해주세요.");
      return;
    }

    setCollecting(true);
    try {
      await projectApi.collectBilling(id, { collectedAt });
      alert("수금 처리가 완료되었습니다.");
      emitAlarmUpdate();
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "수금 처리에 실패했습니다.";
      alert(msg);
    } finally {
      setCollecting(false);
    }
  };

  const statusLabel = (status: string) => {
    if (status === "REQUESTED") return "발행 요청";
    if (status === "APPROVED") return "결재 완료";
    if (status === "ISSUED") return "발행완료";
    if (status === "COLLECTED") return "수금완료";
    return status;
  };

  const statusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    if (status === "COLLECTED") return "default";
    if (status === "ISSUED") return "secondary";
    if (status === "APPROVED") return "secondary";
    return "outline";
  };

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "데이터를 찾을 수 없습니다."} />;

  // 히스토리 상세 로딩
  if (selectedHistoryId != null && (historyLoading || !historyData)) {
    return <LoadingState />;
  }

  // 히스토리가 활성화된 경우: 이력 스냅샷 정보 출력
  if (selectedHistoryId != null && historyData) {
    const historyFields = [
      { label: "고객사", value: historyData.customerName },
      { label: "사업명", value: historyData.projectName },
      { label: "청구금액", value: `₩${historyData.billingAmount.toLocaleString()}` },
      { label: "발행 희망일", value: historyData.requestedIssueDate },
      { label: "세금계산서 발행일", value: historyData.issuedAt ?? "-" },
      { label: "수금일", value: historyData.collectedAt ?? "-" },
      { label: "요청자", value: historyData.createdBy },
      { label: "요청일", value: historyData.createdAt?.slice(0, 10) },
      { label: "특기사항", value: historyData.remarks },
    ];

    const formatDate = (isoString?: string | null) => {
      if (!isoString) return "-";
      try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString;

        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        const h = String(date.getHours()).padStart(2, "0");
        const min = String(date.getMinutes()).padStart(2, "0");
        const s = String(date.getSeconds()).padStart(2, "0");

        return `${y}-${m}-${d} ${h}:${min}:${s}`;
      } catch {
        return isoString;
      }
    };

    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>청구 상세 이력</CardTitle>
            <p className="text-xs text-muted-foreground">이력 저장일시: {formatDate(historyData.createdAt)}</p>
          </div>
          <Badge variant={statusVariant(historyData.status)}>{statusLabel(historyData.status)}</Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {historyFields.map((f) => (
              <div key={f.label}>
                <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
                <p className="font-medium">{f.value ?? "-"}</p>
              </div>
            ))}
          </div>

          {/* 세금계산서 이미지 */}
          {historyData.invoiceImageId && (
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground mb-2">세금계산서 (이력 시점)</p>
              <div className="flex items-center gap-3 bg-muted/50 rounded-md p-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium flex-1">세금계산서 파일</span>
                {historyInvoiceImageUrl ? (
                  <a href={historyInvoiceImageUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost">
                      <Download className="w-4 h-4 mr-1" />
                      보기/다운로드
                    </Button>
                  </a>
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          )}

          {/* 관련 문서 */}
          <div className="border-t pt-4 flex gap-4 text-sm">
            {data?.orderReportId && (
              <Link href={`/contract/orders/${data.orderReportId}`} className="text-blue-600 hover:underline">
                수주보고서 #{data.orderReportId}
              </Link>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" asChild>
              <Link href="/project?tab=billingAndCollection">목록으로</Link>
            </Button>
            <Button variant="secondary" onClick={() => setSelectedHistoryId(null)}>
              현재 상세로 돌아가기
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fields = [
    { label: "고객사", value: data.customerName },
    { label: "사업명", value: data.projectName },
    { label: "청구금액", value: `₩${data.billingAmount.toLocaleString()}` },
    { label: "발행 희망일", value: data.requestedIssueDate },
    { label: "세금계산서 발행일", value: data.issuedAt ?? "-" },
    { label: "수금일", value: data.collectedAt ?? "-" },
    { label: "요청자", value: data.createdBy },
    { label: "요청일", value: data.createdAt?.slice(0, 10) },
    { label: "특기사항", value: data.remarks },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>청구 상세</CardTitle>
          <Badge variant={statusVariant(data.status)}>{statusLabel(data.status)}</Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.label}>
                <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
                <p className="font-medium">{f.value ?? "-"}</p>
              </div>
            ))}
          </div>

          {/* 세금계산서 이미지 */}
          {data.invoiceImageId && (
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground mb-2">세금계산서</p>
              <div className="flex items-center gap-3 bg-muted/50 rounded-md p-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium flex-1">세금계산서 파일</span>
                {invoiceImageUrl ? (
                  <a href={invoiceImageUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost">
                      <Download className="w-4 h-4 mr-1" />
                      보기/다운로드
                    </Button>
                  </a>
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          )}

          {/* 결재 현황 */}
          {workflowLines && workflowLines.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground mb-3">결재 현황</p>
              <div className="space-y-2">
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
            </div>
          )}

          {/* 관련 문서 */}
          <div className="border-t pt-4 flex gap-4 text-sm">
            {data.orderReportId && (
              <Link href={`/contract/orders/${data.orderReportId}`} className="text-blue-600 hover:underline">
                수주보고서 #{data.orderReportId}
              </Link>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t">
            {data.status === "REQUESTED" ? (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                삭제
              </Button>
            ) : (
              <span /> // empty element to preserve justify-between layout
            )}
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/project?tab=billingAndCollection">목록으로</Link>
              </Button>
              <Button asChild>
                <Link href={`/project/billingAndCollection/${id}/edit`}>수정</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 결재 반려 알림 */}
      {data.approvalStatus === "REJECTED" && (
        <Card className="border-destructive dark:border-red-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              결재 반려
            </CardTitle>
            <p className="text-sm text-muted-foreground">세금계산서 발행 요청이 반려되었습니다. 내용을 수정 후 재요청해 주세요.</p>
          </CardHeader>
        </Card>
      )}

      {/* 결재 처리 패널 (결재 대기 중) */}
      {data.approvalStatus === "PENDING" && data.workflowId !== null && (
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
                      다음 결재자 <span className="text-xs text-muted-foreground font-normal">{currentStepOrder === 1 ? "(팀장 선택)" : currentStepOrder === 2 ? "(본부장 선택)" : ""}</span>{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <UserPicker
                      value={nextApprover?.name ?? ""}
                      users={users}
                      onSelect={setNextApprover}
                      placeholder={currentStepOrder === 1 ? "팀장을 선택하세요" : currentStepOrder === 2 ? "본부장을 선택하세요" : "다음 결재자 선택"}
                    />
                    <p className="text-xs text-muted-foreground">
                      {currentStepOrder === 1 ? "2차 결재자(팀장)를 지정해주세요." : currentStepOrder === 2 ? "3차 결재자(본부장)를 지정해주세요." : "다음 결재자를 지정해주세요."}
                    </p>
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

      {/* 세금계산서 발행 처리 (결재 완료 상태, 발행 담당자에게만 표시) */}
      {data.status === "APPROVED" &&
        (isInvoiceManager === null ? (
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                권한 확인 중...
              </div>
            </CardContent>
          </Card>
        ) : isInvoiceManager ? (
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-blue-800 dark:text-blue-300">
                <CheckCircle2 className="w-4 h-4" />
                세금계산서 발행 처리
              </CardTitle>
              <p className="text-sm text-muted-foreground">결재가 완료되었습니다. 세금계산서 발행일과 이미지를 등록해주세요.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="issuedAt">세금계산서 발행일 *</Label>
                <Input id="issuedAt" type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceFile">세금계산서 이미지 등록</Label>
                <div className="flex items-center gap-3">
                  <input ref={fileInputRef} id="invoiceFile" type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    파일 선택
                  </Button>
                  {invoiceFile && <span className="text-sm text-muted-foreground">{invoiceFile.name}</span>}
                </div>
                <p className="text-xs text-muted-foreground">이미지 또는 PDF 파일을 업로드하세요. (선택사항)</p>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleIssue} disabled={issuing || !issuedAt}>
                  {issuing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    "세금계산서 발행 완료"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null)}

      {/* 수금 처리 (발행완료 상태일 때) */}
      {data.status === "ISSUED" && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-green-800 dark:text-green-300">
              <CheckCircle2 className="w-4 h-4" />
              수금 처리
            </CardTitle>
            <p className="text-sm text-muted-foreground">세금계산서가 발행되었습니다. 수금일을 입력하여 수금 결과를 확정해주세요.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 6) 수금일 */}
            <div className="space-y-2">
              <Label htmlFor="collectedAt">수금일 *</Label>
              <Input id="collectedAt" type="date" value={collectedAt} onChange={(e) => setCollectedAt(e.target.value)} />
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleCollect} disabled={collecting || !collectedAt}>
                {collecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  "수금 확인 완료"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 변경 이력 카드 */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">변경 이력</CardTitle>
            <Badge variant="secondary">{histories.length}건</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {historiesLoading ? (
            <div className="flex justify-center items-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              불러오는 중...
            </div>
          ) : histories.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 변경 이력이 없습니다.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>변경일시</TableHead>
                  <TableHead>고객사</TableHead>
                  <TableHead>사업명</TableHead>
                  <TableHead className="text-right">청구금액</TableHead>
                  <TableHead>세금계산서 발행일</TableHead>
                  <TableHead>수금일</TableHead>
                  <TableHead>영업대표</TableHead>
                  <TableHead>요청자</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {histories.map((history) => (
                  <TableRow key={history.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedHistoryId(history.id)}>
                    <TableCell className="text-xs text-muted-foreground font-medium">
                      {(() => {
                        if (!history.createdAt) return "-";
                        try {
                          const date = new Date(history.createdAt);
                          if (isNaN(date.getTime())) return history.createdAt;
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, "0");
                          const d = String(date.getDate()).padStart(2, "0");
                          const h = String(date.getHours()).padStart(2, "0");
                          const min = String(date.getMinutes()).padStart(2, "0");
                          const s = String(date.getSeconds()).padStart(2, "0");
                          return `${y}-${m}-${d} ${h}:${min}:${s}`;
                        } catch {
                          return history.createdAt;
                        }
                      })()}
                    </TableCell>
                    <TableCell>{history.customerName ?? "-"}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{history.projectName ?? "-"}</TableCell>
                    <TableCell className="text-right font-medium">₩{history.billingAmount.toLocaleString()}</TableCell>
                    <TableCell>{history.issuedAt ?? "-"}</TableCell>
                    <TableCell>{history.collectedAt ?? "-"}</TableCell>
                    <TableCell>{history.salesRepName ?? "-"}</TableCell>
                    <TableCell>{history.requesterName ?? "-"}</TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const status = history.status;
                        const label = statusLabel(status);
                        let className = "";
                        switch (status) {
                          case "COLLECTED":
                            className = "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700";
                            break;
                          case "ISSUED":
                            className = "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700";
                            break;
                          case "APPROVED":
                            className = "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-700";
                            break;
                          default:
                            className = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700";
                            break;
                        }
                        return (
                          <Badge variant="outline" className={className}>
                            {label}
                          </Badge>
                        );
                      })()}
                    </TableCell>
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

// 공통 상태 컴포넌트
function LoadingState() {
  return (
    <div className="flex justify-center items-center py-20 gap-2 text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin" />
      불러오는 중...
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex justify-center items-center py-20 gap-2 text-destructive">
      <AlertCircle className="w-6 h-6" />
      {message}
    </div>
  );
}

// 페이지 진입점
export default function ProjectDetailPage() {
  const params = useParams();
  const category = params.category as Category;
  const rawId = params.id as string;
  const numericId = parseInt(rawId);

  const label = category === "results" ? "결과보고" : "청구 및 수금";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${label} 상세`} description={`${label} 정보를 확인합니다`} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/project">사업</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{rawId}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {isNaN(numericId) ? <ErrorState message="유효하지 않은 ID입니다." /> : category === "results" ? <ProjectDetail id={numericId} /> : <BillingDetail id={numericId} />}
          </div>
        </main>
      </div>
    </div>
  );
}
