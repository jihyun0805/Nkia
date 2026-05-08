"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface LicenseRequestFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  inheritedData?: {
    customerId?: string;
    customerName?: string;
    opportunityId?: string;
    opportunityName?: string;
  } | null;
}

export function LicenseRequestForm({ onSuccess, onCancel, inheritedData }: LicenseRequestFormProps) {
  const [customerName, setCustomerName] = useState(inheritedData?.customerName || "");
  const [projectName, setProjectName] = useState(inheritedData?.opportunityName || "");
  const [notes, setNotes] = useState("");
  
  // 모듈 목록 상태
  const [modules, setModules] = useState([
    { id: 1, product: "", module: "", quantity: 1 }
  ]);

  // 오늘 날짜 포맷팅 (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];
  const requester = "현재 로그인 사용자"; // TODO: 실제 로그인 사용자로 변경 필요

  const handleAddModule = () => {
    setModules([...modules, { id: Date.now(), product: "", module: "", quantity: 1 }]);
  };

  const handleRemoveModule = (id: number) => {
    if (modules.length > 1) {
      setModules(modules.filter(m => m.id !== id));
    }
  };

  const handleModuleChange = (id: number, field: string, value: any) => {
    setModules(modules.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("라이선스 발행 요청이 접수되었습니다. 결재 완료 후 시스템에서 라이선스가 자동 발행됩니다.");
    onSuccess();
  };

  return (
    <Card className="max-w-4xl mx-auto shadow-sm mt-8">
      <CardHeader className="border-b bg-muted/20">
        <CardTitle className="text-xl">라이선스 발행 요청</CardTitle>
        <CardDescription className="mt-1">
          정식 구매 또는 임시 사용(BMT, PoC 등)을 위한 라이선스 발행을 요청합니다. 결재 프로세스가 완료되면 자동으로 라이선스가 생성됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="customerName">고객사 <span className="text-red-500">*</span></Label>
              <Input 
                id="customerName" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                required 
                placeholder="고객사명을 입력하세요" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectName">사업명 <span className="text-red-500">*</span></Label>
              <Input 
                id="projectName" 
                name="projectName"
                value={projectName} 
                onChange={(e) => setProjectName(e.target.value)} 
                required 
                placeholder="사업명(프로젝트명)을 입력하세요" 
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">요청 라이선스 제품 모듈 및 수량 <span className="text-red-500">*</span></Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddModule}>
                <Plus className="w-4 h-4 mr-2" />
                모듈 추가
              </Button>
            </div>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">제품군</th>
                    <th className="px-4 py-3 font-medium">모듈명</th>
                    <th className="px-4 py-3 font-medium w-32">수량</th>
                    <th className="px-4 py-3 font-medium w-16 text-center">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {modules.map((mod) => (
                    <tr key={mod.id} className="bg-card">
                      <td className="px-4 py-2">
                        <Select value={mod.product} onValueChange={(val) => handleModuleChange(mod.id, "product", val)} required>
                          <SelectTrigger>
                            <SelectValue placeholder="제품군 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ems">EMS</SelectItem>
                            <SelectItem value="itsm">ITSM</SelectItem>
                            <SelectItem value="automation">Automation</SelectItem>
                            <SelectItem value="wss">WSS</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2">
                        <Input 
                          placeholder="모듈명 입력" 
                          value={mod.module}
                          onChange={(e) => handleModuleChange(mod.id, "module", e.target.value)}
                          required
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input 
                          type="number" 
                          min="1" 
                          value={mod.quantity}
                          onChange={(e) => handleModuleChange(mod.id, "quantity", parseInt(e.target.value) || 1)}
                          required
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
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

          <div className="grid grid-cols-2 gap-6 p-4 rounded-lg bg-muted/30 border">
            <div className="space-y-2">
              <Label>요청일 (자동 입력)</Label>
              <div className="font-medium">{today}</div>
            </div>
            <div className="space-y-2">
              <Label>요청자 (자동 입력)</Label>
              <div className="font-medium">{requester}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">기타 특기 사항</Label>
            <Textarea 
              id="notes" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="임시 라이선스 요청 사유(PoC, BMT 등), 사용 기한 등 특기 사항을 입력하세요."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} className="w-24">
              취소
            </Button>
            <Button type="submit" className="w-24">
              요청 등록
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
