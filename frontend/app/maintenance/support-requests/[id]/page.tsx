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
import { Loader2, AlertCircle, ArrowLeft, Edit, Trash2 } from "lucide-react";
import { getCustomerSupportRequestDetail, type CustomerSupportRequestDetailResponse, deleteCustomerSupportRequest } from "@/lib/api/maintenance";
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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="고객지원 요청 상세" />
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

            {!loading &&
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
                    <h1 className="text-2xl font-bold">고객지원 요청 #{item.id}</h1>
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
                </div>
              ))}
          </div>
        </main>
      </div>
    </div>
  );
}
