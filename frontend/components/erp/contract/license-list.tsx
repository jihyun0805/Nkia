"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type License } from "@/lib/contract-data";

interface LicenseListProps {
  licenses: License[];
}

export function LicenseList({ licenses }: LicenseListProps) {
  const router = useRouter();

  const customerGroups = useMemo(() => {
    const groups = licenses.reduce((acc, license) => {
      if (!acc[license.customer]) {
        acc[license.customer] = {
          customer: license.customer,
          count: 0,
          latestIssueDate: new Date(license.issueDate).getTime() || 0,
        };
      }
      acc[license.customer].count += 1;
      const issueTime = new Date(license.issueDate).getTime() || 0;
      if (issueTime > acc[license.customer].latestIssueDate) {
        acc[license.customer].latestIssueDate = issueTime;
      }
      return acc;
    }, {} as Record<string, { customer: string; count: number; latestIssueDate: number }>);

    return Object.values(groups).sort((a, b) => b.latestIssueDate - a.latestIssueDate);
  }, [licenses]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">라이선스 목록</CardTitle>
          <Badge variant="secondary">총 {licenses.length}건</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {customerGroups.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {customerGroups.map((group) => (
              <button
                key={group.customer}
                type="button"
                onClick={() => router.push(`/contract/licenses/customer/${encodeURIComponent(group.customer)}`)}
                className="min-h-[168px] rounded-xl border p-5 text-left transition-colors hover:bg-muted/50 w-full"
              >
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <p className="line-clamp-2 text-lg font-semibold">{group.customer}</p>
                  </div>
                  <div className="mt-5 text-sm text-muted-foreground">
                    <p>등록된 라이선스 {group.count}건</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            등록된 라이선스가 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
