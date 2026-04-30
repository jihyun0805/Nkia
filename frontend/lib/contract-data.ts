export type ContractCategory = "orders" | "contracts" | "purchases" | "licenses";

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
};

export const orderReports: OrderReport[] = [
  {
    id: "ORD-2026-001",
    name: "농협은행 통합 모니터링 시스템",
    customer: "농협은행",
    orderDate: "2026-03-05",
    amount: "300,000,000",
    product: "EMS Enterprise",
    salesRep: "김영업",
    approvalStatus: "승인완료",
    approver: "대표이사",
  },
  {
    id: "ORD-2026-002",
    name: "우리은행 자동화 시스템",
    customer: "우리은행",
    orderDate: "2026-02-20",
    amount: "250,000,000",
    product: "Automation Suite",
    salesRep: "박과장",
    approvalStatus: "승인완료",
    approver: "대표이사",
  },
  {
    id: "ORD-2026-003",
    name: "현대해상 ITSM 구축",
    customer: "현대해상",
    orderDate: "2026-03-15",
    amount: "450,000,000",
    product: "ITSM Pro",
    salesRep: "이대리",
    approvalStatus: "검토중",
    approver: "사업본부장",
  },
];

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

export const contracts: Contract[] = [
  {
    id: "CON-2026-001",
    orderId: "ORD-2026-001",
    name: "농협은행 통합 모니터링 시스템",
    customer: "농협은행",
    contractDate: "2026-03-10",
    startDate: "2026-03-15",
    endDate: "2026-06-30",
    amount: "300,000,000",
    maintenanceEnd: "2027-06-30",
    status: "진행중",
  },
  {
    id: "CON-2026-002",
    orderId: "ORD-2026-002",
    name: "우리은행 자동화 시스템",
    customer: "우리은행",
    contractDate: "2026-02-25",
    startDate: "2026-03-01",
    endDate: "2026-05-31",
    amount: "250,000,000",
    maintenanceEnd: "2027-05-31",
    status: "진행중",
  },
];

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

export const licenses: License[] = [
  {
    id: "LIC-2026-001",
    contractId: "CON-2026-001",
    customer: "농협은행",
    product: "EMS Enterprise",
    module: "SMS/NMS/APM",
    quantity: 100,
    type: "영구",
    issueDate: "2026-03-15",
    expiryDate: "-",
    status: "발급완료",
  },
  {
    id: "LIC-2026-002",
    contractId: "CON-2026-002",
    customer: "우리은행",
    product: "Automation Suite",
    module: "WFA/RPA",
    quantity: 50,
    type: "영구",
    issueDate: "2026-03-01",
    expiryDate: "-",
    status: "발급완료",
  },
  {
    id: "LIC-2026-003",
    contractId: "-",
    customer: "삼성전자",
    product: "EMS Trial",
    module: "SMS/NMS",
    quantity: 10,
    type: "트라이얼",
    issueDate: "2026-03-10",
    expiryDate: "2026-04-10",
    status: "사용중",
  },
];

export type PurchaseContract = {
  id: string;
  name: string;
  supplier: string;
  contractDate: string;
  amount: string;
  manager: string;
  status: string;
};

export const purchaseContracts: PurchaseContract[] = [
  {
    id: "PUR-2026-001",
    name: "AI 서버용 GPU 매입",
    supplier: "NVIDIA",
    contractDate: "2026-03-20",
    amount: "500000000",
    manager: "박매입",
    status: "계약완료",
  },
  {
    id: "PUR-2026-002",
    name: "업무용 소프트웨어 라이선스 매입",
    supplier: "Microsoft",
    contractDate: "2026-03-22",
    amount: "120000000",
    manager: "김구매",
    status: "진행중",
  },
];

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
