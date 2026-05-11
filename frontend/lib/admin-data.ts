export type AdminCategory = "users" | "permissions" | "workflow" | "products" | "departments"

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
  employeeNumber?: string
  position?: string
}

export const users: AdminUser[] = [
  { id: "USR-001", employeeNumber: "210001", name: "김영업", email: "kim.sales@Nkia.com", department: "영업1팀", position: "부장", role: "영업대표", permissions: ["발굴", "활동", "입찰", "계약"], status: "활성", lastLogin: "2026-03-17 14:30", isPresales: false },
  { id: "USR-002", employeeNumber: "220015", name: "이대리", email: "lee.manager@Nkia.com", department: "영업2팀", position: "대리", role: "영업대표", permissions: ["발굴", "활동", "입찰"], status: "활성", lastLogin: "2026-03-17 10:15", isPresales: false },
  { id: "USR-003", employeeNumber: "190042", name: "박기술", email: "park.presales@Nkia.com", department: "솔루션컨설팅팀", position: "과장", role: "프리세일즈 담당", permissions: ["활동", "입찰", "데모"], status: "활성", lastLogin: "2026-03-17 09:40", isPresales: true },
  { id: "USR-004", employeeNumber: "150021", name: "최PM", email: "choi.pm@Nkia.com", department: "사업수행팀", position: "차장", role: "PM", permissions: ["프로젝트", "수행"], status: "활성", lastLogin: "2026-03-17 08:55", isPresales: false },
  { id: "USR-005", employeeNumber: "240101", name: "김사원", email: "kim.dev@Nkia.com", department: "연구1팀", position: "사원", role: "에이전트 개발", permissions: ["개발", "테스트"], status: "활성", lastLogin: "2026-03-16 18:20", isPresales: false },
  { id: "USR-006", employeeNumber: "100005", name: "정관리", email: "jung.admin@Nkia.com", department: "경영지원팀", position: "이사", role: "시스템 관리자", permissions: ["시스템설정", "사용자관리", "권한관리"], status: "활성", lastLogin: "2026-05-10 09:00", isPresales: false },
  { id: "USR-007", employeeNumber: "180033", name: "강재무", email: "kang.finance@Nkia.com", department: "경영지원팀", position: "차장", role: "급여 및 노무", permissions: ["매출조회", "수금관리", "세금계산서"], status: "활성", lastLogin: "2026-05-11 11:30", isPresales: false },
  { id: "USR-008", employeeNumber: "200055", name: "조계약", email: "cho.contract@Nkia.com", department: "기술지원팀", position: "과장", role: "유지보수 엔지니어", permissions: ["유지보수", "고객지원"], status: "휴직", lastLogin: "2026-01-20 17:00", isPresales: false },
]

export const permissionGroups = [
  { id: "PG-001", name: "시스템 관리자", description: "시스템 전반의 모든 설정 및 관리 권한", permissions: ["ALL"], userCount: 2 },
  { id: "PG-002", name: "영업대표", description: "영업 활동 전반에 대한 권한", permissions: ["발굴 읽기/쓰기", "활동 읽기/쓰기", "계약 읽기"], userCount: 15 },
  { id: "PG-003", name: "프리세일즈", description: "기술 지원 및 사전 영업 활동 권한", permissions: ["활동 읽기/쓰기", "제안서 등록", "데모 지원"], userCount: 8 },
  { id: "PG-004", name: "재무/회계", description: "매출 및 수금 현황 조회 권한", permissions: ["매출 현황", "수금 읽기/쓰기", "세금계산서 발행"], userCount: 4 },
  { id: "PG-005", name: "임원", description: "모든 데이터에 대한 읽기 권한", permissions: ["전체 읽기", "결재 승인"], userCount: 3 },
]

export const workflows = [
  { id: "WF-001", name: "수주보고 결재", steps: ["상신자", "팀장", "본부장"], status: "활성", lastModified: "2026-01-15", active: true },
  { id: "WF-002", name: "세금계산서 발행 요청", steps: ["영업대표", "재무담당자"], status: "활성", lastModified: "2026-02-20", active: true },
  { id: "WF-003", name: "프리세일즈 지원 요청", steps: ["영업대표", "프리세일즈 팀장"], status: "활성", lastModified: "2026-03-10", active: true },
  { id: "WF-004", name: "유지보수 계약 품의", steps: ["담당자", "팀장", "본부장", "대표이사"], status: "비활성", lastModified: "2025-11-05", active: false },
]

