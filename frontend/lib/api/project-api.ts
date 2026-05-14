import { customInstance } from "./customAxios";

// 공통 API 응답 래퍼
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 사업(Project) 타입 정의

/** 사업 목록 응답 */
export interface ProjectListResponse {
  id: number;
  customerName: string | null;
  projectName: string | null;
  totalAmount: number | null;
  startDate: string | null; // LocalDate → ISO string (YYYY-MM-DD)
  endDate: string | null;
  pmName: string | null;
  salesRepresentativeName: string | null;
  hasResultReport: boolean;
}

/** 사업 상세 응답 */
export interface ProjectDetailResponse {
  id: number;
  pjtNumber: string | null;
  pjtName: string | null;
  customerName: string | null;
  totalAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  pmName: string | null;
  salesRepName: string | null;
  resultReport: ResultReportInfo | null;
  orderReportId: number | null;
  contractId: number | null;
}

export interface ResultReportInfo {
  id: number;
  fileName: string;
  fileSize: number;
  fileUrl: string;
}

/** 사업 등록 요청 (수주보고서 ID로 생성) */
export interface ProjectCreateRequest {
  orderReportId: number;
}

/** 사업 결합 수정 요청 (PM, 영업대표, 기간, 결과보고 파일) */
export interface ProjectCombinedUpdateRequest {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;
  managerId: string; // UUID
  salesRepresentativeId: string; // UUID
  fileId?: number | null;
}

// 청구(Billing) 타입 정의

/** 청구 목록 응답 */
export interface BillingListResponse {
  id?: number; // 목록 API에서 제공 시 사용 (optional)
  customerName: string;
  projectName: string;
  billingAmount: number;
  issuedAt: string | null; // YYYY-MM-DD
  collectedAt: string | null;
  salesRepName: string;
  requesterName: string;
  status?: "REQUESTED" | "ISSUED" | "COLLECTED"; // 있을 경우 배지 표시
  createdAt?: string;
}

/** 청구 상세 응답 */
export interface BillingDetailResponse {
  id: number;
  orderReportId: number;
  customerName: string;
  projectName: string;
  billingAmount: number;
  requestedIssueDate: string; // YYYY-MM-DD
  issuedAt: string | null;
  collectedAt: string | null;
  remarks: string | null;
  invoiceImageId: number | null;
  status: "REQUESTED" | "ISSUED" | "COLLECTED";
  createdBy: string;
  createdAt: string; // ISO datetime
}

/** 청구 폼 초기화 데이터 */
export interface BillingFormInitResponse {
  customerName: string;
  projectName: string;
  requesterName: string;
  requestDate: string; // YYYY-MM-DD
  contractId: number;
}

/** 청구 등록 요청 */
export interface BillingCreateRequest {
  orderReportId: number;
  billingAmount: number;
  requestedIssueDate: string; // YYYY-MM-DD
  remarks?: string;
}

/** 청구 발행 확인 요청 */
export interface BillingIssueRequest {
  issuedAt: string; // YYYY-MM-DD
  invoiceImageId?: number | null;
}

/** 수금 확인 요청 */
export interface BillingCollectRequest {
  collectedAt: string; // YYYY-MM-DD
}

/** 청구 수정 요청 */
export interface BillingUpdateRequest {
  billingAmount?: number;
  requestedIssueDate?: string;
  remarks?: string;
  issuedAt?: string;
  invoiceImageId?: number | null;
  collectedAt?: string;
}

/** 예상 매출액 응답 */
export interface EstimatedRevenueResponse {
  productCategory: string; // 'EMS', 'ITG', 'IOT', 'ETC', 'EMS_MAINTENANCE', 'ITG_MAINTENANCE'
  categoryName: string;
  monthlyRevenue: Record<string, number>;
  totalAmount: number;
}

// API 함수 모음

export const projectApi = {
  // 사업

  /** 예상 매출액 조회 */
  getAnnualRevenue: (year?: number) =>
    customInstance<ApiResponse<EstimatedRevenueResponse[]>>({
      url: "/api/v1/projects/revenues/annual",
      method: "GET",
      params: year ? { year } : undefined,
    }),

  /** 사업 전체 목록 조회 */
  getProjects: () =>
    customInstance<ApiResponse<ProjectListResponse[]>>({
      url: "/api/v1/projects",
      method: "GET",
    }),

  /** 사업 상세 조회 */
  getProject: (projectId: number) =>
    customInstance<ApiResponse<ProjectDetailResponse>>({
      url: `/api/v1/projects/${projectId}`,
      method: "GET",
    }),

  /** 사업 등록 (수주보고서 ID 기반) */
  createProject: (data: ProjectCreateRequest) =>
    customInstance<ApiResponse<number>>({
      url: "/api/v1/projects/register",
      method: "POST",
      data,
    }),

  /** 사업 + 결과보고 통합 수정 */
  updateProjectWithReport: (projectId: number, data: ProjectCombinedUpdateRequest) =>
    customInstance<ApiResponse<ProjectDetailResponse>>({
      url: `/api/v1/projects/${projectId}/with-report`,
      method: "PUT",
      data,
    }),

  /** 사업 삭제 */
  deleteProject: (projectId: number) =>
    customInstance<ApiResponse<null>>({
      url: `/api/v1/projects/${projectId}`,
      method: "DELETE",
    }),

  // 청구

  /** 청구 목록 조회 */
  getBillings: () =>
    customInstance<ApiResponse<BillingListResponse[]>>({
      url: "/api/v1/projects/billings",
      method: "GET",
    }),

  /** 청구 상세 조회 */
  getBilling: (billingId: number) =>
    customInstance<ApiResponse<BillingDetailResponse>>({
      url: `/api/v1/projects/billings/${billingId}`,
      method: "GET",
    }),

  /** 청구 폼 초기 데이터 (수주보고서 ID 기반 자동 채움) */
  getBillingFormInit: (orderReportId: number) =>
    customInstance<ApiResponse<BillingFormInitResponse>>({
      url: `/api/v1/projects/billings/form-init/${orderReportId}`,
      method: "GET",
    }),

  /** 세금계산서 발행 요청 등록 */
  createBilling: (data: BillingCreateRequest) =>
    customInstance<ApiResponse<number>>({
      url: "/api/v1/projects/billings",
      method: "POST",
      data,
    }),

  /** 세금계산서 발행 확인 처리 */
  issueBilling: (billingId: number, data: BillingIssueRequest) =>
    customInstance<ApiResponse<null>>({
      url: `/api/v1/projects/billings/${billingId}/issue`,
      method: "POST",
      data,
    }),

  /** 수금 확인 처리 */
  collectBilling: (billingId: number, data: BillingCollectRequest) =>
    customInstance<ApiResponse<null>>({
      url: `/api/v1/projects/billings/${billingId}/collect`,
      method: "POST",
      data,
    }),

  /** 청구 정보 수정 */
  updateBilling: (billingId: number, data: BillingUpdateRequest) =>
    customInstance<ApiResponse<BillingDetailResponse>>({
      url: `/api/v1/projects/billings/${billingId}`,
      method: "PUT",
      data,
    }),

  /** 청구 삭제 */
  deleteBilling: (billingId: number) =>
    customInstance<ApiResponse<null>>({
      url: `/api/v1/projects/billings/${billingId}`,
      method: "DELETE",
    }),
};
