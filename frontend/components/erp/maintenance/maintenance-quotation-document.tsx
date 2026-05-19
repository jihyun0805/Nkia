"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { projectApi } from "@/lib/api/project-api";
import { adminApi } from "@/lib/api/admin-api";
import type { MaintenanceQuotationCreateRequest } from "@/lib/api/maintenance";
import type { UserResponse, ProductModuleResponse } from "@/lib/api/admin-api";
import type { ProjectListResponse } from "@/lib/api/project-api";

// 한국어 숫자 변환
function numberToKorean(num: number): string {
  if (!num || isNaN(num) || num <= 0) return "";
  const D = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  const BIG = ["", "만", "억", "조"];
  const grp = (n: number): string => {
    const t = Math.floor(n / 1000),
      h = Math.floor((n % 1000) / 100);
    const te = Math.floor((n % 100) / 10),
      o = n % 10;
    return (t ? (t === 1 ? "천" : D[t] + "천") : "") + (h ? (h === 1 ? "백" : D[h] + "백") : "") + (te ? (te === 1 ? "십" : D[te] + "십") : "") + (o ? D[o] : "");
  };
  const parts: string[] = [];
  let n = num,
    i = 0;
  while (n > 0) {
    const g = n % 10000;
    if (g) parts.unshift(grp(g) + BIG[i]);
    n = Math.floor(n / 10000);
    i++;
  }
  return parts.join("");
}

function won(v: string | number): string {
  const n = typeof v === "string" ? Number(v.replace(/[^0-9]/g, "")) : v;
  if (!n || isNaN(n)) return "0";
  return n.toLocaleString("ko-KR");
}

