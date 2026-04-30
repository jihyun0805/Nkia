"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type License } from "@/lib/contract-data";

interface LicenseListProps {
  licenses: License[];
}

export function LicenseList({ licenses }: LicenseListProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">라이선스 목록</CardTitle>
          <Badge variant="secondary">{licenses.length}건</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">라이선스번호</TableHead>
              <TableHead>계약번호</TableHead>
              <TableHead>고객사</TableHead>
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
            {licenses.map((license) => (
              <TableRow key={license.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/contract/licenses/${license.id}`)}>
                <TableCell className="font-mono text-sm">{license.id}</TableCell>
                <TableCell className="font-mono text-sm">{license.contractId}</TableCell>
                <TableCell className="font-medium">{license.customer}</TableCell>
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
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
