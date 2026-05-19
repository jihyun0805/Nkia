import { customInstance } from "@/lib/api/customAxios";

export interface MaintenanceListResponse {
  id: number;
  customerName: string;
  projectName: string;
  productFamilyName: string;
  contractAmount: number;
  startDate: string;
  endDate: string;
  inspectionMethod: string;
  salesRepName: string;
  managerPrimaryName: string;
}

export interface IntegratedSupportListResponse {
  dataType: "REQUEST" | "ACTIVITY";
  id: number;
  customerName: string;
  activityCategory: string;
  startAt: string;
  endAt: string;
  ownerName: string;
  salesRepName: string;
  supportManagerName: string;
}

export interface ApiResponse<T> {
  success?: boolean;
  result?: "SUCCESS" | "ERROR" | string;
  message?: string;
  errorCode?: string;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export const getFreeMaintenanceList = async (): Promise<ApiResponse<MaintenanceListResponse[]>> => {
  return await customInstance({ url: "/maintenances/free", method: "get" });
};

export const getPaidMaintenanceList = async (): Promise<ApiResponse<MaintenanceListResponse[]>> => {
  return await customInstance({ url: "/maintenances/paid", method: "get" });
};

export const getSupportHistoryList = async (): Promise<ApiResponse<IntegratedSupportListResponse[]>> => {
  return await customInstance({ url: "/maintenances/customer-supports/activities/integrated-status", method: "get" });
};

export interface MaintenanceQuotationCreateRequest {
  projectId: number;
  quotationDate: string; // YYYY-MM-DD
  paymentTerms: string;
  totalAmount: number;
  startDate: string;
  endDate: string;
  monthlySupplyPrice: number;
  totalQuotationAmount: number;
  specialNotes?: string;
  coverInfo?: {
    salesRepresentativeId: string; // UUID
    proposalType: "SELF" | "SI";
    productFamily: "EMS" | "ITSM" | "AUTOMATION" | "WSS";
  };
  packageCosts?: Array<{
    packageName: string;
    amount: number;
  }>;
  serviceInfos?: Array<{
    productId?: number;
    category: string;
    item: string;
    content: string;
  }>;
  amountReasons?: Array<{
    productId?: number;
    quantity: number;
    amount: number;
    months: number;
    remarks?: string;
  }>;
}

export interface MaintenanceQuotationCreateResponse {
  id: number;
  refNo: string;
  quotationDate: string;
  totalQuotationAmount: number;
}

export interface MaintenanceQuotationDetailResponse {
  id: number;
  workflowId: number;
  status: string;
  companyName: string;
  projectName: string;
  refNo: string;
  quotationDate: string;
  paymentTerms: string;
  totalAmount: number;
  startDate: string;
  endDate: string;
  monthlySupplyPrice: number;
  totalQuotationAmount: number;
  specialNotes: string | null;
  coverInfo: {
    customerName: string;
    projectName: string;
    proposalType: string;
    productFamily: string;
    totalQuotationAmount: number;
    quotationDate: string;
    salesRepresentative: string;
  } | null;
  packageCosts: Array<{ packageName: string; amount: number }>;
  serviceInfos: Array<{
    productId: number | null;
    productName: string;
    category: string;
    item: string;
    content: string;
  }>;
  amountReasons: Array<{
    productId: number | null;
    productCategory: string;
    productName: string;
    quantity: number;
    amount: number;
    months: number;
    remarks: string | null;
  }>;
}

export const createMaintenanceQuotation = async (data: MaintenanceQuotationCreateRequest): Promise<ApiResponse<MaintenanceQuotationCreateResponse>> => {
  return await customInstance({ url: "/maintenances/quotations", method: "post", data });
};

export const getMaintenanceQuotationDetail = async (id: number): Promise<ApiResponse<MaintenanceQuotationDetailResponse>> => {
  return await customInstance({ url: `/maintenances/quotations/${id}`, method: "get" });
};

export const updateMaintenanceQuotation = async (id: number, data: MaintenanceQuotationCreateRequest): Promise<ApiResponse<MaintenanceQuotationDetailResponse>> => {
  return await customInstance({ url: `/maintenances/quotations/${id}`, method: "put", data });
};

export const deleteMaintenanceQuotation = async (id: number): Promise<ApiResponse<void>> => {
  return await customInstance({ url: `/maintenances/quotations/${id}`, method: "delete" });
};

// ---------------------------------------------------------------------------
// Maintenance Contract (유지보수 계약) – /maintenances endpoints
// ---------------------------------------------------------------------------

export interface MaintenanceCreateRequest {
  projectId: number;
  salesRep: string; // UUID
  managerPrimary?: string | null;
  managerSecondary?: string | null;
  category?: string | null;
  type: "FREE" | "PAID";
  contractAmount?: number;
  annualAmount?: number;
  rate?: number;
  contractDate?: string | null;
  startDate: string;
  endDate: string;
  isRemote?: boolean;
  inspectionCycle?: string | null;
  importance?: string;
  location?: string | null;
  reportSubmitted?: boolean;
  regularPm?: string | null;
  productFamily?: string;
  apVersion?: string | null;
  apCount?: number;
  esVersion?: string | null;
  esCount?: number;
  dbVersion?: string | null;
  dbHaStatus?: boolean;
  aclPatchStatus?: boolean;
  vulnPatchStatus?: boolean;
  upgradePlan?: string | null;
  remarks?: string | null;
  contractFileId?: number | null;
}

export interface MaintenanceDetailResponse {
  id: number;
  projectName: string;
  customerName: string;
  type: "FREE" | "PAID";
  category: string | null;
  salesRepName: string | null;
  managerPrimaryName: string | null;
  managerSecondaryName: string | null;
  regularPm: string | null;
  isRemote: boolean;
  inspectionCycle: string | null;
  importance: string | null;
  reportSubmitted: boolean;
  location: string | null;
  rate: number | null;
  contractAmount: number | null;
  annualAmount: number | null;
  contractDate: string | null;
  startDate: string;
  endDate: string;
  productFamily: string | null;
  apVersion: string | null;
  apCount: number | null;
  esVersion: string | null;
  esCount: number | null;
  dbVersion: string | null;
  dbHaStatus: boolean;
  aclPatchStatus: boolean;
  vulnPatchStatus: boolean;
  upgradePlan: string | null;
  remarks: string | null;
  contractFileId: number | null;
}

export const createMaintenance = async (data: MaintenanceCreateRequest): Promise<ApiResponse<MaintenanceDetailResponse>> => {
  return await customInstance({ url: "/maintenances", method: "post", data });
};

export const getMaintenanceDetail = async (id: number): Promise<ApiResponse<MaintenanceDetailResponse>> => {
  return await customInstance({ url: `/maintenances/${id}`, method: "get" });
};

export const updateMaintenance = async (id: number, data: Partial<MaintenanceCreateRequest>): Promise<ApiResponse<MaintenanceDetailResponse>> => {
  return await customInstance({ url: `/maintenances/${id}`, method: "put", data });
};

export const deleteMaintenance = async (id: number): Promise<ApiResponse<void>> => {
  return await customInstance({ url: `/maintenances/${id}`, method: "delete" });
};

// ---------------------------------------------------------------------------
// Customer Support Request (고객지원 요청) – /maintenances/customer-supports/requests
// ---------------------------------------------------------------------------

export interface CustomerSupportCreateRequest {
  customerCompanyCode: number;
  requestStartDate: string;
  requestEndDate: string;
  requestContent: string;
  requesterId: string;
  registrantId: string;
  salesRepId: string;
  supportManagerId: string;
  remarks?: string;
  attachedFileIds?: number[];
}

export interface CustomerSupportRequestListResponse {
  id: number;
  customerName: string;
  requestStartDate: string;
  requestEndDate: string;
  requesterName: string;
  salesRepName: string;
  supportManagerName: string;
}

export const getCustomerSupportRequests = async (): Promise<ApiResponse<CustomerSupportRequestListResponse[]>> => {
  return await customInstance({ url: "/maintenances/customer-supports/requests", method: "get" });
};

export const createCustomerSupportRequest = async (data: CustomerSupportCreateRequest): Promise<ApiResponse<number>> => {
  return await customInstance({ url: "/maintenances/customer-supports/requests", method: "post", data });
};

export interface CustomerSupportRequestDetailResponse {
  id: number;
  workflowId: number | null;
  status: string;
  customerName: string;
  requestStartDate: string;
  requestEndDate: string;
  requestContent: string;
  requesterName: string;
  supportManagerName: string;
  registrantName: string;
  salesRepName: string;
  remarks: string;
  attachedFileIds: number[];
}

export const getCustomerSupportRequestDetail = async (id: number): Promise<ApiResponse<CustomerSupportRequestDetailResponse>> => {
  return await customInstance({ url: `/maintenances/customer-supports/requests/${id}`, method: "get" });
};

// ---------------------------------------------------------------------------
// Customer Support Activity (고객지원 활동 결과) – /maintenances/customer-supports/activities
// ---------------------------------------------------------------------------

export interface CustomerSupportActivityCreateRequest {
  requestId?: number | null;
  maintenanceId?: number | null;
  customerCompanyCode: number;
  activityType: "REGULAR" | "REQUEST";
  activityStartTime: string;
  activityEndTime: string;
  activityContent: string;
  registrantId: string;
  remarks?: string;
  participantList?: { userId: string; roleDescription: string }[];
  attachedFileIds?: number[];
}

export const createCustomerSupportActivity = async (data: CustomerSupportActivityCreateRequest): Promise<ApiResponse<number>> => {
  return await customInstance({ url: "/maintenances/customer-supports/activities", method: "post", data });
};

export interface CustomerSupportActivityDetailResponse {
  id: number;
  requestId: number | null;
  customerName: string;
  activityType: string;
  activityStartTime: string;
  activityEndTime: string;
  activityContent: string;
  registrantName: string;
  remarks: string;
  participants: { userName: string; roleDescription: string }[];
  attachedFileIds: number[];
}

export const getCustomerSupportActivityDetail = async (id: number): Promise<ApiResponse<CustomerSupportActivityDetailResponse>> => {
  return await customInstance({ url: `/maintenances/customer-supports/activities/${id}`, method: "get" });
};

export interface CustomerSupportHistoryListResponse {
  historyId: number;
  originalActivityId: number;
  customerName: string;
  activityType: string;
  activityStartTime: string;
  activityEndTime: string;
  registrantName: string;
  savedAt: string;
}

export interface CustomerSupportHistoryDetailResponse {
  historyId: number;
  originalActivityId: number;
  customerName: string;
  activityType: string;
  activityStartTime: string;
  activityEndTime: string;
  activityContent: string;
  registrantName: string;
  remarks: string;
  participantsInfo: string;
  savedAt: string;
}

export const getCustomerSupportActivityHistories = async (id: number): Promise<ApiResponse<CustomerSupportHistoryListResponse[]>> => {
  return await customInstance({ url: `/maintenances/customer-supports/activities/${id}/histories`, method: "get" });
};

export const getCustomerSupportActivityHistoryDetail = async (historyId: number): Promise<ApiResponse<CustomerSupportHistoryDetailResponse>> => {
  return await customInstance({ url: `/maintenances/customer-supports/activities/histories/${historyId}`, method: "get" });
};

// Update Customer Support Request
export const updateCustomerSupportRequest = async (id: number, data: any): Promise<ApiResponse<CustomerSupportRequestDetailResponse>> => {
  return await customInstance({ url: `/maintenances/customer-supports/requests/${id}`, method: "put", data });
};

// Delete Customer Support Request
export const deleteCustomerSupportRequest = async (id: number): Promise<ApiResponse<void>> => {
  return await customInstance({ url: `/maintenances/customer-supports/requests/${id}`, method: "delete" });
};

// Update Customer Support Activity
export const updateCustomerSupportActivity = async (id: number, data: any): Promise<ApiResponse<CustomerSupportActivityDetailResponse>> => {
  return await customInstance({ url: `/maintenances/customer-supports/activities/${id}`, method: "put", data });
};

// Delete Customer Support Activity
export const deleteCustomerSupportActivity = async (id: number): Promise<ApiResponse<void>> => {
  return await customInstance({ url: `/maintenances/customer-supports/activities/${id}`, method: "delete" });
};

