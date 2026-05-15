"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, FileText, ArrowRight, Search } from "lucide-react";
import { OrderReportSelector } from "@/components/erp/contract/order-report-selector";
import { type OrderReportListResponse } from "@/lib/api/contract-api";
import { UserPicker } from "@/components/erp/user-picker";
import { useBackendUsers } from "@/lib/use-backend-users";
import type { BackendUserSummary } from "@/lib/workflow-backend";

export interface PurchaseFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  inheritedData?: {
    customerId: string;
    customerName: string;
    opportunityId: string;
    opportunityName: string;
    orderReportId?: string; // 수주보고서 ID
  } | null;
}

export function PurchaseForm({ onSuccess, onCancel, inheritedData }: PurchaseFormProps) {
  const [data, setData] = useState<any>(inheritedData);
  const [amount, setAmount] = useState<string>("");
  const users = useBackendUsers();
  const [salesRep, setSalesRep] = useState<BackendUserSummary | null>(null);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 숫자만 추출하여 천 단위 콤마 추가
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    setAmount(formattedValue);
  };

  // 선택된 데이터가 없으면 수주보고서 선택 유도
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-blue-900">수주보고서 연결</h3>
            <p className="text-xs text-blue-700">매입계약 등록의 기반이 되는 수주보고서를 선택해주세요.</p>
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
                {data?.orderReportId ? "수주보고서 변경" : "수주보고서 찾기"}
              </Button>
            }
          />
        </div>
        {data?.orderReportId && (
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">매입계약 등록</CardTitle>
              <CardDescription className="mt-1">필수사항을 시스템에 입력하고, 별도 계약서 파일을 첨부파일로 업로드합니다.</CardDescription>
            </div>
            {data?.orderReportId && (
              <Button variant="outline" size="sm" asChild className="gap-2 text-primary">
                <Link href={`/contract/order/${data.orderReportId}`}>
                  <FileText className="w-4 h-4" />
                  수주보고서 조회 <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              onSuccess();
            }}
          >
            {/* 고객사, 사업명(사업기회) */}
            <div className="grid grid-cols-2 gap-6 p-4 rounded-lg bg-muted/30 border">
              <div className="space-y-2">
                <Label className="text-muted-foreground">고객사</Label>
                <div className="font-medium">
                  {data?.customerName || "미선택"} {data?.customerId && <span className="text-xs text-muted-foreground ml-1">({data.customerId})</span>}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">사업명(사업기회)</Label>
                <div className="font-medium">
                  {data?.opportunityName || "미선택"} {data?.opportunityId && <span className="text-xs text-muted-foreground ml-1">({data.opportunityId})</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* 매입 품목 */}
              <div className="space-y-2">
                <Label htmlFor="purchaseItem">
                  매입 품목 <span className="text-red-500">*</span>
                </Label>
                <Input id="purchaseItem" required />
              </div>
              {/* 계약 금액 */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  계약 금액 <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input id="amount" type="text" className="pr-8 text-right" required value={amount} onChange={handleAmountChange} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* 계약일 */}
              <div className="space-y-2">
                <Label htmlFor="contractDate">
                  계약일 <span className="text-red-500">*</span>
                </Label>
                <Input id="contractDate" type="date" required />
              </div>
              {/* 영업대표 */}
              <div className="space-y-2">
                <Label htmlFor="salesRep">
                  영업대표 <span className="text-red-500">*</span>
                </Label>
                <UserPicker
                  value={salesRep?.name ?? ""}
                  users={users}
                  onSelect={setSalesRep}
                  placeholder="이름으로 영업대표를 검색하세요"
                />
                <input type="hidden" name="salesRepId" value={salesRep?.id ?? ""} required />
              </div>
            </div>

            {/* 첨부파일 */}
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="contractFile">
                계약서 첨부파일 <span className="text-red-500">*</span>
              </Label>
              <Input id="contractFile" type="file" required className="cursor-pointer" />
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, JPG 등 원본 스캔본 또는 전자계약 문서를 첨부하세요.</p>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-8">
              <Button type="button" variant="outline" onClick={onCancel} className="w-24">
                취소
              </Button>
              <Button type="submit" className="w-24">
                매입계약 등록
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
