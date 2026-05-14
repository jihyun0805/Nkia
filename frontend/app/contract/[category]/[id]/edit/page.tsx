"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStatusOptions, isStatusField } from "@/lib/status-options";
import { orderReportApi, contractApi, licenseApi, type OrderReportResponse, type ContractResponse, type LicenseResponse } from "@/lib/api/contract-api";
import { Loader2, AlertCircle } from "lucide-react";

type Category = "orders" | "order" | "contracts" | "contract" | "purchases" | "purchase" | "licenses" | "license";

export default function ContractEditPage() {
  const params = useParams();
  const category = params.category as Category;
  const id = params.id as string;
  const numericId = parseInt(id);
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNaN(numericId)) {
      setError("유효하지 않은 ID입니다.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        let res: any;
        console.log(`Fetching ${category} edit data with ID: ${numericId}`);

        if (category === "orders" || category === "order") {
          res = await orderReportApi.getOrderReport(numericId);
        } else if (category === "contracts" || category === "contract") {
          res = await contractApi.getContract(numericId);
        } else if (category === "licenses" || category === "license") {
          res = await licenseApi.getLicense(numericId);
        } else {
          setError(`알 수 없는 카테고리: ${category}`);
          setLoading(false);
          return;
        }

        console.log("API Response received:", res);

        if (res) {
          // ApiResponse 형태인 경우 (success/result와 data 필드가 있음)
          const isSuccess = res.success === true || res.result === "SUCCESS";
          const hasDataField = res.data !== undefined;

          if ((res.success !== undefined || res.result !== undefined) && hasDataField) {
            if (isSuccess) {
              setData(res.data);
            } else {
              setError(res.message || "데이터를 찾을 수 없습니다.");
            }
          }
          // 응답 자체가 데이터인 경우
          else {
            setData(res);
          }
        } else {
          setError("응답 데이터가 비어있습니다.");
        }
      } catch (err: any) {
        console.error("Fetch Error:", err);
        const errMsg = err.response?.data?.message || err.message || "정보를 불러오는 데 실패했습니다.";
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [category, numericId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="로딩 중..." description="수정 정보를 불러오고 있습니다" />
          <main className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </main>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="오류" description="정보를 불러오지 못했습니다" />
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-destructive">
              <AlertCircle className="w-12 h-12" />
              <p className="text-xl font-bold">{error || "데이터를 찾을 수 없습니다."}</p>
              <Button asChild variant="outline">
                <Link href="/contract">목록으로 돌아가기</Link>
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const label =
    category === "orders" || category === "order"
      ? "수주보고"
      : category === "contracts" || category === "contract"
        ? "계약"
        : category === "purchases" || category === "purchase"
          ? "매입계약"
          : "라이선스";

  const getFields = () => {
    if (category === "orders" || category === "order") {
      const d = data as OrderReportResponse;
      return [
        { label: "사업명", value: d?.projectName },
        { label: "결재상태", value: d?.status },
        { label: "유형", value: d?.type },
        { label: "지급조건", value: d?.paymentCondition },
      ];
    }
    if (category === "contracts" || category === "contract") {
      const d = data as ContractResponse;
      return [
        { label: "계약금액", value: d?.contractAmount },
        { label: "영업대표", value: d?.salesRepresentativeName },
      ];
    }
    if (category === "licenses" || category === "license") {
      const d = data as LicenseResponse;
      return [
        { label: "제품명", value: d?.productName },
        { label: "수량", value: d?.quantity },
        { label: "상태", value: d?.licenseStatus },
      ];
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${label} 수정`} description={`${label} 정보를 페이지에서 수정합니다`} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/contract">계약</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{id}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <Card>
              <CardHeader>
                <CardTitle>{label} 수정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {getFields().map((field) => (
                    <div key={field.label} className="space-y-2">
                      <Label>{field.label}</Label>
                      {isStatusField(field.label) ? (
                        <Select defaultValue={String(field.value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="상태 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {getStatusOptions(String(field.value)).map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input defaultValue={String(field.value)} />
                      )}
                    </div>
                  ))}
                  <div className="space-y-2 md:col-span-2">
                    <Label>첨부파일</Label>
                    <Input type="file" multiple />
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href={`/contract/${category}/${id}`}>취소</Link>
                  </Button>
                  <Button onClick={() => router.push(`/contract/${category}/${id}`)}>수정</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
