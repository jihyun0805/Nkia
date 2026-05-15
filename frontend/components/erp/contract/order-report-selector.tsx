"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Loader2 } from "lucide-react";
import { orderReportApi, type OrderReportListResponse } from "@/lib/api/order-report-api";
import { fuzzyMatch } from "@/lib/fuzzy-match";
import { Badge } from "@/components/ui/badge";

interface OrderReportSelectorProps {
  onSelect: (report: OrderReportListResponse) => void;
  trigger?: React.ReactNode;
}

export function OrderReportSelector({ onSelect, trigger }: OrderReportSelectorProps) {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<OrderReportListResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await orderReportApi.getOrderReports();
      setReports(res.data);
    } catch (err) {
      console.error("Failed to fetch order reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchReports();
    }
  }, [open]);

  const filteredReports = (() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return reports;
    const hits = fuzzyMatch(
      trimmed,
      reports,
      (r) => [r.finalCustomerCompanyName, r.projectName],
      reports.length,
    );
    return hits.map((h) => h.item);
  })();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Search className="w-4 h-4" />
            사업 선택
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>사업 선택</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="고객사 또는 사업명 검색..."
              className="w-full pl-9 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>고객사</TableHead>
                  <TableHead>사업명</TableHead>
                  <TableHead>영업대표</TableHead>
                  <TableHead>수주일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      불러오는 중...
                    </TableCell>
                  </TableRow>
                ) : filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium text-xs">{report.finalCustomerCompanyName}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs">{report.projectName}</TableCell>
                      <TableCell className="text-xs">{report.pmName}</TableCell>
                      <TableCell className="text-xs">{report.contractDate}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] px-1 h-5">
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">₩{report.totalAmount?.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            onSelect(report);
                            setOpen(false);
                          }}
                        >
                          선택
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
