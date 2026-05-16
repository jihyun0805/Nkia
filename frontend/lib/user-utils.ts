"use client"

export type UserLike = {
  id?: string
  employeeNumber?: string
  name?: string
  email?: string
  position?: string
  departmentName?: string
}

const POSITION_LABELS: Record<string, string> = {
  TEAM_MEMBER: "팀원",
  TEAM_LEADER: "팀장",
  HEAD_DIRECTOR: "본부장",
}

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

