"use client";

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";

export function OrderBasicSection() {
  const { register, control, setValue } = useFormContext();
  const cellInput = "w-full h-full min-h-[32px] border-0 bg-transparent px-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none";
  const readonlyInput = "w-full h-full min-h-[32px] border-0 bg-transparent px-2 text-sm outline-none cursor-default select-none";

  const parseNum = (val: string | number | undefined) => {
    if (!val) return 0;
    const num = Number(val.toString().replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  };

  const licenseData = useWatch({ control, name: "licenseDetails" }) || [];
  const serviceData = useWatch({ control, name: "serviceDetails" }) || [];
  const maintenanceData = useWatch({ control, name: "maintenanceDetails" }) || [];
  const otherSalesData = useWatch({ control, name: "otherSalesDetails" }) || [];
  const purchaseData = useWatch({ control, name: "purchaseDetails" }) || [];

  const licenseDiscount = useWatch({ control, name: "licenseDiscount" });
  const serviceDiscount = useWatch({ control, name: "serviceDiscount" });
  const maintenanceDiscount = useWatch({ control, name: "maintenanceDiscount" });

  const totalAmount = useWatch({ control, name: "totalAmount" });

  const salesClassificationValues =
    useWatch({
      control,
      name: [
        "salesClassification.ems",
        "salesClassification.emsMaintenance",
        "salesClassification.itg",
        "salesClassification.itgMaintenance",
        "salesClassification.dashboard",
        "salesClassification.ito",
        "salesClassification.aiotion",
        "salesClassification.others",
      ],
    }) || [];

  useEffect(() => {
    const getSum = (arr: any[]) => arr.reduce((acc, curr) => acc + parseNum(curr.subtotal), 0);

    const licenseTotal = getSum(licenseData) + parseNum(licenseDiscount);
    const serviceTotal = getSum(serviceData) + parseNum(serviceDiscount);
    const maintenanceTotal = getSum(maintenanceData) + parseNum(maintenanceDiscount);
    const otherSalesTotal = getSum(otherSalesData);
    const purchaseTotal = getSum(purchaseData);

    // 매입(purchase)을 포함한 총 계약금액
    const grandTotal = licenseTotal + serviceTotal + maintenanceTotal + otherSalesTotal + purchaseTotal;

    // 무한 렌더링 방지 (값이 다를 때만 업데이트)
    if (parseNum(totalAmount) !== grandTotal) {
      setValue("totalAmount", grandTotal === 0 ? "" : grandTotal.toLocaleString());
    }

    // 매출분류 자동 매핑 및 업데이트
    // 매출분류는 매입(purchase)을 제외한 순수 매출 항목만 포함
    let ems = 0;
    let itg = 0;
    let dashboard = 0;
    let aiotion = 0;
    let ito = 0;
    let others = 0;

    licenseData.forEach((item: any) => {
      const sub = parseNum(item.subtotal);
      const cat = item.category || "";
      if (!cat) return;
      // 백엔드 ProductClass enum 기준 매핑 (대소문자·공백·언더스코어 무관)
      const catNorm = cat.toUpperCase().replace(/[\s_]/g, "");
      if (catNorm === "EMS") ems += sub;
      else if (catNorm === "ITSM") itg += sub;
      else if (catNorm === "DASHBOARD") dashboard += sub;
      else if (catNorm === "DATACENTER" || catNorm === "RCA" || catNorm === "DCA" || cat === "상면 관리") aiotion += sub;
      else if (catNorm === "ITAM") ito += sub;
      else others += sub;
    });

    // 용역 총합 + 기타 매출 총합을 기타 매출분류로 합산 (할인은 제외)
    const rawServiceTotal = getSum(serviceData);
    others += rawServiceTotal + otherSalesTotal;

    // 유지보수 분류 자동 계산 (할인 제외, 저장값과 일치)
    let emsMaint = 0;
    let itgMaint = 0;
    maintenanceData.forEach((item: any) => {
      const sub = parseNum(item.subtotal);
      const content = (item.content || "").toUpperCase();
      if (content.includes("ITG") || content.includes("ITSM")) {
        itgMaint += sub;
      } else {
        emsMaint += sub;
      }
    });

    // 각 매출분류 값이 0일 경우 빈 문자열로 표시
    const fmtVal = (val: number) => (val === 0 ? "" : val.toLocaleString());

    const currentEms = parseNum(salesClassificationValues[0]);
    const currentEmsMaint = parseNum(salesClassificationValues[1]);
    const currentItg = parseNum(salesClassificationValues[2]);
    const currentItgMaint = parseNum(salesClassificationValues[3]);
    const currentDashboard = parseNum(salesClassificationValues[4]);
    const currentIto = parseNum(salesClassificationValues[5]);
    const currentAiotion = parseNum(salesClassificationValues[6]);
    const currentOthers = parseNum(salesClassificationValues[7]);

    if (currentEms !== ems) setValue("salesClassification.ems", fmtVal(ems));
    if (currentEmsMaint !== emsMaint) setValue("salesClassification.emsMaintenance", fmtVal(emsMaint));
    if (currentItg !== itg) setValue("salesClassification.itg", fmtVal(itg));
    if (currentItgMaint !== itgMaint) setValue("salesClassification.itgMaintenance", fmtVal(itgMaint));
    if (currentDashboard !== dashboard) setValue("salesClassification.dashboard", fmtVal(dashboard));
    if (currentIto !== ito) setValue("salesClassification.ito", fmtVal(ito));
    if (currentAiotion !== aiotion) setValue("salesClassification.aiotion", fmtVal(aiotion));
    if (currentOthers !== others) setValue("salesClassification.others", fmtVal(others));
  }, [licenseData, serviceData, maintenanceData, otherSalesData, purchaseData, licenseDiscount, serviceDiscount, maintenanceDiscount, totalAmount, setValue, salesClassificationValues]);

  // 값이 변경될 때마다 검증(Verification) 값 자동계산
  // 매출분류 합계 = 총 계약금액 - 매입합계 이어야 0 (매입은 매출분류에 포함되지 않음)
  useEffect(() => {
    const getSum = (arr: any[]) => arr.reduce((acc, curr) => acc + parseNum(curr.subtotal), 0);
    const purchaseTotal = getSum(purchaseData);

    const salesSum = salesClassificationValues.reduce((acc, curr) => acc + parseNum(curr), 0);
    const total = parseNum(totalAmount);

    // 매입을 제외한 나머지가 매출분류 합계와 일치해야 0
    const verification = salesSum - (total - purchaseTotal);

    setValue("salesClassification.verification", verification.toLocaleString());
  }, [salesClassificationValues, totalAmount, purchaseData, setValue]);

  return (
    <div className="w-full">
      <div className="text-sm font-bold text-yellow-600 mb-1">※ 노랑색 채워진 부분 자동계산 (별도수정X)</div>
      {/* 기본 정보 표 */}
      <table className="w-full border-collapse border border-black text-sm table-fixed bg-white">
        <colgroup>
          {Array.from({ length: 10 }).map((_, i) => (
            <col key={i} className="w-[10%]" />
          ))}
        </colgroup>
        <tbody>
          <tr className="border-b border-black">
            <th className="bg-slate-100 border-r border-black py-2 font-semibold" colSpan={1}>
              사업명
            </th>
            <td className="border-r border-black p-0" colSpan={9}>
              <input className={`${cellInput} text-center`} {...register("projectName")} />
            </td>
          </tr>
          <tr className="border-b border-black">
            <th className="bg-slate-100 border-r border-black py-2 font-semibold" colSpan={1}>
              총 계약금액
            </th>
            <td className="bg-yellow-200 border-r border-black p-0" colSpan={8}>
              <input className={`${readonlyInput} text-right`} {...register("totalAmount")} readOnly tabIndex={-1} />
            </td>
            <td className="text-center font-medium" colSpan={1}>
              <select className={`${cellInput} text-left [text-align-last:center]`} {...register("vatType")}>
                <option value="" hidden>
                  선택
                </option>
                <option value="VAT별도">(VAT별도)</option>
                <option value="VAT포함">(VAT포함)</option>
              </select>
            </td>
          </tr>
          <tr className="border-b border-black">
            <th className="bg-slate-100 border-r border-black py-2 font-semibold" colSpan={1}>
              대금지급조건
            </th>
            <td colSpan={9} className="p-0">
              <input className={`${cellInput} text-center`} {...register("paymentTerms")} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* 매출분류 표 */}
      <table className="w-full border-collapse border border-black text-sm text-center table-fixed -mt-[1px] bg-white">
        <colgroup>
          {Array.from({ length: 10 }).map((_, i) => (
            <col key={i} className="w-[10%]" />
          ))}
        </colgroup>
        <tbody>
          <tr className="border-b border-black">
            <th className="bg-slate-100 border-r border-black py-2 font-semibold" rowSpan={2} colSpan={1}>
              매출분류
            </th>
            <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
              EMS
            </th>
            <td className="border-r border-black p-0" colSpan={1}>
              <input className={`${readonlyInput} text-right`} {...register("salesClassification.ems")} readOnly tabIndex={-1} />
            </td>
            <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
              ITG
            </th>
            <td className="border-r border-black p-0" colSpan={1}>
              <input className={`${readonlyInput} text-right`} {...register("salesClassification.itg")} readOnly tabIndex={-1} />
            </td>
            <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
              대시보드
            </th>
            <td className="border-r border-black p-0" colSpan={1}>
              <input className={`${readonlyInput} text-right`} {...register("salesClassification.dashboard")} readOnly tabIndex={-1} />
            </td>
            <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
              AIOTION
            </th>
            <td className="border-r border-black p-0" colSpan={1}>
              <input className={`${readonlyInput} text-right`} {...register("salesClassification.aiotion")} readOnly tabIndex={-1} />
            </td>
            <th className="bg-slate-100 font-bold text-red-600 text-[10px] leading-tight border-l border-black" colSpan={1}>
              검증
              <br />
              (0이정상)
            </th>
          </tr>

          <tr>
            <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
              EMS유지보수
            </th>
            <td className="border-r border-black p-0" colSpan={1}>
              <input className={`${readonlyInput} text-right`} {...register("salesClassification.emsMaintenance")} readOnly tabIndex={-1} />
            </td>
            <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
              ITG유지보수
            </th>
            <td className="border-r border-black p-0" colSpan={1}>
              <input className={`${readonlyInput} text-right`} {...register("salesClassification.itgMaintenance")} readOnly tabIndex={-1} />
            </td>
            <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
              ITO
            </th>
            <td className="border-r border-black p-0" colSpan={1}>
              <input className={`${readonlyInput} text-right`} {...register("salesClassification.ito")} readOnly tabIndex={-1} />
            </td>
            <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
              기타
            </th>
            <td className="border-r border-black p-0" colSpan={1}>
              <input className={`${readonlyInput} text-right`} {...register("salesClassification.others")} readOnly tabIndex={-1} />
            </td>
            <td className="bg-red-50 p-0 border-l border-black" colSpan={1}>
              <input className={`${cellInput} text-center text-red-600 font-bold`} readOnly tabIndex={-1} {...register("salesClassification.verification")} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
