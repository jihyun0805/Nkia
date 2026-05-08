import type { StoredFileAttachment } from "@/lib/attachments"

export type ActivityCategory = "activities" | "quotations" | "requests"

export type ActivityAttachment = StoredFileAttachment

export type ActivityRecord = {
  id: string
  date: string
  requestId?: string
  registrant?: string
  requester?: string
  customerCode: string
  businessCode: string
  activityMode: string
  activityContent: string
  type?: string
  customer: string
  opportunity: string
  location: string
  attendees: string
  content: string
  issues: string
  nextAction: string
  status: string
  attachments?: ActivityAttachment[]
}

export type QuotationRecord = {
  id: string
  requestId?: string
  refNumber?: string
  date: string
  customerCode?: string
  opportunityCode?: string
  customer: string
  opportunity: string
  proposalType: "자체 제안" | "SI 제안"
  productGroup: "EMS" | "ITSM" | "Automation" | "WSS"
  salesRep: string
  paymentTerms?: string
  contactName?: string
  items: {
    id: string
    name: string
    amount: string
  }[]
  solutionSectionTitle?: string
  solutionRows?: {
    id: string
    rowNo: string
    category: string
    module: string
    quantity: string
    consumerUnitPrice: string
    consumerTotal: string
    supplyUnitPrice: string
    supplyTotal: string
    discountRate: string
    note: string
  }[]
  customizingSectionTitle?: string
  customizingRows?: {
    id: string
    rowNo: string
    item: string
    laborRate: string
    manMonth: string
    supplyAmount: string
  }[]
  templateText?: {
    headerBrand: string
    headerCompanyName: string
    documentTitle: string
    refLabel: string
    recipientSuffix: string
    introText: string
    quoteDateLabel: string
    paymentTermsLabel: string
    businessNameLabel: string
    totalAmountLabel: string
    totalAmountSuffix: string
    unitNote: string
    remarksTitle: string
    evidenceTitle: string
    supplierName: string
    addressLine1: string
    addressLine2: string
    ceoLabel: string
    ceoName: string
    telLabel: string
    tel: string
    faxLabel: string
    fax: string
    contactLabel: string
  }
  approvalFlow?: {
    drafter: string
    firstApprover: string
    secondApprover: string
    secondApproverOptional: boolean
    distributor: string
    sharedWith: string
  }
  approvalProcess?: {
    overallStatus: "진행중" | "승인완료" | "반려"
    currentStepIndex: number
    steps: {
      label: string
      assignee: string
      status: "pending" | "approved" | "rejected"
      actedAt?: string
      actedBy?: string
      note?: string
    }[]
  }
  deletedAt?: string
  deletedBy?: string
  deletedVersions?: string[]
  changeHistory?: {
    version: string
    changedAt: string
    changedBy: string
    action: "created" | "updated" | "deleted"
    summary: string
  }[]
  versionSnapshots?: {
    version: string
    capturedAt: string
    form: Omit<QuotationRecord, "id" | "changeHistory" | "versionSnapshots">
  }[]
  remarks?: string
  amount: string
  validity: string
  status: string
}

export type StandardPriceRecord = {
  id: string
  productClass: string
  productGroup: string
  productNumber: string
  productName: string
  licenseBase: string
  licenseUnit: string
  unitPrice: string
  discountRate: string
  proposalPrice: string
}

export type ActivityRequestRecord = {
  id: string
  date: string
  requester: string
  receiver: string
  type: string
  customerCode?: string
  customer: string
  opportunityCode?: string
  opportunity: string
  content: string
  dueDate: string
  status: string
  approvedAt?: string
  lastAction?: "created" | "updated" | "approved"
  lastActionAt?: string
  attachments?: ActivityAttachment[]
}

export const activityModeOptions = [
  "이메일",
  "전화",
  "대면미팅",
  "영상회의",
  "기타",
]

export const activityContentOptions = [
  "상담",
  "제품소개",
  "데모",
  "PoC",
  "BMT",
  "자료 전달",
  "RFP 분석",
  "제안서 작성",
  "SI 제안서 작성",
  "기타",
]

