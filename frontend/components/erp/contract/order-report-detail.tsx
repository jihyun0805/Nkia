"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type OrderReport } from "@/lib/contract-data";

interface OrderReportDetailProps {
  report: OrderReport;
}

const parseNum = (val: string | number | undefined) => {
  if (!val) return 0;
  const num = Number(val.toString().replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
};
const fmt = (num: number) => (num === 0 ? "" : num.toLocaleString());

const cellBase = "px-2 py-1.5 text-sm min-h-[32px]";
const codeMap: Record<string, string> = {
  GN: "공공신규: GN",
  GA: "공공증설: GA",
  JN: "3자단가신규: JN",
  JA: "3자단가증설: JA",
  MN: "민간신규: MN",
  MA: "민간증설: MA",
  "GN-MA": "[공공]신규 고객사 유지보수: GN-MA",
  "GE-MA": "[공공]기존 유지보수(연장): GE-MA",
  "GL-MA": "[공공]추가 라이선스 유상전환: GL-MA",
  "MN-MA": "[민간]신규 고객사 유지보수: MN-MA",
  "ME-MA": "[민간]기존 유지보수(연장): ME-MA",
  "ML-MA": "[민간]추가 라이선스 유상전환: ML-MA",
};
const typeMap: Record<string, string> = { SOLUTION: "솔루션", MAINTENANCE: "유지보수", SERVICE: "용역" };

export function OrderReportDetail({ report: r }: OrderReportDetailProps) {
  const sc = r.salesClassification;
  const licenseDetails = r.licenseDetails || [];
  const serviceDetails = r.serviceDetails || [];
  const maintenanceDetails = r.maintenanceDetails || [];
  const otherSalesDetails = r.otherSalesDetails || [];
  const purchaseDetails = r.purchaseDetails || [];

  const licenseSubtotal = licenseDetails.reduce((a, c) => a + parseNum(c.subtotal), 0);
  const serviceSubtotal = serviceDetails.reduce((a, c) => a + parseNum(c.subtotal), 0);
  const maintenanceSubtotal = maintenanceDetails.reduce((a, c) => a + parseNum(c.subtotal), 0);
  const otherSalesSubtotal = otherSalesDetails.reduce((a, c) => a + parseNum(c.subtotal), 0);
  const purchaseSubtotal = purchaseDetails.reduce((a, c) => a + parseNum(c.subtotal), 0);

  const licenseTotal = licenseSubtotal + parseNum(r.licenseDiscount);
  const serviceTotal = serviceSubtotal + parseNum(r.serviceDiscount);
  const maintenanceTotal = maintenanceSubtotal + parseNum(r.maintenanceDiscount);

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
            {r.id} · {r.customer} · {r.orderDate}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={r.approvalStatus === "승인완료" ? "default" : "secondary"} className={r.approvalStatus === "승인완료" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
            {r.approvalStatus}
          </Badge>
          <span className="text-sm text-muted-foreground">결재자: {r.approver}</span>
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
                {r.name}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 font-semibold" colSpan={1}>
                총 계약금액
              </th>
              <td className="bg-yellow-100 border-r border-black text-right px-2 py-1.5 text-sm font-bold text-blue-700" colSpan={8}>
                ₩{r.amount}
              </td>
              <td className={`${cellBase} text-center font-medium`} colSpan={1}>
                {r.vatType ? `(${r.vatType})` : "-"}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 font-semibold" colSpan={1}>
                대금지급조건
              </th>
              <td className={`${cellBase} text-center`} colSpan={9}>
                {r.paymentTerms || "-"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 매출분류 */}
        {sc && (
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
                  {sc.ems}
                </td>
                <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                  ITG
                </th>
                <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                  {sc.itg}
                </td>
                <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                  대시보드
                </th>
                <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                  {sc.dashboard}
                </td>
                <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                  AIOTION
                </th>
                <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                  {sc.aiotion}
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
                  {sc.emsMaintenance}
                </td>
                <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                  ITG유지보수
                </th>
                <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                  {sc.itgMaintenance}
                </td>
                <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                  ITO
                </th>
                <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                  {sc.ito}
                </td>
                <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
                  기타
                </th>
                <td className="border-r border-black text-right px-2 py-1.5 text-sm" colSpan={1}>
                  {sc.others}
                </td>
                <td className="bg-red-50 text-center text-red-600 font-bold px-2 py-1.5 text-sm border-l border-black" colSpan={1}>
                  {sc.verification}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* 계약 정보 */}
        <table className="w-full border-collapse border border-black text-sm table-fixed -mt-[1px] bg-white">
          <Col10 />
          <tbody>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                유형
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={2}>
                {typeMap[r.type || ""] || r.type || "-"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                채널유무
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={2}>
                {r.hasChannel === "Y" ? "O" : r.hasChannel === "N" ? "X" : "-"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                코드분류
              </th>
              <td className={`${cellBase}`} colSpan={3}>
                {codeMap[r.codeClassification || ""] || r.codeClassification || "-"}
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
                {r.contractPartner?.name || "-"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                최종고객사
              </th>
              <td className={`${cellBase} text-center`} colSpan={4}>
                {r.finalCustomer?.name || "-"}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                담당자
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={4}>
                {r.contractPartner?.manager || "-"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                담당자
              </th>
              <td className={`${cellBase} text-center`} colSpan={4}>
                {r.finalCustomer?.manager || "-"}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                연락처
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={4}>
                {r.contractPartner?.contact || "-"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                연락처
              </th>
              <td className={`${cellBase} text-center`} colSpan={4}>
                {r.finalCustomer?.contact || "-"}
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
                {r.startDate || "-"}
              </td>
              <td className="bg-yellow-100 text-center font-bold text-blue-700 px-2 py-1.5 text-sm" colSpan={1} rowSpan={2}>
                {r.contractPeriod || "-"}
              </td>
            </tr>
            <tr className="border-b border-black">
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={2}>
                무상유지보수기간
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={3}>
                {r.freeMaintenancePeriod || "해당없음"}
              </td>
              <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
                종료일
              </th>
              <td className={`${cellBase} text-center border-r border-black`} colSpan={2}>
                {r.endDate || "-"}
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
                {r.businessScope || "-"}
              </td>
            </tr>
            {r.attachments && (
              <>
                <tr className="border-b border-black">
                  <th className="bg-slate-100 border-r border-black py-1.5 text-center font-semibold" colSpan={2} rowSpan={2}>
                    첨부서류
                  </th>
                  <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                    견적서
                  </th>
                  <td className={`${cellBase} text-center border-r border-black`} colSpan={1}>
                    {r.attachments.quotation === "Y" ? "O" : "X"}
                  </td>
                  <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                    계약서
                  </th>
                  <td className={`${cellBase} text-center border-r border-black`} colSpan={1}>
                    {r.attachments.contract === "Y" ? "O" : "X"}
                  </td>
                  <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                    발주서
                  </th>
                  <td className={`${cellBase} text-center border-r border-black`} colSpan={1}>
                    {r.attachments.purchaseOrder === "Y" ? "O" : "X"}
                  </td>
                  <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                    PRB보고서
                  </th>
                  <td className={`${cellBase} text-center`} colSpan={1}>
                    {r.attachments.prbReport === "Y" ? "O" : "X"}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
                    기타서류
                  </th>
                  <td className={cellBase} colSpan={7}>
                    {r.attachments.others || "-"}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>

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
                { value: d.category, span: 1 },
                { value: d.group, span: 1 },
                { value: d.product, span: 3 },
                { value: d.quantity, span: 1, center: true },
                { value: d.unitPrice, span: 2, right: true },
                { value: d.subtotal, span: 2, right: true, highlight: true },
              ])}
              discount={r.licenseDiscount}
              total={licenseTotal}
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
                { value: d.mm, span: 1, center: true },
                { value: d.unitPrice, span: 2, right: true },
                { value: d.subtotal, span: 2, right: true, highlight: true },
              ])}
              discount={r.serviceDiscount}
              total={serviceTotal}
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
                { value: d.cycle, span: 1, center: true },
                { value: d.months, span: 1, center: true },
                { value: d.monthlyAmount, span: 2, right: true },
                { value: d.subtotal, span: 2, right: true, highlight: true },
              ])}
              discount={r.maintenanceDiscount}
              total={maintenanceTotal}
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
                { value: d.quantity, span: 1, center: true },
                { value: d.unitPrice, span: 2, right: true },
                { value: d.subtotal, span: 2, right: true, highlight: true },
              ])}
              total={otherSalesSubtotal}
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
                { value: d.quantity, span: 1, center: true },
                { value: d.unitPrice, span: 2, right: true },
                { value: d.subtotal, span: 2, right: true, highlight: true },
              ])}
              total={purchaseSubtotal}
            />
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/contract">목록으로 돌아가기</Link>
        </Button>
      </div>
    </div>
  );
}

/* ── 공통 세부내역 테이블 서브 컴포넌트 ── */
type HeaderDef = { label: string; span: number };
type CellDef = { value: string; span: number; center?: boolean; right?: boolean; highlight?: boolean };

function DetailTable({ title, headers, rows, discount, total }: { title: string; headers: HeaderDef[]; rows: CellDef[][]; discount?: string; total: number }) {
  const hasDiscount = discount !== undefined;
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
                  className={`border-r border-black last:border-r-0 px-2 py-1.5 text-sm ${c.center ? "text-center" : ""} ${c.right ? "text-right" : ""} ${c.highlight ? "bg-orange-50 font-semibold text-slate-600" : ""}`}
                >
                  {c.value}
                </td>
              ))}
            </tr>
          ))}
          {hasDiscount && (
            <tr className="bg-green-100 border-b border-black">
              <td className="border-r border-black p-2 text-center font-medium" colSpan={8}>
                특별할인
              </td>
              <td className="p-2 text-right text-red-600 font-semibold" colSpan={2}>
                {discount || "-"}
              </td>
            </tr>
          )}
          <tr className="bg-yellow-100 font-bold border-b border-black">
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
