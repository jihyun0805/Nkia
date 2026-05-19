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
import { projectApi, type ProjectDetailResponse, type BillingDetailResponse, uploadBillingInvoiceFile } from "@/lib/api/project-api";
import { UserPicker } from "@/components/erp/user-picker";
import { useBackendUsers } from "@/lib/use-backend-users";
import type { BackendUserSummary } from "@/lib/workflow-backend";
import { customAxiosInstance } from "@/lib/api/customAxios";

interface EditFormValues {
  // Project fields
  startDate?: string;
  endDate?: string;
  managerId?: string;
  salesRepresentativeId?: string;

  // Billing fields
  billingAmount?: number;
  requestedIssueDate?: string;
  remarks?: string;
  issuedAt?: string;
  collectedAt?: string;
}

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const category = params.category as string; // 'results' or 'billingAndCollection'
  const rawId = params.id as string;
  const numericId = parseInt(rawId);

  const isProject = category === "results";
  const isBilling = category === "billingAndCollection";

  // Project states
  const [projectData, setProjectData] = useState<ProjectDetailResponse | null>(null);
  const [pmUser, setPmUser] = useState<BackendUserSummary | null>(null);
  const [salesRepUser, setSalesRepUser] = useState<BackendUserSummary | null>(null);
  const [resultFile, setResultFile] = useState<File | null>(null);

  // Billing states
  const [billingData, setBillingData] = useState<BillingDetailResponse | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  // Common states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm<EditFormValues>({
    defaultValues: {
      startDate: "",
      endDate: "",
      managerId: "",
      salesRepresentativeId: "",
      billingAmount: 0,
      requestedIssueDate: "",
      remarks: "",
      issuedAt: "",
      collectedAt: "",
    },
  });

  const projectUsers = useBackendUsers();

  // Project PM & 영업대표 자동 매칭
  useEffect(() => {
    if (isProject && projectData && projectUsers.length > 0) {
      if (projectData.pmName) {
        const matchingPm = projectUsers.find((u) => u.name === projectData.pmName);
        if (matchingPm) {
          setPmUser(matchingPm);
          setValue("managerId", matchingPm.id ?? "");
        }
      }
      if (projectData.salesRepName) {
        const matchingSalesRep = projectUsers.find((u) => u.name === projectData.salesRepName);
        if (matchingSalesRep) {
          setSalesRepUser(matchingSalesRep);
          setValue("salesRepresentativeId", matchingSalesRep.id ?? "");
        }
      }
    }
  }, [projectData, projectUsers, setValue, isProject]);

  // 데이터 로드
  useEffect(() => {
    if (isNaN(numericId)) return;
    setLoading(true);
    setError(null);

    if (isProject) {
      projectApi
        .getProject(numericId)
        .then((res) => {
          const d = res.data;
          setProjectData(d);
          reset({
            startDate: d.startDate ?? "",
            endDate: d.endDate ?? "",
            managerId: "",
            salesRepresentativeId: "",
          });
        })
        .catch(() => setError("사업 정보를 불러오는 데 실패했습니다."))
        .finally(() => setLoading(false));
    } else if (isBilling) {
      projectApi
        .getBilling(numericId)
        .then((res) => {
          const d = res.data;
          setBillingData(d);
          reset({
            billingAmount: d.billingAmount,
            requestedIssueDate: d.requestedIssueDate ?? "",
            remarks: d.remarks ?? "",
            issuedAt: d.issuedAt ?? "",
            collectedAt: d.collectedAt ?? "",
          });
        })
        .catch(() => setError("청구 정보를 불러오는 데 실패했습니다."))
        .finally(() => setLoading(false));
    }
  }, [numericId, category, isProject, isBilling, reset]);

  const onSubmit = async (formData: EditFormValues) => {
    if (isProject) {
      if (!formData.startDate) {
        alert("사업 개시일을 입력해주세요.");
        return;
      }
      if (!formData.endDate) {
        alert("사업 완료일을 입력해주세요.");
        return;
      }
      if (!formData.managerId?.trim()) {
        alert("PM을 선택해주세요.");
        return;
      }
      if (!formData.salesRepresentativeId?.trim()) {
        alert("영업대표를 선택해주세요.");
        return;
      }

      setIsSubmitting(true);
      try {
        let fileId: number | undefined = undefined;

        if (resultFile) {
          const formDataObj = new FormData();
          formDataObj.append("file", resultFile);

          const uploadRes = await customAxiosInstance.post("/files/upload", formDataObj, {
            params: { category: "PROJECT_RESULT" },
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
          fileId = uploadRes.data?.data;
        }

        const finalFileId = fileId || projectData?.resultReport?.id || null;

        await projectApi.updateProjectWithReport(numericId, {
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          managerId: formData.managerId.trim(),
          salesRepresentativeId: formData.salesRepresentativeId.trim(),
          fileId: finalFileId,
        });
        alert("사업 정보가 수정되었습니다.");
        router.push(`/project/results/${rawId}`);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? "수정에 실패했습니다.";
        alert(msg);
      } finally {
        setIsSubmitting(false);
      }
    } else if (isBilling) {
      if (!billingData) return;

      setIsSubmitting(true);
      try {
        await projectApi.updateBilling(numericId, {
          billingAmount: billingData.billingAmount,
          requestedIssueDate: billingData.requestedIssueDate || undefined,
          remarks: formData.remarks || "",
          issuedAt: billingData.issuedAt || undefined,
          collectedAt: billingData.collectedAt || undefined,
          invoiceImageId: billingData.invoiceImageId || undefined,
        });

        alert("청구 정보가 수정되었습니다.");
        router.push(`/project/billingAndCollection/${rawId}`);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? "수정에 실패했습니다.";
        alert(msg);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header 
          title={isProject ? "사업 수정" : "청구 및 수금 수정"} 
          description={isProject ? "사업 정보를 수정합니다." : "청구 및 수금 세부 항목 정보를 수정합니다."} 
        />
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
                    <Link href={`/project/${category}/${rawId}`}>{rawId}</Link>
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
                  <CardTitle>{isProject ? "사업 정보 수정" : "청구 및 수금 정보 수정"}</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 1. 사업(Project) 카테고리 폼 */}
                  {isProject && projectData && (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-muted/30 rounded-md">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">사업명</p>
                          <p className="font-medium text-sm">{projectData.pjtName ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">고객사</p>
                          <p className="font-medium text-sm">{projectData.customerName ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">사업금액</p>
                          <p className="font-medium text-sm">
                            {projectData.totalAmount != null ? `₩${projectData.totalAmount.toLocaleString()}` : "-"}
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="startDate">사업개시일 *</Label>
                            <Input id="startDate" type="date" {...register("startDate", { required: true })} />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="endDate">사업완료일 *</Label>
                            <Input id="endDate" type="date" {...register("endDate", { required: true })} />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="managerId">PM *</Label>
                            <UserPicker
                              value={pmUser?.name ?? ""}
                              users={projectUsers}
                              onSelect={(u) => {
                                setPmUser(u);
                                setValue("managerId", u?.id ?? "", { shouldValidate: true });
                              }}
                              placeholder="이름으로 PM 검색"
                            />
                            <input type="hidden" {...register("managerId", { required: true })} />
                            <p className="text-xs text-muted-foreground">현재: {projectData.pmName ?? "미배정"}</p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="salesRepresentativeId">영업대표 *</Label>
                            <UserPicker
                              value={salesRepUser?.name ?? ""}
                              users={projectUsers}
                              onSelect={(u) => {
                                setSalesRepUser(u);
                                setValue("salesRepresentativeId", u?.id ?? "", { shouldValidate: true });
                              }}
                              placeholder="이름으로 영업대표 검색"
                            />
                            <input type="hidden" {...register("salesRepresentativeId", { required: true })} />
                            <p className="text-xs text-muted-foreground">현재: {projectData.salesRepName ?? "미배정"}</p>
                          </div>

                          <div className="space-y-2 col-span-2">
                            <Label htmlFor="resultFile">결과보고서 파일 첨부</Label>
                            <Input
                              id="resultFile"
                              type="file"
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  setResultFile(e.target.files[0]);
                                } else {
                                  setResultFile(null);
                                }
                              }}
                              className="cursor-pointer"
                            />
                            {projectData.resultReport && (
                              <p className="text-xs text-muted-foreground">
                                현재 파일: <span className="font-semibold text-blue-600">{projectData.resultReport.fileName}</span> (새 파일을 첨부하면 기존 파일이 교체됩니다)
                              </p>
                            )}
                          </div>
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
                    </>
                  )}

                  {/* 2. 청구(Billing) 카테고리 폼 */}
                  {isBilling && billingData && (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-muted/30 rounded-md">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">고객사</p>
                          <p className="font-medium text-sm">{billingData.customerName ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">사업명</p>
                          <p className="font-medium text-sm">{billingData.projectName ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">청구금액</p>
                          <p className="font-medium text-sm">₩{billingData.billingAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">발행 희망일</p>
                          <p className="font-medium text-sm">{billingData.requestedIssueDate ?? "-"}</p>
                        </div>
                        {billingData.issuedAt && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">세금계산서 발행일</p>
                            <p className="font-medium text-sm">{billingData.issuedAt}</p>
                          </div>
                        )}
                        {billingData.collectedAt && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">수금일</p>
                            <p className="font-medium text-sm">{billingData.collectedAt}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">현재 상태</p>
                          <p className="font-medium text-sm">
                            {(() => {
                              if (billingData.status === "REQUESTED") return "발행 요청";
                              if (billingData.status === "APPROVED") return "결재 완료";
                              if (billingData.status === "ISSUED") return "발행완료";
                              if (billingData.status === "COLLECTED") return "수금완료";
                              return billingData.status;
                            })()}
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="remarks">특기사항</Label>
                          <Input
                            id="remarks"
                            type="text"
                            placeholder="특기사항을 입력해 주세요."
                            {...register("remarks")}
                          />
                        </div>

                        <div className="flex justify-end gap-2 border-t pt-6">
                          <Button variant="outline" asChild disabled={isSubmitting}>
                            <Link href={`/project/billingAndCollection/${rawId}`}>취소</Link>
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
                    </>
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