export const products = [
  { id: "PRD-001", productClass: "EMS", productGroup: "Framework", productName: "POLESTAR Single Manager", licenseStandard: "Core", licenseUnit: "EA", unitPrice: 15000000 },
  { id: "PRD-002", productClass: "EMS", productGroup: "SMS", productName: "POLESTAR Server Management for Unix", licenseStandard: "Node", licenseUnit: "EA", unitPrice: 12000000 },
  { id: "PRD-003", productClass: "EMS", productGroup: "DPM", productName: "POLESTAR DPM for Oracle", licenseStandard: "Instance", licenseUnit: "EA", unitPrice: 8500000 },
  { id: "PRD-004", productClass: "ITSM", productGroup: "CMDB", productName: "POLESTAR CMDB(Configuration management DB)", licenseStandard: "User", licenseUnit: "EA", unitPrice: 20000000 },
  { id: "PRD-005", productClass: "CLOUD", productGroup: "PCM", productName: "POLESTAR Public Cloud for EC2(EFS, VPC 포함)", licenseStandard: "Account", licenseUnit: "식", unitPrice: 5000000 },
  { id: "PRD-006", productClass: "AIOTION", productGroup: "WSS", productName: "AIOTION AI Analytics", licenseStandard: "Site", licenseUnit: "식", unitPrice: 30000000 },
]

export const departments = [
  { id: "DPT-001", headquarters: "영업1본부", team: "영업1팀" },
  { id: "DPT-002", headquarters: "영업2본부", team: "영업2팀" },
  { id: "DPT-003", headquarters: "IoT사업본부", team: "IoT사업팀" },
  { id: "DPT-004", headquarters: "사업본부", team: "사업수행팀" },
  { id: "DPT-005", headquarters: "사업본부", team: "사업지원팀" },
  { id: "DPT-006", headquarters: "사업본부", team: "기술지원팀" },
  { id: "DPT-007", headquarters: "연구소", team: "연구1팀" },
  { id: "DPT-008", headquarters: "연구소", team: "연구2팀" },
  { id: "DPT-009", headquarters: "연구소", team: "연구3팀" },
  { id: "DPT-010", headquarters: "연구소", team: "AI1팀" },
  { id: "DPT-011", headquarters: "신사업본부", team: "AI혁신팀" },
  { id: "DPT-012", headquarters: "신사업본부", team: "신사업추진팀" },
  { id: "DPT-013", headquarters: "신사업본부", team: "정보보안팀" },
  { id: "DPT-014", headquarters: "글로벌사업본부", team: "대외협력팀" },
  { id: "DPT-015", headquarters: "경영지원본부", team: "경영지원팀" },
  { id: "DPT-016", headquarters: "경영지원본부", team: "품질혁신팀" },
  { id: "DPT-017", headquarters: "경영지원본부", team: "솔루션컨설팅팀" },
]

export function getAdminCategoryLabel(category: AdminCategory) {
  if (category === "users") return "계정관리"
  if (category === "permissions") return "권한관리"
  if (category === "workflow") return "프로세스관리"
  if (category === "products") return "제품관리"
  if (category === "departments") return "부서관리"
  return "시스템관리"
}

export function getAdminItem(category: AdminCategory, id: string) {
  if (category === "users") return users.find((item) => item.id === id) ?? null
  if (category === "permissions") return permissionGroups.find((item) => item.id === id) ?? null
  if (category === "workflow") return workflows.find((item) => item.id === id) ?? null
  if (category === "products") return products.find((item) => item.id === id) ?? null
  if (category === "departments") return departments.find((item) => item.id === id) ?? null
  return null
}

export function getAdminFields(category: AdminCategory, item: any) {
  if (!item) return []
  if (category === "users") return [
    { label: "ID", value: item.id },
    { label: "사번", value: item.employeeNumber },
    { label: "이름", value: item.name },
    { label: "직급", value: item.position },
    { label: "이메일", value: item.email },
    { label: "부서", value: item.department },
    { label: "역할", value: item.role },
    { label: "프리세일즈 담당", value: item.isPresales ? "예" : "아니오" },
    { label: "권한", value: item.permissions?.join(", ") },
    { label: "상태", value: item.status },
    { label: "최종 로그인", value: item.lastLogin },
  ]
  if (category === "permissions") return [
    { label: "권한 그룹 ID", value: item.id },
    { label: "권한 그룹명", value: item.name },
    { label: "설명", value: item.description },
    { label: "권한", value: item.permissions?.join(", ") },
    { label: "사용자 수", value: `${item.userCount}명` },
  ]
  if (category === "workflow") return [
    { label: "프로세스 ID", value: item.id },
    { label: "프로세스명", value: item.name },
    { label: "단계", value: item.steps?.join(" → ") },
    { label: "상태", value: item.status },
    { label: "최종 수정일", value: item.lastModified },
  ]
  if (category === "products") return [
    { label: "제품 ID", value: item.id },
    { label: "제품 클래스", value: item.productClass },
    { label: "제품 그룹", value: item.productGroup },
    { label: "제품명", value: item.productName },
    { label: "라이선스 기준", value: item.licenseStandard },
    { label: "단위", value: item.licenseUnit },
    { label: "단가 (원)", value: item.unitPrice?.toLocaleString() },
  ]
  if (category === "departments") return [
    { label: "부서 ID", value: item.id },
    { label: "본부명", value: item.headquarters },
    { label: "팀명", value: item.team },
  ]
  return []
}

export function getPresalesUsers() {
  return users.filter((item) => item.isPresales && item.status === "활성")
}

