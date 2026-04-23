export type ActivityCategory = "activities" | "quotations" | "requests"

export type ActivityRecord = {
  id: string
  date: string
  customerCode: string
  businessCode: string
  type: string
  customer: string
  opportunity: string
  location: string
  attendees: string
  content: string
  issues: string
  nextAction: string
  status: string
}

export type QuotationRecord = {
  id: string
  date: string
  customer: string
  opportunity: string
  product: string
  amount: string
  validity: string
  status: string
}

export type ActivityRequestRecord = {
  id: string
  date: string
  requester: string
  receiver: string
  type: string
  customer: string
  content: string
  dueDate: string
  status: string
}

export const activityTypeOptions = [
  "이메일",
  "전화",
  "영상회의",
  "대면미팅",
  "제품소개",
  "데모",
  "PoC",
  "BMT",
]

export const activityRequestTypeOptions = [
  "제품소개",
  "데모",
  "PoC",
  "BMT",
  "자료",
  "RFP 분석",
  "제안서 작성",
  "SI 제안서 작성",
  "기타",
]

export const activityRequestStatusOptions = [
  "요청",
  "접수완료",
]

export const activities: ActivityRecord[] = [
  {
    id: "ACT-2026-001",
    date: "2026-03-17",
    customerCode: "CUS-001",
    businessCode: "OPP-2026-001",
    type: "대면미팅",
    customer: "삼성전자",
    opportunity: "삼성전자 EMS 구축",
    location: "삼성전자 수원캠퍼스",
    attendees: "김영업, 박기술",
    content: "EMS 제품 소개 및 고객 요구사항 청취",
    issues: "기존 시스템과의 연동 방안 검토 필요",
    nextAction: "기술 검토 후 PoC 일정 협의",
    status: "완료",
  },
  {
    id: "ACT-2026-002",
    date: "2026-03-16",
    customerCode: "CUS-002",
    businessCode: "OPP-2026-002",
    type: "이메일",
    customer: "LG CNS",
    opportunity: "국방부 ITSM 도입",
    location: "이메일",
    attendees: "이대리",
    content: "RFP 관련 추가 자료 전달",
    issues: "-",
    nextAction: "회신 대기",
    status: "완료",
  },
  {
    id: "ACT-2026-003",
    date: "2026-03-18",
    customerCode: "CUS-004",
    businessCode: "OPP-2026-004",
    type: "데모",
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
    customerCode: "CUS-003",
    businessCode: "OPP-2026-003",
    type: "PoC",
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
    customerCode: "CUS-005",
    businessCode: "OPP-2026-005",
    type: "전화",
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
    date: "2026-03-15",
    customer: "삼성전자",
    opportunity: "삼성전자 EMS 구축",
    product: "EMS Enterprise",
    amount: "500,000,000",
    validity: "2026-04-15",
    status: "전달완료",
  },
  {
    id: "QT-2026-002",
    date: "2026-03-10",
    customer: "SK텔레콤",
    opportunity: "SK텔레콤 NMS 업그레이드",
    product: "NMS Pro",
    amount: "200,000,000",
    validity: "2026-04-10",
    status: "검토중",
  },
  {
    id: "QT-2026-003",
    date: "2026-03-08",
    customer: "현대자동차",
    opportunity: "현대차 Automation 확장",
    product: "Automation Suite",
    amount: "300,000,000",
    validity: "2026-04-08",
    status: "수정요청",
  },
]

export const activityRequests: ActivityRequestRecord[] = [
  {
    id: "REQ-2026-001",
    date: "2026-03-17",
    requester: "김영업",
    receiver: "박기술",
    type: "데모",
    customer: "카카오",
    content: "EMS 제품 데모 지원 요청",
    dueDate: "2026-03-25",
    status: "요청",
  },
  {
    id: "REQ-2026-002",
    date: "2026-03-16",
    requester: "이대리",
    receiver: "최PM",
    type: "PoC",
    customer: "네이버",
    content: "ITSM PoC 환경 구성 지원",
    dueDate: "2026-03-22",
    status: "접수완료",
  },
  {
    id: "REQ-2026-003",
    date: "2026-03-15",
    requester: "박과장",
    receiver: "김기술",
    type: "기타",
    customer: "현대자동차",
    content: "기술 문의 대응",
    dueDate: "2026-03-18",
    status: "접수완료",
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
]

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
      return activities.find((item) => item.id === id) ?? null
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
        { label: "사업기회", value: item.opportunity },
        { label: "활동일", value: item.date },
        { label: "활동 구분", value: item.type },
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
        { label: "사업기회", value: item.opportunity },
        { label: "제품", value: item.product },
        { label: "견적 금액", value: item.amount },
        { label: "유효기간", value: item.validity },
        { label: "견적 비고", value: "-" },
      ]
    case "requests":
      return [
        { label: "요청일", value: item.date },
        { label: "요청 유형", value: item.type },
        { label: "요청자", value: item.requester },
        { label: "담당자", value: item.receiver },
        { label: "고객사", value: item.customer },
        { label: "활동일", value: item.dueDate },
        { label: "상태", value: item.status },
        { label: "요청 내용", value: item.content },
      ]
  }
}
