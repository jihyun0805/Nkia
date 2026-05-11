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
    vatType: "VAT별도",
    paymentTerms: "계약금 30%, 중도금 30%, 잔금 40%",
    salesClassification: {
      ems: "200,000,000",
      emsMaintenance: "30,000,000",
      itg: "50,000,000",
      itgMaintenance: "0",
      dashboard: "20,000,000",
      ito: "0",
      aiotion: "0",
      others: "0",
      verification: "0",
    },
    type: "SOLUTION",
    hasChannel: "N",
    codeClassification: "GN",
    pmName: "최프로",
    contractPartner: { name: "농협은행", manager: "홍길동 과장", contact: "02-1234-5678" },
    finalCustomer: { name: "농협은행", manager: "김은행 차장", contact: "02-1234-9999" },
    contractDate: "2026-03-05",
    startDate: "2026-03-15",
    endDate: "2026-06-30",
    contractPeriod: "( 108 일 )",
    freeMaintenancePeriod: "납품 후 1년",
    businessScope: "통합 모니터링 시스템 구축\n- SMS/NMS/APM 모듈 설치 및 구성\n- 대시보드 커스터마이징\n- 운영자 교육 및 기술이전",
    attachments: { quotation: "Y", contract: "Y", purchaseOrder: "Y", prbReport: "N", others: "" },
    licenseDetails: [
      { category: "EMS", group: "NMS", product: "NMS Enterprise v5.0", quantity: "100", unitPrice: "1,000,000", subtotal: "100,000,000" },
      { category: "EMS", group: "SMS", product: "SMS Standard v3.0", quantity: "100", unitPrice: "800,000", subtotal: "80,000,000" },
      { category: "EMS", group: "APM", product: "APM Enterprise v2.0", quantity: "50", unitPrice: "400,000", subtotal: "20,000,000" },
    ],
    licenseDiscount: "-10,000,000",
    serviceDetails: [
      { content: "시스템 구축 및 커스터마이징", mm: "3", unitPrice: "20,000,000", subtotal: "60,000,000" },
      { content: "운영자 교육", mm: "1", unitPrice: "10,000,000", subtotal: "10,000,000" },
    ],
    serviceDiscount: "",
    maintenanceDetails: [{ content: "EMS 유지보수 (월간 점검)", cycle: "월", months: "12", monthlyAmount: "2,500,000", subtotal: "30,000,000" }],
    maintenanceDiscount: "",
    otherSalesDetails: [{ content: "대시보드 전용 모니터 (55인치)", quantity: "4", unitPrice: "2,500,000", subtotal: "10,000,000" }],
    purchaseDetails: [{ content: "서버 장비 (Dell PowerEdge R750)", quantity: "2", unitPrice: "15,000,000", subtotal: "30,000,000" }],
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
    vatType: "VAT별도",
    paymentTerms: "선금 50%, 잔금 50%",
    salesClassification: {
      ems: "0",
      emsMaintenance: "0",
      itg: "180,000,000",
      itgMaintenance: "20,000,000",
      dashboard: "0",
      ito: "50,000,000",
      aiotion: "0",
      others: "0",
      verification: "0",
    },
    type: "SOLUTION",
    hasChannel: "Y",
    codeClassification: "MN",
    pmName: "정매니저",
    contractPartner: { name: "우리은행", manager: "이담당 대리", contact: "02-2222-3333" },
    finalCustomer: { name: "우리은행", manager: "박고객 과장", contact: "02-2222-4444" },
    contractDate: "2026-02-20",
    startDate: "2026-03-01",
    endDate: "2026-05-31",
    contractPeriod: "( 92 일 )",
    freeMaintenancePeriod: "납품 후 1년",
    businessScope: "업무 자동화 시스템 구축\n- WFA/RPA 모듈 도입\n- 기존 시스템 연동 개발\n- 사용자 교육",
    attachments: { quotation: "Y", contract: "Y", purchaseOrder: "N", prbReport: "N", others: "" },
    licenseDetails: [
      { category: "ITG", group: "WFA", product: "WFA Enterprise v4.0", quantity: "50", unitPrice: "2,000,000", subtotal: "100,000,000" },
      { category: "ITG", group: "RPA", product: "RPA Standard v2.0", quantity: "50", unitPrice: "1,600,000", subtotal: "80,000,000" },
    ],
    licenseDiscount: "",
    serviceDetails: [
      { content: "시스템 연동 개발", mm: "2", unitPrice: "15,000,000", subtotal: "30,000,000" },
      { content: "사용자 교육 및 매뉴얼 작성", mm: "1", unitPrice: "10,000,000", subtotal: "10,000,000" },
    ],
    serviceDiscount: "",
    maintenanceDetails: [{ content: "ITG 유지보수 (분기별 점검)", cycle: "분기", months: "12", monthlyAmount: "1,666,667", subtotal: "20,000,000" }],
    maintenanceDiscount: "",
    otherSalesDetails: [{ content: "ITO 운영 대행 (3개월)", quantity: "1", unitPrice: "10,000,000", subtotal: "10,000,000" }],
    purchaseDetails: [],
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
    vatType: "VAT별도",
    paymentTerms: "계약금 20%, 1차 중도금 30%, 2차 중도금 30%, 잔금 20%",
    salesClassification: {
      ems: "150,000,000",
      emsMaintenance: "50,000,000",
      itg: "150,000,000",
      itgMaintenance: "30,000,000",
      dashboard: "40,000,000",
      ito: "30,000,000",
      aiotion: "0",
      others: "0",
      verification: "0",
    },
    type: "SOLUTION",
    hasChannel: "N",
    codeClassification: "MN",
    pmName: "강프로",
    contractPartner: { name: "현대해상", manager: "조담당 과장", contact: "02-3333-4444" },
    finalCustomer: { name: "현대해상", manager: "윤고객 부장", contact: "02-3333-5555" },
    contractDate: "2026-03-15",
    startDate: "2026-04-01",
    endDate: "2026-09-30",
    contractPeriod: "( 183 일 )",
    freeMaintenancePeriod: "납품 후 1년",
    businessScope: "ITSM 통합 구축 프로젝트\n- IT서비스 관리 체계 수립\n- EMS/ITG 통합 모니터링\n- 대시보드 구성 및 리포트 자동화\n- ITO 운영 체계 수립",
    attachments: { quotation: "Y", contract: "N", purchaseOrder: "N", prbReport: "Y", others: "PRB 보고서 첨부" },
    licenseDetails: [
      { category: "EMS", group: "NMS", product: "NMS Enterprise v5.0", quantity: "200", unitPrice: "500,000", subtotal: "100,000,000" },
      { category: "EMS", group: "SMS", product: "SMS Enterprise v5.0", quantity: "200", unitPrice: "250,000", subtotal: "50,000,000" },
      { category: "ITG", group: "WFA", product: "WFA Enterprise v4.0", quantity: "100", unitPrice: "1,000,000", subtotal: "100,000,000" },
      { category: "ITG", group: "RPA", product: "RPA Enterprise v3.0", quantity: "50", unitPrice: "1,000,000", subtotal: "50,000,000" },
    ],
    licenseDiscount: "-20,000,000",
    serviceDetails: [
      { content: "ITSM 체계 수립 컨설팅", mm: "2", unitPrice: "25,000,000", subtotal: "50,000,000" },
      { content: "시스템 구축 및 연동", mm: "3", unitPrice: "20,000,000", subtotal: "60,000,000" },
      { content: "대시보드 개발", mm: "1", unitPrice: "15,000,000", subtotal: "15,000,000" },
    ],
    serviceDiscount: "-5,000,000",
    maintenanceDetails: [
      { content: "EMS 유지보수", cycle: "월", months: "12", monthlyAmount: "2,500,000", subtotal: "30,000,000" },
      { content: "ITG 유지보수", cycle: "분기", months: "12", monthlyAmount: "1,666,667", subtotal: "20,000,000" },
    ],
    maintenanceDiscount: "",
    otherSalesDetails: [
      { content: "대시보드 전용 디스플레이 (65인치)", quantity: "6", unitPrice: "3,000,000", subtotal: "18,000,000" },
      { content: "ITO 운영 대행 (6개월)", quantity: "1", unitPrice: "32,000,000", subtotal: "32,000,000" },
    ],
    purchaseDetails: [
      { content: "서버 장비 (HPE DL380)", quantity: "3", unitPrice: "12,000,000", subtotal: "36,000,000" },
      { content: "네트워크 장비 (Cisco Catalyst)", quantity: "2", unitPrice: "8,000,000", subtotal: "16,000,000" },
    ],
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
