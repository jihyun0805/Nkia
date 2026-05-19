"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CustomerAutocomplete } from "@/components/erp/entity-customer-autocomplete";
import { UserIdPicker } from "@/components/erp/user-id-picker";
import { loadBackendUsers, type BackendUserSummary } from "@/lib/finding-backend";
import { createCustomerSupportActivity, getCustomerSupportRequests, type CustomerSupportRequestListResponse } from "@/lib/api/maintenance";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SupportResultFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function SupportResultForm({ onSuccess, onCancel }: SupportResultFormProps) {
  const router = useRouter();
  const { register, handleSubmit, setValue, watch, control, formState: { isSubmitting } } = useForm({
    defaultValues: {
      customerCompanyCode: null as number | null,
      customerCompanyName: "",
      requestType: "REQUEST" as "REQUEST" | "REGULAR",
      requestId: null as number | null,
      activityStartTime: "",
      activityEndTime: "",
      activityContent: "",
      registrantId: "",
      remarks: "",
      participantList: [] as { userId: string; roleDescription: string }[],
    },
  });

  const { fields: participantFields, append: appendParticipant, remove: removeParticipant } = useFieldArray({
    control,
    name: "participantList",
  });

  const selectedCustomerName = watch("customerCompanyName");
  const selectedRequestType = watch("requestType");

  const [users, setUsers] = useState<BackendUserSummary[]>([]);
  const [requests, setRequests] = useState<CustomerSupportRequestListResponse[]>([]);

  useEffect(() => {
    loadBackendUsers().then(setUsers).catch(console.error);
    getCustomerSupportRequests().then((res) => {
      if (res.success || (res as any).result === "SUCCESS") {
        setRequests(res.data ?? []);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    setValue("requestId", null);
  }, [selectedCustomerName, setValue]);

  const filteredRequests = requests.filter(req => req.customerName === selectedCustomerName);

  const onSubmit = async (data: any) => {
    if (!data.customerCompanyCode) {
      toast.error("고객사를 선택해주세요.");
      return;
    }
    if (!data.registrantId) {
      toast.error("등록자를 선택해주세요.");
      return;
    }
    if (data.requestType === "REQUEST" && !data.requestId) {
      toast.error("요청 받음인 경우 관련 요청을 선택해주세요.");
      return;
    }

    try {
      const payload = {
        requestId: data.requestType === "REQUEST" ? data.requestId : null,
        maintenanceId: null, // TODO: Link maintenance if needed
        customerCompanyCode: data.customerCompanyCode,
        activityType: data.requestType,
        activityStartTime: data.activityStartTime,
        activityEndTime: data.activityEndTime,
        activityContent: data.activityContent,
        registrantId: data.registrantId,
        remarks: data.remarks,
        participantList: data.participantList.filter((p: any) => p.userId && p.roleDescription),
        attachedFileIds: [],
      };

      const res = await createCustomerSupportActivity(payload);
      if (res.success || (res as any).result === "SUCCESS") {
        toast.success("고객지원 활동 결과가 등록되었습니다.");
        onSuccess();
        const createdId = res.data ?? (res as any).id ?? (res as any).body?.data;
        if (createdId) {
          router.push(`/maintenance/support-activities/${createdId}`);
        }
      } else {
        toast.error(res.message || "등록 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      toast.error("등록하는 도중 에러가 발생했습니다.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>고객지원 활동 결과 등록</CardTitle>
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

            {/* 등록자 */}
            <div className="space-y-2">
              <Label htmlFor="registrantId">등록자</Label>
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

            {/* 요청 여부 및 요청 코드 */}
            <div className="space-y-3 col-span-2 p-4 bg-muted/30 border rounded-md">
              <Label>고객지원 요청 여부</Label>
              <Controller
                name="requestType"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-2 sm:flex-row sm:space-x-4 sm:space-y-0"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="REQUEST" id="r-requested" />
                      <Label htmlFor="r-requested" className="font-normal cursor-pointer">요청 받음 (장애 지원, 특수 지원 등)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="REGULAR" id="r-regular" />
                      <Label htmlFor="r-regular" className="font-normal cursor-pointer">정기점검 (요청 없음)</Label>
                    </div>
                  </RadioGroup>
                )}
              />

              {selectedRequestType === "REQUEST" && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <Label htmlFor="requestId">관련 요청 선택</Label>
                  <Controller
                    name="requestId"
                    control={control}
                    rules={{ required: selectedRequestType === "REQUEST" }}
                    render={({ field }) => (
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : ""} disabled={!selectedCustomerName}>
                        <SelectTrigger id="requestId" className="w-full sm:w-[300px]">
                          <SelectValue placeholder={selectedCustomerName ? "지원 요청 선택" : "먼저 고객사를 선택해주세요"} />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedCustomerName && filteredRequests.length > 0 ? (
                            filteredRequests.map((req) => (
                              <SelectItem key={req.id} value={String(req.id)}>
                                [ID: {req.id}] {req.requestStartDate} ~ {req.requestEndDate}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              해당 고객사에 등록된 요청이 없습니다
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}
            </div>

            {/* 개시 일시 */}
            <div className="space-y-2">
              <Label htmlFor="activityStartTime">고객지원 개시 일시</Label>
              <Input
                id="activityStartTime"
                type="datetime-local"
                {...register("activityStartTime", { required: true })}
              />
            </div>

            {/* 완료 일시 */}
            <div className="space-y-2">
              <Label htmlFor="activityEndTime">고객지원 완료 일시</Label>
              <Input
                id="activityEndTime"
                type="datetime-local"
                {...register("activityEndTime", { required: true })}
              />
            </div>
          </div>

          {/* 지원 내용 */}
          <div className="space-y-2">
            <Label htmlFor="activityContent">고객지원 활동 내용</Label>
            <Textarea
              id="activityContent"
              {...register("activityContent", { required: true })}
              placeholder="지원 활동 및 조치 내용 입력"
              rows={4}
            />
          </div>

          {/* 타부서 지원 인력 (참여자 목록) */}
          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">지원 인력 및 역할 (타부서 등)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendParticipant({ userId: "", roleDescription: "" })}
                className="h-8"
              >
                <Plus className="w-4 h-4 mr-2" />
                인력 추가
              </Button>
            </div>
            
            {participantFields.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-muted/20 p-4 rounded-md text-center border border-dashed">
                추가 지원 인력이 있을 경우 '인력 추가' 버튼을 눌러주세요.
              </p>
            ) : (
              <div className="space-y-3">
                {participantFields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-3 p-3 bg-muted/10 border rounded-md">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">지원 인력</Label>
                          <Controller
                            name={`participantList.${index}.userId`}
                            control={control}
                            rules={{ required: true }}
                            render={({ field: userField }) => (
                              <UserIdPicker
                                value={userField.value}
                                users={users}
                                onValueChange={userField.onChange}
                                placeholder="지원자 검색"
                              />
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">지원 내용 / 역할</Label>
                          <Input
                            {...register(`participantList.${index}.roleDescription`, { required: true })}
                            placeholder="예: 데이터베이스 마이그레이션 지원"
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeParticipant(index)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0 mt-6"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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

          {/* 첨부파일 */}
          <div className="space-y-2 opacity-50">
            <Label htmlFor="file">관련 첨부파일</Label>
            <Input
              id="file"
              type="file"
              disabled
              className="cursor-not-allowed"
            />
            <p className="text-sm text-muted-foreground mt-1">
              * 조치 결과 보고서 등 파일 업로드는 준비 중입니다.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "등록 중..." : "결과 등록"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
