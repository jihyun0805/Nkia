"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerAutocomplete } from "@/components/erp/entity-customer-autocomplete";
import { UserIdPicker } from "@/components/erp/user-id-picker";
import { loadBackendUsers, type BackendUserSummary } from "@/lib/finding-backend";
import { createCustomerSupportRequest } from "@/lib/api/maintenance";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SupportRequestFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function SupportRequestForm({ onSuccess, onCancel }: SupportRequestFormProps) {
  const router = useRouter();
  const { register, handleSubmit, setValue, control, formState: { isSubmitting } } = useForm({
    defaultValues: {
      customerCompanyCode: null as number | null,
      customerCompanyName: "",
      requestStartDate: "",
      requestEndDate: "",
      requestContent: "",
      requesterId: "",
      registrantId: "",
      salesRepId: "",
      supportManagerId: "",
      remarks: "",
    },
  });

  const [users, setUsers] = useState<BackendUserSummary[]>([]);

  useEffect(() => {
    loadBackendUsers().then(setUsers).catch(console.error);
  }, []);

  const onSubmit = async (data: any) => {
    if (!data.customerCompanyCode) {
      toast.error("고객사를 선택해주세요.");
      return;
    }
    if (!data.requesterId || !data.registrantId || !data.salesRepId || !data.supportManagerId) {
      toast.error("모든 담당자 및 요청자를 선택해주세요.");
      return;
    }

    try {
      const res = await createCustomerSupportRequest({
        customerCompanyCode: data.customerCompanyCode,
        requestStartDate: data.requestStartDate,
        requestEndDate: data.requestEndDate,
        requestContent: data.requestContent,
        requesterId: data.requesterId,
        registrantId: data.registrantId,
        salesRepId: data.salesRepId,
        supportManagerId: data.supportManagerId,
        remarks: data.remarks,
        attachedFileIds: [],
      });

      if (res.success || (res as any).result === "SUCCESS") {
        toast.success("고객지원 요청이 등록되었습니다.");
        onSuccess();
        const createdId = res.data ?? (res as any).id ?? (res as any).body?.data;
        if (createdId) {
          router.push(`/maintenance/support-requests/${createdId}`);
        }
      } else {
        toast.error(res.message || "등록 실패했습니다.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("등록하는 도중 에러가 발생했습니다.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>고객지원 요청 등록</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* 고객사 */}
            <div className="space-y-2">
              <Label htmlFor="customerCompanyCode">고객사</Label>
              <Controller
                name="customerCompanyCode"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Controller
                    name="customerCompanyName"
                    control={control}
                    render={({ field: nameField }) => (
                      <CustomerAutocomplete
                        value={nameField.value}
                        onSelect={(customer) => {
                          if (customer?.backendId) {
                            field.onChange(customer.backendId);
                            nameField.onChange(customer.name);
                          } else {
                            field.onChange(null);
                            nameField.onChange("");
                          }
                        }}
                        onValueChange={nameField.onChange}
                        placeholder="고객사 검색 및 선택"
                      />
                    )}
                  />
                )}
              />
            </div>

            {/* 개시일 */}
            <div className="space-y-2">
              <Label htmlFor="requestStartDate">요청 개시일</Label>
              <Input
                id="requestStartDate"
                type="date"
                {...register("requestStartDate", { required: true })}
              />
            </div>

            {/* 완료일 */}
            <div className="space-y-2">
              <Label htmlFor="requestEndDate">요청 완료일</Label>
              <Input
                id="requestEndDate"
                type="date"
                {...register("requestEndDate", { required: true })}
              />
            </div>

            <div className="hidden md:block"></div>

            {/* 요청자 */}
            <div className="space-y-2">
              <Label htmlFor="requesterId">요청자 (고객사 담당자 등)</Label>
              <Controller
                name="requesterId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <UserIdPicker
                    value={field.value}
                    users={users}
                    onValueChange={field.onChange}
                    placeholder="요청자 검색"
                  />
                )}
              />
            </div>

            {/* 등록자 */}
            <div className="space-y-2">
              <Label htmlFor="registrantId">등록자 (내부 직원)</Label>
              <Controller
                name="registrantId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <UserIdPicker
                    value={field.value}
                    users={users}
                    onValueChange={field.onChange}
                    placeholder="등록자 검색"
                  />
                )}
              />
            </div>

            {/* 영업대표 */}
            <div className="space-y-2">
              <Label htmlFor="salesRepId">영업대표</Label>
              <Controller
                name="salesRepId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <UserIdPicker
                    value={field.value}
                    users={users}
                    onValueChange={field.onChange}
                    placeholder="영업대표 검색"
                  />
                )}
              />
            </div>

            {/* 고객지원 담당자 */}
            <div className="space-y-2">
              <Label htmlFor="supportManagerId">고객지원 담당자</Label>
              <Controller
                name="supportManagerId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <UserIdPicker
                    value={field.value}
                    users={users}
                    onValueChange={field.onChange}
                    placeholder="고객지원 담당자 검색"
                  />
                )}
              />
            </div>
          </div>

          {/* 요청 내용 */}
          <div className="space-y-2">
            <Label htmlFor="requestContent">요청 내용</Label>
            <Textarea
              id="requestContent"
              {...register("requestContent", { required: true })}
              placeholder="지원 요청 상세 내용 입력"
              rows={4}
            />
          </div>

          {/* 특기사항 */}
          <div className="space-y-2">
            <Label htmlFor="remarks">특기사항</Label>
            <Textarea
              id="remarks"
              {...register("remarks")}
              placeholder="특기사항 입력 (옵션)"
              rows={2}
            />
          </div>

          {/* 첨부파일 (TODO) */}
          <div className="space-y-2 opacity-50">
            <Label htmlFor="file">관련 첨부파일</Label>
            <Input
              id="file"
              type="file"
              disabled
              className="cursor-not-allowed"
            />
            <p className="text-sm text-muted-foreground mt-1">
              * 파일 업로드 기능은 준비 중입니다.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "등록 중..." : "등록"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
