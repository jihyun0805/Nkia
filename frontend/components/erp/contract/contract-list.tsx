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
              <TableHead>고객사</TableHead>
              <TableHead>사업기회</TableHead>
              <TableHead>계약일</TableHead>
              <TableHead>계약기간</TableHead>
              <TableHead className="text-right">계약금액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/contract/contracts/${contract.id}`)}>
                <TableCell>{contract.customer}</TableCell>
                <TableCell className="max-w-[200px] truncate font-medium">{contract.name}</TableCell>
                <TableCell>{contract.contractDate}</TableCell>
                <TableCell className="text-sm">
                  {contract.startDate} ~ {contract.endDate}
                </TableCell>
                <TableCell className="text-right font-medium">₩{parseInt(contract.amount.replace(/,/g, "")).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
