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

