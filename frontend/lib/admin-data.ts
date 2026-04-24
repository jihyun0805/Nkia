export type AdminCategory = "users" | "permissions" | "workflow"

export type AdminUser = {
  id: string
  name: string
  email: string
  department: string
  role: string
  permissions: string[]
  status: string
  lastLogin: string
  isPresales: boolean
}

export const users: AdminUser[] = [
  { id: "USR-001", name: "김영업", email: "kim.sales@Nkia.com", department: "영업본부", role: "영업대표", permissions: ["발굴", "활동", "입찰", "계약"], status: "활성", lastLogin: "2026-03-17 14:30", isPresales: false },
  { id: "USR-002", name: "이대리", email: "lee.manager@Nkia.com", department: "영업본부", role: "영업담당", permissions: ["발굴", "활동", "입찰"], status: "활성", lastLogin: "2026-03-17 10:15", isPresales: false },
  { id: "USR-003", name: "박기술", email: "park.presales@Nkia.com", department: "프리세일즈팀", role: "프리세일즈 담당", permissions: ["활동", "입찰", "데모"], status: "활성", lastLogin: "2026-03-17 09:40", isPresales: true },
  { id: "USR-004", name: "최PM", email: "choi.presales@Nkia.com", department: "프리세일즈팀", role: "프리세일즈 담당", permissions: ["활동", "PoC", "제안"], status: "활성", lastLogin: "2026-03-17 08:55", isPresales: true },
  { id: "USR-005", name: "김기술", email: "kim.tech@Nkia.com", department: "프리세일즈팀", role: "프리세일즈 담당", permissions: ["활동", "기술지원", "제안"], status: "활성", lastLogin: "2026-03-16 18:20", isPresales: true },
]

export const permissionGroups = [
  { id: "PG-001", name: "영업대표", description: "영업 활동 전반에 대한 권한", permissions: ["발굴 읽기/쓰기", "활동 읽기/쓰기"], userCount: 5 },
]

export const workflows = [
  { id: "WF-001", name: "수주보고 결재", steps: ["상신자", "팀장", "본부장"], status: "활성", lastModified: "2026-01-15" },
]

export function getAdminCategoryLabel(category: AdminCategory) {
  if (category === "users") return "계정관리"
  if (category === "permissions") return "권한관리"
  return "프로세스관리"
}

export function getAdminItem(category: AdminCategory, id: string) {
  if (category === "users") return users.find((item) => item.id === id) ?? null
  if (category === "permissions") return permissionGroups.find((item) => item.id === id) ?? null
  return workflows.find((item) => item.id === id) ?? null
}

export function getAdminFields(category: AdminCategory, item: any) {
  if (category === "users") return [
    { label: "ID", value: item.id },
    { label: "이름", value: item.name },
    { label: "이메일", value: item.email },
    { label: "부서", value: item.department },
    { label: "역할", value: item.role },
    { label: "프리세일즈 담당", value: item.isPresales ? "예" : "아니오" },
    { label: "권한", value: item.permissions.join(", ") },
    { label: "상태", value: item.status },
    { label: "최종 로그인", value: item.lastLogin },
  ]
  if (category === "permissions") return [
    { label: "권한 그룹 ID", value: item.id },
    { label: "권한 그룹명", value: item.name },
    { label: "설명", value: item.description },
    { label: "권한", value: item.permissions.join(", ") },
    { label: "사용자 수", value: `${item.userCount}명` },
  ]
  return [
    { label: "프로세스 ID", value: item.id },
    { label: "프로세스명", value: item.name },
    { label: "단계", value: item.steps.join(" → ") },
    { label: "상태", value: item.status },
    { label: "최종 수정일", value: item.lastModified },
  ]
}

export function getPresalesUsers() {
  return users.filter((item) => item.isPresales && item.status === "활성")
}
