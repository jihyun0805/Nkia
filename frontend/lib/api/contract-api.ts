import { customInstance } from "./customAxios";

// 공통
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// 수주보고서 (Order Report) 타입
export type OrderReportType = "NEW" | "RENEWAL" | "MAINTENANCE_ONLY";
export type CodeType = "DIRECT" | "INDIRECT";
export type ApprovalStatus = "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED";
export type VisitCycle = "MONTHLY" | "QUARTERLY" | "BIANNUAL" | "ANNUAL" | "AS_NEEDED";
export type ProductClass = "EMS" | "ITSM" | "DASHBOARD" | "DATACENTER" | "RCA" | "DCA" | "ITAM" | "ETC";

export interface OrderReportMaintenanceRequest {
  content: string;
  visitCycle: VisitCycle;
  month: number;
  price: number;
}

export interface OrderReportServiceRequest {
  content: string;
  manMonth: number;
  price: number;
}

export interface OrderReportOtherRequest {
  content: string;
  quantity: number;
  price: number;
}

export interface OrderReportPurchaseRequest {
  content: string;
  quantity: number;
  price: number;
}

export interface OrderReportMaintenanceOnlyItemRequest {
  year: number;
  amount: number;
  license: number;
  thirdParty: number;
  service: number;
  maintenance: number;
  maintenanceRate: number;
}

export interface LicenseFromOrderReportRequest {
  productModuleId: number;
  quantity: number;
}

export interface OrderReportRequest {
  type: OrderReportType;
  quotationProvided: boolean;
  contractProvided: boolean;
  purchaseOrderProvided: boolean;
  prbReportProvided: boolean;
  paymentCondition: string;
  additionalDocuments?: string;
  channel: boolean;
  codeType: CodeType;
  contractDate: string; // LocalDate → ISO string
  freeMaintenancePeriodMonths?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  contractPeriodMonths?: number;
  scopeOfWork?: string;
  remarks?: string;
  projectOpportunityId: number;
  pmId?: string; // UUID
  contractCounterpartManagerId?: number;
  contractCounterpartCompanyId?: number;
  finalCustomerCompanyId?: number;
  finalCustomerManagerId?: number;
  maintenances?: OrderReportMaintenanceRequest[];
  licenses?: LicenseFromOrderReportRequest[];
  services?: OrderReportServiceRequest[];
  maintenanceOnlyItems?: OrderReportMaintenanceOnlyItemRequest[];
  others?: OrderReportOtherRequest[];
  purchases?: OrderReportPurchaseRequest[];
  emsMaintenanceSummary?: number;
  itgMaintenanceSummary?: number;
  itemTotalMaintenanceRate?: number;
}

// Response 타입
export interface OrderReportMaintenanceResponse {
  id: number;
  content: string;
  visitCycle: VisitCycle;
  month: number;
  price: number;
  totalPrice: number;
}

export interface OrderReportServiceResponse {
  id: number;
  content: string;
  manMonth: number;
  price: number;
  totalPrice: number;
}

