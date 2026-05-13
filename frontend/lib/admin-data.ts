export type AdminCategory = "users" | "permissions" | "workflow" | "products" | "departments";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  permissions: string[];
  status: string;
  lastLogin: string;
  isPresales: boolean;
  employeeNumber?: string;
  position?: string;
};

export const users: AdminUser[] = [];

export const permissionGroups: { id: string; name: string; description: string; permissions: string[]; userCount: string | number }[] = [];

export const workflows: any[] = [];

export const products: any[] = [];

export const departments: any[] = [];

export function getAdminCategoryLabel(category: AdminCategory) {
  if (category === "users") return "계정관리";
  if (category === "permissions") return "권한관리";
  if (category === "workflow") return "프로세스관리";
  if (category === "products") return "제품관리";
  if (category === "departments") return "부서관리";
  return "시스템관리";
}

export function getAdminItem(category: AdminCategory, id: string) {
  if (category === "users") return users.find((item) => item.id === id) ?? null;
  if (category === "permissions") return permissionGroups.find((item) => item.id === id) ?? null;
  if (category === "workflow") return workflows.find((item) => item.id === id) ?? null;
  if (category === "products") return products.find((item) => item.id === id) ?? null;
  if (category === "departments") return departments.find((item) => item.id === id) ?? null;
  return null;
}

export function getAdminFields(category: AdminCategory, item: any) {
  if (!item) return [];
  if (category === "users")
    return [
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
    ];
  if (category === "permissions")
    return [
      { label: "권한 그룹 ID", value: item.id },
      { label: "권한 그룹명", value: item.name },
      { label: "설명", value: item.description },
      { label: "권한", value: item.permissions?.join(", ") },
      { label: "사용자 수", value: `${item.userCount}명` },
    ];
  if (category === "workflow")
    return [
      { label: "프로세스 ID", value: item.id },
      { label: "프로세스명", value: item.name },
      { label: "단계", value: item.steps?.join(" → ") },
      { label: "상태", value: item.status },
      { label: "최종 수정일", value: item.lastModified },
    ];
  if (category === "products")
    return [
      { label: "제품 ID", value: item.id },
      { label: "제품 클래스", value: item.productClass },
      { label: "제품 그룹", value: item.productGroup },
      { label: "제품명", value: item.productName },
      { label: "라이선스 기준", value: item.licenseStandard },
      { label: "단위", value: item.licenseUnit },
      { label: "단가 (원)", value: item.unitPrice?.toLocaleString() },
    ];
  if (category === "departments")
    return [
      { label: "부서 ID", value: item.id },
      { label: "본부명", value: item.headquarters },
      { label: "팀명", value: item.team },
    ];
  return [];
}

export function getPresalesUsers() {
  return users.filter((item) => item.isPresales && item.status === "활성");
}
