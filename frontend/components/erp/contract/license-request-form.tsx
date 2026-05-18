"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { productData } from "@/lib/product-data";
import { licenseApi, type LicenseRequest, type LicenseType } from "@/lib/api/contract-api";
import { toast } from "sonner";
import { CustomerAutocomplete } from "@/components/erp/entity-customer-autocomplete";
import { type CustomerRecord } from "@/lib/finding-data";
import { EntityAutocomplete } from "@/components/erp/entity-autocomplete";
import { type EntitySuggestion } from "@/lib/entity-suggestions-api";
import { currentUser } from "@/lib/current-user";
import { adminApi } from "@/lib/api/admin-api";

export interface LicenseRequestFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  inheritedData?: {
    customerId?: string;
    customerName?: string;
    customerCompanyId?: number;
    opportunityId?: string;
    opportunityName?: string;
  } | null;
}

interface ModuleRow {
  id: number;
  productModuleId: string;
  category: string;
  group: string;
  module: string;
  quantity: number | string;
  licenseType: LicenseType | "";
  startDate: string;
  endDate: string;
}

export function LicenseRequestForm({ onSuccess, onCancel, inheritedData }: LicenseRequestFormProps) {
  const [customerCompanyId, setCustomerCompanyId] = useState<string>(inheritedData?.customerCompanyId?.toString() || "");
  const [customerName, setCustomerName] = useState<string>(inheritedData?.customerName || "");
  const [opportunityName, setOpportunityName] = useState<string>(inheritedData?.opportunityName || "");
  const [opportunityId, setOpportunityId] = useState<string>(inheritedData?.opportunityId || "");
  const [remarks, setRemarks] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbProducts, setDbProducts] = useState<any[]>([]);

  useEffect(() => {
    adminApi
      .getProducts()
      .then((res) => {
        setDbProducts(res.data || []);
      })
      .catch(console.error);
  }, []);

  const handleCustomerSelect = (customer: CustomerRecord | null) => {
    if (customer) {
      setCustomerName(customer.name);
      setCustomerCompanyId(customer.backendId?.toString() || "");
      setOpportunityName("");
      setOpportunityId("");
    } else {
      setCustomerName("");
      setCustomerCompanyId("");
      setOpportunityName("");
      setOpportunityId("");
    }
  };

  const handleOpportunitySelect = (suggestion: EntitySuggestion | null) => {
    if (suggestion) {
      setOpportunityName(suggestion.label);
      setOpportunityId(suggestion.id.toString());
    } else {
      setOpportunityName("");
      setOpportunityId("");
    }
  };

  const today = new Date().toISOString().split("T")[0];

  const [modules, setModules] = useState<ModuleRow[]>([
    {
      id: 1,
      productModuleId: "",
      category: "",
      group: "",
      module: "",
      quantity: "",
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
        quantity: "",
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
          } else if (field === "module") {
            const matched = dbProducts.find((p) => p.productClass === m.category && p.productGroup === m.group && p.productName === value);
            if (matched) {
              newMod.productModuleId = matched.id.toString();
            } else {
              newMod.productModuleId = "";
            }
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

    const currentOpportunityName = inheritedData?.opportunityName ?? opportunityName;
    if (!currentOpportunityName) {
      toast.error("사업명을 입력해 주세요.");
      return;
    }

    // 각 라이선스 행의 수량 검증
    for (let i = 0; i < modules.length; i++) {
      const m = modules[i];
      const q = typeof m.quantity === "number" ? m.quantity : parseInt(m.quantity);
      if (isNaN(q) || q <= 0) {
        toast.error(`${i + 1}번째 라이선스의 수량을 올바르게 입력해주세요.`);
        return;
      }
    }

    // 각 모듈마다 별도의 라이선스 생성 요청
    const validModules = modules.filter((m) => {
      const q = typeof m.quantity === "number" ? m.quantity : parseInt(m.quantity);
      return m.productModuleId && !isNaN(q) && q > 0 && m.licenseType && m.startDate;
    });

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
            quantity: typeof m.quantity === "number" ? m.quantity : parseInt(m.quantity) || 1,
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
    <Card className="w-full shadow-sm mt-8">
      <CardHeader className="border-b bg-muted/20">
        <CardTitle className="text-xl">라이선스 발행 요청</CardTitle>
        <CardDescription className="mt-1">정식 구매 또는 임시 사용(BMT, PoC 등)을 위한 라이선스 발행을 요청합니다. 결재 프로세스가 완료되면 자동으로 라이선스가 생성됩니다.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="customerName">
                고객사 <span className="text-red-500">*</span>
              </Label>
              {inheritedData?.customerName ? (
                <Input id="customerName" value={inheritedData.customerName} readOnly placeholder="고객사명" className="bg-muted/30" />
              ) : (
                <CustomerAutocomplete value={customerName} onSelect={handleCustomerSelect} onValueChange={setCustomerName} placeholder="고객사명을 검색하여 선택하세요" />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="opportunityName">
                사업명 <span className="text-red-500">*</span>
              </Label>
              {inheritedData?.opportunityName ? (
                <Input id="opportunityName" value={inheritedData.opportunityName} readOnly placeholder="사업명" className="bg-muted/30" />
              ) : (
                <EntityAutocomplete
                  value={opportunityName}
                  target="opportunities"
                  onValueChange={setOpportunityName}
                  onSelect={handleOpportunitySelect}
                  disabled={!customerName}
                  placeholder={customerName ? "사업명을 입력하세요" : "고객사를 먼저 선택하세요"}
                  emptyMessage="등록된 사업기회가 없습니다."
                  filterSuggestion={(suggestion) =>
                    !customerName ||
                    [suggestion.metadata?.customerCompanyName, suggestion.metadata?.customerName]
                      .filter((value): value is string => typeof value === "string")
                      .some((value) => value.trim().toLowerCase() === customerName.trim().toLowerCase())
                  }
                />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">
                요청 라이선스 제품 모듈 및 수량 <span className="text-red-500">*</span>
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddModule}>
                <Plus className="w-4 h-4 mr-2" />
                추가
              </Button>
            </div>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[1100px] table-fixed">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 font-medium w-[14%]">제품분류</th>
                    <th className="px-3 py-3 font-medium w-[20%]">제품군</th>
                    <th className="px-3 py-3 font-medium w-[28%]">제품명</th>
                    <th className="px-3 py-3 font-medium w-[6%]">수량</th>
                    <th className="px-3 py-3 font-medium w-[8%]">라이선스유형</th>
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
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={mod.quantity}
                          onChange={(e) => {
                            const cleanVal = e.target.value.replace(/[^0-9]/g, "");
                            handleModuleChange(mod.id, "quantity", cleanVal);
                          }}
                          required
                          className="text-center"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Select value={mod.licenseType} onValueChange={(val) => handleModuleChange(mod.id, "licenseType", val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="유형" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERMANENT">영구</SelectItem>
                            <SelectItem value="SUBSCRIPTION">구독</SelectItem>
                            <SelectItem value="TRIAL">임시</SelectItem>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">기타 특기 사항</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="라이선스 발행과 관련된 요청사항이나 특기 사항을 입력해주세요 (예: BMT 테스트용 라이선스 발급 요청)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-6 p-4 rounded-lg bg-muted/30 border">
            <div className="space-y-2">
              <Label className="text-muted-foreground">요청일</Label>
              <div className="font-medium">{today}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">요청자</Label>
              <div className="font-medium">
                {currentUser.name} ({currentUser.role})
              </div>
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
