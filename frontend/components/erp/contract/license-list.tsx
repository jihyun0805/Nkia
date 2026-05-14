"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type LicenseListResponse, type LicenseStatus } from "@/lib/api/contract-api";

interface LicenseListProps {
  licenses: LicenseListResponse[];
  isLoading?: boolean;
}

const statusStyle: Record<LicenseStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  EXPIRED: "bg-red-100 text-red-700",
  PENDING: "bg-amber-100 text-amber-700",
  REVOKED: "bg-gray-100 text-gray-700",
};

const statusLabel: Record<LicenseStatus, string> = {
  ACTIVE: "활성",
  EXPIRED: "만료",
  PENDING: "대기",
  REVOKED: "취소",
};

export function LicenseList({ licenses, isLoading }: LicenseListProps) {
  const router = useRouter();

  // 고객사별 그룹화
  const customerGroups = useMemo(() => {
    const groups = licenses.reduce(
      (acc, license) => {
        const key = license.customerCompanyName ?? `ID:${license.customerCompanyId}`;
        if (!acc[key]) {
          acc[key] = { customerName: key, count: 0, activeCount: 0, latestStart: "" };
        }
        acc[key].count += 1;
        if (license.licenseStatus === "ACTIVE") acc[key].activeCount += 1;
        if (!acc[key].latestStart || license.startDate > acc[key].latestStart) {
          acc[key].latestStart = license.startDate;
        }
        return acc;
      },
      {} as Record<string, { customerName: string; count: number; activeCount: number; latestStart: string }>,
    );
    return Object.values(groups).sort((a, b) => b.latestStart.localeCompare(a.latestStart));
  }, [licenses]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">라이선스 목록</CardTitle>
          <Badge variant="secondary">{isLoading ? "..." : `총 ${licenses.length}건`}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[168px] rounded-xl" />
            ))}
          </div>
        ) : customerGroups.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {customerGroups.map((group) => (
              <button
                key={group.customerName}
                type="button"
                onClick={() => router.push(`/contract/licenses/customer/${encodeURIComponent(group.customerName)}`)}
                className="min-h-[168px] rounded-xl border p-5 text-left transition-colors hover:bg-muted/50 w-full"
              >
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <p className="line-clamp-2 text-lg font-semibold">{group.customerName}</p>
                  </div>
                  <div className="mt-5 text-sm text-muted-foreground space-y-1">
                    <p>등록된 라이선스 {group.count}건</p>
                    {group.activeCount > 0 && (
                      <Badge className={`${statusStyle.ACTIVE} text-xs`}>
                        {statusLabel.ACTIVE} {group.activeCount}건
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">등록된 라이선스가 없습니다.</div>
        )}
      </CardContent>
    </Card>
  );
}
