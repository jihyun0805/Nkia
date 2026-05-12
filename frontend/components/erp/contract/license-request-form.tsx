"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { productData } from "@/lib/product-data";
import { licenseApi, type LicenseRequest, type LicenseType } from "@/lib/api/contract-api";
import { toast } from "sonner";

export interface LicenseRequestFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  inheritedData?: {
    customerId?: string;
    customerName?: string;
    customerCompanyId?: number; // 백엔드 숫자 ID
    opportunityId?: string;
    opportunityName?: string;
  } | null;
}

interface ModuleRow {
  id: number;
  productModuleId: string; // 백엔드 productModuleId
  category: string;
  group: string;
  module: string;
  quantity: number;
  licenseType: LicenseType | "";
  startDate: string;
  endDate: string;
}

export function LicenseRequestForm({ onSuccess, onCancel, inheritedData }: LicenseRequestFormProps) {
  const [customerCompanyId, setCustomerCompanyId] = useState<string>(inheritedData?.customerCompanyId?.toString() || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const [modules, setModules] = useState<ModuleRow[]>([
    {
      id: 1,
      productModuleId: "",
      category: "",
      group: "",
      module: "",
      quantity: 1,
      licenseType: "",
      startDate: today,
      endDate: "",
    },
  ]);

  const handleAddModule = () => {
    setModules([
      ...modules,
      {
        id: Date.now(),
        productModuleId: "",
        category: "",
        group: "",
        module: "",
        quantity: 1,
        licenseType: "",
        startDate: today,
        endDate: "",
      },
    ]);
  };

  const handleRemoveModule = (id: number) => {
    if (modules.length > 1) {
      setModules(modules.filter((m) => m.id !== id));
    }
  };

  const handleModuleChange = (id: number, field: string, value: any) => {
    setModules(
      modules.map((m) => {
        if (m.id === id) {
          const newMod = { ...m, [field]: value };
          if (field === "category") {
            newMod.group = "";
            newMod.module = "";
            newMod.productModuleId = "";
          } else if (field === "group") {
            newMod.module = "";
            newMod.productModuleId = "";
          }
          return newMod;
        }
        return m;
      }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const companyId = inheritedData?.customerCompanyId ?? parseInt(customerCompanyId);
    if (!companyId || isNaN(companyId)) {
      toast.error("고객사 ID(숫자)를 확인할 수 없습니다.");
      return;
    }

    // 각 모듈마다 별도의 라이선스 생성 요청
    const validModules = modules.filter((m) => m.productModuleId && m.quantity > 0 && m.licenseType && m.startDate);
    if (validModules.length === 0) {
      toast.error("라이선스 요청 정보를 올바르게 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.all(
        validModules.map((m) => {
          const payload: LicenseRequest = {
            productModuleId: parseInt(m.productModuleId),
            quantity: m.quantity,
            licenseType: m.licenseType as LicenseType,
            customerCompanyId: companyId,
            startDate: m.startDate,
            endDate: m.endDate || m.startDate,
          };
          return licenseApi.createLicense(payload);
        }),
      );
      toast.success(`라이선스 ${validModules.length}건이 요청되었습니다. 결재 완료 후 자동 발행됩니다.`);
      onSuccess();
    } catch (error: any) {
      const message = error?.response?.data?.message || "라이선스 요청에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-5xl mx-auto shadow-sm mt-8">
      <CardHeader className="border-b bg-muted/20">
        <CardTitle className="text-xl">라이선스 발행 요청</CardTitle>
        <CardDescription className="mt-1">정식 구매 또는 임시 사용(BMT, PoC 등)을 위한 라이선스 발행을 요청합니다. 결재 프로세스가 완료되면 자동으로 라이선스가 생성됩니다.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="customerName">고객사</Label>
              <Input
                id="customerName"
                value={inheritedData?.customerName || ""}
                readOnly={!!inheritedData?.customerName}
                placeholder="고객사명"
                className={inheritedData?.customerName ? "bg-muted/30" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerCompanyId">
                고객사 ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerCompanyId"
                type="number"
                min="1"
                required
                value={customerCompanyId}
                onChange={(e) => setCustomerCompanyId(e.target.value)}
                readOnly={!!inheritedData?.customerCompanyId}
                placeholder="백엔드 고객사 숫자 ID"
                className={inheritedData?.customerCompanyId ? "bg-muted/30" : ""}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">
                요청 라이선스 목록 <span className="text-red-500">*</span>
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddModule}>
                <Plus className="w-4 h-4 mr-2" />
                모듈 추가
              </Button>
            </div>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 font-medium w-[14%]">제품분류</th>
                    <th className="px-3 py-3 font-medium w-[18%]">제품군</th>
                    <th className="px-3 py-3 font-medium w-[22%]">제품명</th>
                    <th className="px-3 py-3 font-medium w-[10%]">수량</th>
                    <th className="px-3 py-3 font-medium w-[12%]">라이선스유형</th>
                    <th className="px-3 py-3 font-medium w-[10%]">시작일</th>
                    <th className="px-3 py-3 font-medium w-[10%]">종료일</th>
                    <th className="px-3 py-3 font-medium w-[4%] text-center">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {modules.map((mod) => (
                    <tr key={mod.id} className="bg-card">
                      <td className="px-2 py-2">
                        <Select value={mod.category} onValueChange={(val) => handleModuleChange(mod.id, "category", val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="분류 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(productData).map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2">
                        <Select value={mod.group} onValueChange={(val) => handleModuleChange(mod.id, "group", val)} disabled={!mod.category}>
                          <SelectTrigger>
                            <SelectValue placeholder="제품군 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {mod.category &&
                              Object.keys(productData[mod.category] || {}).map((grp) => (
                                <SelectItem key={grp} value={grp}>
                                  {grp}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2">
                        <Select value={mod.module} onValueChange={(val) => handleModuleChange(mod.id, "module", val)} disabled={!mod.group}>
                          <SelectTrigger>
                            <SelectValue placeholder="제품명 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {mod.category &&
                              mod.group &&
                              (productData[mod.category]?.[mod.group] || []).map((m) => (
                                <SelectItem key={m} value={m}>
                                  {m}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2">
                        <Input type="number" min="1" value={mod.quantity} onChange={(e) => handleModuleChange(mod.id, "quantity", parseInt(e.target.value) || 1)} required />
                      </td>
                      <td className="px-2 py-2">
                        <Select value={mod.licenseType} onValueChange={(val) => handleModuleChange(mod.id, "licenseType", val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="유형" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERMANENT">영구</SelectItem>
                            <SelectItem value="SUBSCRIPTION">구독</SelectItem>
                            <SelectItem value="TRIAL">임시(Trial)</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2">
                        <Input type="date" value={mod.startDate} onChange={(e) => handleModuleChange(mod.id, "startDate", e.target.value)} required />
                      </td>
                      <td className="px-2 py-2">
                        <Input type="date" value={mod.endDate} min={mod.startDate} onChange={(e) => handleModuleChange(mod.id, "endDate", e.target.value)} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveModule(mod.id)}
                          disabled={modules.length === 1}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">* 제품 모듈 ID는 제품명 선택 후 자동 매핑됩니다. productModuleId 직접 입력이 필요한 경우 담당자에게 문의하세요.</p>
          </div>

          <div className="p-4 rounded-lg bg-muted/30 border">
            <div className="space-y-2">
              <Label>요청일 (자동)</Label>
              <div className="font-medium">{today}</div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="w-24">
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-24">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              요청 등록
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
