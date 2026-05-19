"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type OrderReportResponse, type VisitCycle, orderReportApi } from "@/lib/api/contract-api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface OrderReportDetailProps {
  report: OrderReportResponse;
}

const parseNum = (val: string | number | undefined) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return val;
  const num = Number(val.toString().replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
};

const fmt = (num: number | null | undefined) => {
  if (num === null || num === undefined) return "0";
  return num.toLocaleString();
};

const cellBase = "px-2 py-1.5 text-sm min-h-[32px]";

const cycleMap: Record<VisitCycle, string> = {
  MONTHLY: "매월",
  QUARTERLY: "분기",
  SEMI_ANNUAL: "반기",
  ANNUAL: "매년",
  AS_NEEDED: "수시",
};

const codeMap: Record<string, string> = {
  DIRECT: "직접수주",
  INDIRECT: "간접수주",
};

const typeMap: Record<string, string> = {
  NEW: "신규",
  RENEWAL: "갱신",
  MAINTENANCE_ONLY: "유지보수",
};

export function OrderReportDetail({ report: r }: OrderReportDetailProps) {
  const licenseDetails = r.licenses || [];
  const serviceDetails = r.services || [];
  const maintenanceDetails = r.maintenances || [];
  const otherSalesDetails = r.others || [];
  const purchaseDetails = r.purchases || [];
  const maintenanceOnlyItems = r.maintenanceOnlyItems || [];
  const router = useRouter();

  const computedEmsMaintenanceSummary = maintenanceDetails.reduce((sum, m) => {
    const content = (m.content || "").toUpperCase();
    return content.includes("ITG") || content.includes("ITSM") ? sum : sum + (m.totalPrice || 0);
  }, 0);
  const computedItgMaintenanceSummary = maintenanceDetails.reduce((sum, m) => {
    const content = (m.content || "").toUpperCase();
    return content.includes("ITG") || content.includes("ITSM") ? sum + (m.totalPrice || 0) : sum;
  }, 0);

  const knownClasses = new Set(["EMS", "ITSM", "DASHBOARD", "DATACENTER", "RCA", "DCA", "ITAM"]);
  const computedOtherSummary =
    licenseDetails.reduce((sum, l) => {
      const cat = (l.productClass || "").toUpperCase();
      return cat && !knownClasses.has(cat) ? sum + (l.totalPrice || 0) : sum;
    }, 0) +
    (r.serviceTotal || 0) +
    (r.otherTotal || 0);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("정말로 이 수주보고서를 삭제하시겠습니까?")) return;
    setIsDeleting(true);
    try {
      await orderReportApi.deleteOrderReport(r.id);
      toast.success("수주보고서가 삭제되었습니다.");
      router.push("/contract");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "삭제에 실패했습니다.");
      setIsDeleting(false);
    }
  };

  const Col10 = () => (
    <colgroup>
      {Array.from({ length: 10 }).map((_, i) => (
        <col key={i} className="w-[10%]" />
      ))}
    </colgroup>
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">수주보고서</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {r.orderReportCode} · {r.projectName} · {r.contractDate}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={r.status === "APPROVED" ? "default" : "secondary"} className={r.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
            {r.status === "APPROVED" ? "승인완료" : r.status === "REJECTED" ? "반려" : r.status === "IN_PROGRESS" ? "결재중" : "대기중"}
          </Badge>
          <span className="text-sm text-muted-foreground">PM: {r.pmName}</span>
        </div>
      </div>

      {/* 수주보고서 본문 */}
      <div className="bg-card rounded-lg border p-6 space-y-0">
        {/* 기본 정보 */}
        <table className="w-full border-collapse border border-black text-sm table-fixed bg-white">
          <Col10 />
          <tbody>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 font-semibold" colSpan={1}>
                사업명
              </th>
              <td className={`${cellBase} text-center`} colSpan={9}>
                {r.projectName}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 font-semibold" colSpan={1}>
                총 계약금액
              </th>
              <td className="bg-yellow-200 border-r border-black text-right px-2 py-1.5 text-sm font-bold text-blue-700" colSpan={8}>
                ₩{fmt(r.totalAmount)}
              </td>
              <td className="text-center font-semibold text-sm" colSpan={1}>
                ({r.vatType || "-"})
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 font-semibold" colSpan={1}>
                대금지급조건
              </th>
              <td className={`${cellBase} text-center`} colSpan={9}>
                {r.paymentCondition || "-"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 매출분류 */}
        <table className="w-full border-collapse border border-black text-sm text-center table-fixed -mt-[1px] bg-white">
          <Col10 />
          <tbody>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 font-semibold" rowSpan={2} colSpan={1}>
                매출분류
              </th>
              <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                EMS
              </th>
              <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                {fmt(r.emsSummary)}
              </td>
              <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                ITG
              </th>
              <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                {fmt(r.itgSummary)}
              </td>
              <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                대시보드
              </th>
              <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                {fmt(r.dashboardSummary)}
              </td>
              <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                AIOTION
              </th>
              <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                {fmt(r.aiotionSummary)}
              </td>
              <th className="bg-slate-100 font-bold text-red-600 text-[10px] leading-tight border-l border-black" colSpan={1}>
                검증
                <br />
                (0이정상)
              </th>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                EMS유지보수
              </th>
              <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                {fmt(computedEmsMaintenanceSummary)}
              </td>
              <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                ITG유지보수
              </th>
              <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                {fmt(computedItgMaintenanceSummary)}
              </td>
              <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                ITO
              </th>
              <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                {fmt(r.itoSummary)}
              </td>
              <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                기타
              </th>
              <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                {fmt(computedOtherSummary)}
              </td>
              <td className="bg-red-50 text-center text-red-600 font-bold px-2 py-1.5 text-sm border-l border-black" colSpan={1}>
                {fmt(
                  r.totalAmount -
                    (r.emsSummary + r.itgSummary + r.dashboardSummary + r.aiotionSummary + computedEmsMaintenanceSummary + computedItgMaintenanceSummary + r.itoSummary + computedOtherSummary),
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 계약 정보 */}
        <table className="w-full border-collapse border border-black text-sm table-fixed -mt-[1px] bg-white">
          <Col10 />
          <tbody>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                유형
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={2}>
                {typeMap[r.type] || r.type}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                채널유무
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={2}>
                {r.channel ? "O" : "X"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                코드분류
              </th>
              <td className={`${cellBase} text-center`} colSpan={3}>
                {codeMap[r.codeType] || r.codeType}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                수행PM
              </th>
              <td className={`${cellBase} text-center`} colSpan={9}>
                {r.pmName || "-"}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                계약상대
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={4}>
                {r.contractCounterpartCompanyName || "-"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                최종고객사
              </th>
              <td className={`${cellBase} text-center`} colSpan={4}>
                {r.finalCustomerCompanyName || "-"}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                담당자
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={4}>
                {r.contractCounterpartManagerName || "-"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                담당자
              </th>
              <td className={`${cellBase} text-center`} colSpan={4}>
                {r.finalCustomerManagerName || "-"}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                연락처
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={4}>
                {r.contractCounterpartPhone || "-"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                연락처
              </th>
              <td className={`${cellBase} text-center`} colSpan={4}>
                {r.finalCustomerPhone || "-"}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={2}>
                계약일자(발주일자)
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={3}>
                {r.contractDate || "-"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1} rowSpan={2}>
                계약기간
              </th>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                시작일
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={2}>
                {r.contractStartDate || "-"}
              </td>
              <td className="bg-yellow-200 text-center font-bold text-blue-700 px-2 py-1.5 text-sm" colSpan={1} rowSpan={2}>
                {r.contractPeriodMonths}개월
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={2}>
                무상유지보수기간
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={3}>
                {r.freeMaintenancePeriodMonths ? `${r.freeMaintenancePeriodMonths}개월` : "해당없음"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                종료일
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={2}>
                {r.contractEndDate || "-"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 사업범위 & 첨부서류 */}
        <table className="w-full border-collapse border border-black text-sm table-fixed -mt-[1px] bg-white">
          <Col10 />
          <tbody>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                사업범위
              </th>
              <td className="px-2 py-2 text-sm whitespace-pre-wrap leading-relaxed" colSpan={9}>
                {r.scopeOfWork || "-"}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-1.5 text-center font-semibold" colSpan={2} rowSpan={2}>
                첨부서류
              </th>
              <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                견적서
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={1}>
                {r.quotationProvided ? "O" : "X"}
              </td>
              <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                계약서
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={1}>
                {r.contractProvided ? "O" : "X"}
              </td>
              <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                발주서
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={1}>
                {r.purchaseOrderProvided ? "O" : "X"}
              </td>
              <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                PRB보고서
              </th>
              <td className={`${cellBase} text-center`} colSpan={1}>
                {r.prbReportProvided ? "O" : "X"}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                기타서류
              </th>
              <td className={cellBase} colSpan={7}>
                {r.additionalDocuments || "-"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 유지보수 수주보고 표 */}
        {maintenanceOnlyItems && maintenanceOnlyItems.length > 0 && (
          <div className="pt-6 pb-6">
            <div className="text-sm font-bold text-purple-800 mb-1 mt-6">※ 유지보수 수주보고 시 작성</div>
            <table className="w-full border-collapse border border-black text-sm text-center table-fixed bg-white">
              <Col10 />
              <thead>
                <tr className="bg-slate-100 border-b border-black">
                  <th className="border-r border-black py-1.5 font-semibold" colSpan={2}>
                    년도
                  </th>
                  <th className="border-r border-black py-1.5 font-semibold" colSpan={3}>
                    사업금액
                  </th>
                  <th className="border-r border-black py-1.5 font-semibold" colSpan={1}>
                    라이선스
                  </th>
                  <th className="border-r border-black py-1.5 font-semibold" colSpan={1}>
                    3rd
                  </th>
                  <th className="border-r border-black py-1.5 font-semibold" colSpan={1}>
                    용역
                  </th>
                  <th className="border-r border-black py-1.5 font-semibold" colSpan={1}>
                    유지보수
                  </th>
                  <th className="py-1.5 font-semibold" colSpan={1}>
                    요율
                  </th>
                </tr>
              </thead>
              <tbody>
                {maintenanceOnlyItems.map((item) => (
                  <tr key={item.id} className="border-b border-black">
                    <td className="border-r border-black px-2 py-1.5 text-center" colSpan={2}>
                      {item.year ? `${item.year}년` : "-"}
                    </td>
                    <td className="border-r border-black px-2 py-1.5 text-right font-semibold text-slate-700 bg-slate-50" colSpan={3}>
                      ₩{fmt(item.amount)}
                    </td>
                    <td className="border-r border-black px-2 py-1.5 text-right" colSpan={1}>
                      ₩{fmt(item.license)}
                    </td>
                    <td className="border-r border-black px-2 py-1.5 text-right" colSpan={1}>
                      ₩{fmt(item.thirdParty)}
                    </td>
                    <td className="border-r border-black px-2 py-1.5 text-right" colSpan={1}>
                      ₩{fmt(item.service)}
                    </td>
                    <td className="border-r border-black px-2 py-1.5 text-right" colSpan={1}>
                      ₩{fmt(item.maintenance)}
                    </td>
                    <td className="px-2 py-1.5 text-center" colSpan={1}>
                      {item.maintenanceRate ? `${item.maintenanceRate}%` : "-"}
                    </td>
                  </tr>
                ))}

                {/* 합계 행 */}
                <tr className="bg-yellow-200 font-bold border-b border-black">
                  <td className="border-r border-black py-2 text-center text-slate-700" colSpan={2}>
                    합계
                  </td>
                  <td className="border-r border-black px-2 py-1.5 text-right text-blue-700" colSpan={3}>
                    ₩{fmt(r.itemTotalAmount)}
                  </td>
                  <td className="border-r border-black px-2 py-1.5 text-right text-blue-700" colSpan={1}>
                    ₩{fmt(r.itemTotalLicense)}
                  </td>
                  <td className="border-r border-black px-2 py-1.5 text-right text-blue-700" colSpan={1}>
                    ₩{fmt(r.itemTotalThirdParty)}
                  </td>
                  <td className="border-r border-black px-2 py-1.5 text-right text-blue-700" colSpan={1}>
                    ₩{fmt(r.itemTotalService)}
                  </td>
                  <td className="border-r border-black px-2 py-1.5 text-right text-blue-700" colSpan={1}>
                    ₩{fmt(r.itemTotalMaintenance)}
                  </td>
                  <td className="px-2 py-1.5 text-center text-blue-700" colSpan={1}>
                    {r.itemTotalMaintenanceRate ? `${r.itemTotalMaintenanceRate.toFixed(2)}%` : "-"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 매출 세부 내역 */}
        <div className="space-y-8 mt-10">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 border-b-2 border-black pb-2 mb-4">매출</h2>

            {/* 라이선스 */}
            <DetailTable
              title="▶ 라이선스"
              headers={[
                { label: "제품분류", span: 1 },
                { label: "제품군", span: 1 },
                { label: "제품명", span: 3 },
                { label: "수량", span: 1 },
                { label: "단가", span: 2 },
                { label: "소계", span: 2 },
              ]}
              rows={licenseDetails.map((d) => [
                { value: d.productClass, span: 1, center: true },
                { value: d.productGroup, span: 1, center: true },
                { value: d.productName, span: 3 },
                { value: fmt(d.quantity), span: 1, center: true },
                { value: fmt(d.price), span: 2, right: true },
                { value: fmt(d.totalPrice), span: 2, right: true, highlight: true },
              ])}
              total={r.licenseTotal}
            />

            {/* 용역 */}
            <DetailTable
              title="▶ 용역"
              headers={[
                { label: "내용", span: 5 },
                { label: "M/M", span: 1 },
                { label: "단가", span: 2 },
                { label: "소계", span: 2 },
              ]}
              rows={serviceDetails.map((d) => [
                { value: d.content, span: 5 },
                { value: fmt(d.manMonth), span: 1, center: true },
                { value: fmt(d.price), span: 2, right: true },
                { value: fmt(d.totalPrice), span: 2, right: true, highlight: true },
              ])}
              total={r.serviceTotal}
            />

            {/* 유지보수 */}
            <DetailTable
              title="▶ 유지보수"
              headers={[
                { label: "내용", span: 4 },
                { label: "방문주기", span: 1 },
                { label: "개월 수", span: 1 },
                { label: "유지보수 금액(월)", span: 2 },
                { label: "소계", span: 2 },
              ]}
              rows={maintenanceDetails.map((d) => [
                { value: d.content, span: 4 },
                { value: cycleMap[d.visitCycle] || d.visitCycle, span: 1, center: true },
                { value: fmt(d.month), span: 1, center: true },
                { value: fmt(d.price), span: 2, right: true },
                { value: fmt(d.totalPrice), span: 2, right: true, highlight: true },
              ])}
              total={r.maintenanceTotal}
            />

            {/* 기타 매출 */}
            <DetailTable
              title="▶ 기타 (3rd party H/W, S/W, Bypass 매출 등)"
              headers={[
                { label: "내용", span: 5 },
                { label: "수량", span: 1 },
                { label: "단가", span: 2 },
                { label: "소계", span: 2 },
              ]}
              rows={otherSalesDetails.map((d) => [
                { value: d.content, span: 5 },
                { value: fmt(d.quantity), span: 1, center: true },
                { value: fmt(d.price), span: 2, right: true },
                { value: fmt(d.totalPrice), span: 2, right: true, highlight: true },
              ])}
              total={r.otherTotal}
            />
          </div>

          {/* 매입 */}
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 border-b-2 border-black pb-2 mb-4">매입</h2>
            <DetailTable
              title="▶ 매입 (VAT별도)"
              headers={[
                { label: "내용", span: 5 },
                { label: "수량", span: 1 },
                { label: "단가", span: 2 },
                { label: "소계", span: 2 },
              ]}
              rows={purchaseDetails.map((d) => [
                { value: d.content, span: 5 },
                { value: fmt(d.quantity), span: 1, center: true },
                { value: fmt(d.price), span: 2, right: true },
                { value: fmt(d.totalPrice), span: 2, right: true, highlight: true },
              ])}
              total={r.purchaseTotal}
            />
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/contract">목록으로 돌아가기</Link>
        </Button>
        <Button variant="outline" onClick={() => router.push(`/contract/orders/${r.id}/edit`)}>
          수정
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          삭제
        </Button>
      </div>
    </div>
  );
}

/* 공통 세부내역 테이블 서브 컴포넌트 */
type HeaderDef = { label: string; span: number };
type CellDef = { value: string; span: number; center?: boolean; right?: boolean; highlight?: boolean };

function DetailTable({ title, headers, rows, total }: { title: string; headers: HeaderDef[]; rows: CellDef[][]; total: number }) {
  return (
    <div className="mb-6">
      <div className="text-sm font-bold text-slate-800 mb-1 mt-6">{title}</div>
      <table className="w-full border-collapse border border-black text-sm text-center table-fixed bg-white">
        <colgroup>
          {Array.from({ length: 10 }).map((_, i) => (
            <col key={i} className="w-[10%]" />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-slate-100 border-b border-black">
            {headers.map((h, i) => (
              <th key={i} className="border-r border-black py-1.5 last:border-r-0" colSpan={h.span}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr className="border-b border-black">
              <td colSpan={10} className="py-3 text-muted-foreground">
                등록된 내역이 없습니다
              </td>
            </tr>
          )}
          {rows.map((cells, ri) => (
            <tr key={ri} className="border-b border-black">
              {cells.map((c, ci) => (
                <td
                  key={ci}
                  colSpan={c.span}
                  className={`border-r border-black last:border-r-0 px-2 py-1.5 text-sm ${c.center ? "text-center" : ""} ${c.right ? "text-right" : ""} ${
                    c.highlight ? "bg-orange-50 font-semibold text-slate-600" : ""
                  }`}
                >
                  {c.value}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-yellow-200 font-bold border-b border-black">
            <td className="border-r border-black p-2 text-center text-slate-700" colSpan={8}>
              합계
            </td>
            <td className="p-2 text-right font-bold text-blue-700" colSpan={2}>
              {fmt(total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
