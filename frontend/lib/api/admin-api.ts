import { customInstance } from './customAxios';

export interface UserResponse {
  id: string;
  employeeNumber: string;
  position: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  departmentId: number;
  departmentName: string;
  createdAt: string;
  roles: string[];
}

export interface UserUpdateRequest {
  employeeNumber: string;
  position: string;
  name: string;
  phone: string;
  roleIds: number[];
  status: string;
  departmentId: number;
}

export interface SignupRequest {
  email: string;
  password?: string;
  employeeNumber: string;
  position: string;
  name: string;
  phone: string;
  departmentId: number;
  roleIds: number[];
}

export interface RoleListResponse {
  id: number;
  name: string;
  permissions: string[];
}

export interface RoleCreateRequest {
  name: string;
  permissions: string[];
}

export interface RoleRequest {
  permissions: string[];
}

export interface Permission {
  permissionId: number;
  domain: string;
  action: string;
}

export interface RoleResponse {
  roleId: number;
  roleName: string;
  permissions: Permission[];
}

export interface WorkflowTemplateListResponse {
  id: number;
  workflowDomain: string;
  name: string;
  active: boolean;
}

export interface WorkflowStepResponse {
  id: number;
  stepOrder: number;
  stepName: string;
  approverPosition: string;
  required: boolean;
  active: boolean;
}

export interface WorkflowTemplateResponse {
  id: number;
  workflowDomain: string;
  name: string;
  active: boolean;
  steps: WorkflowStepResponse[];
}

export interface WorkflowStepCreateRequest {
  stepOrder: number
  stepName: string
  approverPosition: string
  required: boolean
  active: boolean
}

export interface WorkflowTemplateCreateRequest {
  workflowDomain: string
  name: string
  steps: WorkflowStepCreateRequest[]
}

export interface WorkflowTemplateUpdateRequest {
  workflowDomain: string;
  name: string;
  active: boolean;
    steps: {
    stepOrder: number
    stepName: string
    approverPosition: string
    required: boolean
  }[]
}

export interface ProductModuleResponse {
  id: number;
  productClass: string;
  productGroup: string;
  productName: string;
  licenseStandard: string;
  licenseUnit: string;
  unitPrice: number;
}

export interface ProductModuleRequest {
  productClass: string;
  productGroup: string;
  productName: string;
  licenseStandard: string;
  licenseUnit: string;
  unitPrice: number;
}

export interface DepartmentResponse {
  id: number;
  headquarters: string;
  team: string;
}

export interface DepartmentRequest {
  headquarters: string;
  team: string;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export const adminApi = {
  // Users
  getUsers: () => customInstance<ApiResponse<UserResponse[]>>({ url: '/user', method: 'GET' }),
  getUser: (userId: string) => customInstance<ApiResponse<UserResponse>>({ url: `/user/${userId}`, method: 'GET' }),
  createUser: (data: SignupRequest) => customInstance<ApiResponse<string>>({ url: '/user/signup/admin', method: 'POST', data }),
  updateUser: (userId: string, data: UserUpdateRequest) => customInstance<ApiResponse<UserResponse>>({ url: `/user/${userId}`, method: 'PATCH', data }),

  // Roles
  getRoles: () => customInstance<ApiResponse<RoleListResponse[]>>({ url: '/admin/roles', method: 'GET' }),
  getRole: (roleId: string) => customInstance<ApiResponse<RoleListResponse>>({ url: `/admin/roles/${roleId}`, method: 'GET' }),
  createRole: (data: RoleCreateRequest) => customInstance<ApiResponse<RoleListResponse>>({ url: '/admin/roles', method: 'POST', data }),
  updateRole: (roleId: string, data: RoleRequest) => customInstance<ApiResponse<RoleListResponse>>({ url: `/admin/roles/${roleId}`, method: 'PUT', data }),

  // Workflow Templates
  getWorkflows: () => customInstance<ApiResponse<WorkflowTemplateListResponse[]>>({ url: '/admin/workflow-templates', method: 'GET' }),
  getWorkflow: (id: string) => customInstance<ApiResponse<WorkflowTemplateResponse>>({ url: `/admin/workflow-templates/${id}`, method: 'GET' }),
  createWorkflow: (data: WorkflowTemplateCreateRequest) => customInstance<ApiResponse<WorkflowTemplateListResponse>>({ url: '/admin/workflow-templates', method: 'POST', data }),
  updateWorkflow: (id: string, data: WorkflowTemplateUpdateRequest) => customInstance<ApiResponse<WorkflowTemplateListResponse>>({ url: `/admin/workflow-templates/${id}`, method: 'PUT', data }),

  // Product Modules
  getProducts: () => customInstance<ApiResponse<ProductModuleResponse[]>>({ url: '/admin/product-modules', method: 'GET' }),
  getProduct: (id: string) => customInstance<ApiResponse<ProductModuleResponse>>({ url: `/admin/product-modules/${id}`, method: 'GET' }),
  createProduct: (data: ProductModuleRequest) => customInstance<ApiResponse<ProductModuleResponse>>({ url: '/admin/product-modules', method: 'POST', data }),
  updateProduct: (id: string, data: ProductModuleRequest) => customInstance<ApiResponse<ProductModuleResponse>>({ url: `/admin/product-modules/${id}`, method: 'PATCH', data }),
  deleteProduct: (id: string) => customInstance<ApiResponse<void>>({ url: `/admin/product-modules/${id}`, method: 'DELETE' }),

  // Departments
  getDepartments: () => customInstance<ApiResponse<DepartmentResponse[]>>({ url: '/admin/departments', method: 'GET' }),
  getDepartment: (id: string) => customInstance<ApiResponse<DepartmentResponse>>({ url: `/admin/departments/${id}`, method: 'GET' }),
  createDepartment: (data: DepartmentRequest) => customInstance<ApiResponse<DepartmentResponse>>({ url: '/admin/departments', method: 'POST', data }),
  updateDepartment: (id: string, data: DepartmentRequest) => customInstance<ApiResponse<DepartmentResponse>>({ url: `/admin/departments/${id}`, method: 'PATCH', data }),
  deleteDepartment: (id: string) => customInstance<ApiResponse<void>>({ url: `/admin/departments/${id}`, method: 'DELETE' }),
};
