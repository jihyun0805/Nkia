"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { licenseApi, type LicenseListResponse, type LicenseStatus, type LicenseType } from "@/lib/api/contract-api";
import { Skeleton } from "@/components/ui/skeleton";

const statusStyle: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 hover:bg-green-100",
  EXPIRED: "bg-red-100 text-red-700 hover:bg-red-100",
  PENDING: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  REVOKED: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  DEACTIVE: "bg-red-100 text-red-700 hover:bg-red-100",
  ISSUED: "bg-green-100 text-green-700 hover:bg-green-100",
  // Korean descriptions returned by backend
  "활성": "bg-green-100 text-green-700 hover:bg-green-100",
  "만료": "bg-red-100 text-red-700 hover:bg-red-100",
  "대기": "bg-amber-100 text-amber-700 hover:bg-amber-100",
  "취소": "bg-gray-100 text-gray-700 hover:bg-gray-100",
  "비활성": "bg-red-100 text-red-700 hover:bg-red-100",
  "발급 완료": "bg-green-100 text-green-700 hover:bg-green-100",
  "발급완료": "bg-green-100 text-green-700 hover:bg-green-100",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "활성",
  EXPIRED: "만료",
  PENDING: "대기",
  REVOKED: "취소",
  DEACTIVE: "비활성",
  ISSUED: "발급 완료",
  // Korean descriptions returned by backend
  "활성": "활성",
  "만료": "만료",
  "대기": "대기",
  "취소": "취소",
  "비활성": "비활성",
  "발급 완료": "발급 완료",
  "발급완료": "발급 완료",
};

const typeLabel: Record<string, string> = {
  PERMANENT: "영구",
  SUBSCRIPTION: "구독",
  TRIAL: "임시",
  OFFICIAL: "정식",
  TEMPORARY: "임시",
  // Korean descriptions returned by backend
  "영구": "영구",
  "구독": "구독",
  "임시": "임시",
  "정식": "정식",
  "체험": "체험",
};

export default function CustomerLicensesPage({ params }: { params: Promise<{ customerName: string }> }) {
  const router = useRouter();
  const { customerName } = use(params);
  const decodedCustomerName = decodeURIComponent(customerName);

  const [customerLicenses, setCustomerLicenses] = useState<LicenseListResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLicenses = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await licenseApi.getLicenses();
        const filtered = (res.data ?? []).filter(
          (lic) => lic.customerCompanyName === decodedCustomerName
        );
        setCustomerLicenses(filtered);
      } catch (err: any) {
        console.error(err);
        setError("라이선스 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchLicenses();
  }, [decodedCustomerName]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="라이선스 목록" description={`${decodedCustomerName}의 전체 라이선스 현황입니다`} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle className="text-lg">{decodedCustomerName} 라이선스 상세</CardTitle>
                  </div>
                  <Badge variant="secondary">{loading ? "..." : `총 ${customerLicenses.length}건`}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-12 text-destructive gap-2">
                    <AlertCircle className="w-8 h-8" />
                    <p>{error}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">라이선스번호</TableHead>
                        <TableHead>수주보고번호</TableHead>
                        <TableHead>제품군</TableHead>
                        <TableHead>제품명/모듈</TableHead>
                        <TableHead className="text-center">수량</TableHead>
                        <TableHead>유형</TableHead>
                        <TableHead>시작일/발급일</TableHead>
                        <TableHead>종료일/만료일</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerLicenses.map((license) => (
                        <TableRow
                          key={license.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/contract/licenses/${license.id}`)}
                        >
                          <TableCell className="font-mono text-sm">{license.id}</TableCell>
                          <TableCell className="font-mono text-sm">{license.orderReportId ?? "-"}</TableCell>
                          <TableCell>{license.productClass}</TableCell>
                          <TableCell>{license.productName}</TableCell>
                          <TableCell className="text-center">{license.quantity}</TableCell>
                          <TableCell>
                            <Badge variant={license.licenseType === "PERMANENT" ? "default" : "outline"}>
                              {typeLabel[license.licenseType] ?? license.licenseType}
                            </Badge>
                          </TableCell>
                          <TableCell>{license.startDate}</TableCell>
                          <TableCell>{license.endDate ?? "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={statusStyle[license.licenseStatus] ?? "bg-gray-100 text-gray-700"}
                            >
                              {statusLabel[license.licenseStatus] ?? license.licenseStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {customerLicenses.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                            라이선스 내역이 없습니다.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
