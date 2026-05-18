"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMaintenanceCategoryLabel, getMaintenanceFields, type MaintenanceCategory } from "@/lib/maintenance-data";
import { getFreeMaintenanceList, getPaidMaintenanceList } from "@/lib/api/maintenance";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStatusOptions, isStatusField } from "@/lib/status-options";
import { Loader2, AlertCircle } from "lucide-react";

export default function MaintenanceEditPage() {
  const params = useParams();
  const category = params.category as MaintenanceCategory;
  const id = params.id as string;

  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let response: any;
        if (category === "free") {
          response = await getFreeMaintenanceList();
        } else if (category === "paid") {
          response = await getPaidMaintenanceList();
        } else {
          setError("올바르지 않은 카테고리입니다.");
          setLoading(false);
          return;
        }

        if ((response.success === true || response.result === "SUCCESS") && response.data) {
          // id 형식 (api-free-{index} 또는 api-paid-{index})에서 index 파싱
          const index = parseInt(id.split("-").pop() || "");
          if (isNaN(index) || index < 0 || index >= response.data.length) {
            setError("해당 유지보수 상세 정보를 찾을 수 없습니다.");
            setLoading(false);
            return;
          }

          const rawItem = response.data[index];
          const today = new Date();
          const endDate = rawItem.endDate ? new Date(rawItem.endDate) : null;
          let status = "진행중";
          if (endDate) {
            if (endDate < today) status = "종료";
            else if (endDate.getTime() - today.getTime() < 30 * 24 * 60 * 60 * 1000) status = "종료예정";
          }

          let mappedItem: any;
          if (category === "free") {
            mappedItem = {
              id: id,
              contractId: rawItem.contractId || "-",
              customer: rawItem.customerName || "-",
              opportunity: rawItem.projectName || "-",
              product: rawItem.productFamilyName || "-",
              amount: rawItem.contractAmount ? `₩${rawItem.contractAmount.toLocaleString()}` : "₩0",
              startDate: rawItem.startDate || "-",
              endDate: rawItem.endDate || "-",
              salesRep: rawItem.salesRepName || "-",
              manager: rawItem.managerPrimaryName || "-",
              status: status,
            };
          } else {
            mappedItem = {
              id: id,
              customer: rawItem.customerName || "-",
              opportunity: rawItem.projectName || "-",
              product: rawItem.productFamilyName || "-",
              amount: rawItem.contractAmount ? `₩${rawItem.contractAmount.toLocaleString()}` : "₩0",
              startDate: rawItem.startDate || "-",
              endDate: rawItem.endDate || "-",
              inspectionMethod: rawItem.inspectionMethod || "-",
              salesRep: rawItem.salesRepName || "-",
              manager: rawItem.managerPrimaryName || "-",
              progress: rawItem.progress || "진행중",
              status: status,
            };
          }
          setItem(mappedItem);
        } else {
          setError("데이터를 불러오지 못했습니다.");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="로딩 중..." description="정보를 불러오고 있습니다" />
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p>정보를 불러오는 중...</p>
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
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-destructive">
              <AlertCircle className="w-12 h-12" />
              <p className="text-xl font-bold">{error || "데이터를 찾을 수 없습니다."}</p>
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
                    <Link href="/maintenance">유지보수</Link>
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
                  {getMaintenanceFields(category, item).map((field) => (
                    <div key={field.label} className="space-y-2">
                      <Label>{field.label}</Label>
                      {isStatusField(field.label) ? (
                        <Select defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="상태 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {getStatusOptions(field.value).map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input defaultValue={field.value} />
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
                    <Link href={`/maintenance/${category}/${id}`}>취소</Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/maintenance/${category}/${id}`}>수정</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
