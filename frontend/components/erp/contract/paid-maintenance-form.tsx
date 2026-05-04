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

export interface PaidMaintenanceFormProps {
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

export function PaidMaintenanceForm({ onSuccess, onCancel, inheritedData }: PaidMaintenanceFormProps) {
  const [amount, setAmount] = useState<string>("");
  const [annualAmount, setAnnualAmount] = useState<string>("");

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    setAmount(numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  };
  const handleAnnualAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    setAnnualAmount(numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  };

  // 유상유지보수 계약은 수주보고가 선행되어야 하며, 관련 데이터가 없으면 차단
  if (!inheritedData || !inheritedData.customerId || !inheritedData.opportunityId || !inheritedData.orderReportId) {
    return (
      <Card className="max-w-2xl mx-auto mt-8 border-amber-200 bg-amber-50/50">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500" />
          <h2 className="text-xl font-bold text-amber-700">필수 승계 정보가 부족합니다</h2>
          <p className="text-center text-amber-600/80">
            유상유지보수 계약 등록은 고객사, 사업기회, 그리고 수주보고 코드가 필수적으로 필요합니다.
            <br />
            먼저 필요한 정보를 등록해 주세요.
          </p>
          <div className="flex gap-4 mt-4">
            <Button variant="outline" onClick={onCancel}>
              돌아가기
            </Button>
            <Button asChild>
              <Link href="/contract">수주보고 등록</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = inheritedData;

  return (
    <Card className="max-w-4xl mx-auto shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <CardTitle className="text-xl">유상유지보수 계약 등록</CardTitle>
        <CardDescription className="mt-1">필수사항을 입력하고 별도 계약서 파일을 첨부하세요.</CardDescription>
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
              <Label className="text-muted-foreground">수주보고 코드</Label>
              <div className="font-medium">{data.orderReportId}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">계약 코드</Label>
              <div className="font-medium">{data.contractId || "없음"}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-8 border-t pt-6">
            <div className="space-y-2">
              <Label htmlFor="no">No</Label>
              <Input id="no" placeholder="자동생성" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteName">
                사이트명 <span className="text-red-500">*</span>
              </Label>
              <Input id="siteName" defaultValue={data.customerName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="engineerMain">변경(정)</Label>
              <Input id="engineerMain" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="engineerSub">변경(부)</Label>
              <Input id="engineerSub" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">
                구분 <span className="text-red-500">*</span>
              </Label>
              <Input id="type" required />
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
              <Label htmlFor="paymentType">유무상</Label>
              <Input id="paymentType" value="유상" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">
                위치 <span className="text-red-500">*</span>
              </Label>
              <Input id="location" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">
                요율 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input id="rate" type="number" step="0.01" className="pr-8 text-right" required />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">
                계약금액 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input id="amount" type="text" className="pr-8 text-right" value={amount} onChange={handleAmountChange} required />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="annualAmount">
                연간 유지보수 금액 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input id="annualAmount" type="text" className="pr-8 text-right" value={annualAmount} onChange={handleAnnualAmountChange} required />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractDate">
                계약일 <span className="text-red-500">*</span>
              </Label>
              <Input id="contractDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project">도입PJT</Label>
              <Input id="project" value={`${data.opportunityName} (${data.opportunityId})`} disabled />
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
              <Label htmlFor="estimateContract">견적 및 계약</Label>
              <Input id="estimateContract" />
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
              <Label htmlFor="regularPm">정기 PM</Label>
              <Input id="regularPm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productFamily">
                제품군 <span className="text-red-500">*</span>
              </Label>
              <Input id="productFamily" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apVersion">
                AP버전 <span className="text-red-500">*</span>
              </Label>
              <Input id="apVersion" required />
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
            <div className="space-y-2">
              <Label htmlFor="ltsUpgradePlan">LTS 8.4.0 업그레이드 계획</Label>
              <Input id="ltsUpgradePlan" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apCount">
                AP수 <span className="text-red-500">*</span>
              </Label>
              <Input id="apCount" type="number" min="0" required />
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
              <Label htmlFor="dbHa">
                DB HA <span className="text-red-500">*</span>
              </Label>
              <Input id="dbHa" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dbVersion">
                DB버전 <span className="text-red-500">*</span>
              </Label>
              <Input id="dbVersion" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salesRep">
                영업 <span className="text-red-500">*</span>
              </Label>
              <Input id="salesRep" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerContactName">
                고객 <span className="text-red-500">*</span>
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
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="remarks">비고</Label>
              <Textarea id="remarks" rows={3} />
            </div>
            <div className="space-y-2 md:col-span-2 pt-4 border-t">
              <Label htmlFor="contractFile">
                계약서 첨부파일 <span className="text-red-500">*</span>
              </Label>
              <Input id="contractFile" type="file" required className="cursor-pointer" />
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX 등 원본 스캔본 또는 전자계약 문서를 첨부하세요.</p>
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
