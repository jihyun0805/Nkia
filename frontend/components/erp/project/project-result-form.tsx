"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useChatbotPrefill } from "@/lib/use-chatbot-prefill";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Loader2, AlertCircle, Search } from "lucide-react";
import { projectApi, type ProjectListResponse, type ProjectDetailResponse } from "@/lib/api/project-api";
import { ProjectSelector } from "@/components/erp/project/project-selector";
import { register as registerResultReport } from "@/lib/api/generated/project-result-report/project-result-report";
import { customAxiosInstance } from "@/lib/api/customAxios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPicker } from "@/components/erp/user-picker";
import { useBackendUsers } from "@/lib/use-backend-users";
import type { BackendUserSummary } from "@/lib/workflow-backend";

interface ProjectResultFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  inheritedData?: {
    customerId?: string;
    customerName?: string;
    opportunityId?: string;
    opportunityName?: string;
    orderReportId?: string | number;
    contractId?: string | number;
    projectName?: string;
    salesRep?: string;
    projectAmount?: string;
    projectId?: string | number;
    startDate?: string;
    endDate?: string;
    [key: string]: any;
  } | null;
}

interface FormValues {
  customerName: string;
  projectName: string;
  projectAmount: string;
  startDate: string;
  endDate: string;
  pmName: string;
  salesRep: string;
  managerId: string;
  salesRepresentativeId: string;
}

