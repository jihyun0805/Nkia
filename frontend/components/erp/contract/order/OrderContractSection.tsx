"use client";

import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { adminApi } from "@/lib/api/admin-api";
import { loadBackendFindingData, loadBackendCompanyManagers } from "@/lib/finding-backend";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

function ComboboxCell({
  value,
  onChange,
  options,
  placeholder = "선택",
  disabled = false,
  className,
}: {
  value: any;
  onChange: (value: any) => void;
  options: { value: any; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (!open) {
      const selected = options.find((opt) => String(opt.value) === String(value));
      setInputValue(selected ? selected.label : "");
    }
  }, [value, options, open]);

  const filteredOptions = options.filter((opt) => opt.label.toLowerCase().includes(inputValue.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <input
          type="text"
          disabled={disabled}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
            if (e.target.value === "") {
              onChange("");
            }
          }}
          onFocus={() => setOpen(true)}
          className={cn(
            "w-full h-full min-h-[32px] text-center border-0 bg-transparent px-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none disabled:opacity-50 placeholder:text-slate-400",
            className,
          )}
        />
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="center" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command shouldFilter={false}>
          <CommandList>
            {inputValue.trim().length === 0 ? (
              <div className="py-4 px-2 text-center text-xs text-slate-500">검색어를 입력해 주세요.</div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm">결과가 없습니다.</div>
            ) : (
              <CommandGroup>
                {filteredOptions.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => {
                      onChange(opt.value);
                      setInputValue(opt.label);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", String(value) === String(opt.value) ? "opacity-100" : "opacity-0")} />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

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

  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [contractManagers, setContractManagers] = useState<any[]>([]);
  const [finalManagers, setFinalManagers] = useState<any[]>([]);

  const contractCompanyId = useWatch({ control, name: "contractPartner.companyId" });
  const finalCompanyId = useWatch({ control, name: "finalCustomer.companyId" });
  const contractManagerId = useWatch({ control, name: "contractPartner.managerId" });
  const finalManagerId = useWatch({ control, name: "finalCustomer.managerId" });
  const pmId = useWatch({ control, name: "pmId" });

  useEffect(() => {
    adminApi
      .getUsers()
      .then((res) => setUsers(res.data || []))
      .catch(console.error);
    loadBackendFindingData()
      .then((data) => {
        setCompanies([...data.customers, ...data.partners]);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (contractCompanyId) {
      loadBackendCompanyManagers(contractCompanyId).then(setContractManagers).catch(console.error);
    } else {
      setContractManagers([]);
    }
  }, [contractCompanyId]);

  useEffect(() => {
    if (finalCompanyId) {
      loadBackendCompanyManagers(finalCompanyId).then(setFinalManagers).catch(console.error);
    } else {
      setFinalManagers([]);
    }
  }, [finalCompanyId]);

  useEffect(() => {
    const manager = contractManagers.find((m) => String(m.id) === String(contractManagerId));
    if (manager) {
      setValue("contractPartner.contact", manager.mobilePhone || manager.officePhone || manager.email || "");
    } else if (contractManagerId) {
    } else {
      setValue("contractPartner.contact", "");
    }
  }, [contractManagerId, contractManagers, setValue]);

  useEffect(() => {
    const manager = finalManagers.find((m) => String(m.id) === String(finalManagerId));
    if (manager) {
      setValue("finalCustomer.contact", manager.mobilePhone || manager.officePhone || manager.email || "");
    } else if (finalManagerId) {
    } else {
      setValue("finalCustomer.contact", "");
    }
  }, [finalManagerId, finalManagers, setValue]);

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
            <select className={`${cellInput} text-center [text-align-last:center]`} {...register("type")}>
              <option value="" hidden>
                선택
              </option>
              <option value="SOLUTION" className="text-left">
                솔루션
              </option>
              <option value="MAINTENANCE" className="text-left">
                유지보수
              </option>
              <option value="SERVICE" className="text-left">
                용역
              </option>
            </select>
          </td>
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            채널유무
          </th>
          <td className="border-r border-black p-0" colSpan={2}>
            <select className={`${cellInput} text-center [text-align-last:center]`} {...register("hasChannel")}>
              <option value="" hidden>
                선택
              </option>
              <option value="Y" className="text-left">
                O
              </option>
              <option value="N" className="text-left">
                X
              </option>
            </select>
          </td>
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            코드분류
          </th>
          <td className="p-0" colSpan={3}>
            <select className={`${cellInput} text-center cursor-pointer`} {...register("codeClassification")}>
              <option value="" hidden>
                선택
              </option>
              <option value="GN" className="text-left">
                공공신규: GN
              </option>
              <option value="GA" className="text-left">
                공공증설: GA
              </option>
              <option value="JN" className="text-left">
                3자단가신규: JN
              </option>
              <option value="JA" className="text-left">
                3자단가증설: JA
              </option>
              <option value="MN" className="text-left">
                민간신규: MN
              </option>
              <option value="MA" className="text-left">
                민간증설: MA
              </option>
              <option value="GN-MA" className="text-left">
                [공공]신규 고객사 유지보수: GN-MA
              </option>
              <option value="GE-MA" className="text-left">
                [공공]기존 유지보수(연장): GE-MA
              </option>
              <option value="GL-MA" className="text-left">
                [공공]추가 라이선스 유상전환: GL-MA
              </option>
              <option value="MN-MA" className="text-left">
                [민간]신규 고객사 유지보수: MN-MA
              </option>
              <option value="ME-MA" className="text-left">
                [민간]기존 유지보수(연장): ME-MA
              </option>
              <option value="ML-MA" className="text-left">
                [민간]추가 라이선스 유상전환: ML-MA
              </option>
            </select>
          </td>
        </tr>
        <tr className="border-b border-black">
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            수행PM
          </th>
          <td className="p-0" colSpan={9}>
            <ComboboxCell
              value={pmId || ""}
              onChange={(val) => setValue("pmId", val)}
              options={users.map((u) => ({ value: u.id, label: `${u.name} (${u.roles?.join(", ") || ""})` }))}
              className="text-center"
            />
          </td>
        </tr>
        <tr className="border-b border-black">
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            계약상대
          </th>
          <td className="border-r border-black p-0" colSpan={4}>
            <ComboboxCell
              value={contractCompanyId || ""}
              onChange={(val) => {
                setValue("contractPartner.companyId", val);
                setValue("contractPartner.managerId", ""); // 회사 변경 시 담당자 초기화
              }}
              options={companies.map((c) => ({ value: c.backendId, label: c.name }))}
              className="text-center"
            />
          </td>
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            최종고객사
          </th>
          <td className="p-0" colSpan={4}>
            <ComboboxCell
              value={finalCompanyId || ""}
              onChange={(val) => {
                setValue("finalCustomer.companyId", val);
                setValue("finalCustomer.managerId", ""); // 회사 변경 시 담당자 초기화
              }}
              options={companies.map((c) => ({ value: c.backendId, label: c.name }))}
              className="text-center"
            />
          </td>
        </tr>
        <tr className="border-b border-black">
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            담당자
          </th>
          <td className="border-r border-black p-0" colSpan={4}>
            <ComboboxCell
              value={contractManagerId || ""}
              onChange={(val) => setValue("contractPartner.managerId", val)}
              options={contractManagers.map((m) => ({ value: m.id, label: m.name }))}
              disabled={!contractCompanyId}
              className={`text-center ${!contractCompanyId ? "bg-slate-50" : ""}`}
            />
          </td>
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            담당자
          </th>
          <td className="p-0" colSpan={4}>
            <ComboboxCell
              value={finalManagerId || ""}
              onChange={(val) => setValue("finalCustomer.managerId", val)}
              options={finalManagers.map((m) => ({ value: m.id, label: m.name }))}
              disabled={!finalCompanyId}
              className={`text-center ${!finalCompanyId ? "bg-slate-50" : ""}`}
            />
          </td>
        </tr>
        <tr className="border-b border-black">
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            연락처
          </th>
          <td className="border-r border-black p-0 bg-slate-50" colSpan={4}>
            <input className={`${cellInput} text-center font-semibold text-slate-600`} readOnly tabIndex={-1} {...register("contractPartner.contact")} />
          </td>
          <th className="bg-slate-100 border-r border-black py-2 text-center font-semibold" colSpan={1}>
            연락처
          </th>
          <td className="p-0 bg-slate-50" colSpan={4}>
            <input className={`${cellInput} text-center font-semibold text-slate-600`} readOnly tabIndex={-1} {...register("finalCustomer.contact")} />
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
