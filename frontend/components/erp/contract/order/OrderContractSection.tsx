"use client";

import { use, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";

export function OrderContractSection() {
  const { register, control, setValue } = useFormContext();
  const cellInput = "w-full h-full min-h-[32px] border-0 bg-transparent px-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none";

  const startDate = useWatch({ control, name: "startDate" });
  const endDate = useWatch({ control, name: "endDate" });

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end >= start) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const totalDays = diffDays + 1;

        setValue("contractPeriod", `( ${totalDays} 일 )`);
      } else {
        setValue("contractPeriod", "오류");
      }
    } else {
      setValue("contractPeriod", "");
    }
  }, [startDate, endDate, setValue]);

  return (
    <table className="w-full border-collapse border border-black text-sm table-fixed -mt-[1px] bg-white">
      <colgroup>
        {Array.from({ length: 10 }).map((_, i) => (
          <col key={i} className="w-[10%]" />
        ))}
      </colgroup>
      <tbody>
        <tr className="border-b border-black">
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            유형
          </th>
          <td className="border-r border-black p-0" colSpan={2}>
            <input className={`${cellInput} text-center`} {...register("type")} />
          </td>
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            채널유무
          </th>
          <td className="border-r border-black p-0" colSpan={2}>
            <input className={`${cellInput} text-center`} {...register("hasChannel")} />
          </td>
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            코드분류
          </th>
          <td className="p-0" colSpan={3}>
            <input className={`${cellInput} text-center`} {...register("codeClassification")} />
          </td>
        </tr>
        <tr className="border-b border-black">
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            수행PM
          </th>
          <td className="p-0" colSpan={9}>
            <input className={`${cellInput} text-center`} {...register("pmName")} />
          </td>
        </tr>
        <tr className="border-b border-black">
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            계약상대
          </th>
          <td className="border-r border-black p-0" colSpan={4}>
            <input className={`${cellInput} text-center`} {...register("contractPartner.name")} />
          </td>
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            최종고객사
          </th>
          <td className="p-0" colSpan={4}>
            <input className={`${cellInput} text-center`} {...register("finalCustomer.name")} />
          </td>
        </tr>
        <tr className="border-b border-black">
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            담당자
          </th>
          <td className="border-r border-black p-0" colSpan={4}>
            <input className={`${cellInput} text-center`} {...register("contractPartner.manager")} />
          </td>
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            담당자
          </th>
          <td className="p-0" colSpan={4}>
            <input className={`${cellInput} text-center`} {...register("finalCustomer.manager")} />
          </td>
        </tr>
        <tr className="border-b border-black">
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            연락처
          </th>
          <td className="border-r border-black p-0" colSpan={4}>
            <input className={`${cellInput} text-center`} {...register("contractPartner.contact")} />
          </td>
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            연락처
          </th>
          <td className="p-0" colSpan={4}>
            <input className={`${cellInput} text-center`} {...register("finalCustomer.contact")} />
          </td>
        </tr>
        <tr className="border-b border-black">
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={2}>
            계약일자(발주일자)
          </th>
          <td className="border-r border-black p-0" colSpan={3}>
            <input type="date" className={`${cellInput} text-center`} {...register("contractDate")} />
          </td>
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1} rowSpan={2}>
            계약기간
          </th>
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            시작일
          </th>
          <td className="border-r border-black p-0" colSpan={2}>
            <input type="date" className={`${cellInput} text-center`} {...register("startDate")} />
          </td>
          <td className="bg-yellow-200 p-0" colSpan={1} rowSpan={2}>
            <input className={`${cellInput} text-center font-bold text-blue-700`} readOnly tabIndex={-1} {...register("contractPeriod")} />
          </td>
        </tr>
        <tr className="border-b border-black">
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={2}>
            무상유지보수기간
          </th>
          <td className="border-r border-black p-0" colSpan={3}>
            <input className={`${cellInput} text-center`} placeholder="해당없음" {...register("freeMaintenancePeriod")} />
          </td>
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            종료일
          </th>
          <td className="border-r border-black p-0" colSpan={2}>
            <input type="date" className={`${cellInput} text-center`} {...register("endDate")} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