export function ProjectResultForm({ onSuccess, onCancel, inheritedData }: ProjectResultFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState<"register" | "complete">("register");
  const [selectedProject, setSelectedProject] = useState<ProjectListResponse | null>(null);
  const [selectedProjectDetail, setSelectedProjectDetail] = useState<ProjectDetailResponse | null>(null);

  const projectUsers = useBackendUsers();
  const [pmUser, setPmUser] = useState<BackendUserSummary | null>(null);
  const [salesRepUser, setSalesRepUser] = useState<BackendUserSummary | null>(null);

  // 현재 유효한 데이터 (상속된 데이터 또는 직접 선택한 데이터)
  const currentCustomerName = selectedProject?.customerName || inheritedData?.customerName || "";
  const currentProjectName = selectedProject?.projectName || inheritedData?.projectName || "";
  const currentProjectId = selectedProject?.id || inheritedData?.projectId || "";
  const currentProjectNo = selectedProjectDetail?.pjtNumber || selectedProject?.pjtNumber || inheritedData?.pjtNumber || "";
  const currentPmName = selectedProject?.pmName || inheritedData?.pmName || "";
  const currentSalesRep = selectedProject?.salesRepresentativeName || inheritedData?.salesRep || "";
  const currentProjectAmount = selectedProject?.totalAmount?.toString() || inheritedData?.projectAmount || "";
  const currentStartDate = selectedProject?.startDate || inheritedData?.startDate || "";
  const currentEndDate = selectedProject?.endDate || inheritedData?.endDate || "";

  const { register, handleSubmit, setValue, reset, watch } = useForm<FormValues>({
    defaultValues: {
      customerName: currentCustomerName,
      projectName: currentProjectName,
      projectAmount: currentProjectAmount ? Number(currentProjectAmount).toLocaleString() : "",
      startDate: currentStartDate,
      endDate: currentEndDate,
      pmName: currentPmName,
      salesRep: currentSalesRep,
      managerId: "",
      salesRepresentativeId: "",
    },
  });

  const pmNameValue = watch("pmName");

  // 챗봇 create_draft (project_result_report) prefill
  const { values: chatbotPrefill, hasPrefill: hasChatbotPrefill, clear: clearChatbotPrefill } = useChatbotPrefill();
  const prefillAppliedRef = useRef(false);
  useEffect(() => {
    if (!hasChatbotPrefill || prefillAppliedRef.current) return;
    if (inheritedData) return;
    prefillAppliedRef.current = true;
    const slot = chatbotPrefill;
    if (slot.customer_name) setValue("customerName", slot.customer_name);
    if (slot.title || slot.opportunity_name) setValue("projectName", slot.title || slot.opportunity_name);
    const applied = Object.keys(slot).length;
    if (applied > 0) {
      const id = window.setTimeout(() => clearChatbotPrefill(), 100);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [hasChatbotPrefill]);

  // 상속 데이터(Inherited Data) 처리
  useEffect(() => {
    if (inheritedData?.projectId) {
      const pId = Number(inheritedData.projectId);
      if (!isNaN(pId)) {
        projectApi
          .getProject(pId)
          .then((res) => {
            const p = res.data;
            setSelectedProjectDetail(p);

            const mapped: ProjectListResponse = {
              id: p.id,
              pjtNumber: p.pjtNumber,
              customerName: p.customerName,
              projectName: p.pjtName,
              totalAmount: p.totalAmount,
              startDate: p.startDate,
              endDate: p.endDate,
              pmName: p.pmName,
              salesRepresentativeName: p.salesRepName,
              hasResultReport: !!p.resultReport,
            };
            setSelectedProject(mapped);
            setValue("customerName", p.customerName || "");
            setValue("projectName", p.pjtName || "");
            setValue("projectAmount", p.totalAmount?.toLocaleString() || "");
            setValue("pmName", p.pmName || "");
            setValue("salesRep", p.salesRepName || "");
            setValue("startDate", p.startDate || "");
            setValue("endDate", p.endDate || "");
          })
          .catch((err) => {
            console.error("Failed to load project from inherited data", err);
          });
      }
    }
  }, [inheritedData]);

  // 선택 시 폼 업데이트
  const handleSelectProject = async (project: ProjectListResponse) => {
    setSelectedProject(project);
    try {
      const res = await projectApi.getProject(project.id);
      const d = res.data;
      setSelectedProjectDetail(d);

      setValue("customerName", d.customerName || "");
      setValue("projectName", d.pjtName || "");
      setValue("projectAmount", d.totalAmount?.toLocaleString() || "");
      setValue("pmName", d.pmName || "");
      setValue("salesRep", d.salesRepName || "");
      setValue("startDate", d.startDate || "");
      setValue("endDate", d.endDate || "");
    } catch (err) {
      console.error("Failed to load project details", err);
    }
  };

  // 사용자 목록이 로드되거나 사업 정보가 변경될 때 PM 및 영업대표 매칭
  useEffect(() => {
    if (selectedProjectDetail && projectUsers.length > 0) {
      if (selectedProjectDetail.pmName) {
        const matchingPm = projectUsers.find((u) => u.name === selectedProjectDetail.pmName);
        if (matchingPm) {
          setPmUser(matchingPm);
          setValue("managerId", matchingPm.id ?? "");
        }
      }
      if (selectedProjectDetail.salesRepName) {
        const matchingSalesRep = projectUsers.find((u) => u.name === selectedProjectDetail.salesRepName);
        if (matchingSalesRep) {
          setSalesRepUser(matchingSalesRep);
          setValue("salesRepresentativeId", matchingSalesRep.id ?? "");
        }
      }
    }
  }, [projectUsers, selectedProjectDetail, setValue]);

  // 필수 데이터 체크
  const isDataMissing = !currentProjectId;

  useEffect(() => {
    if (isDataMissing) {
      console.warn("필수 연계 데이터(사업)가 누락되었습니다.");
    }
  }, [isDataMissing]);

  // 결과보고 등록
  const onSubmit = async (_data: FormValues) => {
    const projectId = Number(currentProjectId);
    if (isNaN(projectId)) {
      alert("사업 정보가 없습니다.");
      return;
    }

    const finalManagerId = _data.managerId || pmUser?.id;
    if (!finalManagerId) {
      alert("PM을 선택해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      let fileId: number | undefined = undefined;

      // 1. 결과보고 파일 업로드 진행
      if (resultFile) {
        const formData = new FormData();
        formData.append("file", resultFile);

        const uploadRes = await customAxiosInstance.post("/files/upload", formData, {
          params: { category: "PROJECT_RESULT" },
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        fileId = uploadRes.data?.data;
      }

      let salesRepId = salesRepUser?.id;
      if (!salesRepId && projectUsers.length > 0) {
        const repName = selectedProjectDetail?.salesRepName || currentSalesRep;
        const found = projectUsers.find((u) => u.name === repName);
        if (found) {
          salesRepId = found.id;
        } else {
          salesRepId = finalManagerId || projectUsers[0]?.id;
        }
      }

      const finalFileId = fileId || selectedProjectDetail?.resultReport?.id || null;

      // 2. 사업 정보 및 결과보고 등록/수정 API 통합 호출
      const updateRes = await projectApi.updateProjectWithReport(projectId, {
        startDate: _data.startDate || undefined,
        endDate: _data.endDate || undefined,
        managerId: finalManagerId,
        salesRepresentativeId: salesRepId || finalManagerId,
        fileId: finalFileId,
      });

      const updated = updateRes.data;
      setSelectedProjectDetail(updated);

      const mapped: ProjectListResponse = {
        id: updated.id,
        pjtNumber: updated.pjtNumber,
        customerName: updated.customerName,
        projectName: updated.pjtName,
        totalAmount: updated.totalAmount,
        startDate: updated.startDate,
        endDate: updated.endDate,
        pmName: updated.pmName,
        salesRepresentativeName: updated.salesRepName,
        hasResultReport: !!updated.resultReport,
      };
      setSelectedProject(mapped);

      // 3. 완료 단계 전환
      setUploadStep("complete");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "사업 결과보고 등록에 실패했습니다. 다시 시도해주세요.";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 완료 단계 UI
  if (uploadStep === "complete" && selectedProject) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>사업 결과보고 완료</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-4 text-sm text-green-700 dark:text-green-300">
            사업 결과보고가 성공적으로 완료되었습니다.
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">사업 번호</p>
              <p className="font-medium">{selectedProjectDetail?.pjtNumber || selectedProject.pjtNumber || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">사업명</p>
              <p className="font-medium">{selectedProject.projectName ?? "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">고객사</p>
              <p className="font-medium">{selectedProject.customerName ?? "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">사업금액</p>
              <p className="font-medium">{selectedProject.totalAmount != null ? `₩${selectedProject.totalAmount.toLocaleString()}` : "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">사업기간</p>
              <p className="font-medium">
                {selectedProject.startDate && selectedProject.endDate
                  ? `${selectedProject.startDate} ~ ${selectedProject.endDate}`
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">결과보고 파일</p>
              <p className="font-medium text-blue-600">{resultFile ? resultFile.name : "없음"}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>
              목록으로
            </Button>
            <Button onClick={onSuccess}>완료</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 등록 단계 UI
  return (
    <div className="space-y-6">
      {/* 대상 사업 정보 요약 카드 */}
      <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-300">
            <ExternalLink className="w-4 h-4" />
            대상 사업 정보
          </CardTitle>
          {isDataMissing ? (
            <ProjectSelector onSelect={handleSelectProject} />
          ) : (
            <ProjectSelector
              onSelect={handleSelectProject}
              trigger={
                <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700 p-0 text-xs gap-1">
                  <Search className="w-3 h-3" />
                  변경하기
                </Button>
              }
            />
          )}
        </CardHeader>
        <CardContent className="py-3 px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1">
              <p className="text-muted-foreground font-medium">고객사</p>
              <p className="font-semibold">{currentCustomerName || "미선택"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground font-medium">사업명</p>
              <p className="font-semibold">{currentProjectName || "미선택"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground font-medium">사업 번호</p>
              <p className="font-semibold">{currentProjectNo || "미선택"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground font-medium">사업 기간</p>
              <p className="font-semibold">
                {currentStartDate && currentEndDate
                  ? `${currentStartDate} ~ ${currentEndDate}`
                  : "미설정"}
              </p>
            </div>
          </div>
          {isDataMissing && (
            <p className="mt-3 text-[11px] text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              결과보고를 등록할 사업을 선택해 주세요.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>사업 결과보고 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* 고객사 */}
              <div className="space-y-2">
                <Label htmlFor="customerName">고객사</Label>
                <Input id="customerName" {...register("customerName")} readOnly className="bg-muted" placeholder="사업 선택 시 자동 연동" />
              </div>

              {/* 사업명 */}
              <div className="space-y-2">
                <Label htmlFor="projectName">사업명</Label>
                <Input id="projectName" {...register("projectName")} readOnly className="bg-muted" placeholder="사업 선택 시 자동 연동" />
              </div>

              {/* 사업금액 */}
              <div className="space-y-2">
                <Label htmlFor="projectAmount">사업금액</Label>
                <Input id="projectAmount" type="text" {...register("projectAmount")} readOnly className="bg-muted" placeholder="사업 선택 시 자동 연동" />
              </div>

              {/* 사업개시일 */}
              <div className="space-y-2">
                <Label htmlFor="startDate">사업개시일</Label>
                <Input id="startDate" type="date" {...register("startDate")} placeholder="사업개시일 선택" />
              </div>

              {/* 사업완료일 */}
              <div className="space-y-2">
                <Label htmlFor="endDate">사업완료일</Label>
                <Input id="endDate" type="date" {...register("endDate")} placeholder="사업완료일 선택" />
              </div>

              {/* PM 이름 */}
              <div className="space-y-2">
                <Label htmlFor="pmName">PM 이름</Label>
                <UserPicker
                  value={pmNameValue || ""}
                  users={projectUsers}
                  onSelect={(u) => {
                    setPmUser(u);
                    setValue("managerId", u?.id ?? "", { shouldValidate: true });
                    setValue("pmName", u?.name ?? "");
                  }}
                  placeholder="이름으로 PM 검색 및 선택"
                  disabled={isSubmitting || isDataMissing}
                />
                <input type="hidden" {...register("managerId", { required: true })} />
              </div>

              {/* 영업대표 */}
              <div className="space-y-2">
                <Label htmlFor="salesRep">영업대표</Label>
                <Input id="salesRep" {...register("salesRep")} readOnly className="bg-muted" placeholder="사업 선택 시 자동 연동" />
              </div>

              {/* 결과보고서 파일 첨부 */}
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
                <p className="text-xs text-muted-foreground">
                  * 사업 수행 완료 후 작성된 결과보고서 파일을 첨부해 주십시오. (선택사항)
                </p>
              </div>
            </div>

            {/* 안내 */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-4 text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p>• 선택하신 사업 번호를 기반으로 결과보고가 등록됩니다.</p>
              <p>• 첨부파일은 서버에 안전하게 업로드되어 연계됩니다.</p>
            </div>

            {/* 관련 문서 링크 */}
            {selectedProjectDetail && (
              <div className="bg-muted/50 p-4 rounded-md space-y-3 border col-span-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  관련 문서 참고
                </h4>
                <div className="flex flex-col sm:flex-row gap-6 text-sm">
                  {selectedProjectDetail.orderReportId && (
                    <Link
                      href={`/contract/orders/${selectedProjectDetail.orderReportId}`}
                      target="_blank"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      수주보고서 상세 바로가기
                    </Link>
                  )}
                  {selectedProjectDetail.contractId && (
                    <Link
                      href={`/contract/contracts/${selectedProjectDetail.contractId}`}
                      target="_blank"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      계약서 상세 바로가기
                    </Link>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting || isDataMissing}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    등록 중...
                  </>
                ) : (
                  "결과보고 등록"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
