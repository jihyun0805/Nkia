"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { PurchaseResponse } from "@/lib/api/contract-api";

interface PurchaseListProps {
  purchases: PurchaseResponse[];
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
                <TableHead>매입내용</TableHead>
                <TableHead>사업명</TableHead>
                <TableHead className="text-right">수량</TableHead>
                <TableHead className="text-right">단가</TableHead>
                <TableHead className="text-right">합계금액</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase) => (
                <TableRow key={purchase.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/contract/purchases/${purchase.id}`)}>
                  <TableCell className="font-medium">{purchase.content}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{purchase.projectOpportunityName || "-"}</TableCell>
                  <TableCell className="text-right">{purchase.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-right">₩{purchase.price.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium text-blue-600">₩{purchase.totalPrice.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
