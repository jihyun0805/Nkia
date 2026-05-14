"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, FileText, ArrowRight, Loader2 } from "lucide-react";
import { contractApi, type ContractRequest, type ProposalType } from "@/lib/api/contract-api";
import { toast } from "sonner";

export interface ContractFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  inheritedData?: {
    customerId?: string;
    customerName?: string;
    opportunityId?: string;
    opportunityName?: string;
    orderReportId?: string | number;
    orderReportNumericId?: number;
  } | null;
}

export function ContractForm({ onSuccess, onCancel, inheritedData }: ContractFormProps) {
  const [amount, setAmount] = useState<string>("");
  const [contractDate, setContractDate] = useState<string>("");
  const [maintenanceCondition, setMaintenanceCondition] = useState<string>("");
  const [salesRepId, setSalesRepId] = useState<string>("");
  const [proposalType, setProposalType] = useState<ProposalType | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    setAmount(formattedValue);
  };

  // 필수 데이터 없으면 안내
  if (!inheritedData || !inheritedData.customerId || !inheritedData.opportunityId) {
    return (
      <Card className="max-w-2xl mx-auto mt-8 border-amber-200 bg-amber-50/50">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500" />
          <h2 className="text-xl font-bold text-amber-700">고객사 및 사업기회 정보가 필요합니다</h2>
          <p className="text-center text-amber-600/80">
            계약 등록은 앞 단계에서 등록된 고객사 및 사업기회 코드를 기반으로 진행됩니다.
            <br />
            먼저 고객사와 사업기회를 등록해 주세요.
          </p>
          <div className="flex gap-4 mt-4">
            <Button variant="outline" onClick={onCancel}>
              목록으로 돌아가기
            </Button>
            <Button asChild>
              <Link href="/finding">사업기회 등록하러 가기</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = inheritedData;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const orderReportNumericId = data.orderReportNumericId ?? (data.orderReportId ? parseInt(String(data.orderReportId).replace(/\D/g, "")) || undefined : undefined);

    if (!orderReportNumericId) {
      toast.error("연결된 수주보고서 ID가 없습니다. 수주보고서를 먼저 등록해주세요.");
      return;
    }
    if (!proposalType) {
      toast.error("제안 유형을 선택해주세요.");
      return;
    }
    if (!salesRepId) {
      toast.error("영업대표 ID를 입력해주세요.");
      return;
    }

    const payload: ContractRequest = {
      orderReportId: orderReportNumericId,
      proposalType: proposalType as ProposalType,
      contractAmount: parseInt(amount.replace(/,/g, "")) || 0,
      contractDate,
      maintenanceCondition,
      salesRepresentativeId: salesRepId,
      contractModuleItems: [],
    };

    setIsSubmitting(true);
    try {
      await contractApi.createContract(payload);
      toast.success("계약이 등록되었습니다.");
      onSuccess();
    } catch (error: any) {
      const message = error?.response?.data?.message || "계약 등록에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">계약 등록</CardTitle>
            <CardDescription className="mt-1">필수사항을 시스템에 입력하고, 별도 계약서 파일을 첨부파일로 업로드합니다.</CardDescription>
          </div>
          {data.orderReportId && (
            <Button variant="outline" size="sm" asChild className="gap-2 text-primary">
              <Link href={`/contract/orders/${data.orderReportNumericId ?? data.orderReportId}`}>
                <FileText className="w-4 h-4" />
                수주보고서 조회 <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* 승계 정보 (수정 불가) */}
          <div className="grid grid-cols-2 gap-6 p-4 rounded-lg bg-muted/30 border">
            <div className="space-y-2">
              <Label className="text-muted-foreground">고객사</Label>
              <div className="font-medium">
                {data.customerName} <span className="text-xs text-muted-foreground ml-1">({data.customerId})</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">사업명(사업기회)</Label>
              <div className="font-medium">
                {data.opportunityName} <span className="text-xs text-muted-foreground ml-1">({data.opportunityId})</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* 제안 유형 */}
            <div className="space-y-2">
              <Label htmlFor="proposalType">
                제안 유형 <span className="text-red-500">*</span>
              </Label>
              <Select required value={proposalType} onValueChange={(v) => setProposalType(v as ProposalType)}>
                <SelectTrigger id="proposalType">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SELF">자체 제안</SelectItem>
                  <SelectItem value="SI">SI 제안</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* 영업대표 */}
            <div className="space-y-2">
              <Label htmlFor="salesRep">
                영업대표 ID (UUID) <span className="text-red-500">*</span>
              </Label>
              <Input id="salesRep" required placeholder="영업대표 UUID를 입력하세요" value={salesRepId} onChange={(e) => setSalesRepId(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* 계약 금액 */}
            <div className="space-y-2">
              <Label htmlFor="amount">
                계약 금액 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input id="amount" type="text" placeholder="0" className="pr-8 text-right" required value={amount} onChange={handleAmountChange} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
              </div>
            </div>
            {/* 계약일 */}
            <div className="space-y-2">
              <Label htmlFor="contractDate">
                계약일 <span className="text-red-500">*</span>
              </Label>
              <Input id="contractDate" type="date" required value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
            </div>
          </div>

          {/* 무상유지보수 조건 */}
          <div className="space-y-2">
            <Label htmlFor="maintenance">무상유지보수 조건</Label>
            <Input id="maintenance" placeholder="예: 납품 후 1년" value={maintenanceCondition} onChange={(e) => setMaintenanceCondition(e.target.value)} />
          </div>

          {/* 첨부파일 (계약서) - 파일 업로드는 별도 구현 필요 */}
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="contractFile">계약서 첨부파일</Label>
            <Input id="contractFile" type="file" className="cursor-pointer" />
            <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, JPG 등 원본 스캔본 또는 전자계약 문서를 첨부하세요.</p>
          </div>

          <div className="flex justify-end gap-3 pt-6 mt-8">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="w-24">
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-24">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              계약 등록
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
