import { customInstance } from './customAxios';
import { ApiResponse } from './project-api';

export interface OrderReportListResponse {
  id: number;
  customerName: string;
  projectName: string;
  orderDate: string;
  salesRepName: string;
  approvalStatus: string;
  totalAmount: number;
}

export const orderReportApi = {
  /** 수주보고서 목록 조회 */
  getOrderReports: () =>
    customInstance<ApiResponse<OrderReportListResponse[]>>({
      url: '/contract/order-reports',
      method: 'GET',
    }),

  /** 수주보고서 상세 조회 */
  getOrderReport: (id: number) =>
    customInstance<ApiResponse<any>>({
      url: `/contract/order-reports/${id}`,
      method: 'GET',
    }),
};
