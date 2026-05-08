"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Upload } from "lucide-react";

interface ProjectResultFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  inheritedData?: {
    customerId?: string;
    customerName?: string;
    opportunityId?: string;
    opportunityName?: string;
    orderReportId?: string;
    contractId?: string;
    projectName?: string;
    salesRep?: string;
    projectAmount?: string;
    [key: string]: any;
  } | null;
}

export function ProjectResultForm({ onSuccess, onCancel, inheritedData }: ProjectResultFormProps) {
  useEffect(() => {
    // 고객사(코드), 사업기회(코드), 수주보고서(코드)가 등록되지 않았다면 진행 불가
    if (!inheritedData?.customerId || !inheritedData?.opportunityId || !inheritedData?.orderReportId) {
      alert("고객사, 사업기회 또는 수주보고서가 등록되지 않았습니다. 먼저 등록을 진행해주십시오.");
      onCancel();
    }
  }, [inheritedData, onCancel]);

  const { register, handleSubmit, setValue } = useForm({
    defaultValues: {
      customerName: inheritedData?.customerName || "",
      projectName: inheritedData?.projectName || inheritedData?.opportunityName || "",
      projectAmount: inheritedData?.projectAmount ? Number(inheritedData.projectAmount).toLocaleString() : "",
      startDate: "",
      endDate: "",
      pmName: "",
      salesRep: inheritedData?.salesRep || "",
      file: null,
    },
  });

  const onSubmit = (data: any) => {
    console.log("제출된 데이터:", data);
    alert("사업결과보고가 등록되었습니다.");
    onSuccess();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>사업결과보고 등록</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* 고객사 */}
            <div className="space-y-2">
              <Label htmlFor="customerName">고객사</Label>
              <Input
                id="customerName"
                {...register("customerName", { required: true })}
                readOnly
                className="bg-muted"
                placeholder="고객사 입력"
              />
            </div>

            {/* 사업명 */}
            <div className="space-y-2">
              <Label htmlFor="projectName">사업명</Label>
              <Input
                id="projectName"
                {...register("projectName", { required: true })}
                placeholder="사업명 입력"
              />
            </div>

            {/* 사업금액 */}
            <div className="space-y-2">
              <Label htmlFor="projectAmount">사업금액</Label>
              <Input
                id="projectAmount"
                type="text"
                {...register("projectAmount", {
                  required: true,
                  onChange: (e) => {
                    const value = e.target.value.replace(/[^\d]/g, ""); // 숫자 이외의 문자 제거
                    const formatted = value ? Number(value).toLocaleString() : "";
                    setValue("projectAmount", formatted, { shouldValidate: true, shouldDirty: true });
                  }
                })}
                placeholder="사업금액 입력"
              />
            </div>

            {/* 사업개시일 */}
            <div className="space-y-2">
              <Label htmlFor="startDate">사업개시일</Label>
              <Input
                id="startDate"
                type="date"
                {...register("startDate", { required: true })}
              />
            </div>

            {/* 사업완료일 */}
            <div className="space-y-2">
              <Label htmlFor="endDate">사업완료일</Label>
              <Input
                id="endDate"
                type="date"
                {...register("endDate", { required: true })}
              />
            </div>

            {/* PM 이름 */}
            <div className="space-y-2">
              <Label htmlFor="pmName">PM 이름</Label>
              <Input
                id="pmName"
                {...register("pmName", { required: true })}
                placeholder="PM 이름 입력"
              />
            </div>

            {/* 영업대표 */}
            <div className="space-y-2">
              <Label htmlFor="salesRep">영업대표</Label>
              <Input
                id="salesRep"
                {...register("salesRep", { required: true })}
                placeholder="영업대표 입력"
              />
            </div>
          </div>

          {/* 결과보고서 첨부파일 */}
          <div className="space-y-2">
            <Label htmlFor="file">결과보고서 첨부</Label>
            <div className="flex items-center gap-4">
              <Input
                id="file"
                type="file"
                {...register("file", { required: true })}
                className="cursor-pointer"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              * 사업결과보고서를 업로드해주십시오.
            </p>
          </div>

          {/* 관련 문서 링크 (참고용) */}
          <div className="bg-muted/50 p-4 rounded-md space-y-3 mt-6 border">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              관련 문서 참고
            </h4>
            <div className="flex gap-4 text-sm">
              <Link
                href="/contract?tab=orders"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                수주보고서 ({inheritedData?.orderReportId || "미등록"})
              </Link>
              {inheritedData?.contractId && (
                <Link
                  href="/contract?tab=contracts"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  계약 ({inheritedData.contractId})
                </Link>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              취소
            </Button>
            <Button type="submit">등록</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
