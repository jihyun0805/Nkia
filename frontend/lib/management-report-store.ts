"use client"

import { toast } from "sonner"
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

import {
  createManagementReport,
  type ManagementReportRequest,
  type ManagementReportResponse,
} from "@/lib/management-report-api"

/**
 * 모달 닫혀도 리포트 생성 작업이 살아있도록 store 로 끌어올린 상태.
 *
 * - `form` / `report` / `error` 는 sessionStorage 에 persist → 모달 다시 열 때 복구
 * - `isLoading` 은 in-memory 만 (탭 새로고침 시 false 로 시작; 진행 중이던 fetch 결과는 못 받음)
 * - backend 에 별도 Job entity 는 두지 않는다 (사용자 결정: "세션 저장은 아니지만")
 */

function formatDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getDefaultDateRange() {
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setFullYear(startDate.getFullYear() - 1)
  return {
    startAt: formatDateInputValue(startDate),
    endAt: formatDateInputValue(endDate),
  }
}

export function createDefaultManagementReportRequest(): ManagementReportRequest {
  const dateRange = getDefaultDateRange()
  return {
    query: "선택한 조건에 해당하는 사업기회 현황, 주요 리스크, 대응 방안, 경영진 의사결정 포인트를 요약해줘",
    title: "사업기회 경영 리포트",
    reportType: "management",
    limit: 10,
    startAt: dateRange.startAt,
    endAt: dateRange.endAt,
    customerGroup: "ALL",
    businessTypes: [],
    statuses: [],
    visualization: {
      includeMetrics: true,
      includeCharts: true,
      includeTables: true,
      chartTypes: ["bar", "pie"],
    },
  }
}

type State = {
  form: ManagementReportRequest
  report: ManagementReportResponse | null
  error: string | null
  isLoading: boolean
  // 마지막 제출 시각 — UI 가 "5분 전 생성" 같은 표시에 사용 가능
  lastSubmittedAt: number | null
}

type Actions = {
  setForm: (updater: (current: ManagementReportRequest) => ManagementReportRequest) => void
  setField: <K extends keyof ManagementReportRequest>(
    key: K,
    value: ManagementReportRequest[K],
  ) => void
  toggleArrayValues: (
    field: "businessTypes" | "statuses",
    values: string[],
  ) => void
  setArrayField: (
    field: "businessTypes" | "statuses",
    values: string[],
  ) => void
  submit: () => Promise<void>
  resetReport: () => void
  resetAll: () => void
}

export const useManagementReportStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      form: createDefaultManagementReportRequest(),
      report: null,
      error: null,
      isLoading: false,
      lastSubmittedAt: null,

      setForm: (updater) => set((s) => ({ form: updater(s.form) })),

      setField: (key, value) =>
        set((s) => ({ form: { ...s.form, [key]: value } })),

      toggleArrayValues: (field, values) =>
        set((s) => {
          const current = s.form[field] ?? []
          const allSelected = values.every((v) => current.includes(v))
          const next = allSelected
            ? current.filter((v) => !values.includes(v))
            : Array.from(new Set([...current, ...values]))
          return { form: { ...s.form, [field]: next } }
        }),

      setArrayField: (field, values) =>
        set((s) => ({ form: { ...s.form, [field]: values } })),

      submit: async () => {
        // 이미 진행 중이면 중복 호출 차단 — 모달 닫혔다 다시 열어도 in-flight 가 보임
        if (get().isLoading) return
        set({ isLoading: true, error: null, lastSubmittedAt: Date.now() })
        const startedAt = Date.now()
        const dateRange = getDefaultDateRange()
        const current = get().form
        const payload: ManagementReportRequest = {
          ...current,
          customerGroup: current.customerGroup === "ALL" ? undefined : current.customerGroup,
          startAt: current.startAt || dateRange.startAt,
          endAt: current.endAt || dateRange.endAt,
        }
        try {
          const result = await createManagementReport(payload)
          set({ report: result, isLoading: false })
          // 모달이 닫혀 있어도 보이도록 toast 알림.
          // 빠르게 끝나면 (<3초) 사용자가 모달 보고 있을 가능성 높아 알림 생략, 그 외에만.
          if (Date.now() - startedAt >= 3000) {
            toast.success("경영 리포트가 생성되었습니다.", {
              description: payload.title ?? "리포트를 확인해 주세요.",
              duration: 8000,
            })
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "리포트 생성에 실패했습니다."
          set({ error: message, isLoading: false })
          toast.error("경영 리포트 생성 실패", { description: message, duration: 8000 })
        }
      },

      resetReport: () =>
        set({ report: null, error: null, isLoading: false, lastSubmittedAt: null }),

      resetAll: () =>
        set({
          form: createDefaultManagementReportRequest(),
          report: null,
          error: null,
          isLoading: false,
          lastSubmittedAt: null,
        }),
    }),
    {
      name: "orbis-management-report-v1",
      storage: createJSONStorage(() => sessionStorage),
      // isLoading 은 persist 제외 — 탭 새로고침 시 false 로 시작 (진행 중이던 fetch 는 새 탭에선 받지 못함)
      partialize: (s) => ({
        form: s.form,
        report: s.report,
        error: s.error,
        lastSubmittedAt: s.lastSubmittedAt,
      }),
    },
  ),
)
