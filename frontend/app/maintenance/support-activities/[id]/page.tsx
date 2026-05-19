"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, ArrowLeft, History, FileText, Edit, Trash2 } from "lucide-react";
import {
  getCustomerSupportActivityDetail,
  type CustomerSupportActivityDetailResponse,
  getCustomerSupportActivityHistories,
  getCustomerSupportActivityHistoryDetail,
  type CustomerSupportHistoryListResponse,
  type CustomerSupportHistoryDetailResponse,
  deleteCustomerSupportActivity,
} from "@/lib/api/maintenance";
import { SupportResultForm } from "@/components/erp/maintenance/support-result-form";
import { toast } from "sonner";

function formatDateTime(value?: string) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    return d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

export default function CustomerSupportActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [item, setItem] = useState<CustomerSupportActivityDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 수정 및 삭제 상태 추가
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // 이력 관리 상태 추가
  const [histories, setHistories] = useState<CustomerSupportHistoryListResponse[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const [historyData, setHistoryData] = useState<CustomerSupportHistoryDetailResponse | null>(null);
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
    if (!window.confirm("정말로 이 고객지원 활동 결과를 삭제하시겠습니까?")) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await deleteCustomerSupportActivity(parseInt(id));
      if (res.success || (res as any).result === "SUCCESS") {
        toast.success("고객지원 활동 결과가 삭제되었습니다.");
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
        const res = await getCustomerSupportActivityDetail(numericId);
        if (res.success || (res as any).result === "SUCCESS") {
          setItem(res.data ?? null);
        } else {
          setError(res.message || "상세 정보를 불러오는 데 실패했습니다.");
        }
      } catch (err) {
        console.error(err);
        setError("고객지원 활동 결과 상세를 불러오는 중 오류가 발생했습니다.");
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
        const res = await getCustomerSupportActivityHistories(numericId);
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
        const res = await getCustomerSupportActivityHistoryDetail(selectedHistoryId);
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
        <Header title="고객지원 활동 결과 상세" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink asChild><Link href="/maintenance">유지보수</Link></BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>고객지원 활동 결과 상세</BreadcrumbPage></BreadcrumbItem>
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
                    고객지원활동 상세 이력
                  </h1>
                  <p className="text-xs text-muted-foreground">이력 저장일시: {formatDate(historyData.savedAt)}</p>
                </div>
                <Badge variant="secondary">{historyData.activityType}</Badge>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-lg">기본 정보</CardTitle></CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div>
                      <dt className="text-muted-foreground">고객사</dt>
                      <dd className="font-medium mt-1">{historyData.customerName}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">활동 유형</dt>
                      <dd className="font-medium mt-1">{historyData.activityType}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">개시 일시</dt>
                      <dd className="font-medium mt-1">{formatDateTime(historyData.activityStartTime)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">완료 일시</dt>
                      <dd className="font-medium mt-1">{formatDateTime(historyData.activityEndTime)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">등록자</dt>
                      <dd className="font-medium mt-1">{historyData.registrantName}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg">활동 내용</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{historyData.activityContent || "-"}</p>
                </CardContent>
              </Card>

              {historyData.participantsInfo && (
                <Card>
                  <CardHeader><CardTitle className="text-lg">지원 인력</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {historyData.participantsInfo.split(", ").map((part, idx) => {
                        const match = part.match(/(.*?)\((.*?)\)/);
                        const name = match ? match[1] : part;
                        const role = match ? match[2] : "";
                        return (
                          <div key={idx} className="flex items-center gap-4 p-3 bg-muted/30 rounded-md text-sm">
                            <span className="font-medium min-w-[80px]">{name}</span>
                            <span className="text-muted-foreground">{role || "참여자"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {historyData.remarks && (
                <Card>
                  <CardHeader><CardTitle className="text-lg">특기사항</CardTitle></CardHeader>
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

          {/* 기본 상태: 현재 고객지원 활동 결과 상세 정보 + 하단에 히스토리 목록 출력 */}
          {selectedHistoryId == null && !loading && !error && item && (
            isEditing ? (
              <SupportResultForm
                initialData={item}
                onSuccess={() => {
                  setIsEditing(false);
                  setReloadTrigger(prev => prev + 1);
                }}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">고객지원 활동 결과 #{item.id}</h1>
                <Badge variant="outline">{item.activityType}</Badge>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-lg">기본 정보</CardTitle></CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div>
                      <dt className="text-muted-foreground">고객사</dt>
                      <dd className="font-medium mt-1">{item.customerName}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">활동 유형</dt>
                      <dd className="font-medium mt-1">{item.activityType}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">개시 일시</dt>
                      <dd className="font-medium mt-1">{formatDateTime(item.activityStartTime)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">완료 일시</dt>
                      <dd className="font-medium mt-1">{formatDateTime(item.activityEndTime)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">등록자</dt>
                      <dd className="font-medium mt-1">{item.registrantName}</dd>
                    </div>
                    {item.requestId && (
                      <div>
                        <dt className="text-muted-foreground">연결된 요청</dt>
                        <dd className="font-medium mt-1">
                          <Link
                            href={`/maintenance/support-requests/${item.requestId}`}
                            className="text-blue-600 hover:underline"
                          >
                            요청 #{item.requestId}
                          </Link>
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg">활동 내용</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{item.activityContent || "-"}</p>
                </CardContent>
              </Card>

              {item.participants && item.participants.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-lg">지원 인력 ({item.participants.length}명)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {item.participants.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-3 bg-muted/30 rounded-md text-sm">
                          <span className="font-medium min-w-[80px]">{p.userName}</span>
                          <span className="text-muted-foreground">{p.roleDescription}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {item.remarks && (
                <Card>
                  <CardHeader><CardTitle className="text-lg">특기사항</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{item.remarks}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between items-center mt-6">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
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
                                활동 결과
                              </Badge>
                            </TableCell>
                            <TableCell>{history.customerName ?? "-"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-normal text-xs">
                                {history.activityType ?? "-"}
                              </Badge>
                            </TableCell>
                            <TableCell>{history.registrantName ?? "-"}</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>-</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        )}
          </div>
        </main>
      </div>
    </div>
  );
}
