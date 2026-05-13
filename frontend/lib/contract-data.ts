export type ContractCategory = "orders" | "contracts" | "purchases" | "licenses";

export type OrderReportLicenseDetail = {
  category: string;
  group: string;
  product: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
};

export type OrderReportServiceDetail = {
  content: string;
  mm: string;
  unitPrice: string;
  subtotal: string;
};

export type OrderReportMaintenanceDetail = {
  content: string;
  cycle: string;
  months: string;
  monthlyAmount: string;
  subtotal: string;
};

export type OrderReportOtherDetail = {
  content: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
};

export type OrderReportMaintenanceSummary = {
  year: string;
  projectAmount: string;
  license: string;
  thirdParty: string;
  service: string;
  maintenance: string;
  rate: string;
};

export type OrderReport = {
  id: string;
  name: string;
  customer: string;
  orderDate: string;
  amount: string;
  product: string;
  salesRep: string;
  approvalStatus: string;
  approver: string;
  // 기본 정보
  vatType?: string;
  paymentTerms?: string;
  // 매출분류
  salesClassification?: {
    ems: string;
    emsMaintenance: string;
    itg: string;
    itgMaintenance: string;
    dashboard: string;
    ito: string;
    aiotion: string;
    others: string;
    verification: string;
  };
  // 계약 정보
  type?: string;
  hasChannel?: string;
  codeClassification?: string;
  pmName?: string;
  contractPartner?: { name: string; manager: string; contact: string };
  finalCustomer?: { name: string; manager: string; contact: string };
  contractDate?: string;
  startDate?: string;
  endDate?: string;
  contractPeriod?: string;
  freeMaintenancePeriod?: string;
  // 사업 범위
  businessScope?: string;
  attachments?: {
    quotation: string;
    contract: string;
    purchaseOrder: string;
    prbReport: string;
    others: string;
  };
  // 유지보수 수주보고 요약
  maintenanceSummary?: OrderReportMaintenanceSummary[];
  // 세부 내역
  licenseDetails?: OrderReportLicenseDetail[];
  licenseDiscount?: string;
  serviceDetails?: OrderReportServiceDetail[];
  serviceDiscount?: string;
  maintenanceDetails?: OrderReportMaintenanceDetail[];
  maintenanceDiscount?: string;
  otherSalesDetails?: OrderReportOtherDetail[];
  purchaseDetails?: OrderReportOtherDetail[];
};

export const orderReports: OrderReport[] = [];;

export type Contract = {
  id: string;
  orderId: string;
  name: string;
  customer: string;
  contractDate: string;
  startDate: string;
  endDate: string;
  amount: string;
  maintenanceEnd: string;
  status: string;
};

export const contracts: Contract[] = [];;

export type License = {
  id: string;
  contractId: string;
  customer: string;
  product: string;
  module: string;
  quantity: number;
  type: string;
  issueDate: string;
  expiryDate: string;
  status: string;
};

export const licenses: License[] = [];;

export type PurchaseContract = {
  id: string;
  name: string;
  supplier: string;
  contractDate: string;
  amount: string;
  manager: string;
  status: string;
};

export const purchaseContracts: PurchaseContract[] = [];;

export const contractStatuses = ["승인완료", "검토중", "진행중", "발급완료", "사용중"];

export function getContractItem(category: ContractCategory, id: string) {
  if (category === "orders") return orderReports.find((item) => item.id === id) ?? null;
  if (category === "contracts") return contracts.find((item) => item.id === id) ?? null;
  if (category === "purchases") return purchaseContracts.find((item) => item.id === id) ?? null;
  return licenses.find((item) => item.id === id) ?? null;
}

export function getContractFields(category: ContractCategory, item: any) {
  if (category === "orders")
    return [
      { label: "수주보고 번호", value: item.id },
      { label: "사업명", value: item.name },
      { label: "고객사", value: item.customer },
      { label: "수주일", value: item.orderDate },
      { label: "계약금액", value: item.amount },
      { label: "제품", value: item.product },
      { label: "납품 모듈", value: "-" },
      { label: "사업 시작일", value: "-" },
      { label: "사업 종료일", value: "-" },
      { label: "비고", value: `담당자 ${item.salesRep} / 승인자 ${item.approver}` },
      { label: "결재상태", value: item.approvalStatus },
    ];
  if (category === "contracts")
    return [
      { label: "수주번호", value: item.orderId },
      { label: "계약번호", value: item.id },
      { label: "계약일", value: item.contractDate },
      { label: "계약금액", value: item.amount },
      { label: "사업 시작일", value: item.startDate },
      { label: "사업 종료일", value: item.endDate },
      { label: "유지보수 종료일", value: item.maintenanceEnd },
      { label: "사업명", value: item.name },
      { label: "고객사", value: item.customer },
      { label: "상태", value: item.status },
    ];
  if (category === "purchases")
    return [
      { label: "매입계약 번호", value: item.id },
      { label: "공급사", value: item.supplier },
      { label: "계약일", value: item.contractDate },
      { label: "계약금액", value: item.amount },
      { label: "담당자", value: item.manager },
      { label: "상태", value: item.status },
    ];
  return [
    { label: "계약번호", value: item.contractId },
    { label: "고객사", value: item.customer },
    { label: "제품", value: item.product },
    { label: "모듈", value: item.module },
    { label: "수량", value: String(item.quantity) },
    { label: "유형", value: item.type },
    { label: "발급일", value: item.issueDate },
    { label: "만료일", value: item.expiryDate },
    { label: "라이선스번호", value: item.id },
    { label: "상태", value: item.status },
  ];
}

export function getContractCategoryLabel(category: ContractCategory) {
  if (category === "orders") return "수주보고";
  if (category === "contracts") return "계약";
  if (category === "purchases") return "매입계약";
  return "라이선스";
}
