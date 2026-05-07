"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { licenses } from "@/lib/contract-data";

export default function CustomerLicensesPage({ params }: { params: Promise<{ customerName: string }> }) {
  const router = useRouter();
  const { customerName } = use(params);
  const decodedCustomerName = decodeURIComponent(customerName);

  const customerLicenses = licenses.filter((lic) => lic.customer === decodedCustomerName);

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
                  <Badge variant="secondary">총 {customerLicenses.length}건</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">라이선스번호</TableHead>
                      <TableHead>계약번호</TableHead>
                      <TableHead>제품</TableHead>
                      <TableHead>모듈</TableHead>
                      <TableHead className="text-center">수량</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>발급일</TableHead>
                      <TableHead>만료일</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerLicenses.map((license) => (
                      <TableRow key={license.id}>
                        <TableCell className="font-mono text-sm">{license.id}</TableCell>
                        <TableCell className="font-mono text-sm">{license.contractId}</TableCell>
                        <TableCell>{license.product}</TableCell>
                        <TableCell>{license.module}</TableCell>
                        <TableCell className="text-center">{license.quantity}</TableCell>
                        <TableCell>
                          <Badge variant={license.type === "영구" ? "default" : "outline"}>{license.type}</Badge>
                        </TableCell>
                        <TableCell>{license.issueDate}</TableCell>
                        <TableCell>{license.expiryDate}</TableCell>
                        <TableCell>
                          <Badge
                            variant={license.status === "발급완료" ? "default" : "secondary"}
                            className={license.status === "발급완료" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-blue-100 text-blue-700 hover:bg-blue-100"}
                          >
                            {license.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {customerLicenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                          라이선스 내역이 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