function koreanDate(d: string): string {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`;
}

function monthDiff(s: string, e: string): number {
  if (!s || !e) return 0;
  const a = new Date(s),
    b = new Date(e);
  return (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + 1;
}

// 상수
const PROPOSAL_TYPES = [
  { value: "SELF", label: "자체 제안" },
  { value: "SI", label: "SI 제안" },
];
const PRODUCT_FAMILIES = [
  { value: "EMS", label: "EMS" },
  { value: "ITSM", label: "ITSM" },
  { value: "AUTOMATION", label: "Automation" },
  { value: "WSS", label: "WSS" },
];
// 유지보수 서비스 템플릿 (editable=true 항목만 사용자가 내용 입력)
const SERVICE_TEMPLATE = [
  { category: "기본 서비스", item: "일상지원", defaultContent: "평일: 09:00 ~ 18:00\n- 업무시간 이후 익일 서비스 지원\n- 1차 유선지원, 2차 방문지원", editable: false },
  { category: "기본 서비스", item: "긴급/장애 지원", defaultContent: "24시간 * 365일 지원\n- 8시간 이내 대응 및 24시간 이내 조치", editable: false },
  { category: "기본 서비스", item: "정기점검", defaultContent: "", editable: true },
  { category: "기본 서비스", item: "제품 패치", defaultContent: "- 고객사 보안 취약점 조치 지원\n- 제품 결함에 대한 Hotfix 패치 지원", editable: false },
  { category: "추가 서비스", item: "OZ 보고서", defaultContent: "신규보고서 유상 제공, 기존 보고서 수정작업 차등적용", editable: false },
  { category: "추가 서비스", item: "제품 패치", defaultContent: "", editable: true },
  { category: "추가 서비스", item: "재구축", defaultContent: "", editable: true },
  { category: "추가 서비스", item: "기능개선", defaultContent: "", editable: true },
  { category: "추가 서비스", item: "기타 지원 서비스", defaultContent: "- 설정 변경 및 추가 설정 작업, Agent 재설치 및 이관 설치, 등의 운영 업무\n- 정기 PM 작업", editable: false },
  { category: "교육서비스", item: "사용자, 운영자 교육", defaultContent: "연 1회 지원 (요청 시)", editable: false },
] as const;

// 구분 컬럼 rowspan 맵 (렌더링할 인덱스 → rowspan 수)
const CATEGORY_ROWSPAN: Record<number, number> = { 0: 4, 4: 5, 9: 1 };

// 타입
interface FormValues {
  projectId: string;
  quotationDate: string;
  paymentTerms: string;
  totalAmount: string;
  startDate: string;
  endDate: string;
  monthlySupplyPrice: string;
  totalQuotationAmount: string;
  specialNotes: string;
  coverInfo: { salesRepresentativeId: string; proposalType: string; productFamily: string };
  packageCosts: Array<{ packageName: string; amount: string }>;
  serviceProductId: string;
  serviceInfos: Array<{ productId: string; category: string; item: string; content: string }>;
  amountReasons: Array<{ productId: string; quantity: string; amount: string; months: string; remarks: string }>;
}

interface MaintenanceQuotationDocumentProps {
  mode: "create" | "view" | "edit";
  onSubmit?: (data: MaintenanceQuotationCreateRequest) => void;
  initialData?: Partial<FormValues>;
  isSubmitting?: boolean;
}

// 공통 CSS
const TH = "border border-gray-400 bg-gray-100 px-2 py-1.5 text-center text-[12px] font-semibold whitespace-nowrap";
const TD = "border border-gray-400 px-2 py-1.5 text-[12px]";
const INLINE = "bg-transparent border-0 border-b border-blue-500 text-blue-700 underline text-[13px] focus:outline-none w-full";
const PLAIN = "bg-transparent border-0 border-b border-gray-400 text-[13px] focus:outline-none w-full";

export default function MaintenanceQuotationDocument({ mode, onSubmit, initialData, isSubmitting = false }: MaintenanceQuotationDocumentProps) {
  const [projects, setProjects] = useState<ProjectListResponse[]>([]);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [products, setProducts] = useState<ProductModuleResponse[]>([]);
  const isReadOnly = mode === "view";
  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      projectId: "",
      quotationDate: today,
      paymentTerms: "",
      totalAmount: "0",
      startDate: "",
      endDate: "",
      monthlySupplyPrice: "0",
      totalQuotationAmount: "0",
      specialNotes: "",
      coverInfo: { salesRepresentativeId: "", proposalType: "", productFamily: "" },
      packageCosts: [],
      serviceProductId: "",
      serviceInfos: SERVICE_TEMPLATE.map((t) => ({ productId: "", category: t.category, item: t.item, content: "" })),
      amountReasons: [],
      ...initialData,
    },
  });
  const v = watch();

  const { fields: pkgF, append: pkgAdd, remove: pkgDel } = useFieldArray({ control, name: "packageCosts" });
  const { fields: svcF } = useFieldArray({ control, name: "serviceInfos" });
  const { fields: amtF, append: amtAdd, remove: amtDel } = useFieldArray({ control, name: "amountReasons" });

  useEffect(() => {
    Promise.all([projectApi.getProjects(), adminApi.getUsers(), adminApi.getProducts()])
      .then(([p, u, pr]) => {
        if (p.data) setProjects(p.data);
        if (u.data) setUsers(u.data);
        if (pr.data) setProducts(pr.data);
      })
      .catch(() => {});
  }, []);

  const selProject = useMemo(() => projects.find((p) => String(p.id) === v.projectId), [projects, v.projectId]);
  const selSalesRep = useMemo(() => users.find((u) => u.id === v.coverInfo?.salesRepresentativeId), [users, v.coverInfo?.salesRepresentativeId]);
  const months = useMemo(() => monthDiff(v.startDate, v.endDate), [v.startDate, v.endDate]);
  const amtTotal = useMemo(() => (v.amountReasons ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0), [v.amountReasons]);

  const onFormSubmit = (vals: FormValues) => {
    if (!onSubmit) return;
    const req: MaintenanceQuotationCreateRequest = {
      projectId: Number(vals.projectId),
      quotationDate: vals.quotationDate,
      paymentTerms: vals.paymentTerms,
      totalAmount: Number(vals.totalAmount),
      startDate: vals.startDate,
      endDate: vals.endDate,
      monthlySupplyPrice: Number(vals.monthlySupplyPrice),
      totalQuotationAmount: Number(vals.totalQuotationAmount),
      specialNotes: vals.specialNotes || undefined,
    };
    const ci = vals.coverInfo;
    if (ci.salesRepresentativeId && ci.proposalType && ci.productFamily) {
      req.coverInfo = {
        salesRepresentativeId: ci.salesRepresentativeId,
        proposalType: ci.proposalType as "SELF" | "SI",
        productFamily: ci.productFamily as "EMS" | "ITSM" | "AUTOMATION" | "WSS",
      };
    }
    if (vals.packageCosts.length) req.packageCosts = vals.packageCosts.map((p) => ({ packageName: p.packageName, amount: Number(p.amount) }));
    const filledServiceInfos = vals.serviceInfos.filter((s) => s.content.trim());
    if (filledServiceInfos.length)
      req.serviceInfos = filledServiceInfos.map((s) => ({
        productId: vals.serviceProductId && vals.serviceProductId !== "__none__" ? Number(vals.serviceProductId) : undefined,
        category: s.category,
        item: s.item,
        content: s.content.trim(),
      }));
    if (vals.amountReasons.length)
      req.amountReasons = vals.amountReasons.map((a) => ({
        productId: a.productId && a.productId !== "__none__" ? Number(a.productId) : undefined,
        quantity: Number(a.quantity),
        amount: Number(a.amount),
        months: Number(a.months),
        remarks: a.remarks || undefined,
      }));
    onSubmit(req);
  };

  // helper: 인라인 셀렉트
  function InlineSelect({
    name,
    opts,
    placeholder,
    blue = false,
  }: {
    name: "coverInfo.salesRepresentativeId" | "coverInfo.proposalType" | "coverInfo.productFamily";
    opts: { value: string; label: string }[];
    placeholder: string;
    blue?: boolean;
  }) {
    return (
      <Controller
        name={name}
        control={control}
        render={({ field: f }) =>
          isReadOnly ? (
            <span className={blue ? "text-blue-700" : ""}>{opts.find((o) => o.value === f.value)?.label ?? f.value ?? "-"}</span>
          ) : (
            <Select onValueChange={f.onChange} value={f.value}>
              <SelectTrigger
                className={`h-6 text-[13px] border-0 border-b ${blue ? "border-blue-500 text-blue-700 underline" : "border-gray-400"} rounded-none bg-transparent shadow-none focus:ring-0 px-0`}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {opts.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
      />
    );
  }

  // 렌더
  return (
    <div className="max-w-[1320px] mx-auto py-8 px-6 font-sans text-gray-900">
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <div className="bg-white shadow-md rounded-xl border-0">
          {/* ─── 사업 선택 ─── */}
          {!isReadOnly && (
            <div className="px-10 pt-6 pb-5 border-b border-gray-200">
              <p className="text-[13px] font-semibold text-gray-700 mb-2">
                사업 선택 <span className="text-red-500">*</span>
              </p>
              <Controller
                name="projectId"
                control={control}
                rules={{ required: "사업을 선택해주세요" }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-9 text-[13px] border border-gray-300 rounded-md bg-white max-w-[480px]">
                      <SelectValue placeholder="사업을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.projectName || `프로젝트 ${p.id}`}
                          {p.customerName ? ` (${p.customerName})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.projectId && <p className="text-[11px] text-red-500 mt-1">{errors.projectId.message}</p>}
              {selProject && (
                <div className="mt-2 flex gap-6 text-[12px] text-gray-500">
                  <span>
                    고객사 : <strong className="text-gray-800">{selProject.customerName}</strong>
                  </span>
                  <span>
                    사업명 : <strong className="text-gray-800">{selProject.projectName}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ─── 최상단 바 ─── */}
          <div className="px-10 pt-5 pb-2">
            <span className="text-[11px] text-gray-600">(주) 엔키아&nbsp;&nbsp;www.nkia.co.kr</span>
          </div>

          {/* ─── 제목 ─── */}
          <div className="text-center mt-2 mb-3">
            <h1 className="text-[38px] font-bold tracking-[0.55em] inline-block">見 積 書</h1>
            <p className="text-[11px] text-gray-600 mt-0.5">Ref No : 자동생성</p>
          </div>

          <div className="flex gap-0 px-10 pb-5">
            <div className="flex-1 pr-6 space-y-2 text-[13px]">
              {/* 수신처 — 사업 선택 시 자동 입력 */}
              <div className="flex items-baseline gap-1">
                <span className="text-blue-700 underline font-semibold text-[15px]">{selProject?.customerName || (isReadOnly ? "○○사" : "고객사")}</span>
                <span className="text-[14px] font-semibold ml-0.5">귀중</span>
              </div>

              <p className="text-[12px] text-gray-600">아래와 같이 견적합니다. (견적일로부터 3개월간 유효)</p>

              <div className="h-2" />

              {/* 견적일자 */}
              <div className="flex items-baseline gap-2">
                <span className="whitespace-nowrap">견 적 일 자 :</span>
                {isReadOnly ? (
                  <span className="text-blue-700 underline">{koreanDate(v.quotationDate)}</span>
                ) : (
                  <input type="date" className={INLINE + " max-w-[160px]"} {...register("quotationDate", { required: true })} />
                )}
              </div>

              {/* 대금결제조건 */}
              <div className="flex items-baseline gap-2">
                <span className="whitespace-nowrap">대금결제조건 :</span>
                {isReadOnly ? <span>{v.paymentTerms}</span> : <input className={PLAIN + " max-w-[200px]"} placeholder="예) 현금" {...register("paymentTerms", { required: true })} />}
                {errors.paymentTerms && <span className="text-[10px] text-red-500 ml-1">필수</span>}
              </div>

              <div className="h-1" />

              {/* 사업명 — 선택된 프로젝트에서 자동 입력 */}
              <p>
                사업명:&nbsp;<span>{selProject?.projectName || (isReadOnly ? "─" : "─")}</span>
              </p>

              <div className="h-1" />

              {/* 합계금액 */}
              <div>
                <span className="font-semibold">"합계금액"</span>&nbsp;:&nbsp;
                {isReadOnly ? (
                  <span className="text-blue-700 underline">일금&nbsp;{numberToKorean(Number(v.totalQuotationAmount))}원정 (부가세별도)</span>
                ) : (
                  <span className="inline-flex items-baseline gap-1">
                    일금&nbsp;
                    <input type="number" min="0" className={INLINE + " max-w-[180px] inline"} placeholder="금액 입력" {...register("totalQuotationAmount", { required: true, min: 0 })} />
                    &nbsp;원정 (부가세별도)
                  </span>
                )}
              </div>
              {Number(v.totalQuotationAmount) > 0 && <p className="text-[11px] text-blue-600 pl-16">({numberToKorean(Number(v.totalQuotationAmount))}원)</p>}

              <div className="h-1" />
            </div>

            {/* 발신 회사 정보 박스 */}
            <div className="border border-gray-500 text-[12px] leading-6 px-4 py-3 min-w-[240px] max-w-[260px]">
              <p className="font-bold text-[13px] text-center mb-1">(주) 엔키아</p>
              <p>경기도 성남시 분당구 대왕판교로 660</p>
              <p>유스페이스1 B동 10층</p>
              <p>대표이사 : 이 일 섭</p>
              <p>TEL : 02-2057-8724</p>
              <p>FAX : 02-2057-8725</p>
              <p>영업 담당자 : 한 별</p>
              <p>연락처 : 031-606-4778 / 010-5320-9048</p>
              <p>E-mail : amc@nkia.co.kr</p>
            </div>
          </div>

          {/* ─── 금액 요약 테이블 ─── */}
          <div className="px-10 pb-4">
            {/* 기간 헤더 */}
            <div className="flex justify-between items-center mb-1 text-[12px]">
              <span>
                유지보수 기간 :&nbsp;
                {isReadOnly ? (
                  <span>
                    {koreanDate(v.startDate)} ~ {koreanDate(v.endDate)}
                    {months > 0 ? ` (${months}개월)` : ""}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <input type="date" className={PLAIN + " w-[140px] inline"} {...register("startDate", { required: true })} />
                    <span>~</span>
                    <input type="date" className={PLAIN + " w-[140px] inline"} {...register("endDate", { required: true })} />
                    {months > 0 && <span className="text-gray-500">({months}개월)</span>}
                  </span>
                )}
              </span>
              <span className="text-[11px] text-gray-500">(단위 : 원, VAT 별도)</span>
            </div>

            <table className="w-full border-collapse text-[13px] table-fixed">
              <colgroup>
                <col style={{ width: "75%" }} />
                <col />
                {!isReadOnly && <col style={{ width: "30px" }} />}
              </colgroup>
              <thead>
                <tr>
                  <th className={TH + " text-left pl-3"}>구 분</th>
                  <th className={TH + " text-right pr-3"}>합 계</th>
                  {!isReadOnly && <th className="border-0 print:hidden" />}
                </tr>
              </thead>
              <tbody>
                {/* packageCosts 행 */}
                {pkgF.map((f, idx) => (
                  <tr key={f.id}>
                    <td className={TD + " pl-3"}>
                      {isReadOnly ? (
                        <span>{v.packageCosts?.[idx]?.packageName}</span>
                      ) : (
                        <input className={PLAIN} placeholder="패키지 구분명" {...register(`packageCosts.${idx}.packageName`, { required: true })} />
                      )}
                    </td>
                    <td className={TD + " text-right pr-3"}>
                      {isReadOnly ? (
                        <span>{won(v.packageCosts?.[idx]?.amount ?? "0")}</span>
                      ) : (
                        <input type="number" min="0" className={PLAIN + " text-right"} placeholder="0" {...register(`packageCosts.${idx}.amount`, { required: true, min: 0 })} />
                      )}
                    </td>
                    {!isReadOnly && (
                      <td className="border-0 text-center print:hidden">
                        <button type="button" onClick={() => pkgDel(idx)} className="text-red-400 hover:text-red-600 p-0.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {/* 추가 버튼 행 */}
                {!isReadOnly && (
                  <tr className="print:hidden">
                    <td colSpan={3} className="border border-gray-400 bg-gray-50 text-center py-1">
                      <button type="button" onClick={() => pkgAdd({ packageName: "", amount: "0" })} className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto">
                        <Plus className="w-3 h-3" /> 구분 행 추가
                      </button>
                    </td>
                  </tr>
                )}
                {/* 빈 구분 행 */}
                <tr>
                  <td className={TD + " bg-white py-2"} colSpan={isReadOnly ? 2 : 3}>
                    &nbsp;
                  </td>
                </tr>

                {/* 총 금액 (totalAmount) */}
                <tr>
                  <td className={TD + " bg-gray-50 font-semibold pl-3"}>총 금액 (합산 금액)</td>
                  <td className={TD + " text-right font-semibold pr-3 bg-gray-50"}>
                    {isReadOnly ? (
                      <span>{won(v.totalAmount)}</span>
                    ) : (
                      <input type="number" min="0" className={PLAIN + " text-right font-semibold"} placeholder="0" {...register("totalAmount", { required: true, min: 0 })} />
                    )}
                  </td>
                  {!isReadOnly && <td className="border-0 print:hidden" />}
                </tr>

                {/* 월 공급가 */}
                <tr>
                  <td className={TD + " bg-gray-100 font-bold pl-3"}>월 공급가 (천원 미만 절사)</td>
                  <td className={TD + " text-right font-bold pr-3 bg-gray-100"}>
                    {isReadOnly ? (
                      <span>{won(v.monthlySupplyPrice)}</span>
                    ) : (
                      <input type="number" min="0" className={PLAIN + " text-right font-bold"} placeholder="0" {...register("monthlySupplyPrice", { required: true, min: 0 })} />
                    )}
                  </td>
                  {!isReadOnly && <td className="border-0 print:hidden" />}
                </tr>

                {/* 견적 금액 합계 */}
                <tr>
                  <td className={TD + " bg-gray-100 font-bold pl-3"}>견적 금액 합계{months > 0 ? ` (${months}개월)` : ""}</td>
                  <td className={TD + " text-right font-bold pr-3 bg-gray-100"}>
                    {isReadOnly ? <span>{won(v.totalQuotationAmount)}</span> : <span className="text-right font-bold block">{won(v.totalQuotationAmount)}</span>}
                  </td>
                  {!isReadOnly && <td className="border-0 print:hidden" />}
                </tr>
              </tbody>
            </table>
          </div>

          {/* ─── [특기사항] ─── */}
          <div className="px-10 pb-5">
            <p className="font-bold text-[13px] mb-1">[특기사항]</p>
            {isReadOnly ? (
              <p className="text-[13px] whitespace-pre-line pl-2 min-h-[60px]">{v.specialNotes || "─"}</p>
            ) : (
              <Textarea rows={4} className="text-[13px] border border-gray-400 rounded-none shadow-none focus-visible:ring-0 resize-none" {...register("specialNotes")} />
            )}
          </div>

          {/* ─── 유지보수 서비스내용 ─── */}
          <div className="px-10 pb-8">
            <p className="font-bold text-[13px] mb-2">유지보수 서비스내용</p>
            <table className="w-full border-collapse text-[12px] table-fixed">
              <colgroup>
                <col style={{ width: "15%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "15%" }} />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th className={TH}>제 품 명</th>
                  <th className={TH}>구 분</th>
                  <th className={TH}>서비스항목</th>
                  <th className={TH}>서비스 내용</th>
                </tr>
              </thead>
              <tbody>
                {svcF.map((f, idx) => {
                  const tpl = SERVICE_TEMPLATE[idx];
                  const rowspan = CATEGORY_ROWSPAN[idx];
                  return (
                    <tr key={f.id}>
                      {/* 제품명: 첫 행에만 rowspan=10 */}
                      {idx === 0 && (
                        <td className={TD + " align-middle text-center"} rowSpan={SERVICE_TEMPLATE.length}>
                          {isReadOnly ? (
                            <span>{products.find((p) => String(p.id) === v.serviceProductId)?.productName ?? "─"}</span>
                          ) : (
                            <Controller
                              name="serviceProductId"
                              control={control}
                              render={({ field: ff }) => (
                                <Select onValueChange={ff.onChange} value={ff.value}>
                                  <SelectTrigger className="h-6 text-[12px] border-0 border-b border-gray-400 rounded-none bg-transparent shadow-none focus:ring-0 px-0 w-full">
                                    <SelectValue placeholder="제품 선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">─</SelectItem>
                                    {products.map((p) => (
                                      <SelectItem key={p.id} value={String(p.id)}>
                                        {p.productName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          )}
                        </td>
                      )}
                      {/* 구분: rowspan 있는 행만 렌더 */}
                      {rowspan !== undefined && (
                        <td className={TD + " text-center align-middle"} rowSpan={rowspan}>
                          {tpl.category}
                        </td>
                      )}
                      {/* 서비스항목 */}
                      <td className={TD + " text-center align-middle"}>{tpl.item}</td>
                      <td className={TD + " align-top"}>
                        {isReadOnly ? (
                          <span className="whitespace-pre-line text-blue-700">{v.serviceInfos?.[idx]?.content || "─"}</span>
                        ) : (
                          <Textarea
                            rows={3}
                            className="text-[12px] text-blue-700 border-0 shadow-none focus-visible:ring-0 resize-none p-0 min-h-[48px] placeholder:text-blue-300"
                            placeholder="내용을 입력하세요"
                            {...register(`serviceInfos.${idx}.content`)}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-xl border-0 mt-6 print:mt-0">
          {/* 제목 */}
          <div className="text-center pt-8 pb-5">
            <h2 className="text-[22px] font-bold tracking-[0.4em]">금액산출근거표</h2>
          </div>

          <div className="px-10 pb-10">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[13px] font-semibold">1) Solution Package 유지보수</span>
              <div className="flex items-center gap-4">
                <span className="text-[11px] text-gray-500">(단위 : 원, VAT별도)</span>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => amtAdd({ productId: "", quantity: "1", amount: "0", months: "12", remarks: "" })}
                    className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 print:hidden"
                  >
                    <Plus className="w-3 h-3" /> 행 추가
                  </button>
                )}
              </div>
            </div>
            <table className="w-full border-collapse text-[12px] table-fixed">
              <colgroup>
                <col style={{ width: "5%" }} />
                <col style={{ width: "11%" }} />
                <col />
                <col style={{ width: "7%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "12%" }} />
                {!isReadOnly && <col style={{ width: "30px" }} />}
              </colgroup>
              <thead>
                <tr>
                  <th className={TH}>순번</th>
                  <th className={TH}>구분</th>
                  <th className={TH}>납품 모델</th>
                  <th className={TH}>수량</th>
                  <th className={TH}>유지보수 금액</th>
                  <th className={TH}>개월수</th>
                  <th className={TH}>비고</th>
                  {!isReadOnly && <th className="border-0 w-7 print:hidden" />}
                </tr>
              </thead>
              <tbody>
                {amtF.length === 0 ? (
                  <tr>
                    <td colSpan={isReadOnly ? 7 : 8} className={TD + " text-center text-gray-400 py-4"}>
                      금액 산출 근거가 없습니다.
                    </td>
                  </tr>
                ) : (
                  amtF.map((f, idx) => {
                    const prod = products.find((p) => String(p.id) === v.amountReasons?.[idx]?.productId);
                    const amt = Number(v.amountReasons?.[idx]?.amount ?? 0);
                    return (
                      <tr key={f.id}>
                        <td className={TD + " text-center"}>{idx + 1}</td>
                        <td className={TD + " text-center text-gray-600"}>{prod?.productGroup ?? "─"}</td>
                        {/* 납품 모델 */}
                        <td className={TD}>
                          {isReadOnly ? (
                            <span>{prod?.productName ?? "─"}</span>
                          ) : (
                            <Controller
                              name={`amountReasons.${idx}.productId`}
                              control={control}
                              render={({ field: ff }) => (
                                <Select onValueChange={ff.onChange} value={ff.value}>
                                  <SelectTrigger className="h-6 text-[12px] border-0 border-b border-gray-400 rounded-none bg-transparent shadow-none focus:ring-0 px-0 w-full">
                                    <SelectValue placeholder="제품 선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">─</SelectItem>
                                    {products.map((p) => (
                                      <SelectItem key={p.id} value={String(p.id)}>
                                        {p.productName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          )}
                        </td>
                        {/* 수량 */}
                        <td className={TD + " text-center"}>
                          {isReadOnly ? (
                            <span>{v.amountReasons?.[idx]?.quantity}</span>
                          ) : (
                            <input type="number" min="1" className={PLAIN + " text-center"} {...register(`amountReasons.${idx}.quantity`, { required: true, min: 1 })} />
                          )}
                        </td>
                        {/* 유지보수 금액 */}
                        <td className={TD + " text-right"}>
                          {isReadOnly ? (
                            <span className="font-semibold">{amt > 0 ? won(amt) : "─"}</span>
                          ) : (
                            <input type="number" min="0" className={PLAIN + " text-right"} placeholder="0" {...register(`amountReasons.${idx}.amount`, { required: true, min: 0 })} />
                          )}
                        </td>
                        {/* 개월수 */}
                        <td className={TD + " text-center"}>
                          {isReadOnly ? (
                            <span>{v.amountReasons?.[idx]?.months}개월</span>
                          ) : (
                            <span className="flex items-center gap-0.5">
                              <input type="number" min="1" className={PLAIN + " text-center w-10"} {...register(`amountReasons.${idx}.months`, { required: true, min: 1 })} />
                              <span className="text-gray-500 text-[11px]">개월</span>
                            </span>
                          )}
                        </td>
                        {/* 비고 */}
                        <td className={TD}>
                          {isReadOnly ? <span>{v.amountReasons?.[idx]?.remarks || "─"}</span> : <input className={PLAIN} placeholder="비고" {...register(`amountReasons.${idx}.remarks`)} />}
                        </td>
                        {!isReadOnly && (
                          <td className="border-0 text-center print:hidden">
                            <button type="button" onClick={() => amtDel(idx)} className="text-red-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              {amtF.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={4} className="border border-gray-400 bg-gray-50 px-3 py-2 text-center text-[12px] font-bold">
                      1. Solution Package 유지보수 비용 합계
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-right text-[13px] font-bold">{won(amtTotal)}</td>
                    <td colSpan={2} className="border border-gray-400" />
                    {!isReadOnly && <td className="border-0 print:hidden" />}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
        {/* /Page 2 */}

        {/* ── 저장 버튼 ── */}
        {!isReadOnly && (
          <div className="flex justify-end px-10 py-4 print:hidden">
            <button type="submit" disabled={isSubmitting} className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-[13px] font-semibold px-10 py-2 rounded-sm">
              {isSubmitting ? "저장 중..." : "견적서 저장"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
