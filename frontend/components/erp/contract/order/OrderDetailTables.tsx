"use client";

import { useEffect, useRef } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { productData } from "@/lib/product-data";

export function OrderDetailTables() {
  const { control, register, setValue } = useFormContext();

  const license = useFieldArray({ control, name: "licenseDetails" });
  const service = useFieldArray({ control, name: "serviceDetails" });
  const maintenance = useFieldArray({ control, name: "maintenanceDetails" });
  const otherSales = useFieldArray({ control, name: "otherSalesDetails" });
  const purchase = useFieldArray({ control, name: "purchaseDetails" });

  const licenseData = useWatch({ control, name: "licenseDetails" }) || [];
  const serviceData = useWatch({ control, name: "serviceDetails" }) || [];
  const maintenanceData = useWatch({ control, name: "maintenanceDetails" }) || [];
  const otherSalesData = useWatch({ control, name: "otherSalesDetails" }) || [];
  const purchaseData = useWatch({ control, name: "purchaseDetails" }) || [];

  const licenseDiscount = useWatch({ control, name: "licenseDiscount" });
  const serviceDiscount = useWatch({ control, name: "serviceDiscount" });
  const maintenanceDiscount = useWatch({ control, name: "maintenanceDiscount" });

  // 기본 1줄 자동추가
  const isInitialized = useRef(false);
  useEffect(() => {
    if (!isInitialized.current) {
      if (license.fields.length === 0) license.append({ category: "", group: "", product: "", quantity: "", unitPrice: "", subtotal: "" });
      if (service.fields.length === 0) service.append({ content: "", mm: "", unitPrice: "", subtotal: "" });
      if (maintenance.fields.length === 0) maintenance.append({ content: "", cycle: "", months: "", monthlyAmount: "", subtotal: "" });
      if (otherSales.fields.length === 0) otherSales.append({ content: "", quantity: "", unitPrice: "", subtotal: "" });
      if (purchase.fields.length === 0) purchase.append({ content: "", quantity: "", unitPrice: "", subtotal: "" });
      isInitialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 합계 자동 계산 로직
  const parseNumber = (val: string | number) => {
    if (!val) return 0;
    const num = Number(val.toString().replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  };
  const formatTotal = (num: number) => (num === 0 ? "" : num.toLocaleString());

  useEffect(() => {
    const updateSubtotals = (data: any[], name: string, qtyKey: string, priceKey: string) => {
      data.forEach((item, i) => {
        const sub = parseNumber(item[qtyKey]) * parseNumber(item[priceKey]);
        if (parseNumber(item.subtotal) !== sub) {
          setValue(`${name}.${i}.subtotal`, formatTotal(sub));
        }
      });
    };

    updateSubtotals(licenseData, "licenseDetails", "quantity", "unitPrice");
    updateSubtotals(serviceData, "serviceDetails", "mm", "unitPrice");
    updateSubtotals(maintenanceData, "maintenanceDetails", "months", "monthlyAmount");
    updateSubtotals(otherSalesData, "otherSalesDetails", "quantity", "unitPrice");
    updateSubtotals(purchaseData, "purchaseDetails", "quantity", "unitPrice");
  }, [licenseData, serviceData, maintenanceData, otherSalesData, purchaseData, setValue]);

  // 총 합계(Total) 계산 (소계 합산 + 특별할인 반영)
  const licenseTotal = licenseData.reduce((acc: number, curr: any) => acc + parseNumber(curr.subtotal), 0) + parseNumber(licenseDiscount);
  const serviceTotal = serviceData.reduce((acc: number, curr: any) => acc + parseNumber(curr.subtotal), 0) + parseNumber(serviceDiscount);
  const maintenanceTotal = maintenanceData.reduce((acc: number, curr: any) => acc + parseNumber(curr.subtotal), 0) + parseNumber(maintenanceDiscount);
  const otherSalesTotal = otherSalesData.reduce((acc: number, curr: any) => acc + parseNumber(curr.subtotal), 0);
  const purchaseTotal = purchaseData.reduce((acc: number, curr: any) => acc + parseNumber(curr.subtotal), 0);

  const cellInput = "w-full h-full min-h-[32px] border-0 bg-transparent px-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none";

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

  const TableHeader = ({ title, onAdd }: { title: string; onAdd: () => void }) => (
    <div className="flex justify-between items-end mb-1 mt-6">
      <div className="text-sm font-bold text-slate-800">{title}</div>
      <button type="button" onClick={onAdd} className="text-xs border border-black px-2 py-1 bg-slate-100 hover:bg-slate-200 flex items-center transition-colors">
        <Plus className="w-3 h-3 mr-1" /> 행 추가
      </button>
    </div>
  );

  return (
    <div className="w-full space-y-12 mt-10">
      {/* 매출 */}
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 border-b-2 border-black pb-2 mb-4">매출</h2>

        {/* 라이선스 */}
        <TableHeader title="▶ 라이선스" onAdd={() => license.append({ category: "", group: "", product: "", quantity: "", unitPrice: "", subtotal: "" })} />
        <div className="relative">
          <table className="w-full border-collapse border border-black text-sm text-center table-fixed bg-white">
            <colgroup>
              {Array.from({ length: 10 }).map((_, i) => (
                <col key={i} className="w-[10%]" />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-slate-100 border-b border-black">
                <th className="border-r border-black py-1.5" colSpan={1}>
                  제품분류
                </th>
                <th className="border-r border-black py-1.5" colSpan={1}>
                  제품군
                </th>
                <th className="border-r border-black py-1.5" colSpan={3}>
                  제품명
                </th>
                <th className="border-r border-black py-1.5" colSpan={1}>
                  수량
                </th>
                <th className="border-r border-black py-1.5" colSpan={2}>
                  단가
                </th>
                <th className="py-1.5" colSpan={2}>
                  소계
                </th>
              </tr>
            </thead>
            <tbody>
              {license.fields.map((f, i) => {
                // 각 행별 현재 선택된 제품분류와 제품군 값 로드
                const currentCategory = licenseData[i]?.category;
                const currentGroup = licenseData[i]?.group;

                // 현재 제품명 값이 선택되어 있는지 확인
                const currentProduct = licenseData[i]?.product;

                // 선택된 분류/군에 맞는 옵션 리스트 추출
                const groupOptions = currentCategory && productData[currentCategory] ? Object.keys(productData[currentCategory]) : [];
                const productOptions = currentCategory && currentGroup && productData[currentCategory]?.[currentGroup] ? productData[currentCategory][currentGroup] : [];

                // 하위 드롭다운을 초기화하기 위한 레지스터
                const categoryReg = register(`licenseDetails.${i}.category`);
                const groupReg = register(`licenseDetails.${i}.group`);

                return (
                  <tr key={f.id} className="border-b border-black relative group">
                    <td className="border-r border-black p-0" colSpan={1}>
                      <select
                        className={`${cellInput} text-left [text-align-last:center] cursor-pointer`}
                        {...categoryReg}
                        onChange={(e) => {
                          categoryReg.onChange(e);
                          setValue(`licenseDetails.${i}.group`, ""); // 분류 변경 시 제품군 초기화
                          setValue(`licenseDetails.${i}.product`, ""); // 분류 변경 시 제품명 초기화
                        }}
                      >
                        <option value="" hidden>
                          선택
                        </option>
                        {Object.keys(productData).map((cat) => (
                          <option key={cat} value={cat} className="text-left">
                            {cat}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border-r border-black p-0" colSpan={1}>
                      <select
                        className={`${cellInput} text-left [text-align-last:center] cursor-pointer ${!currentCategory ? "bg-slate-50" : ""}`}
                        {...groupReg}
                        onChange={(e) => {
                          groupReg.onChange(e);
                          setValue(`licenseDetails.${i}.product`, ""); // 제품군 변경 시 제품명 초기화
                        }}
                        disabled={!currentCategory} // 상위항목 미선택시 비활성화
                      >
                        <option value="" hidden>
                          선택
                        </option>
                        {groupOptions.map((grp) => (
                          <option key={grp} value={grp} className="text-left">
                            {grp}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border-r border-black p-0" colSpan={3}>
                      <select
                        className={`${cellInput} text-left [text-align-last:center] cursor-pointer ${!currentGroup ? "bg-slate-50" : ""}`}
                        {...register(`licenseDetails.${i}.product`)}
                        disabled={!currentGroup} // 상위항목 미선택시 비활성화
                      >
                        <option value="" hidden>
                          선택
                        </option>
                        {productOptions.map((prod) => (
                          <option key={prod} value={prod} className="text-left">
                            {prod}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border-r border-black p-0" colSpan={1}>
                      <input className={`${cellInput} text-center`} {...registerNumber(`licenseDetails.${i}.quantity`)} />
                    </td>
                    <td className="border-r border-black p-0" colSpan={2}>
                      <input className={`${cellInput} text-right`} {...registerNumber(`licenseDetails.${i}.unitPrice`)} />
                    </td>
                    <td className="bg-orange-100 border-r border-black p-0" colSpan={2}>
                      <input className={`${cellInput} text-right text-slate-600 font-semibold`} readOnly tabIndex={-1} {...registerNumber(`licenseDetails.${i}.subtotal`)} />
                    </td>
                    <td className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => license.remove(i)} className="p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-green-200 border-b border-black">
                <td className="border-r border-black p-2 text-center font-medium" colSpan={8}>
                  특별할인 (마이너스 금액으로 표기요망)
                </td>
                <td className="p-0" colSpan={2}>
                  <input className={`${cellInput} text-right text-red-600 font-semibold`} {...registerNumber("licenseDiscount")} />
                </td>
              </tr>
              <tr className="bg-yellow-200 font-bold border-b border-black">
                <td className="border-r border-black p-2 text-center text-slate-700" colSpan={8}>
                  합계
                </td>
                <td className="p-0" colSpan={2}>
                  <input className={`${cellInput} text-right font-bold text-blue-700`} readOnly value={formatTotal(licenseTotal)} tabIndex={-1} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 용역 */}
        <TableHeader title="▶ 용역" onAdd={() => service.append({ content: "", mm: "", unitPrice: "", subtotal: "" })} />
        <div className="relative">
          <table className="w-full border-collapse border border-black text-sm text-center table-fixed bg-white">
            <colgroup>
              {Array.from({ length: 10 }).map((_, i) => (
                <col key={i} className="w-[10%]" />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-slate-100 border-b border-black">
                <th className="border-r border-black py-1.5" colSpan={5}>
                  내용
                </th>
                <th className="border-r border-black py-1.5" colSpan={1}>
                  M/M
                </th>
                <th className="border-r border-black py-1.5" colSpan={2}>
                  단가
                </th>
                <th className="py-1.5" colSpan={2}>
                  소계
                </th>
              </tr>
            </thead>
            <tbody>
              {service.fields.map((f, i) => (
                <tr key={f.id} className="border-b border-black relative group">
                  <td className="border-r border-black p-0" colSpan={5}>
                    <input className={cellInput} {...register(`serviceDetails.${i}.content`)} />
                  </td>
                  <td className="border-r border-black p-0" colSpan={1}>
                    <input className={`${cellInput} text-center`} {...registerNumber(`serviceDetails.${i}.mm`)} />
                  </td>
                  <td className="border-r border-black p-0" colSpan={2}>
                    <input className={`${cellInput} text-right`} {...registerNumber(`serviceDetails.${i}.unitPrice`)} />
                  </td>
                  <td className="bg-orange-100 border-r border-black p-0" colSpan={2}>
                    <input className={`${cellInput} text-right`} {...registerNumber(`serviceDetails.${i}.subtotal`)} />
                  </td>
                  <td className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => service.remove(i)} className="p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-green-200 border-b border-black">
                <td className="border-r border-black p-2 text-center font-medium" colSpan={8}>
                  특별할인 (마이너스 금액으로 표기요망)
                </td>
                <td className="p-0" colSpan={2}>
                  <input className={`${cellInput} text-right text-red-600 font-semibold`} {...registerNumber("serviceDiscount")} />
                </td>
              </tr>
              <tr className="bg-yellow-200 font-bold border-b border-black">
                <td className="border-r border-black p-2 text-center text-slate-700" colSpan={8}>
                  합계
                </td>
                <td className="p-0" colSpan={2}>
                  <input className={`${cellInput} text-right font-bold text-blue-700`} readOnly value={formatTotal(serviceTotal)} tabIndex={-1} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 유지보수 */}
        <TableHeader title="▶ 유지보수" onAdd={() => maintenance.append({ content: "", cycle: "", months: "", monthlyAmount: "", subtotal: "" })} />
        <div className="relative">
          <table className="w-full border-collapse border border-black text-sm text-center table-fixed bg-white">
            <colgroup>
              {Array.from({ length: 10 }).map((_, i) => (
                <col key={i} className="w-[10%]" />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-slate-100 border-b border-black">
                <th className="border-r border-black py-1.5" colSpan={4}>
                  내용
                </th>
                <th className="border-r border-black py-1.5" colSpan={1}>
                  월/분기/반기
                  <br />
                  (방문주기)
                </th>
                <th className="border-r border-black py-1.5" colSpan={1}>
                  개월 수
                </th>
                <th className="border-r border-black py-1.5" colSpan={2}>
                  유지보수 금액
                  <br />
                  (월기준)
                </th>
                <th className="py-1.5" colSpan={2}>
                  소계
                </th>
              </tr>
            </thead>
            <tbody>
              {maintenance.fields.map((f, i) => (
                <tr key={f.id} className="border-b border-black relative group">
                  <td className="border-r border-black p-0" colSpan={4}>
                    <input className={cellInput} {...register(`maintenanceDetails.${i}.content`)} />
                  </td>
                  <td className="border-r border-black p-0" colSpan={1}>
                    <select className={`${cellInput} text-left [text-align-last:center]`} {...register(`maintenanceDetails.${i}.cycle`)}>
                      <option value="" hidden>
                        선택
                      </option>
                      <option value="월">월</option>
                      <option value="분기">분기</option>
                      <option value="반기">반기</option>
                    </select>
                  </td>
                  <td className="border-r border-black p-0" colSpan={1}>
                    <input className={`${cellInput} text-center`} {...registerNumber(`maintenanceDetails.${i}.months`)} />
                  </td>
                  <td className="border-r border-black p-0" colSpan={2}>
                    <input className={`${cellInput} text-right`} {...registerNumber(`maintenanceDetails.${i}.monthlyAmount`)} />
                  </td>
                  <td className="bg-orange-100 border-r border-black p-0" colSpan={2}>
                    <input className={`${cellInput} text-right`} {...registerNumber(`maintenanceDetails.${i}.subtotal`)} />
                  </td>
                  <td className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => maintenance.remove(i)} className="p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-green-200 border-b border-black">
                <td className="border-r border-black p-2 text-center font-medium" colSpan={8}>
                  특별할인 (마이너스 금액으로 표기요망)
                </td>
                <td className="p-0" colSpan={2}>
                  <input className={`${cellInput} text-right text-red-600 font-semibold`} {...registerNumber("maintenanceDiscount")} />
                </td>
              </tr>
              <tr className="bg-yellow-200 font-bold border-b border-black">
                <td className="border-r border-black p-2 text-center text-slate-700" colSpan={8}>
                  합계
                </td>
                <td className="p-0" colSpan={2}>
                  <input className={`${cellInput} text-right font-bold text-blue-700`} readOnly value={formatTotal(maintenanceTotal)} tabIndex={-1} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 기타 매출 */}
        <TableHeader title="▶ 기타 (3rd party H/W, S/W, Bypass 매출 등)" onAdd={() => otherSales.append({ content: "", quantity: "", unitPrice: "", subtotal: "" })} />
        <div className="relative">
          <table className="w-full border-collapse border border-black text-sm text-center table-fixed bg-white">
            <colgroup>
              {Array.from({ length: 10 }).map((_, i) => (
                <col key={i} className="w-[10%]" />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-slate-100 border-b border-black">
                <th className="border-r border-black py-1.5" colSpan={5}>
                  내용
                </th>
                <th className="border-r border-black py-1.5" colSpan={1}>
                  수량
                </th>
                <th className="border-r border-black py-1.5" colSpan={2}>
                  단가
                </th>
                <th className="py-1.5" colSpan={2}>
                  소계
                </th>
              </tr>
            </thead>
            <tbody>
              {otherSales.fields.map((f, i) => (
                <tr key={f.id} className="border-b border-black relative group">
                  <td className="border-r border-black p-0" colSpan={5}>
                    <input className={cellInput} {...register(`otherSalesDetails.${i}.content`)} />
                  </td>
                  <td className="border-r border-black p-0" colSpan={1}>
                    <input className={`${cellInput} text-center`} {...registerNumber(`otherSalesDetails.${i}.quantity`)} />
                  </td>
                  <td className="border-r border-black p-0" colSpan={2}>
                    <input className={`${cellInput} text-right`} {...registerNumber(`otherSalesDetails.${i}.unitPrice`)} />
                  </td>
                  <td className="bg-orange-100 border-r border-black p-0" colSpan={2}>
                    <input className={`${cellInput} text-right`} {...registerNumber(`otherSalesDetails.${i}.subtotal`)} />
                  </td>
                  <td className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => otherSales.remove(i)} className="p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-yellow-200 font-bold border-b border-black">
                <td className="border-r border-black p-2 text-center text-slate-700" colSpan={8}>
                  합계
                </td>
                <td className="p-0" colSpan={2}>
                  <input className={`${cellInput} text-right font-bold text-blue-700`} readOnly value={formatTotal(otherSalesTotal)} tabIndex={-1} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-4">
        <h2 className="text-lg font-extrabold text-slate-900 border-b-2 border-black pb-2 mb-4">매입</h2>

        <TableHeader title="▶ 매입 (VAT별도)" onAdd={() => purchase.append({ content: "", quantity: "", unitPrice: "", subtotal: "" })} />
        <div className="relative pb-8">
          <table className="w-full border-collapse border border-black text-sm text-center table-fixed bg-white">
            <colgroup>
              {Array.from({ length: 10 }).map((_, i) => (
                <col key={i} className="w-[10%]" />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-slate-100 border-b border-black">
                <th className="border-r border-black py-1.5" colSpan={5}>
                  내용
                </th>
                <th className="border-r border-black py-1.5" colSpan={1}>
                  수량
                </th>
                <th className="border-r border-black py-1.5" colSpan={2}>
                  단가
                </th>
                <th className="py-1.5" colSpan={2}>
                  소계
                </th>
              </tr>
            </thead>
            <tbody>
              {purchase.fields.map((f, i) => (
                <tr key={f.id} className="border-b border-black relative group">
                  <td className="border-r border-black p-0" colSpan={5}>
                    <input className={cellInput} {...register(`purchaseDetails.${i}.content`)} />
                  </td>
                  <td className="border-r border-black p-0" colSpan={1}>
                    <input className={`${cellInput} text-center`} {...registerNumber(`purchaseDetails.${i}.quantity`)} />
                  </td>
                  <td className="border-r border-black p-0" colSpan={2}>
                    <input className={`${cellInput} text-right`} {...registerNumber(`purchaseDetails.${i}.unitPrice`)} />
                  </td>
                  <td className="bg-orange-100 border-r border-black p-0" colSpan={2}>
                    <input className={`${cellInput} text-right`} {...registerNumber(`purchaseDetails.${i}.subtotal`)} />
                  </td>
                  <td className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => purchase.remove(i)} className="p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-yellow-200 font-bold border-b border-black">
                <td className="border-r border-black p-2 text-center text-slate-700" colSpan={8}>
                  합계
                </td>
                <td className="p-0" colSpan={2}>
                  <input className={`${cellInput} text-right font-bold text-blue-700`} readOnly value={formatTotal(purchaseTotal)} tabIndex={-1} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
