"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SupportResultFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const customerDataMap: Record<string, { requests: string[] }> = {
  "농협은행": { requests: ["REQ-2026-001", "REQ-2026-002"] },
  "신한은행": { requests: ["REQ-2026-003"] },
  "삼성SDS": { requests: ["REQ-2026-004", "REQ-2026-005"] },
  "우리은행": { requests: [] },
  "LG전자": { requests: ["REQ-2026-006"] },
};

export function SupportResultForm({ onSuccess, onCancel }: SupportResultFormProps) {
  const { register, handleSubmit, setValue, watch, control } = useForm({
    defaultValues: {
      customer: "",
      requestType: "requested", // "requested" / "regular"
      requestCode: "",
      startDateTime: "",
      endDateTime: "",
      content: "",
      registrant: "현재사용자", // 현재 로그인한 사용자가 기본값으로 지정됨
      notes: "",
      file: null,
    },
  });

  const selectedCustomer = watch("customer");
  const selectedRequestType = watch("requestType");

  useEffect(() => {
    // 고객사가 변경되면 선택된 요청 코드를 초기화
    setValue("requestCode", "");
  }, [selectedCustomer, setValue]);

  const onSubmit = (data: any) => {
    console.log("제출된 데이터:", data);
    alert("고객지원 활동 결과가 등록되었습니다.");
    onSuccess();
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
              <Label htmlFor="customer">고객사</Label>
              <Controller
                name="customer"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="customer">
                      <SelectValue placeholder="고객사 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(customerDataMap).map((cust) => (
                        <SelectItem key={cust} value={cust}>
                          {cust}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* 등록자 */}
            <div className="space-y-2">
              <Label htmlFor="registrant">등록자</Label>
              <Input
                id="registrant"
                {...register("registrant", { required: true })}
                placeholder="등록자 입력 (예: 고객지원 담당자)"
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
                      <RadioGroupItem value="requested" id="r-requested" />
                      <Label htmlFor="r-requested" className="font-normal cursor-pointer">요청 받음 (장애 지원, 특수 지원 등)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="regular" id="r-regular" />
                      <Label htmlFor="r-regular" className="font-normal cursor-pointer">정기점검 (요청 없음)</Label>
                    </div>
                  </RadioGroup>
                )}
              />

              {selectedRequestType === "requested" && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <Label htmlFor="requestCode">관련 요청 선택</Label>
                  <Controller
                    name="requestCode"
                    control={control}
                    rules={{ required: selectedRequestType === "requested" }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCustomer}>
                        <SelectTrigger id="requestCode" className="w-full sm:w-[300px]">
                          <SelectValue placeholder={selectedCustomer ? "지원 요청(코드) 선택" : "먼저 고객사를 선택해주세요"} />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedCustomer && customerDataMap[selectedCustomer]?.requests.length > 0 ? (
                            customerDataMap[selectedCustomer].requests.map((req) => (
                              <SelectItem key={req} value={req}>
                                {req}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              등록된 요청이 없습니다
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
              <Label htmlFor="startDateTime">고객지원 개시 일시</Label>
              <Input
                id="startDateTime"
                type="datetime-local"
                {...register("startDateTime", { required: true })}
              />
            </div>

            {/* 완료 일시 */}
            <div className="space-y-2">
              <Label htmlFor="endDateTime">고객지원 완료 일시</Label>
              <Input
                id="endDateTime"
                type="datetime-local"
                {...register("endDateTime", { required: true })}
              />
            </div>
          </div>

          {/* 지원 내용 */}
          <div className="space-y-2">
            <Label htmlFor="content">고객지원 활동 내용</Label>
            <Textarea
              id="content"
              {...register("content", { required: true })}
              placeholder="지원 활동 및 조치 내용 입력"
              rows={4}
            />
          </div>

          {/* 특기사항 */}
          <div className="space-y-2">
            <Label htmlFor="notes">특기사항</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="특기사항 입력 (옵션)"
              rows={2}
            />
          </div>

          {/* 첨부파일 */}
          <div className="space-y-2">
            <Label htmlFor="file">관련 첨부파일</Label>
            <Input
              id="file"
              type="file"
              {...register("file")}
              className="cursor-pointer"
            />
            <p className="text-sm text-muted-foreground mt-1">
              * 조치 결과 보고서, 로그 파일 등을 업로드해주십시오.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              취소
            </Button>
            <Button type="submit">결과 등록</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
