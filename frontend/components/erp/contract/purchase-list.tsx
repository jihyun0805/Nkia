"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

// 매입계약 임시 타입 유지
// TODO: 백엔드 API 연동 후 실제 타입으로 대체
export interface PurchaseContractItem {
  id: string | number;
  supplier: string;
  name: string;
  contractDate: string;
  amount: string | number;
  status: string;
}

interface PurchaseListProps {
  purchases: PurchaseContractItem[];
  isLoading?: boolean;
}

export function PurchaseList({ purchases, isLoading }: PurchaseListProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">매입계약 목록</CardTitle>
          <Badge variant="secondary">{isLoading ? "..." : `${purchases.length}건`}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : purchases.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 매입계약이 없습니다.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>공급사</TableHead>
                <TableHead>매입건명</TableHead>
                <TableHead>계약일</TableHead>
                <TableHead className="text-right">매입금액</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase) => (
                <TableRow key={purchase.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/contract/purchases/${purchase.id}`)}>
                  <TableCell>{purchase.supplier}</TableCell>
                  <TableCell className="max-w-[200px] truncate font-medium">{purchase.name}</TableCell>
                  <TableCell>{purchase.contractDate}</TableCell>
                  <TableCell className="text-right font-medium">₩{parseInt(String(purchase.amount).replace(/,/g, "")).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={purchase.status === "계약완료" ? "default" : "secondary"}
                      className={purchase.status === "계약완료" ? "bg-blue-100 text-blue-700 hover:bg-blue-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}
                    >
                      {purchase.status}
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
