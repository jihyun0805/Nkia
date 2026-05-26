// 인수인계 메모: 챗봇 UI 하위 컴포넌트입니다. 모달 본문을 입력창, 메시지, 근거, 액션, 사이드바로 나눠 관리합니다.
// 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
export const MAX_HISTORY_MESSAGES = 8
export const DEFAULT_LIMIT = 5

export const EXAMPLE_PROMPTS = [
  "예상 사업비가 가장 큰 사업 TOP3 알려줘",
  "KB국민은행 코어뱅킹 현대화 사업의 사업비 20억으로 수정해줘",
  "KB국민은행 코어뱅킹 현대화 2단계 모니터링 인프라 구축 RFP 첨부파일 분석해서 요약해줘",
  "KB국민은행 코어뱅킹 현대화 2단계 모니터링 인프라 구축 PRB 결과에서 리스크 알려줘",
  "공공 고객 사업기회 알려줘",
  "롯데카드 사업기회 진행 상황 알려줘",
]

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  ATTACHMENT: "첨부파일",
  COMPANY: "고객/협력사",
  CONTACT: "담당자",
  OPPORTUNITY: "사업기회",
  PROJECT_OPPORTUNITY: "사업기회",
  QUOTATION: "견적서",
  RFP: "RFP",
  RFP_ANALYSIS: "RFP 분석",
  PRB: "PRB",
  PRB_RESULT: "PRB 결과",
  BID_RESULT: "입찰결과",
  PROPOSAL: "제안서",
  WON: "수주",
  LOST: "실주",
  ORDER_REPORT: "수주보고",
  CONTRACT: "계약",
  LICENSE: "라이선스",
  PROJECT: "프로젝트",
  BILLING: "청구",
  POST_SALES: "사후영업",
  MAINTENANCE: "유지보수",
  CUSTOMER_SUPPORT: "고객지원",
  MAINTENANCE_QUOTE: "유지보수 견적",
  MODULE: "모듈",
}
