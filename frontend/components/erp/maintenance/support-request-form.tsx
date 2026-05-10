"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SupportRequestFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const customerDataMap: Record<string, { salesRep: string; supportRep: string }> = {
  "농협은행": { salesRep: "김영업", supportRep: "김유지" },
  "신한은행": { salesRep: "이대리", supportRep: "정관리" },
  "삼성SDS": { salesRep: "김영업", supportRep: "김유지" },
  "우리은행": { salesRep: "박과장", supportRep: "이보수" },
  "LG전자": { salesRep: "박과장", supportRep: "이보수" },
};

export function SupportRequestForm({ onSuccess, onCancel }: SupportRequestFormProps) {
  const { register, handleSubmit, setValue, watch, control } = useForm({
    defaultValues: {
      customer: "",
      startDate: "",
      endDate: "",
      content: "",
      requester: "",
      registrant: "현재사용자",
      salesRep: "",
      supportRep: "",
      notes: "",
      file: null,
    },
  });

  const selectedCustomer = watch("customer");

  useEffect(() => {
    if (selectedCustomer && customerDataMap[selectedCustomer]) {
      setValue("salesRep", customerDataMap[selectedCustomer].salesRep);
      setValue("supportRep", customerDataMap[selectedCustomer].supportRep);
    } else {
      setValue("salesRep", "");
      setValue("supportRep", "");
    }
  }, [selectedCustomer, setValue]);

  const onSubmit = (data: any) => {
    console.log("제출된 데이터:", data);
    alert("고객지원 요청이 등록되었습니다.");
    onSuccess();
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

            {/* 요청자 */}
            <div className="space-y-2">
              <Label htmlFor="requester">요청자</Label>
              <Input
                id="requester"
                {...register("requester", { required: true })}
                placeholder="요청자 이름 입력 (예: 테크센터 담당자)"
              />
            </div>

            {/* 개시일 */}
            <div className="space-y-2">
              <Label htmlFor="startDate">요청 개시일</Label>
              <Input
                id="startDate"
                type="date"
                {...register("startDate", { required: true })}
              />
            </div>

            {/* 완료일 */}
            <div className="space-y-2">
              <Label htmlFor="endDate">요청 완료일</Label>
              <Input
                id="endDate"
                type="date"
                {...register("endDate", { required: true })}
              />
            </div>

            {/* 등록자 */}
            <div className="space-y-2">
              <Label htmlFor="registrant">등록자</Label>
              <Input
                id="registrant"
                {...register("registrant", { required: true })}
                placeholder="등록자 입력"
              />
            </div>

            {/* 영업대표 (자동입력) */}
            <div className="space-y-2">
              <Label htmlFor="salesRep">영업대표</Label>
              <Input
                id="salesRep"
                {...register("salesRep")}
                readOnly
                className="bg-muted"
                placeholder="고객사 선택 시 자동입력"
              />
            </div>

            {/* 고객지원 담당자 (자동입력) */}
            <div className="space-y-2">
              <Label htmlFor="supportRep">고객지원 담당자</Label>
              <Input
                id="supportRep"
                {...register("supportRep")}
                readOnly
                className="bg-muted"
                placeholder="고객사 선택 시 자동입력"
              />
            </div>
          </div>

          {/* 요청 내용 */}
          <div className="space-y-2">
            <Label htmlFor="content">요청 내용</Label>
            <Textarea
              id="content"
              {...register("content", { required: true })}
              placeholder="지원 요청 상세 내용 입력"
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
              * 관련 문서 및 자료를 업로드해주십시오.
            </p>
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
