"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type OrderReportListResponse, type ApprovalStatus } from "@/lib/api/contract-api";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderReportListProps {
  reports: OrderReportListResponse[];
  isLoading?: boolean;
}

const statusLabel: Record<ApprovalStatus, string> = {
  PENDING: "대기중",
  IN_PROGRESS: "결재중",
  APPROVED: "승인완료",
  REJECTED: "반려",
};

const statusStyle: Record<ApprovalStatus, string> = {
  PENDING: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  IN_PROGRESS: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  APPROVED: "bg-green-100 text-green-700 hover:bg-green-100",
  REJECTED: "bg-red-100 text-red-700 hover:bg-red-100",
};

export function OrderReportList({ reports, isLoading }: OrderReportListProps) {
  const router = useRouter();

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
        ) : reports.length === 0 ? (
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
              {reports.map((order) => (
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
