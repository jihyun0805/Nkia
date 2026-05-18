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
import { getMaintenanceCategoryLabel, type MaintenanceCategory } from "@/lib/maintenance-data";
import { getMaintenanceDetail, deleteMaintenance, type MaintenanceDetailResponse } from "@/lib/api/maintenance";
import { getBackendApiBaseUrl } from "@/lib/api-base-url";
import { Loader2, AlertCircle, FileText, Download } from "lucide-react";
import { toast } from "sonner";

export default function MaintenanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const category = params.category as MaintenanceCategory;
  const id = params.id as string;

  const [item, setItem] = useState<MaintenanceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
  }, [category, id]);

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
  const downloadUrl = item.contractFileId ? `${getBackendApiBaseUrl()}/files/${item.contractFileId}/download` : null;

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
    { label: "사업명", value: item.projectName },
    { label: "고객사", value: item.customerName },
    { label: "유무상 구분", value: item.type === "PAID" ? "유상 유지보수" : "무상 유지보수" },
    { label: "구분", value: item.category },
    { label: "영업대표", value: item.salesRepName },
    { label: "주 담당자", value: item.managerPrimaryName },
    { label: "부 담당자", value: item.managerSecondaryName },
    { label: "정기 PM", value: item.regularPm },
    { label: "원격 지원 여부", value: item.isRemote ? "O" : "X" },
    ...(item.type === "PAID" ? [{ label: "점검 주기", value: getCycleLabel(item.inspectionCycle) }] : []),
    { label: "중요도", value: getImportanceLabel(item.importance) },
    { label: "보고서 제출 여부", value: item.reportSubmitted ? "O" : "X" },
    { label: "설치 위치", value: item.location },
    { label: "유지보수 요율", value: item.rate != null ? `${item.rate}%` : null },
    { label: "계약금액", value: item.contractAmount != null ? `₩${item.contractAmount.toLocaleString()}` : null },
    { label: "연간 유지보수 금액", value: item.annualAmount != null ? `₩${item.annualAmount.toLocaleString()}` : null },
    { label: "계약일", value: item.contractDate },
    { label: "유지보수 시작일", value: item.startDate },
    { label: "유지보수 종료일", value: item.endDate },
    { label: "제품군", value: item.productFamily },
    { label: "AP 버전", value: item.apVersion },
    { label: "AP 수량", value: item.apCount != null ? `${item.apCount}` : null },
    { label: "ES 버전", value: item.esVersion },
    { label: "ES 수량", value: item.esCount != null ? `${item.esCount}` : null },
    { label: "DB 버전", value: item.dbVersion },
    { label: "DB HA (고가용성 여부)", value: item.dbHaStatus ? "O" : "X" },
    { label: "ACL 패치 여부", value: item.aclPatchStatus ? "O" : "X" },
    { label: "모니터템플릿 취약점 패치여부", value: item.vulnPatchStatus ? "O" : "X" },
    { label: "LTS 8.4.0 업그레이드 계획", value: item.upgradePlan },
    { label: "비고", value: item.remarks },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${label} 상세`} description={`${label}의 상세 정보를 조회합니다`} />

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
                  <BreadcrumbPage>{item.projectName}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>유지보수 상세</CardTitle>
                <Badge variant={item.type === "PAID" ? "default" : "outline"}>
                  {item.type === "PAID" ? "유상" : "무상"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">

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

                {/* 하단 제어 버튼 */}
                <div className="flex justify-between pt-4 border-t">
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                    삭제
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <Link href="/maintenance">목록으로</Link>
                    </Button>
                    <Button asChild>
                      <Link href={`/maintenance/${category}/${id}/edit`}>수정</Link>
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </div>
  );
}
