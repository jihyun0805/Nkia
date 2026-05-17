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
import { Loader2, AlertCircle, FileText, Download } from "lucide-react";
import { projectApi, type ProjectDetailResponse, type BillingDetailResponse } from "@/lib/api/project-api";

type Category = "results" | "billingAndCollection";

// 사업 상세 뷰
function ProjectDetail({ id }: { id: number }) {
  const router = useRouter();
  const [data, setData] = useState<ProjectDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    projectApi
      .getProject(id)
      .then((res) => setData(res.data))
      .catch(() => setError("사업 정보를 불러오는 데 실패했습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("사업을 삭제하시겠습니까?")) return;
    try {
      await projectApi.deleteProject(id);
      router.push("/project");
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "데이터를 찾을 수 없습니다."} />;

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
            <Link href="/contract?tab=orders" className="text-blue-600 hover:underline">
              수주보고서 #{data.orderReportId}
            </Link>
          )}
          {data.contractId && (
            <Link href="/contract?tab=contracts" className="text-blue-600 hover:underline">
              계약 #{data.contractId}
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
  );
}

// 청구 상세 뷰
function BillingDetail({ id }: { id: number }) {
  const router = useRouter();
  const [data, setData] = useState<BillingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    projectApi
      .getBilling(id)
      .then((res) => setData(res.data))
      .catch(() => setError("청구 정보를 불러오는 데 실패했습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("청구 정보를 삭제하시겠습니까?")) return;
    try {
      await projectApi.deleteBilling(id);
      router.push("/project");
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  const statusLabel = (status: string) => {
    if (status === "REQUESTED") return "발행 요청";
    if (status === "ISSUED") return "발행완료";
    if (status === "COLLECTED") return "수금완료";
    return status;
  };

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "데이터를 찾을 수 없습니다."} />;

  const fields = [
    { label: "고객사", value: data.customerName },
    { label: "사업명", value: data.projectName },
    { label: "청구금액", value: `₩${data.billingAmount.toLocaleString()}` },
    { label: "발행 희망일", value: data.requestedIssueDate },
    { label: "세금계산서 발행일", value: data.issuedAt ?? "미등록" },
    { label: "수금일", value: data.collectedAt ?? "미등록" },
    { label: "요청자", value: data.createdBy },
    { label: "요청일", value: data.createdAt?.slice(0, 10) },
    { label: "특기사항", value: data.remarks },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>청구 상세</CardTitle>
        <Badge variant={data.status === "COLLECTED" ? "default" : data.status === "ISSUED" ? "secondary" : "outline"}>{statusLabel(data.status)}</Badge>
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

        {/* 관련 문서 */}
        <div className="border-t pt-4 flex gap-4 text-sm">
          {data.orderReportId && (
            <Link href="/contract?tab=orders" className="text-blue-600 hover:underline">
              수주보고서 #{data.orderReportId}
            </Link>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            삭제
          </Button>
          <Button variant="outline" asChild>
            <Link href="/project?tab=billingAndCollection">목록으로</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
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
