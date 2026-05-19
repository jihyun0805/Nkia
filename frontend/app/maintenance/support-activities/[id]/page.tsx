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
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import {
  getCustomerSupportActivityDetail,
  type CustomerSupportActivityDetailResponse,
} from "@/lib/api/maintenance";

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
  }, [id]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-6">
          <Breadcrumb className="mb-6">
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

          {!loading && !error && item && (
            <div className="space-y-6 max-w-3xl">
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

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => router.push("/maintenance")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  목록으로
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
