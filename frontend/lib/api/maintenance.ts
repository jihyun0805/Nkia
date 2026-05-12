import { customInstance } from "@/lib/api/customAxios";

export interface MaintenanceListResponse {
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

export interface ApiResponse<T> {
  success: boolean;
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