export const activityRequestTypeOptions = [
  "제품소개",
  "데모",
  "PoC",
  "BMT",
  "자료 전달",
  "RFP 분석",
  "제안서 작성",
  "SI 제안서 작성",
  "기타",
]

export const requestOptionalActivityContents = ["상담", "기타"]

export const activityRequestStatusOptions = [
  "요청",
  "접수완료",
]

export const activities: ActivityRecord[] = [
  {
    id: "ACT-2026-001",
    date: "2026-03-17",
    registrant: "김영업",
    requester: "김영업",
    customerCode: "CUS-001",
    businessCode: "OPP-2026-001",
    activityMode: "대면미팅",
    activityContent: "제품소개",
    customer: "삼성전자",
    opportunity: "삼성전자 EMS 구축",
    location: "삼성전자 수원캠퍼스",
    attendees: "김영업, 박기술",
    content: "EMS 제품 소개 및 고객 요구사항 청취",
    issues: "기존 시스템과의 연동 방안 검토 필요",
    nextAction: "기술 검토 후 PoC 일정 협의",
    status: "완료",
    attachments: [{ id: "ACT-2026-001-ATT-001", name: "삼성전자_미팅메모.pdf", size: 154320, contentType: "application/pdf", dataUrl: "data:application/pdf;base64,JVBERi0xLjQKJcfs...", createdAt: "2026-03-17" }],
  },
  {
    id: "ACT-2026-002",
    date: "2026-03-16",
    registrant: "이대리",
    requester: "이대리",
    customerCode: "CUS-002",
    businessCode: "OPP-2026-002",
    activityMode: "이메일",
    activityContent: "자료 전달",
    customer: "LG CNS",
    opportunity: "국방부 ITSM 도입",
    location: "이메일",
    attendees: "이대리",
    content: "RFP 관련 추가 자료 전달",
    issues: "-",
    nextAction: "회신 대기",
    status: "완료",
    attachments: [{ id: "ACT-2026-002-ATT-001", name: "국방부_RFP_추가자료.zip", size: 332800, contentType: "application/zip", dataUrl: "data:application/zip;base64,UEsDBAoAAAAAA", createdAt: "2026-03-16" }],
  },
  {
    id: "ACT-2026-003",
    date: "2026-03-18",
    registrant: "김영업",
    requester: "김영업",
    customerCode: "CUS-004",
    businessCode: "OPP-2026-004",
    activityMode: "대면미팅",
    activityContent: "데모",
    customer: "SK텔레콤",
    opportunity: "SK텔레콤 NMS 업그레이드",
    location: "SK텔레콤 본사",
    attendees: "김영업, 최기술, 정PM",
    content: "NMS 신규 기능 데모 진행 예정",
    issues: "-",
    nextAction: "데모 결과 정리 및 후속 미팅 일정 조율",
    status: "예정",
  },
  {
    id: "ACT-2026-004",
    date: "2026-03-15",
    registrant: "박기술",
    requester: "박기술",
    customerCode: "CUS-003",
    businessCode: "OPP-2026-003",
    activityMode: "대면미팅",
    activityContent: "PoC",
    customer: "현대자동차",
    opportunity: "현대차 Automation 확장",
    location: "현대차 기술연구소",
    attendees: "박과장, 김기술",
    content: "Automation 솔루션 PoC 1차 완료",
    issues: "성능 테스트 추가 요청",
    nextAction: "2차 PoC 일정 협의",
    status: "진행중",
  },
  {
    id: "ACT-2026-005",
    date: "2026-03-14",
    registrant: "최PM",
    requester: "최PM",
    customerCode: "CUS-005",
    businessCode: "OPP-2026-005",
    activityMode: "전화",
    activityContent: "상담",
    customer: "NTT DoCoMo",
    opportunity: "일본 NTT DoCoMo WSS",
    location: "전화",
    attendees: "최부장",
    content: "WSS 도입 관련 초기 상담",
    issues: "일본어 자료 준비 필요",
    nextAction: "제안서 초안 작성",
    status: "완료",
  },
]

