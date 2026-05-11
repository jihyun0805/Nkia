"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type OrderReport } from "@/lib/contract-data";

interface OrderReportListProps {
  reports: OrderReport[];
}

export function OrderReportList({ reports }: OrderReportListProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">수주보고 목록</CardTitle>
          <Badge variant="secondary">{reports.length}건</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>고객사</TableHead>
              <TableHead>사업명(사업기회)</TableHead>
              <TableHead className="text-right">수주 합계 금액</TableHead>
              <TableHead>수주일</TableHead>
              <TableHead>영업대표</TableHead>
              <TableHead>결재상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((order) => (
              <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/contract/orders/${order.id}`)}>
                <TableCell>{order.customer}</TableCell>
                <TableCell className="max-w-[180px] truncate font-medium">{order.name}</TableCell>
                <TableCell className="text-right font-medium">₩{parseInt(order.amount).toLocaleString()}</TableCell>
                <TableCell>{order.orderDate}</TableCell>
                <TableCell>{order.salesRep}</TableCell>
                <TableCell>
                  <Badge
                    variant={order.approvalStatus === "승인완료" ? "default" : "secondary"}
                    className={order.approvalStatus === "승인완료" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}
                  >
                    {order.approvalStatus}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
