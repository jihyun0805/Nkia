"use client";

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";

export function OrderBasicSection() {
  const { register, control, setValue } = useFormContext();
  const cellInput = "w-full h-full min-h-[32px] border-0 bg-transparent px-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none";

  const registerNumber = (name: string) => {
    const { onChange, ...rest } = register(name);
    return {
      ...rest,
      type: "text",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const isNegative = val.startsWith("-");
        const raw = val.replace(/[^\d]/g, ""); // 숫자만 추출
        e.target.value = raw ? (isNegative ? "-" : "") + Number(raw).toLocaleString() : isNegative ? "-" : "";
        onChange(e); // React Hook Form에 값 전달
      },
    };
  };

  // 계산에 필요한 필드 실시간 감지
  const [totalAmount, ems, emsMaintenance, itg, itgMaintenance, dashboard, ito, aiotion, others] = useWatch({
    control,
    name: [
      "totalAmount",
      "salesClassification.ems",
      "salesClassification.emsMaintenance",
      "salesClassification.itg",
      "salesClassification.itgMaintenance",
      "salesClassification.dashboard",
      "salesClassification.ito",
      "salesClassification.aiotion",
      "salesClassification.others",
    ],
  });

  // 값이 변경될 때마다 검증(Verification) 값 자동계산
  useEffect(() => {
    const parseNum = (val: string | number | undefined) => {
      if (!val) return 0;
      const num = Number(val.toString().replace(/,/g, ""));
      return isNaN(num) ? 0 : num;
    };

    const total = parseNum(totalAmount);
    const salesSum = parseNum(ems) + parseNum(emsMaintenance) + parseNum(itg) + parseNum(itgMaintenance) + parseNum(dashboard) + parseNum(ito) + parseNum(aiotion) + parseNum(others);

    const verification = salesSum - total;

    // 포맷팅하여 폼 상태에 자동 반영
    setValue("salesClassification.verification", verification.toLocaleString());
  }, [totalAmount, ems, emsMaintenance, itg, itgMaintenance, dashboard, ito, aiotion, others, setValue]);

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
              <input className={`${cellInput} text-right`} {...registerNumber("totalAmount")} />
            </td>
            <th className="text-center font-medium" colSpan={1}>
              (VAT별도)
            </th>
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
              <input className={`${cellInput} text-right`} {...registerNumber("salesClassification.ems")} />
            </td>
            <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
              ITG
            </th>
            <td className="border-r border-black p-0" colSpan={1}>
              <input className={`${cellInput} text-right`} {...registerNumber("salesClassification.itg")} />
            </td>
            <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
              대시보드
            </th>
            <td className="border-r border-black p-0" colSpan={1}>
              <input className={`${cellInput} text-right`} {...registerNumber("salesClassification.dashboard")} />
            </td>
            <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
              AIOTION
            </th>
            <td className="border-r border-black p-0" colSpan={1}>
              <input className={`${cellInput} text-right`} {...registerNumber("salesClassification.aiotion")} />
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
              <input className={`${cellInput} text-right`} {...registerNumber("salesClassification.emsMaintenance")} />
            </td>
            <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
              ITG유지보수
            </th>
            <td className="border-r border-black p-0" colSpan={1}>
              <input className={`${cellInput} text-right`} {...registerNumber("salesClassification.itgMaintenance")} />
            </td>
            <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
              ITO
            </th>
            <td className="border-r border-black p-0" colSpan={1}>
              <input className={`${cellInput} text-right`} {...registerNumber("salesClassification.ito")} />
            </td>
            <th className="bg-slate-50 border-r border-black font-medium" colSpan={1}>
              기타
            </th>
            <td className="border-r border-black p-0" colSpan={1}>
              <input className={`${cellInput} text-right`} {...registerNumber("salesClassification.others")} />
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
