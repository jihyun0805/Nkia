import { customInstance } from "@/lib/api/customAxios";

export type AlarmType =
  | "APPROVAL_REQUEST"
  | "APPROVAL_REJECTED"
  | "QUOTE_REVIEW"
  | "DEADLINE_WARNING"
  | "MAINTENANCE_EXPIRY"
  | "ACTIVITY_REQUEST"
  | "QUOTATION_APPROVAL_REQUEST"
  | "MAINTENANCE_QUOTATION_APPROVAL_REQUEST"
  | "ORDER_REPORT_APPROVAL_REQUEST"
  | "CONTRACT_APPROVAL_REQUEST"
  | "PURCHASE_CONTRACT_APPROVAL_REQUEST"
  | "FREE_MAINTENANCE_CONTRACT_APPROVAL_REQUEST"
  | "PAID_MAINTENANCE_CONTRACT_APPROVAL_REQUEST"
  | "LICENSE_APPROVAL_REQUEST"
  | "BILLING_APPROVAL_REQUEST"
  | "CUSTOMER_SUPPORT_APPROVAL_REQUEST"
  | "QUOTATION_APPROVED"
  | "MAINTENANCE_QUOTATION_APPROVED"
  | "ORDER_REPORT_APPROVED"
  | "CONTRACT_APPROVED"
  | "PURCHASE_APPROVED"
  | "FREE_MAINTENANCE_CONTRACT_APPROVED"
  | "PAID_MAINTENANCE_CONTRACT_APPROVED"
  | "LICENSE_APPROVED"
  | "BILLING_APPROVED"
  | "CUSTOMER_SUPPORT_APPROVED"
  | "QUOTATION_REJECTED"
  | "MAINTENANCE_QUOTATION_REJECTED"
  | "ORDER_REPORT_REJECTED"
  | "CONTRACT_REJECTED"
  | "PURCHASE_REJECTED"
  | "FREE_MAINTENANCE_CONTRACT_REJECTED"
  | "PAID_MAINTENANCE_CONTRACT_REJECTED"
  | "LICENSE_REJECTED"
  | "BILLING_REJECTED"
  | "CUSTOMER_SUPPORT_REJECTED"
  | "BILLING_ISSUE_REQUEST"
  | "BILLING_COLLECTION_REQUEST"
  | "FREE_MAINTENANCE_EXPIRY"
  | "PAID_MAINTENANCE_EXPIRY";

export interface AlarmResponse {
  id: number;
  senderName: string;
  type: AlarmType;
  message: string;
  targetId: number | null;
  isRead: boolean;
  createdAt: string;
}

interface AlarmApiWrapper<T> {
  result: string;
  data: T;
  message?: string;
}

export function getAlarmNavigationUrl(type: AlarmType, targetId: number | null): string | null {
  if (!targetId) return null;

  switch (type) {
    case "BILLING_ISSUE_REQUEST":
    case "BILLING_COLLECTION_REQUEST":
    case "BILLING_APPROVED":
    case "BILLING_REJECTED":
    case "BILLING_APPROVAL_REQUEST":
      return `/project/billingAndCollection/${targetId}`;
    case "FREE_MAINTENANCE_EXPIRY":
    case "PAID_MAINTENANCE_EXPIRY":
    case "FREE_MAINTENANCE_CONTRACT_APPROVED":
    case "FREE_MAINTENANCE_CONTRACT_REJECTED":
    case "FREE_MAINTENANCE_CONTRACT_APPROVAL_REQUEST":
    case "PAID_MAINTENANCE_CONTRACT_APPROVED":
    case "PAID_MAINTENANCE_CONTRACT_REJECTED":
    case "PAID_MAINTENANCE_CONTRACT_APPROVAL_REQUEST":
      return `/maintenance`;
    case "CUSTOMER_SUPPORT_APPROVAL_REQUEST":
    case "CUSTOMER_SUPPORT_APPROVED":
    case "CUSTOMER_SUPPORT_REJECTED":
      return `/maintenance/support-requests/${targetId}`;
    case "ORDER_REPORT_APPROVAL_REQUEST":
    case "ORDER_REPORT_APPROVED":
    case "ORDER_REPORT_REJECTED":
      return `/contract/orders/${targetId}`;
    case "CONTRACT_APPROVAL_REQUEST":
    case "CONTRACT_APPROVED":
    case "CONTRACT_REJECTED":
      return `/contract/contracts/${targetId}`;
    default:
      return null;
  }
}

export function alarmNeedsConfirmation(type: AlarmType): boolean {
  return type === "BILLING_ISSUE_REQUEST" || type === "BILLING_COLLECTION_REQUEST";
}

export const alarmApi = {
  getUnreadAlarms: () =>
    customInstance<AlarmApiWrapper<AlarmResponse[]>>({
      url: "/alarms/unread",
      method: "GET",
    }),

  markAsRead: (id: number) =>
    customInstance<AlarmApiWrapper<null>>({
      url: `/alarms/${id}/read`,
      method: "PATCH",
    }),

  markAllAsRead: () =>
    customInstance<AlarmApiWrapper<null>>({
      url: "/alarms/read-all",
      method: "PATCH",
    }),
};
