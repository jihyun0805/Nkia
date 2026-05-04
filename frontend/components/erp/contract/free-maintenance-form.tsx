"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";

export interface FreeMaintenanceFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  inheritedData?: {
    customerId: string;
    customerName: string;
    opportunityId: string;
    opportunityName: string;
    orderReportId?: string;
    contractId?: string;
  } | null;
}

export function FreeMaintenanceForm({ onSuccess, onCancel, inheritedData }: FreeMaintenanceFormProps) {
  if (!inheritedData || !inheritedData.customerId || !inheritedData.opportunityId || (!inheritedData.orderReportId && !inheritedData.contractId)) {
    return (
      <Card className="max-w-2xl mx-auto mt-8 border-amber-200 bg-amber-50/50">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500" />
          <h2 className="text-xl font-bold text-amber-700">필수 승계 정보가 부족합니다</h2>
          <p className="text-center text-amber-600/80">
            무상유지보수 계약 등록은 고객사, 사업기회, 그리고 계약 또는 수주보고 코드가 필요합니다.
            <br />
            먼저 필요한 정보를 등록해 주세요.
          </p>
          <div className="flex gap-4 mt-4">
            <Button variant="outline" onClick={onCancel}>
              돌아가기
            </Button>
            <Button asChild>
              <Link href="/contract">계약/수주보고 등록</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = inheritedData;

  const [amount, setAmount] = useState<string>("0");
  const [annualAmount, setAnnualAmount] = useState<string>("0");

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    setAmount(numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  };
  const handleAnnualAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    setAnnualAmount(numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  };

  return (
    <Card className="max-w-4xl mx-auto shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <CardTitle className="text-xl">무상유지보수 계약 등록</CardTitle>
        <CardDescription className="mt-1">시스템에 정보를 입력하는 것으로 발효됩니다.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            onSuccess();
          }}
        >
          <div className="grid grid-cols-2 gap-6 p-4 rounded-lg bg-muted/30 border">
            <div className="space-y-2">
              <Label className="text-muted-foreground">고객사</Label>
              <div className="font-medium">
                {data.customerName} <span className="text-xs text-muted-foreground ml-1">({data.customerId})</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">도입PJT (사업기회)</Label>
              <div className="font-medium">
                {data.opportunityName} <span className="text-xs text-muted-foreground ml-1">({data.opportunityId})</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">승계된 문서</Label>
              <div className="font-medium">{data.contractId || data.orderReportId}</div>
            </div>
          </div>

          {/* 계약 기본 정보 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">계약 기본 정보</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="siteName">
                  사이트명 <span className="text-red-500">*</span>
                </Label>
                <Input id="siteName" defaultValue={data.customerName} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">
                  구분 <span className="text-red-500">*</span>
                </Label>
                <Input id="type" placeholder="예: 신규, 갱신, 추가" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="importance">
                  중요도 <span className="text-red-500">*</span>
                </Label>
                <Select required>
                  <SelectTrigger id="importance">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="상">상</SelectItem>
                    <SelectItem value="중">중</SelectItem>
                    <SelectItem value="하">하</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">
                  위치 <span className="text-red-500">*</span>
                </Label>
                <Input id="location" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentType">유무상</Label>
                <Input id="paymentType" value="무상" disabled />
              </div>
            </div>
          </div>

          {/* 유지보수 상세 정보 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">유지보수 상세 정보</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="contractDate">
                  계약일 <span className="text-red-500">*</span>
                </Label>
                <Input id="contractDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  시작일 <span className="text-red-500">*</span>
                </Label>
                <Input id="startDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">
                  종료일 <span className="text-red-500">*</span>
                </Label>
                <Input id="endDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remote">
                  원격 <span className="text-red-500">*</span>
                </Label>
                <Select required>
                  <SelectTrigger id="remote">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="O">O</SelectItem>
                    <SelectItem value="X">X</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspectionCycle">
                  점검주기 <span className="text-red-500">*</span>
                </Label>
                <Select required>
                  <SelectTrigger id="inspectionCycle">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="월">월</SelectItem>
                    <SelectItem value="분기">분기</SelectItem>
                    <SelectItem value="반기">반기</SelectItem>
                    <SelectItem value="없음">없음</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reportSubmission">
                  보고서 제출여부 <span className="text-red-500">*</span>
                </Label>
                <Select required>
                  <SelectTrigger id="reportSubmission">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="O">O</SelectItem>
                    <SelectItem value="X">X</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">요율</Label>
                <div className="relative">
                  <Input id="rate" type="number" step="0.01" placeholder="0" className="pr-8 text-right" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">계약금액</Label>
                <div className="relative">
                  <Input id="amount" type="text" className="pr-8 text-right" value={amount} onChange={handleAmountChange} disabled />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="annualAmount">연간 유지보수 금액</Label>
                <div className="relative">
                  <Input id="annualAmount" type="text" className="pr-8 text-right" value={annualAmount} onChange={handleAnnualAmountChange} disabled />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimateContract">견적 및 계약</Label>
                <Input id="estimateContract" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regularPm">정기 PM</Label>
                <Input id="regularPm" />
              </div>
            </div>
          </div>

          {/* 시스템 정보 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">시스템 정보</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="productFamily">
                  제품군 <span className="text-red-500">*</span>
                </Label>
                <Input id="productFamily" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apCount">
                  AP수 <span className="text-red-500">*</span>
                </Label>
                <Input id="apCount" type="number" min="0" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apVersion">
                  AP버전 <span className="text-red-500">*</span>
                </Label>
                <Input id="apVersion" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="esCount">
                  ES수 <span className="text-red-500">*</span>
                </Label>
                <Input id="esCount" type="number" min="0" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="esVersion">
                  ES버전 <span className="text-red-500">*</span>
                </Label>
                <Input id="esVersion" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dbVersion">
                  DB버전 <span className="text-red-500">*</span>
                </Label>
                <Input id="dbVersion" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dbHa">
                  DB HA <span className="text-red-500">*</span>
                </Label>
                <Input id="dbHa" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aclPatch">
                  ACL 패치여부 <span className="text-red-500">*</span>
                </Label>
                <Select required>
                  <SelectTrigger id="aclPatch">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="O">O</SelectItem>
                    <SelectItem value="X">X</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monitorVulnerability">
                  모니터템플릿 취약점 패치여부 <span className="text-red-500">*</span>
                </Label>
                <Select required>
                  <SelectTrigger id="monitorVulnerability">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="O">O</SelectItem>
                    <SelectItem value="X">X</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-3">
                <Label htmlFor="ltsUpgradePlan">LTS 8.4.0 업그레이드 계획</Label>
                <Input id="ltsUpgradePlan" />
              </div>
            </div>
          </div>

          {/* 담당자 정보 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">담당자 정보</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="salesRep">
                  영업 (영업대표) <span className="text-red-500">*</span>
                </Label>
                <Input id="salesRep" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerContactName">
                  고객 (담당자명) <span className="text-red-500">*</span>
                </Label>
                <Input id="customerContactName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactNumber">
                  연락처 <span className="text-red-500">*</span>
                </Label>
                <Input id="contactNumber" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  이메일 <span className="text-red-500">*</span>
                </Label>
                <Input id="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="engineerMain">변경(정) - 정담당자</Label>
                <Input id="engineerMain" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="engineerSub">변경(부) - 부담당자</Label>
                <Input id="engineerSub" />
              </div>
            </div>
          </div>

          {/* 기타 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">기타</h3>
            <div className="space-y-2">
              <Label htmlFor="remarks">비고</Label>
              <Textarea id="remarks" rows={3} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 mt-8 border-t">
            <Button type="button" variant="outline" onClick={onCancel} className="w-24">
              취소
            </Button>
            <Button type="submit" className="w-24">
              등록 완료
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
