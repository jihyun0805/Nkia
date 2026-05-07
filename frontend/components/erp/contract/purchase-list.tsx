"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type PurchaseContract } from "@/lib/contract-data";

interface PurchaseListProps {
  purchases: PurchaseContract[];
}

export function PurchaseList({ purchases }: PurchaseListProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">매입계약 목록</CardTitle>
          <Badge variant="secondary">{purchases.length}건</Badge>
        </div>
      </CardHeader>
      <CardContent>
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
                <TableCell className="text-right font-medium">₩{parseInt(purchase.amount.replace(/,/g, "")).toLocaleString()}</TableCell>
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
      </CardContent>
    </Card>
  );
}
