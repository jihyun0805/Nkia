"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMaintenanceCategoryLabel, type MaintenanceCategory } from "@/lib/maintenance-data";
import { getMaintenanceDetail, updateMaintenance, type MaintenanceDetailResponse, type ApiResponse } from "@/lib/api/maintenance";
import { UserPicker } from "@/components/erp/user-picker";
import { useBackendUsers } from "@/lib/use-backend-users";
import type { BackendUserSummary } from "@/lib/workflow-backend";
import { customInstance } from "@/lib/api/customAxios";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function MaintenanceEditPage() {
  const params = useParams();
  const router = useRouter();
  const category = params.category as MaintenanceCategory;
  const id = params.id as string;

  const users = useBackendUsers();

  const [item, setItem] = useState<MaintenanceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // User picker states
  const [salesRep, setSalesRep] = useState<BackendUserSummary | null>(null);
  const [engineerMain, setEngineerMain] = useState<BackendUserSummary | null>(null);
  const [engineerSub, setEngineerSub] = useState<BackendUserSummary | null>(null);
  const [regularPm, setRegularPm] = useState<BackendUserSummary | null>(null);

  // Form field states
  const [mCategory, setMCategory] = useState<string>("");
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

  // Currency commas formatting helper
  const formatComma = (val: number | string | null) => {
    if (val === null || val === undefined) return "";
    const numericValue = val.toString().replace(/[^0-9]/g, "");
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const numericId = parseInt(id.split("-").pop() || id);
        if (isNaN(numericId)) {
          setError("올바르지 않은 상세 번호입니다.");
          setLoading(false);
          return;
        }

        const response = await getMaintenanceDetail(numericId);
        if (response.success || response.result === "SUCCESS") {
          const d = response.data;
          setItem(d);

          // Populate basic inputs
          setMCategory(d.category || "");
          setIsRemote(d.isRemote ? "true" : "false");
          setInspectionCycle(d.inspectionCycle || "NONE");
          setImportance(d.importance || "MEDIUM");
          setLocation(d.location || "");
          setRate(d.rate?.toString() || "0");
          setAmount(formatComma(d.contractAmount));
          setAnnualAmount(formatComma(d.annualAmount));
          setContractDate(d.contractDate || "");
          setStartDate(d.startDate || "");
          setEndDate(d.endDate || "");
          setReportSubmitted(d.reportSubmitted ? "true" : "false");

          // Populate specs
          setProductFamily(d.productFamily || "EMS");
          setApVersion(d.apVersion || "");
          setApCount(d.apCount?.toString() || "0");
          setEsVersion(d.esVersion || "");
          setEsCount(d.esCount?.toString() || "0");
          setDbVersion(d.dbVersion || "");
          setDbHaStatus(d.dbHaStatus ? "true" : "false");
          setAclPatchStatus(d.aclPatchStatus ? "true" : "false");
          setVulnPatchStatus(d.vulnPatchStatus ? "true" : "false");
          setUpgradePlan(d.upgradePlan || "");
          setRemarks(d.remarks || "");
        } else {
          setError(response.message || "정보를 불러오지 못했습니다.");
        }
      } catch (err: any) {
        console.error("Fetch Error:", err);
        setError("유지보수 상세 정보를 가져오는 도중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [category, id]);

  // Resolve users once users list loads
  useEffect(() => {
    if (users.length > 0 && item) {
      if (item.salesRepName) {
        const u = users.find((x) => x.name === item.salesRepName);
        if (u) setSalesRep(u);
      }
      if (item.managerPrimaryName) {
        const u = users.find((x) => x.name === item.managerPrimaryName);
        if (u) setEngineerMain(u);
      }
      if (item.managerSecondaryName) {
        const u = users.find((x) => x.name === item.managerSecondaryName);
        if (u) setEngineerSub(u);
      }
      if (item.regularPm) {
        const u = users.find((x) => x.name === item.regularPm);
        if (u) setRegularPm(u);
      }
    }
  }, [users, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!item) return;
    if (!salesRep) {
      toast.error("영업대표는 필수입니다.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("시작일과 종료일은 필수입니다.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload contract file if a new file is chosen
      let uploadedFileId = item.contractFileId;
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
          toast.error("새 계약서 첨부파일 업로드에 실패했습니다.");
          setSubmitting(false);
          return;
        }
      }

      // 2. Submit update payload
      const payload = {
        salesRep: salesRep.id,
        managerPrimary: engineerMain?.id || null,
        managerSecondary: engineerSub?.id || null,
        category: mCategory || null,
        isRemote: isRemote === "true",
        inspectionCycle: item.type === "PAID" ? inspectionCycle : null,
        importance,
        type: item.type, // FREE or PAID
        location: location || null,
        rate: parseFloat(rate) || 0.0,
        contractAmount: parseInt(amount.replace(/,/g, "")) || 0,
        annualAmount: parseInt(annualAmount.replace(/,/g, "")) || 0,
        contractDate: contractDate || null,
        startDate: startDate,
        endDate: endDate,
        reportSubmitted: reportSubmitted === "true",
        regularPm: regularPm?.id || null,
        productFamily,
        apVersion: apVersion || null,
        aclPatchStatus: aclPatchStatus === "true",
        vulnPatchStatus: vulnPatchStatus === "true",
        upgradePlan: upgradePlan || null,
        apCount: parseInt(apCount) || 0,
        esCount: parseInt(esCount) || 0,
        esVersion: esVersion || null,
        dbHaStatus: dbHaStatus === "true",
        dbVersion: dbVersion || null,
        remarks: remarks || null,
        contractFileId: uploadedFileId,
      };

      const numericId = parseInt(id.split("-").pop() || id);
      const res = await updateMaintenance(numericId, payload);
      if (res.success || res.result === "SUCCESS") {
        toast.success("유지보수 정보가 성공적으로 수정되었습니다.");
        router.push(`/maintenance/${category}/${id}`);
      } else {
        toast.error(res.message || "수정에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      toast.error("수정하는 도중 에러가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="로딩 중..." description="상세 정보를 가져오고 있습니다" />
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-medium">유지보수 정보를 불러오는 중...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="오류" description="정보를 불러오지 못했습니다" />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="flex flex-col items-center gap-4 text-center max-w-md bg-white p-8 rounded-xl border shadow-sm">
              <AlertCircle className="w-12 h-12 text-destructive" />
              <p className="text-xl font-bold">{error || "유지보수 계약 정보를 찾을 수 없습니다."}</p>
              <Button asChild variant="outline">
                <Link href="/maintenance">목록으로 돌아가기</Link>
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const label = getMaintenanceCategoryLabel(category);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${label} 수정`} description={`${label} 정보를 수정합니다`} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">

            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/maintenance">유지보수</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/maintenance/${category}/${id}`}>{item.projectName}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>수정</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader>
                <CardTitle>{label} 수정</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">

                    <div className="space-y-2">
                      <Label>영업대표 *</Label>
                      <UserPicker value={salesRep?.name ?? ""} users={users} onSelect={setSalesRep} placeholder="이름으로 영업대표 지정" />
                    </div>

                    <div className="space-y-2">
                      <Label>유지보수 담당자 (정)</Label>
                      <UserPicker value={engineerMain?.name ?? ""} users={users} onSelect={setEngineerMain} placeholder="주 엔지니어 검색" />
                    </div>

                    <div className="space-y-2">
                      <Label>유지보수 담당자 (부)</Label>
                      <UserPicker value={engineerSub?.name ?? ""} users={users} onSelect={setEngineerSub} placeholder="부 엔지니어 검색" />
                    </div>

                    <div className="space-y-2">
                      <Label>정기 PM</Label>
                      <UserPicker value={regularPm?.name ?? ""} users={users} onSelect={setRegularPm} placeholder="정기 PM 검색" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mCategory">구분</Label>
                      <Input id="mCategory" value={mCategory} onChange={(e) => setMCategory(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="remote">원격 지원 여부</Label>
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

                    {item.type === "PAID" && (
                      <div className="space-y-2">
                        <Label htmlFor="inspectionCycle">점검 주기</Label>
                        <Select value={inspectionCycle} onValueChange={setInspectionCycle}>
                          <SelectTrigger id="inspectionCycle">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MONTHLY">월</SelectItem>
                            <SelectItem value="QUARTERLY">분기</SelectItem>
                            <SelectItem value="SEMI_ANNUALLY">반기</SelectItem>
                            <SelectItem value="NONE">없음</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="importance">중요도</Label>
                      <Select value={importance} onValueChange={setImportance}>
                        <SelectTrigger id="importance">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HIGH">상</SelectItem>
                          <SelectItem value="MEDIUM">중</SelectItem>
                          <SelectItem value="LOW">하</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">설치 위치</Label>
                      <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rate">유지보수 요율 (%)</Label>
                      <Input id="rate" type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">계약금액</Label>
                      <Input
                        id="amount"
                        value={amount}
                        onChange={(e) => {
                          const numeric = e.target.value.replace(/[^0-9]/g, "");
                          setAmount(numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
                        }}
                        disabled={item.type === "FREE"}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="annualAmount">연간 유지보수 금액</Label>
                      <Input
                        id="annualAmount"
                        value={annualAmount}
                        onChange={(e) => {
                          const numeric = e.target.value.replace(/[^0-9]/g, "");
                          setAnnualAmount(numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
                        }}
                        disabled={item.type === "FREE"}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contractDate">계약일</Label>
                      <Input id="contractDate" type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="startDate">유지보수 시작일 *</Label>
                      <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate">유지보수 종료일 *</Label>
                      <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reportSubmitted">보고서 제출 여부</Label>
                      <Select value={reportSubmitted} onValueChange={setReportSubmitted}>
                        <SelectTrigger id="reportSubmitted">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">O</SelectItem>
                          <SelectItem value="false">X</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="productFamily">제품군</Label>
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
                      <Label htmlFor="apVersion">AP 버전</Label>
                      <Input id="apVersion" value={apVersion} onChange={(e) => setApVersion(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apCount">AP 수</Label>
                      <Input id="apCount" type="number" min="0" value={apCount} onChange={(e) => setApCount(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="esVersion">ES 버전</Label>
                      <Input id="esVersion" value={esVersion} onChange={(e) => setEsVersion(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="esCount">ES 수</Label>
                      <Input id="esCount" type="number" min="0" value={esCount} onChange={(e) => setEsCount(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dbVersion">DB 버전</Label>
                      <Input id="dbVersion" value={dbVersion} onChange={(e) => setDbVersion(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dbHaStatus">DB HA (고가용성 여부)</Label>
                      <Select value={dbHaStatus} onValueChange={setDbHaStatus}>
                        <SelectTrigger id="dbHaStatus">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">O</SelectItem>
                          <SelectItem value="false">X</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="aclPatchStatus">ACL 패치 여부</Label>
                      <Select value={aclPatchStatus} onValueChange={setAclPatchStatus}>
                        <SelectTrigger id="aclPatchStatus">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">O</SelectItem>
                          <SelectItem value="false">X</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vulnPatchStatus">모니터템플릿 취약점 패치여부</Label>
                      <Select value={vulnPatchStatus} onValueChange={setVulnPatchStatus}>
                        <SelectTrigger id="vulnPatchStatus">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">O</SelectItem>
                          <SelectItem value="false">X</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="upgradePlan">LTS 8.4.0 업그레이드 계획</Label>
                      <Input id="upgradePlan" value={upgradePlan} onChange={(e) => setUpgradePlan(e.target.value)} />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="contractFile">계약서 첨부파일 변경</Label>
                      <Input id="contractFile" type="file" onChange={(e) => setContractFile(e.target.files?.[0] || null)} />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="remarks">비고</Label>
                      <Textarea id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} />
                    </div>

                  </div>

                  <div className="flex justify-end gap-2 border-t pt-6">
                    <Button type="button" variant="outline" asChild disabled={submitting}>
                      <Link href={`/maintenance/${category}/${id}`}>취소</Link>
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "저장 중..." : "수정"}
                    </Button>
                  </div>

                </form>
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </div>
  );
}