export const quotations: QuotationRecord[] = [
  {
    id: "QT-2026-001",
    refNumber: "NKIA-20090120-022-01",
    date: "2026-03-15",
    customerCode: "CUS-001",
    opportunityCode: "OPP-2026-001",
    customer: "삼성전자",
    opportunity: "삼성전자 EMS 구축",
    proposalType: "자체 제안",
    productGroup: "EMS",
    salesRep: "김영업",
    paymentTerms: "현금",
    contactName: "진원경",
    items: [
      { id: "QT-2026-001-1", name: "1) Solution Package", amount: "" },
      { id: "QT-2026-001-2", name: "2) 인건비-커스터마이징", amount: "345,375" },
    ],
    solutionSectionTitle: "1) Solution Package",
    solutionRows: [
      { id: "QT-2026-001-S1", rowNo: "1", category: "Framework", module: "POLESTAR for Framework", quantity: "1", consumerUnitPrice: "50,000,000", consumerTotal: "50,000,000", supplyUnitPrice: "50,000,000", supplyTotal: "50,000,000", discountRate: "", note: "" },
      { id: "QT-2026-001-S2", rowNo: "2", category: "SMS", module: "POLESTAR Server Management for Unix", quantity: "10", consumerUnitPrice: "8,000,000", consumerTotal: "80,000,000", supplyUnitPrice: "2,400,000", supplyTotal: "24,000,000", discountRate: "", note: "" },
      { id: "QT-2026-001-S3", rowNo: "3", category: "SMS", module: "POLESTAR Server Management for Unix", quantity: "10", consumerUnitPrice: "8,000,000", consumerTotal: "80,000,000", supplyUnitPrice: "0", supplyTotal: "0", discountRate: "", note: "무상공급" },
      { id: "QT-2026-001-S4", rowNo: "4", category: "SMS", module: "POLESTAR Server Management for for Windows/Linux", quantity: "10", consumerUnitPrice: "4,000,000", consumerTotal: "40,000,000", supplyUnitPrice: "1,200,000", supplyTotal: "12,000,000", discountRate: "", note: "" },
      { id: "QT-2026-001-S5", rowNo: "5", category: "SMS", module: "POLESTAR Server Management for for Windows/Linux", quantity: "10", consumerUnitPrice: "4,000,000", consumerTotal: "40,000,000", supplyUnitPrice: "0", supplyTotal: "0", discountRate: "", note: "무상공급" },
      { id: "QT-2026-001-S6", rowNo: "6", category: "NMS", module: "POLESTAR Network Management", quantity: "10", consumerUnitPrice: "1,500,000", consumerTotal: "15,000,000", supplyUnitPrice: "450,000", supplyTotal: "4,500,000", discountRate: "", note: "" },
      { id: "QT-2026-001-S7", rowNo: "7", category: "NMS", module: "POLESTAR Network Management", quantity: "10", consumerUnitPrice: "1,500,000", consumerTotal: "15,000,000", supplyUnitPrice: "0", supplyTotal: "0", discountRate: "", note: "" },
      { id: "QT-2026-001-S8", rowNo: "8", category: "DPM", module: "DB Management", quantity: "3", consumerUnitPrice: "20,000,000", consumerTotal: "60,000,000", supplyUnitPrice: "3,000,000", supplyTotal: "9,000,000", discountRate: "", note: "" },
      { id: "QT-2026-001-S9", rowNo: "9", category: "DPM", module: "DB Management", quantity: "5", consumerUnitPrice: "20,000,000", consumerTotal: "100,000,000", supplyUnitPrice: "0", supplyTotal: "0", discountRate: "", note: "무상공급" },
      { id: "QT-2026-001-S10", rowNo: "10", category: "WPM", module: "WAS Management", quantity: "3", consumerUnitPrice: "20,000,000", consumerTotal: "60,000,000", supplyUnitPrice: "3,000,000", supplyTotal: "9,000,000", discountRate: "", note: "무상공급" },
      { id: "QT-2026-001-S11", rowNo: "11", category: "WPM", module: "DB Management", quantity: "5", consumerUnitPrice: "20,000,000", consumerTotal: "100,000,000", supplyUnitPrice: "0", supplyTotal: "0", discountRate: "", note: "무상공급" },
      { id: "QT-2026-001-S12", rowNo: "12", category: "Reporting Tool", module: "POLESTAR Report Manager", quantity: "1", consumerUnitPrice: "30,000,000", consumerTotal: "30,000,000", supplyUnitPrice: "9,000,000", supplyTotal: "9,000,000", discountRate: "", note: "" },
    ],
    customizingSectionTitle: "2) 인건비-커스터마이징",
    customizingRows: [
      { id: "QT-2026-001-C1", rowNo: "1", item: "인건비 (특급)", laborRate: "273,664", manMonth: "", supplyAmount: "-" },
      { id: "QT-2026-001-C2", rowNo: "2", item: "인건비 (고급)", laborRate: "215,166", manMonth: "", supplyAmount: "-" },
      { id: "QT-2026-001-C3", rowNo: "3", item: "인건비 (중급)", laborRate: "174,432", manMonth: "1.0", supplyAmount: "174,432" },
      { id: "QT-2026-001-C4", rowNo: "4", item: "인건비 (초급)", laborRate: "136,290", manMonth: "", supplyAmount: "-" },
      { id: "QT-2026-001-C5", rowNo: "5", item: "제 경 비", laborRate: "", manMonth: "", supplyAmount: "209,318" },
      { id: "QT-2026-001-C6", rowNo: "6", item: "기 술 료", laborRate: "", manMonth: "", supplyAmount: "76,750" },
    ],
    remarks:
      "1. 무상유지보수 기간은 1년이며, 무상유지보수 기간 종료 후 유지보수 요율은 12%입니다.\n2. 무상유지보수 활동에는 하자보수와 장애처리가 포함되며, 정기점검은 포함되어 있지 않습니다.",
    templateText: {
      headerBrand: "NKIA",
      headerCompanyName: "주식회사 엔키아",
      documentTitle: "見 積 書",
      refLabel: "Ref No :",
      recipientSuffix: "귀중",
      introText: "아래와 같이 견적합니다(견적일로부터 30일간 유효)",
      quoteDateLabel: "견적일자:",
      paymentTermsLabel: "대금결제조건:",
      businessNameLabel: "사업명:",
      totalAmountLabel: "합계금액:",
      totalAmountSuffix: "원정 (부가세별도)",
      unitNote: "(단위 : 원 , VAT별도)",
      remarksTitle: "특기사항",
      evidenceTitle: "금액산출근거표",
      supplierName: "(주) 엔키아",
      addressLine1: "서울특별시 서초구 양재동 60",
      addressLine2: "일동제약 빌딩 3층",
      ceoLabel: "대표이사 :",
      ceoName: "이선우",
      telLabel: "TEL :",
      tel: "02-2057-8724",
      faxLabel: "FAX :",
      fax: "02-2057-8725",
      contactLabel: "담당자:",
    },
    amount: "345,375",
    validity: "2026-04-15",
    status: "전달완료",
  },
  {
    id: "QT-2026-002",
    refNumber: "NKIA-20260310-002-01",
    date: "2026-03-10",
    customerCode: "CUS-004",
    opportunityCode: "OPP-2026-004",
    customer: "SK텔레콤",
    opportunity: "SK텔레콤 NMS 업그레이드",
    proposalType: "SI 제안",
    productGroup: "EMS",
    salesRep: "김영업",
    paymentTerms: "현금",
    contactName: "진원경",
    items: [
      { id: "QT-2026-002-1", name: "1) Solution Package", amount: "150,000,000" },
      { id: "QT-2026-002-2", name: "2) 인건비-커스터마이징", amount: "50,000,000" },
    ],
    solutionSectionTitle: "1) Solution Package",
    solutionRows: [],
    customizingSectionTitle: "2) 인건비-커스터마이징",
    customizingRows: [],
    templateText: {
      headerBrand: "NKIA",
      headerCompanyName: "주식회사 엔키아",
      documentTitle: "見 積 書",
      refLabel: "Ref No :",
      recipientSuffix: "귀중",
      introText: "아래와 같이 견적합니다(견적일로부터 30일간 유효)",
      quoteDateLabel: "견적일자:",
      paymentTermsLabel: "대금결제조건:",
      businessNameLabel: "사업명:",
      totalAmountLabel: "합계금액:",
      totalAmountSuffix: "원정 (부가세별도)",
      unitNote: "(단위 : 원 , VAT별도)",
      remarksTitle: "특기사항",
      evidenceTitle: "금액산출근거표",
      supplierName: "(주) 엔키아",
      addressLine1: "서울특별시 서초구 양재동 60",
      addressLine2: "일동제약 빌딩 3층",
      ceoLabel: "대표이사 :",
      ceoName: "이선우",
      telLabel: "TEL :",
      tel: "02-2057-8724",
      faxLabel: "FAX :",
      fax: "02-2057-8725",
      contactLabel: "담당자:",
    },
    remarks: "파트너 협업 제안",
    amount: "200,000,000",
    validity: "2026-04-10",
    status: "검토중",
  },
  {
    id: "QT-2026-003",
    refNumber: "NKIA-20260308-003-01",
    date: "2026-03-08",
    customerCode: "CUS-003",
    opportunityCode: "OPP-2026-003",
    customer: "현대자동차",
    opportunity: "현대차 Automation 확장",
    proposalType: "자체 제안",
    productGroup: "Automation",
    salesRep: "박과장",
    paymentTerms: "현금",
    contactName: "진원경",
    items: [
      { id: "QT-2026-003-1", name: "1) Solution Package", amount: "240,000,000" },
      { id: "QT-2026-003-2", name: "2) 인건비-커스터마이징", amount: "60,000,000" },
    ],
    solutionSectionTitle: "1) Solution Package",
    solutionRows: [],
    customizingSectionTitle: "2) 인건비-커스터마이징",
    customizingRows: [],
    templateText: {
      headerBrand: "NKIA",
      headerCompanyName: "주식회사 엔키아",
      documentTitle: "見 積 書",
      refLabel: "Ref No :",
      recipientSuffix: "귀중",
      introText: "아래와 같이 견적합니다(견적일로부터 30일간 유효)",
      quoteDateLabel: "견적일자:",
      paymentTermsLabel: "대금결제조건:",
      businessNameLabel: "사업명:",
      totalAmountLabel: "합계금액:",
      totalAmountSuffix: "원정 (부가세별도)",
      unitNote: "(단위 : 원 , VAT별도)",
      remarksTitle: "특기사항",
      evidenceTitle: "금액산출근거표",
      supplierName: "(주) 엔키아",
      addressLine1: "서울특별시 서초구 양재동 60",
      addressLine2: "일동제약 빌딩 3층",
      ceoLabel: "대표이사 :",
      ceoName: "이선우",
      telLabel: "TEL :",
      tel: "02-2057-8724",
      faxLabel: "FAX :",
      fax: "02-2057-8725",
      contactLabel: "담당자:",
    },
    remarks: "고객 수정 요청 반영 필요",
    amount: "300,000,000",
    validity: "2026-04-08",
    status: "수정요청",
  },
]

