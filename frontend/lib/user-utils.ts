"use client"

export type UserLike = {
  id?: string
  employeeNumber?: string
  name?: string
  email?: string
  position?: string
  departmentName?: string
}

export const POSITION_LABELS: Record<string, string> = {
  TEAM_MEMBER: "팀원",
  TEAM_LEADER: "팀장",
  HEAD_DIRECTOR: "본부장",
}

export const WORKFLOW_DOMAIN_LABELS: Record<string, string> = {
  QUOTATION: "견적",
  MAINTENANCE_QUOTATION: "유지보수 견적",
  ORDER_REPORT: "수주보고",
  CONTRACT: "계약",
  PURCHASE_CONTRACT: "매입 계약",
  FREE_MAINTENANCE_CONTRACT: "무상 유지보수 계약",
  PAID_MAINTENANCE_CONTRACT: "유상 유지보수 계약",
  LICENSE: "라이선스",
  BILLING: "청구 및 수금",
  CUSTOMER_SUPPORT: "고객지원",
  PRB: "PRB",
  PRB_RESULT: "PRB 결과",
  BID_RESULT: "입찰 결과",
}

export const permissionDomains = [
  { label: "사업 기회", value: "PROJECT_OPPORTUNITY" },
  { label: "고객사/협력사", value: "COMPANY" },
  { label: "영업 활동", value: "SALES_ACTIVITY" },
  { label: "영업 활동 요청", value: "SALES_ACTIVITY_REQUEST" },
  { label: "견적", value: "QUOTATION" },
  { label: "제안", value: "PROPOSAL" },
  { label: "RFP 분석 결과", value: "RFP_ANALYSE_RESULT" },
  { label: "PRB", value: "PRB" },
  { label: "PRB 결과", value: "PRB_RESULT" },
  { label: "입찰 결과", value: "BID_RESULT" },
  { label: "수주보고", value: "ORDER_REPORT" },
  { label: "계약", value: "CONTRACT" },
  { label: "매입 계약", value: "PURCHASE_CONTRACT" },
  { label: "라이선스", value: "LICENSE" },
  { label: "사업", value: "PROJECT" },
  { label: "사업 결과", value: "PROJECT_RESULT" },
  { label: "청구/수금", value: "BILLING" },
  { label: "예상매출", value: "ESTIMATED_REVENUE" },
  { label: "유지보수", value: "MAINTENANCE" },
  { label: "유지보수 견적", value: "MAINTENANCE_QUOTATION" },
  { label: "고객지원", value: "CUSTOMER_SUPPORT" },
  { label: "제품 모듈", value: "PRODUCT_MODULE" },
  { label: "부서", value: "DEPARTMENT" },
  { label: "결재 프로세스", value: "WORKFLOW_TEMPLATE" },
  { label: "결재 상신", value: "WORKFLOW" },
  { label: "권한", value: "PERMISSION" },
  { label: "사용자 계정", value: "USER" },
] as const;

export const permissionActions = [
  { label: "조회", value: "READ" },
  { label: "생성", value: "CREATE" },
  { label: "수정", value: "UPDATE" },
  { label: "삭제", value: "DELETE" },
  { label: "승인", value: "APPROVE" },
  { label: "내보내기", value: "EXPORT" },
  { label: "관리", value: "MANAGE" },
] as const;

export function normalizeLookupText(value: string) {
  return value.trim().toLowerCase()
}

export function splitDelimitedValues(value?: string) {
  return String(value ?? "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function findUserByToken<T extends UserLike>(users: T[], token: string) {
  const normalized = normalizeLookupText(token)
  if (!normalized) return null

  return (
    users.find((user) => {
      const id = user.id?.trim()
      const employeeNumber = user.employeeNumber?.trim()
      const name = user.name?.trim()
      const email = user.email?.trim()

      return (
        (id && normalizeLookupText(id) === normalized) ||
        (employeeNumber && normalizeLookupText(employeeNumber) === normalized) ||
        (name && normalizeLookupText(name) === normalized) ||
        (email && normalizeLookupText(email) === normalized)
      )
    }) ?? null
  )
}

export function resolveUserId<T extends UserLike>(token: string, users: T[]) {
  return findUserByToken(users, token)?.id?.trim() ?? token.trim()
}

export function formatUserDisplayName(user?: UserLike | null) {
  return user?.name?.trim() || user?.employeeNumber?.trim() || user?.email?.trim() || user?.id?.trim() || "-"
}

export function formatUserSubtitle(user?: UserLike | null) {
  if (!user) return ""

  const position = user.position ? POSITION_LABELS[user.position] ?? user.position : ""
  return [position, user.departmentName, user.employeeNumber, user.email]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" · ")
}