export interface OrderReportOtherResponse {
  id: number;
  content: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface OrderReportPurchaseResponse {
  id: number;
  content: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface OrderReportMaintenanceOnlyItemResponse {
  id: number;
  year: number;
  amount: number;
  license: number;
  thirdParty: number;
  service: number;
  maintenance: number;
  maintenanceRate: number;
}

export interface LicenseFromOrderReportResponse {
  id: number;
  productModuleId: number;
  productClass: ProductClass;
  productGroup: string;
  productName: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface OrderReportListResponse {
  id: number;
  status: ApprovalStatus;
  orderReportCode: string;
  totalAmount: number;
  type: OrderReportType;
  channel: boolean;
  codeType: CodeType;
  contractDate: string;
  contractPeriodMonths: number;
  projectOpportunityId: number;
  projectName: string;
  pmId: string;
  pmName: string;
  finalCustomerCompanyId: number;
  finalCustomerCompanyName: string;
}

export interface OrderReportResponse {
  id: number;
  workflowId: number;
  status: ApprovalStatus;
  orderReportCode: string;
  totalAmount: number;
  paymentCondition: string;
  quotationProvided: boolean;
  contractProvided: boolean;
  purchaseOrderProvided: boolean;
  prbReportProvided: boolean;
  additionalDocuments: string;
  type: OrderReportType;
  channel: boolean;
  codeType: CodeType;
  contractDate: string;
  freeMaintenancePeriodMonths: number;
  contractStartDate: string;
  contractEndDate: string;
  contractPeriodMonths: number;
  scopeOfWork: string;
  remarks: string;
  projectOpportunityId: number;
  projectName: string;
  pmId: string;
  pmName: string;
  contractCounterpartCompanyId: number;
  contractCounterpartCompanyName: string;
  contractCounterpartManagerId: number;
  contractCounterpartManagerName: string;
  finalCustomerCompanyId: number;
  finalCustomerCompanyName: string;
  finalCustomerManagerId: number;
  finalCustomerManagerName: string;
  maintenances: OrderReportMaintenanceResponse[];
  licenses: LicenseFromOrderReportResponse[];
  services: OrderReportServiceResponse[];
  maintenanceOnlyItems: OrderReportMaintenanceOnlyItemResponse[];
  others: OrderReportOtherResponse[];
  purchases: OrderReportPurchaseResponse[];
  itemTotalAmount: number;
  itemTotalLicense: number;
  itemTotalThirdParty: number;
  itemTotalService: number;
  itemTotalMaintenance: number;
  itemTotalMaintenanceRate: number;
  licenseTotal: number;
  serviceTotal: number;
  maintenanceTotal: number;
  otherTotal: number;
  purchaseTotal: number;
  emsSummary: number;
  itgSummary: number;
  dashboardSummary: number;
  aiotionSummary: number;
  emsMaintenanceSummary: number;
  itgMaintenanceSummary: number;
  itoSummary: number;
  otherSummary: number;
}

export interface OrderReportHistoryListResponse {
  id: number;
  orderReportId: number;
  changedAt: string;
  changedBy: string;
}

export interface SubmitRequest {
  firstApproverId: string; // UUID
}

// 계약 (Contract Summary) 타입
export type ProposalType = "SELF" | "SI";

export interface ContractModuleItemRequest {
  productModuleId: number;
  quantity: number;
}

export interface ContractRequest {
  orderReportId: number;
  contractFileId?: number;
  contractModuleItems: ContractModuleItemRequest[];
  proposalType: ProposalType;
  contractAmount: number;
  contractDate: string; // LocalDate → ISO string
  maintenanceCondition?: string;
  salesRepresentativeId: string; // UUID
}

export interface ContractModuleItemResponse {
  id: number;
  productModuleId: number;
  productModuleName: string;
  productClass: ProductClass;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ContractListResponse {
  id: number;
  proposalType: ProposalType;
  contractAmount: number;
  contractDate: string;
  salesRepresentativeId: string;
  salesRepresentativeName: string;
}

export interface ContractResponse {
  id: number;
  orderReportId: number;
  contractFileId: number;
  contractModuleItems: ContractModuleItemResponse[];
  proposalType: ProposalType;
  contractAmount: number;
  contractDate: string;
  maintenanceCondition: string;
  salesRepresentativeId: string;
  salesRepresentativeName: string;
}

// 라이선스 (License) 타입
export type LicenseType = "PERMANENT" | "SUBSCRIPTION" | "TRIAL";
export type LicenseStatus = "ACTIVE" | "EXPIRED" | "PENDING" | "REVOKED";

export interface LicenseRequest {
  productModuleId: number;
  quantity: number;
  licenseType: LicenseType;
  customerCompanyId: number;
  startDate: string;
  endDate: string;
}

export interface LicenseUpdateRequest {
  customerCompanyId: number;
  productModuleId: number;
  quantity: number;
  licenseType: LicenseType;
  licenseStatus: LicenseStatus;
  startDate: string;
  endDate: string;
}

export interface LicenseListResponse {
  id: number;
  orderReportId: number;
  productModuleId: number;
  productClass: ProductClass;
  productName: string;
  quantity: number;
  licenseType: LicenseType;
  licenseStatus: LicenseStatus;
  customerCompanyId: number;
  customerCompanyName: string;
  startDate: string;
  endDate: string;
}

export interface LicenseResponse {
  id: number;
  workflowId: number;
  status: ApprovalStatus;
  orderReportId: number;
  productModuleId: number;
  productClass: ProductClass;
  productGroup: string;
  productName: string;
  quantity: number;
  price: number;
  totalPrice: number;
  licenseType: LicenseType;
  licenseStatus: LicenseStatus;
  customerCompanyId: number;
  customerCompanyName: string;
  startDate: string;
  endDate: string;
}

// 수주보고서 API
export const orderReportApi = {
  /** 수주보고서 목록 조회 */
  getOrderReports: () =>
    customInstance<ApiResponse<OrderReportListResponse[]>>({
      url: "/contract/order-reports",
      method: "GET",
    }),

  /** 수주보고서 상세 조회 */
  getOrderReport: (id: number) =>
    customInstance<ApiResponse<OrderReportResponse>>({
      url: `/contract/order-reports/${id}`,
      method: "GET",
    }),

  /** 수주보고서 생성 */
  createOrderReport: (data: OrderReportRequest) =>
    customInstance<ApiResponse<OrderReportResponse>>({
      url: "/contract/order-reports",
      method: "POST",
      data,
    }),

  /** 수주보고서 수정 */
  updateOrderReport: (id: number, data: OrderReportRequest) =>
    customInstance<ApiResponse<OrderReportResponse>>({
      url: `/contract/order-reports/${id}`,
      method: "PUT",
      data,
    }),

  /** 수주보고서 삭제 */
  deleteOrderReport: (id: number) =>
    customInstance<ApiResponse<void>>({
      url: `/contract/order-reports/${id}`,
      method: "DELETE",
    }),

  /** 수주보고서 변경이력 목록 조회 */
  getOrderReportHistories: (id: number) =>
    customInstance<ApiResponse<OrderReportHistoryListResponse[]>>({
      url: `/contract/order-reports/${id}/histories`,
      method: "GET",
    }),

  /** 수주보고서 변경이력 상세 조회 */
  getOrderReportHistory: (historyId: number) =>
    customInstance<ApiResponse<OrderReportResponse>>({
      url: `/contract/order-reports/histories/${historyId}`,
      method: "GET",
    }),

  /** 수주보고서 결재 상신 */
  submitOrderReport: (id: number, firstApproverId: string) =>
    customInstance<ApiResponse<string>>({
      url: `/contract/order-reports/submit/${id}`,
      method: "POST",
      data: { firstApproverId } satisfies SubmitRequest,
    }),
};

// 계약 API
export const contractApi = {
  /** 계약 목록 조회 */
  getContracts: () =>
    customInstance<ApiResponse<ContractListResponse[]>>({
      url: "/contract/summaries",
      method: "GET",
    }),

  /** 계약 상세 조회 */
  getContract: (id: number) =>
    customInstance<ApiResponse<ContractResponse>>({
      url: `/contract/summaries/${id}`,
      method: "GET",
    }),

  /** 계약 생성 */
  createContract: (data: ContractRequest) =>
    customInstance<ApiResponse<ContractResponse>>({
      url: "/contract/summaries",
      method: "POST",
      data,
    }),

  /** 계약 수정 */
  updateContract: (id: number, data: ContractRequest) =>
    customInstance<ApiResponse<ContractResponse>>({
      url: `/contract/summaries/${id}`,
      method: "PATCH",
      data,
    }),

  /** 계약 삭제 */
  deleteContract: (id: number) =>
    customInstance<ApiResponse<void>>({
      url: `/contract/summaries/${id}`,
      method: "DELETE",
    }),
};

// 라이선스 API
export const licenseApi = {
  /** 라이선스 목록 조회 */
  getLicenses: () =>
    customInstance<ApiResponse<LicenseListResponse[]>>({
      url: "/contract/licenses",
      method: "GET",
    }),

  /** 라이선스 상세 조회 */
  getLicense: (id: number) =>
    customInstance<ApiResponse<LicenseResponse>>({
      url: `/contract/licenses/${id}`,
      method: "GET",
    }),

  /** 라이선스 생성 */
  createLicense: (data: LicenseRequest) =>
    customInstance<ApiResponse<LicenseResponse>>({
      url: "/contract/licenses",
      method: "POST",
      data,
    }),

  /** 라이선스 수정 */
  updateLicense: (id: number, data: LicenseUpdateRequest) =>
    customInstance<ApiResponse<LicenseResponse>>({
      url: `/contract/licenses/${id}`,
      method: "PATCH",
      data,
    }),

  /** 라이선스 삭제 */
  deleteLicense: (id: number) =>
    customInstance<ApiResponse<void>>({
      url: `/contract/licenses/${id}`,
      method: "DELETE",
    }),

  /** 라이선스 결재 상신 */
  submitLicense: (id: number, firstApproverId: string) =>
    customInstance<ApiResponse<string>>({
      url: `/contract/licenses/submit/${id}`,
      method: "POST",
      data: { firstApproverId } satisfies SubmitRequest,
    }),
};