export const standardPriceRecords: StandardPriceRecord[] = [
  {
    id: "SPR-001",
    productClass: "EMS",
    productGroup: "Framework",
    productNumber: "PSE0101",
    productName: "POLESTAR Framework",
    licenseBase: "개수",
    licenseUnit: "1",
    unitPrice: "50000",
    discountRate: "70",
    proposalPrice: "15000",
  },
  {
    id: "SPR-002",
    productClass: "",
    productGroup: "Server Management",
    productNumber: "PSE0201",
    productName: "POLESTAR Server Management for Unix",
    licenseBase: "Node 수 및 CPU",
    licenseUnit: "1",
    unitPrice: "8000",
    discountRate: "70",
    proposalPrice: "2400",
  },
  {
    id: "SPR-003",
    productClass: "",
    productGroup: "",
    productNumber: "PSE0202",
    productName: "POLESTAR Server Management for Windows/Linux",
    licenseBase: "Node 수 및 CPU",
    licenseUnit: "1",
    unitPrice: "4000",
    discountRate: "70",
    proposalPrice: "1200",
  },
]

export const standardPriceNotes = [
  "주1) 12개월간 제품 하자에 대해 무상 유지 보수 합니다.",
  "주2) 하자 외의 추가 요구 사항에 대해서는 Man/Day 50만원으로 산정 합니다.",
  "주3) 유상 유지보수는 계약 금액 대비 연간 12%입니다.",
]

