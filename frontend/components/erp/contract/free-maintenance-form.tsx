"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Search } from "lucide-react";
import { OrderReportSelector } from "@/components/erp/contract/order-report-selector";
import { type OrderReportListResponse } from "@/lib/api/contract-api";

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
  const [data, setData] = useState<any>(inheritedData);
  const [amount, setAmount] = useState<string>("0");
  const [annualAmount, setAnnualAmount] = useState<string>("0");

  // 선택된 데이터가 없으면 수주보고서 선택 유도
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    setAmount(numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  };
  const handleAnnualAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    setAnnualAmount(numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-blue-900">수주보고서 연결</h3>
            <p className="text-xs text-blue-700">무상유지보수 등록의 기반이 되는 수주보고서를 선택해주세요.</p>
          </div>
          <OrderReportSelector
            onSelect={(report: OrderReportListResponse) => {
              setData({
                customerId: report.finalCustomerCompanyId?.toString() || "",
                customerName: report.finalCustomerCompanyName || "",
                opportunityId: report.projectOpportunityId?.toString() || "",
                opportunityName: report.projectName || "",
                orderReportId: report.id,
                orderReportNumericId: report.id,
              });
            }}
            trigger={
              <Button variant="outline" size="sm" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-100">
                <Search className="w-4 h-4 mr-2" />
                {data?.orderReportId || data?.contractId ? "수주보고서 변경" : "수주보고서 찾기"}
              </Button>
            }
          />
        </div>
        {(data?.orderReportId || data?.contractId) && (
          <div className="mt-3 text-xs bg-white p-2 rounded border border-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-blue-800">[연결됨]</span>
              <span className="text-slate-600">
                {data.opportunityName} ({data.customerName})
              </span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setData(null)}>
              연결 해제
            </Button>
          </div>
        )}
      </div>

      <Card className="shadow-sm">
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
                  {data?.customerName || "미선택"} {data?.customerId && <span className="text-xs text-muted-foreground ml-1">({data.customerId})</span>}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">도입PJT (사업기회)</Label>
                <div className="font-medium">
                  {data?.opportunityName || "미선택"} {data?.opportunityId && <span className="text-xs text-muted-foreground ml-1">({data.opportunityId})</span>}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">승계된 문서</Label>
                <div className="font-medium">{data?.contractId || data?.orderReportId || "없음"}</div>
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
                <Input id="siteName" defaultValue={data?.customerName || ""} required />
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
                <Input id="paymentType" value="무상" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">
                  위치 <span className="text-red-500">*</span>
                </Label>
                <Input id="location" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">요율</Label>
                <div className="relative">
                  <Input id="rate" type="number" step="0.01" className="pr-8 text-right" />
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
                <Label htmlFor="contractDate">
                  계약일 <span className="text-red-500">*</span>
                </Label>
                <Input id="contractDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">도입PJT</Label>
                <Input id="project" value={data?.opportunityName ? `${data.opportunityName} (${data.opportunityId})` : "미선택"} disabled />
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
    </div>
  );
}
