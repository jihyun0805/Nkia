"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { type ContractListResponse, type ProposalType } from "@/lib/api/contract-api";

interface ContractListProps {
  contracts: ContractListResponse[];
  isLoading?: boolean;
}

const proposalTypeLabel: Record<ProposalType, string> = {
  SELF: "자체 제안",
  SI: "SI 제안",
};

export function ContractList({ contracts, isLoading }: ContractListProps) {
  const router = useRouter();

  // 최신 계약일 기준 내림차순 정렬
  const sortedContracts = [...contracts].sort((a, b) => {
    if (!a.contractDate && !b.contractDate) return 0;
    if (!a.contractDate) return 1;
    if (!b.contractDate) return -1;
    return new Date(b.contractDate).getTime() - new Date(a.contractDate).getTime();
  });

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">계약 목록</CardTitle>
          <Badge variant="secondary">{isLoading ? "..." : `${contracts.length}건`}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : sortedContracts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 계약이 없습니다.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제안 유형</TableHead>
                <TableHead>영업대표</TableHead>
                <TableHead>계약일</TableHead>
                <TableHead className="text-right">계약금액</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedContracts.map((contract) => (
                <TableRow key={contract.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/contract/contracts/${contract.id}`)}>
                  <TableCell>
                    <Badge variant="outline">{proposalTypeLabel[contract.proposalType] ?? contract.proposalType}</Badge>
                  </TableCell>
                  <TableCell>{contract.salesRepresentativeName}</TableCell>
                  <TableCell>{contract.contractDate}</TableCell>
                  <TableCell className="text-right font-medium">₩{(contract.contractAmount ?? 0).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
