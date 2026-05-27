import { loadAuthSession } from "@/lib/auth-session"

export type CurrentUser = {
  id: string
  name: string
  email: string
  department: string
  role: string
}

export const currentUser: CurrentUser = {
  id: "USR-001",
  get name() {
    const session = loadAuthSession()
    return session?.name || session?.email?.split("@")[0] || "사용자"
  },
  get email() {
    const session = loadAuthSession()
    return session?.email || "member@orbis.local"
  },
  department: "영업본부",
  role: "영업대표",
}

export function isSalesUser(user: CurrentUser) {
  return user.department.includes("영업") || user.role.includes("영업")
}
