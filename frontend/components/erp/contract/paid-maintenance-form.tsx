"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { ProjectSelector } from "@/components/erp/project/project-selector";
import { type ProjectListResponse } from "@/lib/api/project-api";
import { UserPicker } from "@/components/erp/user-picker";
import { useBackendUsers } from "@/lib/use-backend-users";
import { createMaintenance, type ApiResponse } from "@/lib/api/maintenance";
import type { BackendUserSummary } from "@/lib/workflow-backend";
import { customInstance } from "@/lib/api/customAxios";
import { toast } from "sonner";

export interface PaidMaintenanceFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  inheritedData?: any;
}

export function PaidMaintenanceForm({ onSuccess, onCancel, inheritedData }: PaidMaintenanceFormProps) {
  const [selectedProject, setSelectedProject] = useState<ProjectListResponse | null>(null);
  const users = useBackendUsers();

  // User picker states
  const [salesRep, setSalesRep] = useState<BackendUserSummary | null>(null);
  const [engineerMain, setEngineerMain] = useState<BackendUserSummary | null>(null);
  const [engineerSub, setEngineerSub] = useState<BackendUserSummary | null>(null);
  const [regularPm, setRegularPm] = useState<BackendUserSummary | null>(null);

  // Field states
  const [category, setCategory] = useState<string>("");
  const [isRemote, setIsRemote] = useState<string>("false");
  const [inspectionCycle, setInspectionCycle] = useState<string>("NONE");
  const [importance, setImportance] = useState<string>("MEDIUM");
  const [location, setLocation] = useState<string>("");
  const [rate, setRate] = useState<string>("0");
  const [amount, setAmount] = useState<string>("");
  const [annualAmount, setAnnualAmount] = useState<string>("");
  const [contractDate, setContractDate] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reportSubmitted, setReportSubmitted] = useState<string>("false");

  // Product technical specs
  const [productFamily, setProductFamily] = useState<string>("EMS");
  const [apVersion, setApVersion] = useState<string>("");
  const [apCount, setApCount] = useState<string>("0");
  const [esVersion, setEsVersion] = useState<string>("");
  const [esCount, setEsCount] = useState<string>("0");
  const [dbVersion, setDbVersion] = useState<string>("");
  const [dbHaStatus, setDbHaStatus] = useState<string>("false");
  const [aclPatchStatus, setAclPatchStatus] = useState<string>("false");
  const [vulnPatchStatus, setVulnPatchStatus] = useState<string>("false");
  const [upgradePlan, setUpgradePlan] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  // Attachment state
  const [contractFile, setContractFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Currency commas formatters
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    setAmount(numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  };
  const handleAnnualAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    setAnnualAmount(numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  };

  // Prefill PM and Sales Rep when a project is selected
  const handleSelectProject = (project: ProjectListResponse) => {
    setSelectedProject(project);
    if (project.startDate) setStartDate(project.startDate);
    if (project.endDate) setEndDate(project.endDate);

    // Auto-resolve salesRep and engineerMain from backend users list if names match
    if (project.salesRepresentativeName) {
      const foundSalesRep = users.find((u) => u.name === project.salesRepresentativeName);
      if (foundSalesRep) setSalesRep(foundSalesRep);
    }
    if (project.pmName) {
      const foundPm = users.find((u) => u.name === project.pmName);
      if (foundPm) setEngineerMain(foundPm);
    }

    if (project.totalAmount) {
      setAmount(project.totalAmount.toLocaleString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProject) {
      toast.error("사업을 선택해주세요.");
      return;
    }
    if (!salesRep) {
      toast.error("영업대표를 지정해주세요.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("유지보수 시작일과 종료일은 필수입니다.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload contract file if present
      let uploadedFileId: number | null = null;
      if (contractFile) {
        const formData = new FormData();
        formData.append("file", contractFile);

        const uploadRes = await customInstance<ApiResponse<number>>({
          url: "/files/upload",
          method: "POST",
          data: formData,
          params: { category: "MAINTENANCE_CONTRACT" },
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        if (uploadRes.success || uploadRes.result === "SUCCESS") {
          uploadedFileId = uploadRes.data;
        } else {
          toast.error("계약서 파일 업로드에 실패했습니다.");
          setSubmitting(false);
          return;
        }
      }

      // 2. Submit maintenance registration
      const payload = {
        projectId: selectedProject.id,
        salesRep: salesRep.id,
        managerPrimary: engineerMain?.id || null,
        managerSecondary: engineerSub?.id || null,
        category: category || null,
        type: "PAID",
        contractAmount: parseInt(amount.replace(/,/g, "")) || 0,
        annualAmount: parseInt(annualAmount.replace(/,/g, "")) || 0,
        rate: parseFloat(rate) || 0.0,
        contractDate: contractDate || null,
        startDate: startDate,
        endDate: endDate,
        isRemote: isRemote === "true",
        inspectionCycle,
        importance,
        location: location || null,
        reportSubmitted: reportSubmitted === "true",
        regularPm: regularPm?.id || null,
        productFamily,
        apVersion: apVersion || null,
        apCount: parseInt(apCount) || 0,
        esVersion: esVersion || null,
        esCount: parseInt(esCount) || 0,
        dbVersion: dbVersion || null,
        dbHaStatus: dbHaStatus === "true",
        aclPatchStatus: aclPatchStatus === "true",
        vulnPatchStatus: vulnPatchStatus === "true",
        upgradePlan: upgradePlan || null,
        remarks: remarks || null,
        contractFileId: uploadedFileId,
      };

      const res = await createMaintenance(payload);
      if (res.success || res.result === "SUCCESS") {
        toast.success("유상유지보수 계약이 등록되었습니다.");
        onSuccess();
      } else {
        toast.error(res.message || "등록에 실패했습니다.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="space-y-2 p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-indigo-900">사업(PJT) 연결</h3>
            <p className="text-xs text-indigo-700">유상유지보수 계약 대상이 되는 등록된 사업을 선택해주세요.</p>
          </div>
          <ProjectSelector
            onSelect={handleSelectProject}
            trigger={
              <Button variant="outline" size="sm" className="bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-sm transition-all duration-200">
                <Search className="w-4 h-4 mr-2" />
                {selectedProject ? "사업 변경" : "사업 찾기"}
              </Button>
            }
          />
        </div>
        {selectedProject && (
          <div className="mt-3 text-xs bg-white p-3 rounded-lg border border-indigo-100 shadow-inner flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-indigo-800">[연결됨]</span>
              <span className="text-slate-700 font-medium">
                {selectedProject.projectName} ({selectedProject.customerName})
              </span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 font-bold" onClick={() => setSelectedProject(null)}>
              연결 해제
            </Button>
          </div>
        )}
      </div>

      <Card className="shadow-md border-slate-100 overflow-hidden">
        <CardHeader className="border-b bg-slate-50/75 py-5">
          <CardTitle className="text-lg font-bold text-slate-800">유상유지보수 계약 등록</CardTitle>
          <CardDescription className="text-xs">필수사항 및 사양을 입력하고 별도 계약서 파일을 첨부하세요.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="space-y-8" onSubmit={handleSubmit}>
            {/* 기본 및 관련자 설정 */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-700 border-l-4 border-indigo-500 pl-2">1. 기본 및 관련자 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium">고객사</Label>
                  <Input readOnly value={selectedProject?.customerName || "미선택"} className="bg-slate-50 text-slate-600 font-semibold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium">사업명</Label>
                  <Input readOnly value={selectedProject?.projectName || "미선택"} className="bg-slate-50 text-slate-600 font-semibold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium flex items-center">
                    영업대표 <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <UserPicker value={salesRep?.name ?? ""} users={users} onSelect={setSalesRep} placeholder="이름으로 영업대표 검색" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium">유지보수 담당자 (정)</Label>
                  <UserPicker value={engineerMain?.name ?? ""} users={users} onSelect={setEngineerMain} placeholder="이름으로 검색" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium">유지보수 담당자 (부)</Label>
                  <UserPicker value={engineerSub?.name ?? ""} users={users} onSelect={setEngineerSub} placeholder="이름으로 검색" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium">정기 PM</Label>
                  <UserPicker value={regularPm?.name ?? ""} users={users} onSelect={setRegularPm} placeholder="이름으로 검색" />
                </div>
              </div>
            </div>

            {/* 계약 범위 및 일정 */}
            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-sm font-bold text-slate-700 border-l-4 border-indigo-500 pl-2">2. 계약 범위 및 일정</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-slate-600 font-medium">구분 (카테고리)</Label>
                  <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="예: 공공, 금융, 일반 등" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium">유무상 구분</Label>
                  <Input readOnly value="유상" className="bg-slate-50 text-slate-600 font-semibold" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remote" className="text-slate-600 font-medium">원격 지원 여부</Label>
                  <Select value={isRemote} onValueChange={setIsRemote}>
                    <SelectTrigger id="remote">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">O (예)</SelectItem>
                      <SelectItem value="false">X (아니오)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inspectionCycle" className="text-slate-600 font-medium">점검 주기</Label>
                  <Select value={inspectionCycle} onValueChange={setInspectionCycle}>
                    <SelectTrigger id="inspectionCycle">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">월 (MONTHLY)</SelectItem>
                      <SelectItem value="QUARTERLY">분기 (QUARTERLY)</SelectItem>
                      <SelectItem value="SEMI_ANNUALLY">반기 (SEMI_ANNUALLY)</SelectItem>
                      <SelectItem value="NONE">없음 (NONE)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="importance" className="text-slate-600 font-medium">중요도</Label>
                  <Select value={importance} onValueChange={setImportance}>
                    <SelectTrigger id="importance">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH">상 (HIGH)</SelectItem>
                      <SelectItem value="MEDIUM">중 (MEDIUM)</SelectItem>
                      <SelectItem value="LOW">하 (LOW)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-slate-600 font-medium">설치 위치</Label>
                  <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="예: 목동 IDC, 본사 전산실 등" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate" className="text-slate-600 font-medium">유지보수 요율 (%)</Label>
                  <Input id="rate" type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-slate-600 font-medium flex items-center">
                    계약 금액 <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="relative">
                    <Input id="amount" value={amount} onChange={handleAmountChange} className="pr-8 text-right font-semibold" required />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">원</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annualAmount" className="text-slate-600 font-medium flex items-center">
                    연간 유지보수 금액 <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="relative">
                    <Input id="annualAmount" value={annualAmount} onChange={handleAnnualAmountChange} className="pr-8 text-right font-semibold" required />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">원</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractDate" className="text-slate-600 font-medium">계약일</Label>
                  <Input id="contractDate" type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-slate-600 font-medium flex items-center">
                    계약 시작일 <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-slate-600 font-medium flex items-center">
                    계약 종료일 <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportSubmitted" className="text-slate-600 font-medium">보고서 제출 여부</Label>
                  <Select value={reportSubmitted} onValueChange={setReportSubmitted}>
                    <SelectTrigger id="reportSubmitted">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">O (제출)</SelectItem>
                      <SelectItem value="false">X (미제출)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 제품 기술 명세 */}
            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-sm font-bold text-slate-700 border-l-4 border-indigo-500 pl-2">3. 제품 및 시스템 사양</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-2">
                  <Label htmlFor="productFamily" className="text-slate-600 font-medium">제품군</Label>
                  <Select value={productFamily} onValueChange={setProductFamily}>
                    <SelectTrigger id="productFamily">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMS">EMS</SelectItem>
                      <SelectItem value="ITSM">ITSM</SelectItem>
                      <SelectItem value="Automation">Automation</SelectItem>
                      <SelectItem value="WSS">WSS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apVersion" className="text-slate-600 font-medium">AP 버전</Label>
                  <Input id="apVersion" value={apVersion} onChange={(e) => setApVersion(e.target.value)} placeholder="예: 8.3.2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apCount" className="text-slate-600 font-medium">AP 코어/수량</Label>
                  <Input id="apCount" type="number" min="0" value={apCount} onChange={(e) => setApCount(e.target.value)} className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="esVersion" className="text-slate-600 font-medium">ES 버전</Label>
                  <Input id="esVersion" value={esVersion} onChange={(e) => setEsVersion(e.target.value)} placeholder="예: 7.10.2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="esCount" className="text-slate-600 font-medium">ES 노드/수량</Label>
                  <Input id="esCount" type="number" min="0" value={esCount} onChange={(e) => setEsCount(e.target.value)} className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dbVersion" className="text-slate-600 font-medium">DB 버전</Label>
                  <Input id="dbVersion" value={dbVersion} onChange={(e) => setDbVersion(e.target.value)} placeholder="예: PostgreSQL 14" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dbHaStatus" className="text-slate-600 font-medium">DB HA 여부</Label>
                  <Select value={dbHaStatus} onValueChange={setDbHaStatus}>
                    <SelectTrigger id="dbHaStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">O (Active-Standby 등)</SelectItem>
                      <SelectItem value="false">X (Single)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aclPatchStatus" className="text-slate-600 font-medium">ACL 패치 여부</Label>
                  <Select value={aclPatchStatus} onValueChange={setAclPatchStatus}>
                    <SelectTrigger id="aclPatchStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">O (패치됨)</SelectItem>
                      <SelectItem value="false">X (미패치)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vulnPatchStatus" className="text-slate-600 font-medium">취약점 패치 여부</Label>
                  <Select value={vulnPatchStatus} onValueChange={setVulnPatchStatus}>
                    <SelectTrigger id="vulnPatchStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">O (패치됨)</SelectItem>
                      <SelectItem value="false">X (미패치)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upgradePlan" className="text-slate-600 font-medium">LTS 업그레이드 계획</Label>
                  <Input id="upgradePlan" value={upgradePlan} onChange={(e) => setUpgradePlan(e.target.value)} placeholder="예: 2026년 4분기 업그레이드 예정" />
                </div>
              </div>
            </div>

            {/* 계약 파일 업로드 및 비고 */}
            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-sm font-bold text-slate-700 border-l-4 border-indigo-500 pl-2">4. 첨부파일 및 특이사항</h3>
              <div className="grid grid-cols-1 gap-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contractFile" className="text-slate-600 font-medium">계약서 첨부파일</Label>
                  <Input id="contractFile" type="file" className="cursor-pointer" onChange={(e) => setContractFile(e.target.files?.[0] || null)} />
                  <p className="text-xs text-muted-foreground mt-0.5">PDF, DOCX 등 스캔본 파일을 업로드할 수 있습니다.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remarks" className="text-slate-600 font-medium">비고</Label>
                  <Textarea id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} placeholder="계약 관련 특이사항 혹은 이력 사항 기재" />
                </div>
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={onCancel} className="w-24" disabled={submitting}>
                취소
              </Button>
              <Button type="submit" className="w-28 bg-indigo-600 hover:bg-indigo-700" disabled={submitting}>
                {submitting ? "등록 중..." : "등록 완료"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
