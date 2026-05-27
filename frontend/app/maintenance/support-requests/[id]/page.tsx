"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, ArrowLeft, Edit, Trash2, History, FileText } from "lucide-react";
import {
  getCustomerSupportRequestDetail,
  type CustomerSupportRequestDetailResponse,
  deleteCustomerSupportRequest,
  getCustomerSupportRequestHistories,
  getCustomerSupportRequestHistoryDetail,
  type CustomerSupportRequestHistoryListResponse,
  type CustomerSupportRequestHistoryDetailResponse
} from "@/lib/api/maintenance";
import { SupportRequestForm } from "@/components/erp/maintenance/support-request-form";
import { toast } from "sonner";
import { WorkflowApprovalPanel } from "@/components/erp/workflow-approval-panel";

function statusLabel(status?: string) {
  switch (status) {
    case "DRAFT":
    case "결재 대기":
      return "결재 대기";
    case "PENDING":
    case "결재중":
      return "결재 진행중";
    case "APPROVED":
    case "승인 완료":
      return "승인 완료";
    case "REJECTED":
    case "반려":
      return "반려";
    default:
      return status ?? "-";
  }
}

function statusVariant(status?: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "APPROVED":
    case "승인 완료":
      return "default";
    case "REJECTED":
    case "반려":
      return "destructive";
    case "PENDING":
    case "결재중":
      return "secondary";
    default:
      return "outline";
  }
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    return d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

