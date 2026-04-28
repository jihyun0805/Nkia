"use client";

import { useEffect } from "react";
import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

export function OrderScopeSection() {
  const { register, control } = useFormContext();
  const maintenanceSummary = useFieldArray({ control, name: "maintenanceSummary" });
  const summaryData = useWatch({ control, name: "maintenanceSummary" }) || [];

  const registerNumber = (name: string) => {
    const { onChange, ...rest } = register(name);
    return {
      ...rest,
      type: "text",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const isNegative = val.startsWith("-");
        const raw = val.replace(/[^\d]/g, "");
        e.target.value = raw ? (isNegative ? "-" : "") + Number(raw).toLocaleString() : isNegative ? "-" : "";
        onChange(e);
      },
    };
  };

  // 기본 1줄 자동추가
  useEffect(() => {
    if (maintenanceSummary.fields.length === 0) {
      maintenanceSummary.append({ year: "", projectAmount: "", license: "", thirdParty: "", service: "", maintenance: "", rate: "" });
    }
  }, [maintenanceSummary.fields.length, maintenanceSummary.append]);

  // 자동 합산 로직
  const parseNumber = (val: string | number) => {
    if (!val) return 0;
    const num = Number(val.toString().replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  };

  const totals = summaryData.reduce(
    (acc: any, curr: any) => ({
      projectAmount: acc.projectAmount + parseNumber(curr.projectAmount),
      license: acc.license + parseNumber(curr.license),
      thirdParty: acc.thirdParty + parseNumber(curr.thirdParty),
      service: acc.service + parseNumber(curr.service),
      maintenance: acc.maintenance + parseNumber(curr.maintenance),
    }),
    { projectAmount: 0, license: 0, thirdParty: 0, service: 0, maintenance: 0 },
  );

  const formatTotal = (num: number) => (num === 0 ? "" : num.toLocaleString());

  const cellInput = "w-full h-full min-h-[32px] border-0 bg-transparent px-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none";
  const cellTextarea = "w-full h-full min-h-[80px] border-0 bg-transparent p-2 text-sm resize-none focus:ring-2 focus:ring-blue-600 outline-none leading-relaxed";

  return (
    <div className="w-full">
      <table className="w-full border-collapse border border-black text-sm table-fixed -mt-[1px] bg-white">
        <colgroup>
          {Array.from({ length: 10 }).map((_, i) => (
            <col key={i} className="w-[10%]" />
          ))}
        </colgroup>
        <tbody>
          <tr className="border-b border-black">
            <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
              사업범위
            </th>
            <td className="p-0" colSpan={9}>
              <textarea className={cellTextarea} {...register("businessScope")} />
            </td>
          </tr>

          {/* 첨부서류 */}
          <tr className="border-b border-black">
            <th className="bg-slate-100 border-r border-black py-1.5 text-center font-semibold" colSpan={2} rowSpan={2}>
              첨부서류
            </th>
            <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
              견적서
            </th>
            <td className="border-r border-black p-0" colSpan={1}>
              <input className={`${cellInput} text-center`} maxLength={1} {...register("attachments.quotation")} />
            </td>
            <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
              계약서
            </th>
            <td className="border-r border-black p-0" colSpan={1}>
              <input className={`${cellInput} text-center`} maxLength={1} {...register("attachments.contract")} />
            </td>
            <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
              발주서
            </th>
            <td className="border-r border-black p-0" colSpan={1}>
              <input className={`${cellInput} text-center`} maxLength={1} {...register("attachments.purchaseOrder")} />
            </td>
            <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
              PRB보고서
            </th>
            <td className="p-0" colSpan={1}>
              <input className={`${cellInput} text-center`} maxLength={1} {...register("attachments.prbReport")} />
            </td>
          </tr>
          <tr className="border-b border-black">
            <th className="bg-slate-50 border-r border-black py-1.5 text-center font-medium" colSpan={1}>
              기타서류
            </th>
            <td className="p-0" colSpan={7}>
              <input className={cellInput} {...register("attachments.others")} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* 유지보수 수주보고 표 */}
      <div className="pt-6 pb-12">
        <div className="flex justify-between items-end mb-1">
          <div className="text-sm font-bold text-purple-800">※ 유지보수 수주보고 시 작성</div>
          <button
            type="button"
            onClick={() => maintenanceSummary.append({ year: "", projectAmount: "", license: "", thirdParty: "", service: "", maintenance: "", rate: "" })}
            className="text-xs border border-black px-2 py-1 bg-slate-100 hover:bg-slate-200 flex items-center transition-colors"
          >
            <Plus className="w-3 h-3 mr-1" /> 행 추가
          </button>
        </div>

        <div className="relative">
          <table className="w-full border-collapse border border-black text-sm text-center table-fixed bg-white">
            <colgroup>
              {Array.from({ length: 10 }).map((_, i) => (
                <col key={i} className="w-[10%]" />
              ))}
            </colgroup>
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
              {maintenanceSummary.fields.map((f, i) => (
                <tr key={f.id} className="border-b border-black relative group">
                  <td className="border-r border-black p-0" colSpan={2}>
                    <input className={`${cellInput} text-center`} {...register(`maintenanceSummary.${i}.year`)} />
                  </td>
                  <td className="border-r border-black p-0" colSpan={3}>
                    <input className={`${cellInput} text-right`} {...registerNumber(`maintenanceSummary.${i}.projectAmount`)} />
                  </td>
                  <td className="border-r border-black p-0" colSpan={1}>
                    <input className={`${cellInput} text-right`} {...registerNumber(`maintenanceSummary.${i}.license`)} />
                  </td>
                  <td className="border-r border-black p-0" colSpan={1}>
                    <input className={`${cellInput} text-right`} {...registerNumber(`maintenanceSummary.${i}.thirdParty`)} />
                  </td>
                  <td className="border-r border-black p-0" colSpan={1}>
                    <input className={`${cellInput} text-right`} {...registerNumber(`maintenanceSummary.${i}.service`)} />
                  </td>
                  <td className="border-r border-black p-0" colSpan={1}>
                    <input className={`${cellInput} text-right`} {...registerNumber(`maintenanceSummary.${i}.maintenance`)} />
                  </td>
                  <td className="p-0" colSpan={1}>
                    <input className={`${cellInput} text-center`} {...register(`maintenanceSummary.${i}.rate`)} />
                  </td>

                  {/* 삭제 버튼 */}
                  <td className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => maintenanceSummary.remove(i)} className="p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50" title="행 삭제">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              <tr className="bg-yellow-200 font-bold border-b border-black">
                <td className="border-r border-black py-2 text-center text-slate-700" colSpan={2}>
                  합계
                </td>
                <td className="border-r border-black p-0" colSpan={3}>
                  <input className={`${cellInput} text-right font-bold text-blue-700`} readOnly value={formatTotal(totals.projectAmount)} tabIndex={-1} />
                </td>
                <td className="border-r border-black p-0" colSpan={1}>
                  <input className={`${cellInput} text-right font-bold text-blue-700`} readOnly value={formatTotal(totals.license)} tabIndex={-1} />
                </td>
                <td className="border-r border-black p-0" colSpan={1}>
                  <input className={`${cellInput} text-right font-bold text-blue-700`} readOnly value={formatTotal(totals.thirdParty)} tabIndex={-1} />
                </td>
                <td className="border-r border-black p-0" colSpan={1}>
                  <input className={`${cellInput} text-right font-bold text-blue-700`} readOnly value={formatTotal(totals.service)} tabIndex={-1} />
                </td>
                <td className="border-r border-black p-0" colSpan={1}>
                  <input className={`${cellInput} text-right font-bold text-blue-700`} readOnly value={formatTotal(totals.maintenance)} tabIndex={-1} />
                </td>
                <td className="bg-yellow-200 p-0 bg-slate-100" colSpan={1}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
