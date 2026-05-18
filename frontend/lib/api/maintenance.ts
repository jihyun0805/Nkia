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

export interface MaintenanceDetailResponse {
  id: number;
  workflowId: number | null;
  status: string | null;
  projectId: number | null;
  projectName: string;
  customerName: string;
  salesRepName: string | null;
  managerPrimaryName: string | null;
  managerSecondaryName: string | null;
  regularPm: string | null;
  type: "FREE" | "PAID";
  isRemote: boolean;
  category: string | null;
  contractAmount: number | null;
  annualAmount: number | null;
  contractDate: string | null;
  startDate: string | null;
  endDate: string | null;
  reportSubmitted: boolean;
  inspectionCycle: "MONTHLY" | "QUARTERLY" | "SEMI_ANNUALLY" | "NONE" | null;
  importance: "HIGH" | "MEDIUM" | "LOW" | null;
  location: string | null;
  rate: number | null;
  productFamily: "EMS" | "ITSM" | "Automation" | "WSS" | null;
  apVersion: string | null;
  aclPatchStatus: boolean;
  vulnPatchStatus: boolean;
  upgradePlan: string | null;
  apCount: number | null;
  esCount: number | null;
  esVersion: string | null;
  dbHaStatus: boolean;
  dbVersion: string | null;
  remarks: string | null;
  contractFileId: number | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string | null;
}

export const getMaintenanceDetail = async (id: number): Promise<ApiResponse<MaintenanceDetailResponse>> => {
  return await customInstance({ url: `/maintenances/${id}`, method: "get" });
};

export const createMaintenance = async (data: any): Promise<ApiResponse<number>> => {
  return await customInstance({ url: "/maintenances", method: "post", data });
};

export const updateMaintenance = async (id: number, data: any): Promise<ApiResponse<MaintenanceDetailResponse>> => {
  return await customInstance({ url: `/maintenances/${id}`, method: "put", data });
};

export const deleteMaintenance = async (id: number): Promise<ApiResponse<void>> => {
  return await customInstance({ url: `/maintenances/${id}`, method: "delete" });
};

export const submitMaintenanceApproval = async (id: number, request: { firstApproverId: string }): Promise<ApiResponse<string>> => {
  return await customInstance({ url: `/maintenances/submit/${id}`, method: "post", data: request });
};
