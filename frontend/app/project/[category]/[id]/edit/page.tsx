"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { projectApi, type ProjectDetailResponse } from "@/lib/api/project-api";
import { UserPicker } from "@/components/erp/user-picker";
import { useBackendUsers } from "@/lib/use-backend-users";
import type { BackendUserSummary } from "@/lib/workflow-backend";

interface EditFormValues {
  startDate: string;
  endDate: string;
  managerId: string;
  salesRepresentativeId: string;
}

export default function ProjectEditPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id as string;
  const numericId = parseInt(rawId);

  const [data, setData] = useState<ProjectDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm<EditFormValues>({
    defaultValues: {
      startDate: "",
      endDate: "",
      managerId: "",
      salesRepresentativeId: "",
    },
  });
  const projectUsers = useBackendUsers();
  const [pmUser, setPmUser] = useState<BackendUserSummary | null>(null);
  const [salesRepUser, setSalesRepUser] = useState<BackendUserSummary | null>(null);

  useEffect(() => {
    if (isNaN(numericId)) return;
    setLoading(true);
    projectApi
      .getProject(numericId)
      .then((res) => {
        const d = res.data;
        setData(d);
        reset({
          startDate: d.startDate ?? "",
          endDate: d.endDate ?? "",
          managerId: "",
          salesRepresentativeId: "",
        });
      })
      .catch(() => setError("사업 정보를 불러오는 데 실패했습니다."))
      .finally(() => setLoading(false));
  }, [numericId, reset]);

  const onSubmit = async (formData: EditFormValues) => {
    if (!formData.managerId.trim()) {
      alert("PM(담당자) UUID를 입력해주세요.");
      return;
    }
    if (!formData.salesRepresentativeId.trim()) {
      alert("영업대표 UUID를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await projectApi.updateProjectWithReport(numericId, {
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        managerId: formData.managerId.trim(),
        salesRepresentativeId: formData.salesRepresentativeId.trim(),
      });
      alert("사업 정보가 수정되었습니다.");
      router.push(`/project/results/${rawId}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "수정에 실패했습니다.";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="사업 수정" description="사업 정보를 수정합니다" />
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
                  <BreadcrumbLink asChild>
                    <Link href={`/project/results/${rawId}`}>{rawId}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>수정</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {loading ? (
              <div className="flex justify-center items-center py-20 gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
                불러오는 중...
              </div>
            ) : error ? (
              <div className="flex justify-center items-center py-20 gap-2 text-destructive">
                <AlertCircle className="w-6 h-6" />
                {error}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>사업 수정</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 읽기 전용 정보 */}
                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-muted/30 rounded-md">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">사업명</p>
                      <p className="font-medium text-sm">{data?.pjtName ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">고객사</p>
                      <p className="font-medium text-sm">{data?.customerName ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">사업금액</p>
                      <p className="font-medium text-sm">{data?.totalAmount != null ? `₩${data.totalAmount.toLocaleString()}` : "-"}</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      {/* 사업개시일 */}
                      <div className="space-y-2">
                        <Label htmlFor="startDate">사업개시일</Label>
                        <Input id="startDate" type="date" {...register("startDate")} />
                      </div>

                      {/* 사업완료일 */}
                      <div className="space-y-2">
                        <Label htmlFor="endDate">사업완료일</Label>
                        <Input id="endDate" type="date" {...register("endDate")} />
                      </div>

                      {/* PM */}
                      <div className="space-y-2">
                        <Label htmlFor="managerId">PM *</Label>
                        <UserPicker
                          value={pmUser?.name ?? ""}
                          users={projectUsers}
                          onSelect={(u) => {
                            setPmUser(u)
                            setValue("managerId", u?.id ?? "", { shouldValidate: true })
                          }}
                          placeholder="이름으로 PM 검색"
                        />
                        <input type="hidden" {...register("managerId", { required: true })} />
                        <p className="text-xs text-muted-foreground">현재: {data?.pmName ?? "미배정"}</p>
                      </div>

                      {/* 영업대표 */}
                      <div className="space-y-2">
                        <Label htmlFor="salesRepresentativeId">영업대표 *</Label>
                        <UserPicker
                          value={salesRepUser?.name ?? ""}
                          users={projectUsers}
                          onSelect={(u) => {
                            setSalesRepUser(u)
                            setValue("salesRepresentativeId", u?.id ?? "", { shouldValidate: true })
                          }}
                          placeholder="이름으로 영업대표 검색"
                        />
                        <input type="hidden" {...register("salesRepresentativeId", { required: true })} />
                        <p className="text-xs text-muted-foreground">현재: {data?.salesRepName ?? "미배정"}</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm text-blue-700 dark:text-blue-300">
                      * 결과보고서 첨부는 파일 업로드 API 연동 후 별도 처리됩니다.
                    </div>

                    <div className="flex justify-end gap-2 border-t pt-6">
                      <Button variant="outline" asChild disabled={isSubmitting}>
                        <Link href={`/project/results/${rawId}`}>취소</Link>
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                            저장 중...
                          </>
                        ) : (
                          "저장"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