export default function CustomerSupportRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [item, setItem] = useState<CustomerSupportRequestDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 수정 및 삭제 상태 추가
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // 이력 관리 상태 추가
  const [histories, setHistories] = useState<CustomerSupportRequestHistoryListResponse[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const [historyData, setHistoryData] = useState<CustomerSupportRequestHistoryDetailResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyListLoading, setHistoryListLoading] = useState(false);

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

  const handleDelete = async () => {
    if (!window.confirm("정말로 이 고객지원 요청을 삭제하시겠습니까?")) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await deleteCustomerSupportRequest(parseInt(id));
      if (res.success || (res as any).result === "SUCCESS") {
        toast.success("고객지원 요청이 삭제되었습니다.");
        router.push("/maintenance");
      } else {
        toast.error(res.message || "삭제에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      toast.error("삭제하는 도중 에러가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const numericId = parseInt(id);
        if (isNaN(numericId)) {
          setError("올바르지 않은 ID입니다.");
          setLoading(false);
          return;
        }
        const res = await getCustomerSupportRequestDetail(numericId);
        if (res.success || (res as any).result === "SUCCESS") {
          setItem(res.data ?? null);
        } else {
          setError(res.message || "상세 정보를 불러오는 데 실패했습니다.");
        }
      } catch (err) {
        console.error(err);
        setError("고객지원 요청 상세를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, reloadTrigger]);

  useEffect(() => {
    const fetchHistories = async () => {
      const numericId = parseInt(id);
      if (isNaN(numericId)) return;
      setHistoryListLoading(true);
      try {
        const res = await getCustomerSupportRequestHistories(numericId);
        if (res.success || (res as any).result === "SUCCESS") {
          setHistories(res.data ?? []);
        }
      } catch (err) {
        console.error("히스토리 목록을 불러오는 데 실패했습니다.", err);
      } finally {
        setHistoryListLoading(false);
      }
    };
    fetchHistories();
  }, [id, selectedHistoryId, reloadTrigger]);

  useEffect(() => {
    if (selectedHistoryId === null) {
      setHistoryData(null);
      return;
    }
    const fetchHistoryDetail = async () => {
      setHistoryLoading(true);
      try {
        const res = await getCustomerSupportRequestHistoryDetail(selectedHistoryId);
        if (res.success || (res as any).result === "SUCCESS") {
          setHistoryData(res.data ?? null);
        }
      } catch (err) {
        console.error("히스토리 상세를 불러오는 데 실패했습니다.", err);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistoryDetail();
  }, [selectedHistoryId]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={item?.customerName ? `${item.customerName} - 고객지원 요청 상세` : "고객지원 요청 상세"} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/maintenance">유지보수</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>고객지원 요청 상세</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="flex items-center gap-3 py-8">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                  <p className="text-red-700">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* 히스토리 상세 로딩 */}
            {selectedHistoryId != null && (historyLoading || !historyData) && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* 히스토리가 활성화된 경우: 이력 스냅샷 정보 출력 */}
            {selectedHistoryId != null && historyData && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
                      <History className="w-6 h-6 text-primary" />
                      고객지원요청 상세 이력
                    </h1>
                    <p className="text-xs text-muted-foreground">이력 저장일시: {formatDate(historyData.savedAt)}</p>
                  </div>
                  <Badge variant={statusVariant(historyData.status as any)}>{statusLabel(historyData.status as any)}</Badge>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">기본 정보</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                      <div>
                        <dt className="text-muted-foreground">고객사</dt>
                        <dd className="font-medium mt-1">{historyData.customerName}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">요청 기간</dt>
                        <dd className="font-medium mt-1">
                          {historyData.requestStartDate} ~ {historyData.requestEndDate}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">요청자</dt>
                        <dd className="font-medium mt-1">{historyData.requesterName}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">등록자</dt>
                        <dd className="font-medium mt-1">{historyData.registrantName}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">영업대표</dt>
                        <dd className="font-medium mt-1">{historyData.salesRepName}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">고객지원 담당자</dt>
                        <dd className="font-medium mt-1">{historyData.supportManagerName}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">요청 내용</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{historyData.requestContent || "-"}</p>
                  </CardContent>
                </Card>

                {historyData.remarks && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">특기사항</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{historyData.remarks}</p>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => router.push("/maintenance")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    목록으로
                  </Button>
                  <Button variant="secondary" onClick={() => setSelectedHistoryId(null)}>
                    현재 상세로 돌아가기
                  </Button>
                </div>
              </div>
            )}

            {selectedHistoryId == null && !loading &&
              !error &&
              item &&
              (isEditing ? (
                <SupportRequestForm
                  initialData={item}
                  onSuccess={() => {
                    setIsEditing(false);
                    setReloadTrigger((prev) => prev + 1);
                  }}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{item.customerName} - 고객지원 요청</h1>
                    <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">기본 정보</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <div>
                          <dt className="text-muted-foreground">고객사</dt>
                          <dd className="font-medium mt-1">{item.customerName}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">요청 기간</dt>
                          <dd className="font-medium mt-1">
                            {item.requestStartDate} ~ {item.requestEndDate}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">요청자</dt>
                          <dd className="font-medium mt-1">{item.requesterName}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">등록자</dt>
                          <dd className="font-medium mt-1">{item.registrantName}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">영업대표</dt>
                          <dd className="font-medium mt-1">{item.salesRepName}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">고객지원 담당자</dt>
                          <dd className="font-medium mt-1">{item.supportManagerName}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">요청 내용</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{item.requestContent || "-"}</p>
                    </CardContent>
                  </Card>

                  {item.remarks && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">특기사항</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{item.remarks}</p>
                      </CardContent>
                    </Card>
                  )}

                  <WorkflowApprovalPanel workflowId={item.workflowId} status={item.status} targetId={item.id} domainType="CUSTOMER_SUPPORT" onRefresh={() => setReloadTrigger((prev) => prev + 1)} />

                  <div className="flex justify-between items-center mt-6">
                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      삭제
                    </Button>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => router.push("/maintenance")}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        목록으로
                      </Button>
                      <Button onClick={() => setIsEditing(true)}>
                        <Edit className="w-4 h-4 mr-2" />
                        수정
                      </Button>
                    </div>
                  </div>

                  {/* 하단 변경 이력 카드 추가 */}
                  <Card className="mt-8 border-t border-muted">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <History className="w-5 h-5 text-muted-foreground" />
                        변경 이력
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {historyListLoading ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          불러오는 중...
                        </div>
                      ) : histories.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                          등록된 변경 이력이 없습니다.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>변경일시</TableHead>
                              <TableHead>구분</TableHead>
                              <TableHead>고객사</TableHead>
                              <TableHead>요청/활동구분</TableHead>
                              <TableHead>요청/등록자</TableHead>
                              <TableHead>영업대표</TableHead>
                              <TableHead>고객지원 담당자</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {histories.map((history) => (
                              <TableRow
                                key={history.historyId}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => setSelectedHistoryId(history.historyId)}
                              >
                                <TableCell className="text-xs text-muted-foreground font-medium">
                                  {formatDate(history.savedAt)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className="bg-purple-100 text-purple-700 hover:bg-purple-100"
                                  >
                                    고객지원 요청
                                  </Badge>
                                </TableCell>
                                <TableCell>{history.customerName ?? "-"}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="font-normal text-xs">
                                    요청
                                  </Badge>
                                </TableCell>
                                <TableCell>{history.requesterName ?? "-"}</TableCell>
                                <TableCell>{history.salesRepName ?? "-"}</TableCell>
                                <TableCell>{history.supportManagerName ?? "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
          </div>
        </main>
      </div>
    </div>
  );
}