export const activityRequests: ActivityRequestRecord[] = [
  {
    id: "REQ-2026-010",
    date: "2026-03-12",
    requester: "김영업",
    receiver: "박기술",
    type: "RFP 분석",
    customerCode: "CUS-004",
    customer: "SK텔레콤",
    opportunityCode: "OPP-2026-004",
    opportunity: "SK텔레콤 NMS 업그레이드",
    content: "고객사 전달 RFP 분석 요청 및 요구사항 검토 필요",
    dueDate: "2026-03-30",
    status: "접수완료",
    approvedAt: "2026-03-13",
    lastAction: "approved",
    lastActionAt: "2026-03-13",
    attachments: [{ id: "REQ-2026-010-ATT-001", name: "SKT_RFP_요청서.pdf", size: 287420, contentType: "application/pdf", dataUrl: "data:application/pdf;base64,JVBERi0xLjQKJcfs...", createdAt: "2026-03-12" }],
  },
  {
    id: "REQ-2026-014",
    date: "2026-04-22",
    requester: "김영업",
    receiver: "박과장",
    type: "SI 제안서 작성",
    customerCode: "CUS-004",
    customer: "SK텔레콤",
    opportunityCode: "OPP-2026-004",
    opportunity: "SK텔레콤 NMS 업그레이드",
    content: "제안서 최종본 취합 후 등록 요청",
    dueDate: "2026-04-30",
    status: "접수완료",
    approvedAt: "2026-04-22",
    lastAction: "approved",
    lastActionAt: "2026-04-22",
  },
  {
    id: "REQ-2026-015",
    date: "2026-04-28",
    requester: "박과장",
    receiver: "최PM",
    type: "제안서 작성",
    customerCode: "CUS-003",
    customer: "현대자동차",
    opportunityCode: "OPP-2026-003",
    opportunity: "현대차 Automation 확장",
    content: "고객 요청사항 반영한 제안서 등록 준비",
    dueDate: "2026-05-08",
    status: "접수완료",
    approvedAt: "2026-04-28",
    lastAction: "approved",
    lastActionAt: "2026-04-28",
  },
  {
    id: "REQ-2026-016",
    date: "2026-05-03",
    requester: "최부장",
    receiver: "김영업",
    type: "SI 제안서 작성",
    customerCode: "CUS-005",
    customer: "NTT DoCoMo",
    opportunityCode: "OPP-2026-005",
    opportunity: "일본 NTT DoCoMo WSS",
    content: "현지 협업사와 공동 제안서 작성 요청",
    dueDate: "2026-05-14",
    status: "요청",
    lastAction: "created",
    lastActionAt: "2026-05-03",
  },
  {
    id: "REQ-2026-013",
    date: "2026-05-06",
    requester: "박과장",
    receiver: "김영업",
    type: "RFP 분석",
    customerCode: "CUS-001",
    customer: "삼성전자",
    opportunityCode: "OPP-2026-001",
    opportunity: "삼성전자 EMS 구축",
    content: "고객사 전달 RFP 기준으로 기능 적합성 및 개발 공수 검토 요청",
    dueDate: "2026-05-12",
    status: "요청",
    lastAction: "created",
    lastActionAt: "2026-05-06",
    attachments: [{ id: "REQ-2026-013-ATT-001", name: "삼성전자_RFP_검토요청.docx", size: 194560, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", dataUrl: "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBAoAAAAAA", createdAt: "2026-05-06" }],
  },
  {
    id: "REQ-2026-001",
    date: "2026-03-17",
    requester: "김영업",
    receiver: "박기술",
    type: "데모",
    customerCode: "CUS-006",
    customer: "카카오",
    opportunityCode: "",
    opportunity: "미확인",
    content: "EMS 제품 데모 지원 요청",
    dueDate: "2026-03-25",
    status: "요청",
    lastAction: "created",
    lastActionAt: "2026-03-17",
  },
  {
    id: "REQ-2026-002",
    date: "2026-03-16",
    requester: "이대리",
    receiver: "최PM",
    type: "PoC",
    customerCode: "CUS-007",
    customer: "네이버",
    opportunityCode: "",
    opportunity: "미확인",
    content: "ITSM PoC 환경 구성 지원",
    dueDate: "2026-03-22",
    status: "접수완료",
    approvedAt: "2026-03-16",
    lastAction: "approved",
    lastActionAt: "2026-03-16",
  },
  {
    id: "REQ-2026-003",
    date: "2026-03-15",
    requester: "박과장",
    receiver: "김기술",
    type: "기타",
    customerCode: "CUS-003",
    customer: "현대자동차",
    opportunityCode: "OPP-2026-003",
    opportunity: "현대차 Automation 확장",
    content: "기술 문의 대응",
    dueDate: "2026-03-18",
    status: "접수완료",
    approvedAt: "2026-03-15",
    lastAction: "approved",
    lastActionAt: "2026-03-15",
  },
]

export const activityStatuses = [
  "완료",
  "진행중",
  "예정",
  "전달완료",
  "검토중",
  "수정요청",
  "접수대기",
  "삭제",
]

const ACTIVITIES_STORAGE_KEY = "orbis.activities"
const ACTIVITY_EVENT_NAME = "orbis-activities-updated"

function isBrowser() {
  return typeof window !== "undefined"
}

function cloneActivities() {
  return activities.map((item) => ({
    ...item,
    attachments: item.attachments?.map((attachment) => ({ ...attachment })) ?? [],
  }))
}

function readStorage<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback

  const stored = window.localStorage.getItem(key)
  if (!stored) return fallback

  try {
    return JSON.parse(stored) as T
  } catch {
    return fallback
  }
}

function writeStorage<T>(key: string, value: T) {
  if (!isBrowser()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function emitActivityUpdate() {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(ACTIVITY_EVENT_NAME))
}

function nextActivityId(records: ActivityRecord[]) {
  const max = records.reduce((acc, item) => {
    const current = Number.parseInt(item.id.split("-").at(-1) ?? "0", 10)
    return Number.isNaN(current) ? acc : Math.max(acc, current)
  }, 0)

  return `ACT-2026-${String(max + 1).padStart(3, "0")}`
}

function normalizeActivityRecord(record: ActivityRecord): ActivityRecord {
  return {
    ...record,
    attachments: Array.isArray(record.attachments)
      ? record.attachments.filter((attachment) => attachment && typeof attachment.id === "string" && typeof attachment.name === "string")
      : [],
  }
}

function saveActivities(records: ActivityRecord[]) {
  writeStorage(ACTIVITIES_STORAGE_KEY, records)
}

export function getActivities() {
  const records = readStorage<ActivityRecord[]>(ACTIVITIES_STORAGE_KEY, cloneActivities()).map(normalizeActivityRecord)

  if (isBrowser()) {
    saveActivities(records)
  }

  return records
}

export function createActivity(input: Omit<ActivityRecord, "id">) {
  const records = getActivities()
  const created = normalizeActivityRecord({
    ...input,
    id: nextActivityId(records),
  })

  saveActivities([created, ...records])
  emitActivityUpdate()
  return created
}

export function updateActivity(id: string, input: Omit<ActivityRecord, "id">) {
  const records = getActivities()
  let updatedRecord: ActivityRecord | null = null

  const updatedRecords = records.map((item) => {
    if (item.id !== id) return item

    updatedRecord = normalizeActivityRecord({
      ...item,
      ...input,
      id,
    })

    return updatedRecord
  })

  if (!updatedRecord) return null

  saveActivities(updatedRecords)
  emitActivityUpdate()
  return updatedRecord
}

export function subscribeActivityUpdates(listener: () => void) {
  if (!isBrowser()) return () => {}

  window.addEventListener(ACTIVITY_EVENT_NAME, listener)
  window.addEventListener("storage", listener)
  return () => {
    window.removeEventListener(ACTIVITY_EVENT_NAME, listener)
    window.removeEventListener("storage", listener)
  }
}

export function getCategoryLabel(category: ActivityCategory) {
  switch (category) {
    case "activities":
      return "영업활동"
    case "quotations":
      return "견적"
    case "requests":
      return "활동 요청"
  }
}

export function getActivityItem(category: ActivityCategory, id: string) {
  switch (category) {
    case "activities":
      return getActivities().find((item) => item.id === id) ?? null
    case "quotations":
      return quotations.find((item) => item.id === id) ?? null
    case "requests":
      return activityRequests.find((item) => item.id === id) ?? null
  }
}

export function getActivityItemFields(category: ActivityCategory, item: any) {
  switch (category) {
    case "activities":
      return [
        { label: "고객사", value: item.customer },
        { label: "고객사 코드", value: item.customerCode ?? "-" },
        { label: "사업기회", value: item.opportunity },
        { label: "사업기회 코드", value: item.businessCode ?? "-" },
        { label: "활동일", value: item.date },
        { label: "활동형태", value: item.activityMode ?? "-" },
        { label: "활동내용", value: item.activityContent ?? "-" },
        { label: "요청자", value: item.requester ?? "-" },
        { label: "등록자", value: item.registrant ?? "-" },
        { label: "활동요청ID", value: item.requestId ?? "-" },
        { label: "장소", value: item.location },
        { label: "참석자", value: item.attendees },
        { label: "주요 내용", value: item.content },
        { label: "고객 관심 사항 / 이슈", value: item.issues },
        { label: "다음 할 일", value: item.nextAction },
      ]
    case "quotations":
      return [
        { label: "견적일", value: item.date },
        { label: "고객사", value: item.customer },
        { label: "고객사 코드", value: item.customerCode ?? "-" },
        { label: "사업기회", value: item.opportunity },
        { label: "사업기회 코드", value: item.opportunityCode ?? "-" },
        { label: "제안 유형", value: item.proposalType },
        { label: "제품군", value: item.productGroup },
        { label: "영업대표", value: item.salesRep },
        { label: "제품", value: item.items?.map((entry: { name: string }) => entry.name).join(", ") || "-" },
        { label: "견적 금액", value: item.amount },
        { label: "유효기간", value: item.validity },
        { label: "견적 비고", value: item.remarks ?? "-" },
      ]
    case "requests":
      return [
        { label: "요청일", value: item.date },
        { label: "요청 유형", value: item.type },
        { label: "요청자", value: item.requester },
        { label: "담당자", value: item.receiver },
        { label: "고객사", value: item.customer },
        { label: "고객사 코드", value: item.customerCode ?? "-" },
        { label: "사업기회", value: item.opportunity || "미확인" },
        { label: "사업기회 코드", value: item.opportunityCode || "-" },
        { label: "활동일", value: item.dueDate },
        { label: "상태", value: item.status },
        { label: "요청 내용", value: item.content },
      ]
  }
}

export function getActivityDisplayType(item: Pick<ActivityRecord, "activityMode" | "activityContent" | "type">) {
  const mode = item.activityMode?.trim()
  const content = item.activityContent?.trim()

  if (mode && content) return `${mode} / ${content}`
  return content || mode || item.type || "-"
}
