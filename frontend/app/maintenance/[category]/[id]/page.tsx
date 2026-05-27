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
import { getMaintenanceCategoryLabel, type MaintenanceCategory } from "@/lib/maintenance-data";
import {
  getMaintenanceDetail,
  deleteMaintenance,
  getMaintenanceHistories,
  getMaintenanceHistoryDetail,
  type MaintenanceDetailResponse,
  type MaintenanceHistoryListResponse,
  type MaintenanceHistoryDetailResponse,
} from "@/lib/api/maintenance";
import { getBackendApiBaseUrl } from "@/lib/api-base-url";
import { Loader2, AlertCircle, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { WorkflowApprovalPanel } from "@/components/erp/workflow-approval-panel";

export default function MaintenanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const category = params.category as MaintenanceCategory;
  const id = params.id as string;

  const [item, setItem] = useState<MaintenanceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // History States
  const [histories, setHistories] = useState<MaintenanceHistoryListResponse[]>([]);
  const [historiesLoading, setHistoriesLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const [historyData, setHistoryData] = useState<MaintenanceHistoryDetailResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistories = async (maintenanceId: number) => {
    setHistoriesLoading(true);
    try {
      const res = await getMaintenanceHistories(maintenanceId);
      if (res.success || res.result === "SUCCESS") {
        setHistories(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch histories:", err);
    } finally {
      setHistoriesLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const numericId = parseInt(id.split("-").pop() || id);
        if (isNaN(numericId)) {
          setError("올바르지 않은 상세 번호입니다.");
          setLoading(false);
          return;
        }

        const response = await getMaintenanceDetail(numericId);
        if (response.success || response.result === "SUCCESS") {
          setItem(response.data);
          fetchHistories(numericId);
        } else {
          setError(response.message || "상세 정보를 불러오는 데 실패했습니다.");
        }
      } catch (err: any) {
        console.error("Fetch Error:", err);
        setError("유지보수 상세 정보를 가져오는 도중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [category, id, refreshKey]);

  const handleDelete = async () => {
    if (!item) return;
    if (!confirm("정말 이 유지보수 계약을 삭제하시겠습니까?")) return;

    setDeleting(true);
    try {
      const res = await deleteMaintenance(item.id);
      if (res.success || res.result === "SUCCESS") {
        toast.success("유지보수 계약이 성공적으로 삭제되었습니다.");
        router.push("/maintenance");
      } else {
        toast.error(res.message || "삭제 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      toast.error("삭제하는 도중 에러가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectHistory = async (historyId: number) => {
    setSelectedHistoryId(historyId);
    setHistoryLoading(true);
    try {
      const res = await getMaintenanceHistoryDetail(historyId);
      if (res.success || res.result === "SUCCESS") {
        setHistoryData(res.data);
      } else {
        toast.error(res.message || "이력 상세 조회 실패");
      }
    } catch (err) {
      console.error("History Detail Fetch Error:", err);
      toast.error("이력 상세를 불러오는 도중 오류가 발생했습니다.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleBackToLive = () => {
    setSelectedHistoryId(null);
    setHistoryData(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="로딩 중..." description="상세 정보를 가져오고 있습니다" />
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-medium">유지보수 상세 정보를 불러오는 중...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="오류" description="정보를 불러오지 못했습니다" />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="flex flex-col items-center gap-4 text-center max-w-md bg-white p-8 rounded-xl border shadow-sm">
              <AlertCircle className="w-12 h-12 text-destructive" />
              <p className="text-xl font-bold">{error || "유지보수 계약 정보를 찾을 수 없습니다."}</p>
              <Button asChild variant="outline">
                <Link href="/maintenance">목록으로 돌아가기</Link>
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const label = getMaintenanceCategoryLabel(category);
  const currentViewItem = historyData || item;
  const isHistoryMode = !!historyData;
  const downloadUrl = currentViewItem.contractFileId ? `${getBackendApiBaseUrl()}/files/${currentViewItem.contractFileId}/download` : null;

  // Enum translators
  const getCycleLabel = (cycle: string | null) => {
    if (cycle === "MONTHLY") return "월";
    if (cycle === "QUARTERLY") return "분기";
    if (cycle === "SEMI_ANNUALLY") return "반기";
    if (cycle === "NONE") return "없음";
    return cycle || "-";
  };

  const getImportanceLabel = (imp: string | null) => {
    if (imp === "HIGH") return "상";
    if (imp === "MEDIUM") return "중";
    if (imp === "LOW") return "하";
    return imp || "-";
  };

  const fields = [
    { label: "사업명", value: currentViewItem.projectName },
    { label: "고객사", value: currentViewItem.customerName },
    { label: "유무상 구분", value: currentViewItem.type === "PAID" ? "유상 유지보수" : "무상 유지보수" },
    { label: "구분", value: currentViewItem.category },
    { label: "영업대표", value: currentViewItem.salesRepName },
    { label: "주 담당자", value: currentViewItem.managerPrimaryName },
    { label: "부 담당자", value: currentViewItem.managerSecondaryName },
    { label: "정기 PM", value: currentViewItem.regularPm },
    { label: "원격 지원 여부", value: currentViewItem.isRemote ? "O" : "X" },
    ...(currentViewItem.type === "PAID" ? [{ label: "점검 주기", value: getCycleLabel(currentViewItem.inspectionCycle) }] : []),
    { label: "중요도", value: getImportanceLabel(currentViewItem.importance) },
    { label: "보고서 제출 여부", value: currentViewItem.reportSubmitted ? "O" : "X" },
    { label: "설치 위치", value: currentViewItem.location },
    { label: "유지보수 요율", value: currentViewItem.rate != null ? `${currentViewItem.rate}%` : null },
    { label: "계약금액", value: currentViewItem.contractAmount != null ? `₩${currentViewItem.contractAmount.toLocaleString()}` : null },
    { label: "연간 유지보수 금액", value: currentViewItem.annualAmount != null ? `₩${currentViewItem.annualAmount.toLocaleString()}` : null },
    { label: "계약일", value: currentViewItem.contractDate },
    { label: "유지보수 시작일", value: currentViewItem.startDate },
    { label: "유지보수 종료일", value: currentViewItem.endDate },
    { label: "제품군", value: currentViewItem.productFamily },
    { label: "AP 버전", value: currentViewItem.apVersion },
    { label: "AP 수량", value: currentViewItem.apCount != null ? `${currentViewItem.apCount}` : null },
    { label: "ES 버전", value: currentViewItem.esVersion },
    { label: "ES 수량", value: currentViewItem.esCount != null ? `${currentViewItem.esCount}` : null },
    { label: "DB 버전", value: currentViewItem.dbVersion },
    { label: "DB HA (고가용성 여부)", value: currentViewItem.dbHaStatus ? "O" : "X" },
    { label: "ACL 패치 여부", value: currentViewItem.aclPatchStatus ? "O" : "X" },
    { label: "모니터템플릿 취약점 패치여부", value: currentViewItem.vulnPatchStatus ? "O" : "X" },
    { label: "LTS 8.4.0 업그레이드 계획", value: currentViewItem.upgradePlan },
    { label: "비고", value: currentViewItem.remarks },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${label} 상세`} description={isHistoryMode ? `V${historyData?.version} 유지보수 이력 정보를 조회합니다` : `${label}의 상세 정보를 조회합니다`} />

        <main className="flex-1 overflow-y-auto p-6">
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
                  <BreadcrumbPage>{currentViewItem.projectName}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {isHistoryMode && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-full text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-800 dark:text-amber-300">이전 이력 스냅샷 조회 중</h3>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      이 정보는 과거 수정 직전의 스냅샷 데이터입니다. (등록자: {historyData?.createdBy || "-"}, 저장일시:{" "}
                      {historyData?.createdAt ? new Date(historyData.createdAt).toLocaleString() : "-"})
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={handleBackToLive} className="bg-amber-600 hover:bg-amber-700 text-white border-none">
                  현재 상세로 돌아가기
                </Button>
              </div>
            )}

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{isHistoryMode ? "유지보수 이력 상세" : "유지보수 상세"}</CardTitle>
                <Badge variant={currentViewItem.type === "PAID" ? "default" : "outline"}>{currentViewItem.type === "PAID" ? "유상" : "무상"}</Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="text-sm font-medium">이력 정보를 가져오는 중...</p>
                  </div>
                ) : (
                  <>
                    {/* 필드 그리드 */}
                    <div className="grid grid-cols-2 gap-4">
                      {fields.map((f) => (
                        <div key={f.label}>
                          <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
                          <p className="font-medium">{f.value ?? "-"}</p>
                        </div>
                      ))}
                    </div>

                    {/* 계약서 첨부문서 */}
                    <div className="border-t pt-4">
                      <p className="text-xs text-muted-foreground mb-2">계약서 첨부문서</p>
                      {downloadUrl ? (
                        <div className="flex items-center gap-3 bg-muted/50 rounded-md p-3">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <span className="text-sm font-medium flex-1">업로드된 계약서 문서가 존재합니다.</span>
                          <a href={downloadUrl} download>
                            <Button size="sm" variant="ghost">
                              <Download className="w-4 h-4 mr-1" />
                              다운로드
                            </Button>
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">등록된 계약서 첨부파일이 존재하지 않습니다.</p>
                      )}
                    </div>
                  </>
                )}

                {/* 하단 제어 버튼 */}
                <div className="flex justify-between pt-4 border-t">
                  {!isHistoryMode ? (
                    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                      삭제
                    </Button>
                  ) : (
                    <div />
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <Link href="/maintenance">목록으로</Link>
                    </Button>
                    {!isHistoryMode && (
                      <Button asChild>
                        <Link href={`/maintenance/${category}/${id}/edit`}>수정</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {!isHistoryMode && <WorkflowApprovalPanel workflowId={item.workflowId} status={item.status} targetId={item.id} domainType="MAINTENANCE" onRefresh={() => setRefreshKey((k) => k + 1)} />}

            {/* 변경 이력 카드 */}
            {!isHistoryMode && (
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      유지보수 변경 이력
                    </CardTitle>
                    <Badge variant="secondary">{histories.length}건</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {historiesLoading ? (
                    <div className="flex justify-center py-6 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      이력을 불러오는 중...
                    </div>
                  ) : histories.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 변경 이력이 없습니다.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>고객사</TableHead>
                            <TableHead>사업기회</TableHead>
                            <TableHead>납품 제품</TableHead>
                            <TableHead className="text-right">계약 금액</TableHead>
                            <TableHead>계약개시일</TableHead>
                            <TableHead>계약종료일</TableHead>
                            {category === "paid" && <TableHead>점검 방법</TableHead>}
                            <TableHead>영업대표</TableHead>
                            <TableHead>유지보수 담당자</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {histories.map((h) => (
                            <TableRow key={h.id} className="cursor-pointer hover:bg-muted/50 transition-colors text-left" onClick={() => handleSelectHistory(h.id)}>
                              <TableCell className="font-medium">{h.customerName || "-"}</TableCell>
                              <TableCell className="max-w-[150px] truncate">{h.projectName || "-"}</TableCell>
                              <TableCell>{h.productFamilyName || "-"}</TableCell>
                              <TableCell className="text-right font-medium">₩{(h.contractAmount || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-sm">{h.startDate || "-"}</TableCell>
                              <TableCell className="text-sm">{h.endDate || "-"}</TableCell>
                              {category === "paid" && (
                                <TableCell>
                                  <Badge variant="outline" className="font-normal">
                                    {h.inspectionMethod || "-"}
                                  </Badge>
                                </TableCell>
                              )}
                              <TableCell>{h.salesRepName || "-"}</TableCell>
                              <TableCell>{h.managerPrimaryName || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
