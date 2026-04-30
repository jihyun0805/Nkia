"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Contract } from "@/lib/contract-data";

interface ContractListProps {
  contracts: Contract[];
}

export function ContractList({ contracts }: ContractListProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">계약 목록</CardTitle>
          <Badge variant="secondary">{contracts.length}건</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">계약번호</TableHead>
              <TableHead>수주번호</TableHead>
              <TableHead>사업명</TableHead>
              <TableHead>고객사</TableHead>
              <TableHead>계약일</TableHead>
              <TableHead>사업기간</TableHead>
              <TableHead className="text-right">계약금액</TableHead>
              <TableHead>유지보수종료</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/contract/contracts/${contract.id}`)}>
                <TableCell className="font-mono text-sm">{contract.id}</TableCell>
                <TableCell className="font-mono text-sm">{contract.orderId}</TableCell>
                <TableCell className="max-w-[150px] truncate font-medium">{contract.name}</TableCell>
                <TableCell>{contract.customer}</TableCell>
                <TableCell>{contract.contractDate}</TableCell>
                <TableCell className="text-sm">
                  {contract.startDate} ~ {contract.endDate}
                </TableCell>
                <TableCell className="text-right font-medium">₩{parseInt(contract.amount).toLocaleString()}</TableCell>
                <TableCell>{contract.maintenanceEnd}</TableCell>
                <TableCell>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{contract.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
