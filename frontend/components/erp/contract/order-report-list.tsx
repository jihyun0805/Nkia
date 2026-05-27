"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type OrderReportListResponse } from "@/lib/api/contract-api";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderReportListProps {
  reports: OrderReportListResponse[];
  isLoading?: boolean;
}

// 백엔드가 ApprovalStatus.getDescription() 한글 문자열로 반환
const statusLabel: Record<string, string> = {
  "결재 대기": "대기중",
  "결재중": "결재중",
  "승인 완료": "승인완료",
  "반려": "반려",
  "취소": "취소",
};

const statusStyle: Record<string, string> = {
  "결재 대기": "bg-gray-100 text-gray-700 hover:bg-gray-100",
  "결재중": "bg-amber-100 text-amber-700 hover:bg-amber-100",
  "승인 완료": "bg-green-100 text-green-700 hover:bg-green-100",
  "반려": "bg-red-100 text-red-700 hover:bg-red-100",
  "취소": "bg-gray-100 text-gray-500 hover:bg-gray-100",
};

export function OrderReportList({ reports, isLoading }: OrderReportListProps) {
  const router = useRouter();

  // 최신 계약일 기준 내림차순 정렬
  const sortedReports = [...reports].sort((a, b) => {
    if (!a.contractDate && !b.contractDate) return 0;
    if (!a.contractDate) return 1;
    if (!b.contractDate) return -1;
    return new Date(b.contractDate).getTime() - new Date(a.contractDate).getTime();
  });

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">수주보고 목록</CardTitle>
          <Badge variant="secondary">{isLoading ? "..." : `${reports.length}건`}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : sortedReports.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 수주보고서가 없습니다.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>수주코드</TableHead>
                <TableHead>사업명</TableHead>
                <TableHead>PM</TableHead>
                <TableHead className="text-right">수주금액</TableHead>
                <TableHead>계약일</TableHead>
                <TableHead>결재상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReports.map((order) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/contract/orders/${order.id}`)}>
                  <TableCell className="font-mono text-xs">{order.orderReportCode}</TableCell>
                  <TableCell className="max-w-[250px] truncate font-medium">{order.projectName}</TableCell>
                  <TableCell>{order.pmName ?? "-"}</TableCell>
                  <TableCell className="text-right font-medium">₩{(order.totalAmount ?? 0).toLocaleString()}</TableCell>
                  <TableCell>{order.contractDate ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusStyle[order.status] ?? "bg-gray-100 text-gray-700"}>
                      {statusLabel[order.status] ?? order.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
