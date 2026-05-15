"""실데이터 풀.

- 회사: /home/yusin/devdev/main 의 RFP 모음에서 가져온 실제 회사 + 한국 IT 업계 자주 등장하는 곳.
- 사람: 한국 IT 업계 흔한 성씨 + 이름 조합 (가공된 이름이지만 자연스러움).
- 사업명: ProductClass(EMS/ITSM/RCA/E2E/BSM/...) + 도메인 결합형 실제 RFP 풍 제목.

리얼_xxx, 더미_xxx 같은 표기 절대 금지.
"""

from __future__ import annotations

from dataclasses import dataclass


# ─── 자사(엔키아) 직원 풀 ────────────────────────────────────────────
# UserInitializer가 만든 4명(admin/member/leader/director)에 더해
# 영업/사업수행/연구소/AI 부서에 ~20명을 추가 시드한다.
#
# 직급은 Position enum 기준: TEAM_MEMBER, TEAM_LEADER, HEAD_DIRECTOR
# 직급별로 다양하게 배치.

@dataclass(frozen=True)
class SeedUser:
    employee_number: str
    name: str
    email: str
    position: str          # TEAM_MEMBER | TEAM_LEADER | HEAD_DIRECTOR
    dept_headquarters: str
    dept_team: str
    phone: str
    role: str = "USER"     # ADMIN | USER


SEED_USERS: list[SeedUser] = [
    # 영업1본부 / 영업1팀 (공공 고객 담당)
    SeedUser("NK-S1-01", "박유신",  "park.yushin@nkia.local",   "TEAM_LEADER",  "영업1본부", "영업1팀", "010-3201-7791"),
    SeedUser("NK-S1-02", "김도현",  "kim.dohyeon@nkia.local",   "TEAM_MEMBER",  "영업1본부", "영업1팀", "010-3201-4811"),
    SeedUser("NK-S1-03", "최다은",  "choi.daeun@nkia.local",    "TEAM_MEMBER",  "영업1본부", "영업1팀", "010-3201-2641"),
    SeedUser("NK-S1-04", "안지수",  "ahn.jisu@nkia.local",      "TEAM_MEMBER",  "영업1본부", "영업1팀", "010-3201-5572"),
    # 영업2본부 / 영업2팀 (민간/금융 고객 담당)
    SeedUser("NK-S2-01", "한지훈",  "han.jihoon@nkia.local",    "TEAM_LEADER",  "영업2본부", "영업2팀", "010-3202-9821"),
    SeedUser("NK-S2-02", "조민재",  "jo.minjae@nkia.local",     "TEAM_MEMBER",  "영업2본부", "영업2팀", "010-3202-1144"),
    SeedUser("NK-S2-03", "이서준",  "lee.seojun@nkia.local",    "TEAM_MEMBER",  "영업2본부", "영업2팀", "010-3202-7702"),
    SeedUser("NK-S2-04", "강태윤",  "kang.taeyun@nkia.local",   "TEAM_MEMBER",  "영업2본부", "영업2팀", "010-3202-0431"),
    # 사업본부 / 사업수행팀 (PM)
    SeedUser("NK-P1-01", "김프로",  "kim.pro@nkia.local",       "TEAM_LEADER",  "사업본부",   "사업수행팀", "010-3301-5613"),
    SeedUser("NK-P1-02", "문성호",  "moon.seongho@nkia.local",  "TEAM_MEMBER",  "사업본부",   "사업수행팀", "010-3301-6683"),
    SeedUser("NK-P1-03", "조현우",  "jo.hyunwoo@nkia.local",    "TEAM_MEMBER",  "사업본부",   "사업수행팀", "010-3301-4934"),
    SeedUser("NK-P1-04", "배소연",  "bae.soyeon@nkia.local",    "TEAM_MEMBER",  "사업본부",   "사업수행팀", "010-3301-1921"),
    # 사업본부 / 기술지원팀 (유지보수 PM)
    SeedUser("NK-P2-01", "손유리",  "son.yuri@nkia.local",      "TEAM_LEADER",  "사업본부",   "기술지원팀", "010-3302-4256"),
    SeedUser("NK-P2-02", "권민석",  "kwon.minseok@nkia.local",  "TEAM_MEMBER",  "사업본부",   "기술지원팀", "010-3302-3311"),
    # 경영지원본부 / 솔루션컨설팅팀 (RFP/제안)
    SeedUser("NK-C1-01", "임재원",  "lim.jaewon@nkia.local",    "TEAM_LEADER",  "경영지원본부", "솔루션컨설팅팀", "010-3401-0775"),
    SeedUser("NK-C1-02", "송하민",  "song.hamin@nkia.local",    "TEAM_MEMBER",  "경영지원본부", "솔루션컨설팅팀", "010-3401-9270"),
    SeedUser("NK-C1-03", "류지훈",  "ryu.jihoon@nkia.local",    "TEAM_MEMBER",  "경영지원본부", "솔루션컨설팅팀", "010-3401-8672"),
    SeedUser("NK-C1-04", "윤서현",  "yoon.seohyun@nkia.local",  "TEAM_MEMBER",  "경영지원본부", "솔루션컨설팅팀", "010-3401-0111"),
    # 신사업본부 / AI혁신팀
    SeedUser("NK-A1-01", "이가은",  "lee.gaeun@nkia.local",     "TEAM_LEADER",  "신사업본부",  "AI혁신팀",      "010-3501-6984"),
    SeedUser("NK-A1-02", "김현서",  "kim.hyunseo@nkia.local",   "TEAM_MEMBER",  "신사업본부",  "AI혁신팀",      "010-3501-1536"),
]


# ─── 고객사 풀 ─────────────────────────────────────────────────────
# 실제 RFP 모음에 나온 회사 + 한국 IT 업계 모니터링/ITSM/ITAM/BSM 도입 자주 하는 곳.
# 사업자등록번호는 패턴만 맞춘 가공값 (실 사업자번호 아님).
#
# sector: PUBLIC(공공), PRIVATE(민간), OVERSEAS(해외)
# category: SI, SOLUTION, ETC

@dataclass(frozen=True)
class SeedCompany:
    code: str
    name: str
    sector: str            # PUBLIC | PRIVATE | OVERSEAS
    category: str          # SI | SOLUTION | ETC
    business_registration_number: str
    address: str
    industry: str          # "금융/은행" 등 (내부 용도, 사업기회 제목 결정에 사용)


CUSTOMERS: list[SeedCompany] = [
    # ── 은행 / 카드 / 보험 (민간 금융)
    SeedCompany("CUS-001", "KB국민은행",         "PRIVATE", "ETC", "201-81-68693", "서울 영등포구 국제금융로 8길 26",        "은행"),
    SeedCompany("CUS-002", "신한은행",           "PRIVATE", "ETC", "202-81-66911", "서울 중구 세종대로 9길 20",              "은행"),
    SeedCompany("CUS-003", "우리은행",           "PRIVATE", "ETC", "104-86-23351", "서울 중구 소공로 51",                    "은행"),
    SeedCompany("CUS-004", "하나은행",           "PRIVATE", "ETC", "202-81-39253", "서울 중구 을지로 35",                    "은행"),
    SeedCompany("CUS-005", "IBK기업은행",        "PRIVATE", "ETC", "202-81-04373", "서울 중구 을지로 79",                    "은행"),
    SeedCompany("CUS-006", "NH농협은행",         "PRIVATE", "ETC", "108-81-44354", "서울 중구 새문안로 16",                  "은행"),
    SeedCompany("CUS-007", "수협은행",           "PRIVATE", "ETC", "202-81-83773", "서울 송파구 오금로 62",                  "은행"),
    SeedCompany("CUS-008", "롯데카드",           "PRIVATE", "ETC", "117-81-23381", "서울 중구 남대문로 117",                 "카드"),
    SeedCompany("CUS-009", "신한카드",           "PRIVATE", "ETC", "203-81-44694", "서울 중구 을지로 100",                   "카드"),
    SeedCompany("CUS-010", "하나카드",           "PRIVATE", "ETC", "104-86-89220", "서울 중구 을지로 66",                    "카드"),
    SeedCompany("CUS-011", "KG캐피탈",           "PRIVATE", "ETC", "120-81-77631", "서울 영등포구 의사당대로 88",            "캐피탈"),
    SeedCompany("CUS-012", "키움증권",           "PRIVATE", "ETC", "116-81-04157", "서울 영등포구 여의나루로 4길 18",        "증권"),
    SeedCompany("CUS-013", "우리투자증권",       "PRIVATE", "ETC", "104-81-12230", "서울 영등포구 국제금융로 8길 16",        "증권"),
    SeedCompany("CUS-014", "NH농협생명",         "PRIVATE", "ETC", "112-81-26568", "서울 서대문구 통일로 87",                "생명"),
    SeedCompany("CUS-015", "KDB생명",            "PRIVATE", "ETC", "104-81-29251", "서울 중구 을지로 100",                   "생명"),
    # ── 공공 / 공기업
    SeedCompany("CUS-021", "한국가스공사",         "PUBLIC", "ETC", "215-82-00043", "대구 동구 첨단로 120",         "공공"),
    SeedCompany("CUS-022", "한국도로공사",         "PUBLIC", "ETC", "112-82-04124", "경북 김천시 혁신8로 77",        "공공"),
    SeedCompany("CUS-023", "한국남동발전",         "PUBLIC", "ETC", "613-82-13551", "경남 진주시 신촌1길 30",        "공공"),
    SeedCompany("CUS-024", "국가정보자원관리원",   "PUBLIC", "ETC", "131-83-00000", "대전 유성구 가정북로 175",      "공공"),
    SeedCompany("CUS-025", "기상청",               "PUBLIC", "ETC", "108-83-04632", "대전 동구 청사로 189",          "공공"),
    SeedCompany("CUS-026", "경기도교육청",         "PUBLIC", "ETC", "124-83-00045", "경기 수원시 장안구 조원로 18",  "공공"),
    SeedCompany("CUS-027", "한국산업기술진흥원",   "PUBLIC", "ETC", "220-82-01088", "서울 강남구 테헤란로 305",      "공공"),
    SeedCompany("CUS-028", "대한적십자사",         "PUBLIC", "ETC", "104-82-00045", "서울 중구 소파로 145",          "공공"),
    SeedCompany("CUS-029", "부산교통공사",         "PUBLIC", "ETC", "606-82-00067", "부산 동래구 명륜로 60",         "공공"),
    SeedCompany("CUS-030", "한국전력공사",         "PUBLIC", "ETC", "104-82-09254", "전남 나주시 전력로 55",         "공공"),
    SeedCompany("CUS-031", "한국수자원공사",       "PUBLIC", "ETC", "314-82-00037", "대전 대덕구 신탄진로 200",      "공공"),
    SeedCompany("CUS-032", "국민건강보험공단",     "PUBLIC", "ETC", "131-83-15010", "강원 원주시 건강로 32",         "공공"),
    # ── 민간 대기업 / IT
    SeedCompany("CUS-041", "SK텔레콤",             "PRIVATE", "ETC", "104-81-37225", "서울 중구 을지로 65",           "통신"),
    SeedCompany("CUS-042", "LG유플러스",           "PRIVATE", "ETC", "220-81-39938", "서울 용산구 한강대로 32",       "통신"),
    SeedCompany("CUS-043", "KT",                   "PRIVATE", "ETC", "102-81-42945", "경기 성남시 분당구 불정로 90", "통신"),
    SeedCompany("CUS-044", "삼성SDS",              "PRIVATE", "SI",  "202-81-44363", "서울 송파구 올림픽로 35",       "SI"),
    SeedCompany("CUS-045", "삼성물산 건설부문",    "PRIVATE", "ETC", "104-81-25731", "서울 송파구 올림픽로 35-126",   "건설"),
    SeedCompany("CUS-046", "현대오토에버",         "PRIVATE", "SI",  "120-81-87515", "서울 강남구 강남대로 464",      "SI"),
    SeedCompany("CUS-047", "포스코ICT",            "PRIVATE", "SI",  "230-81-04498", "경기 성남시 분당구 정자일로 95", "SI"),
    SeedCompany("CUS-048", "카카오엔터프라이즈",   "PRIVATE", "ETC", "120-81-72494", "제주 제주시 첨단로 242",         "IT"),
    SeedCompany("CUS-049", "네이버클라우드",       "PRIVATE", "ETC", "220-81-46106", "경기 성남시 분당구 불정로 6",   "IT"),
    SeedCompany("CUS-050", "신세계백화점",         "PRIVATE", "ETC", "104-81-25876", "서울 중구 소공로 63",           "유통"),
    SeedCompany("CUS-051", "롯데정보통신",         "PRIVATE", "SI",  "215-81-13127", "서울 금천구 가산디지털1로 28", "SI"),
    SeedCompany("CUS-052", "한화시스템",           "PRIVATE", "SI",  "133-81-49274", "경기 성남시 분당구 판교로 491","SI"),
    SeedCompany("CUS-053", "KB파트너스",           "PRIVATE", "ETC", "117-86-22188", "서울 영등포구 의사당대로 12",  "금융IT"),
    SeedCompany("CUS-054", "엘지CNS",              "PRIVATE", "SI",  "220-81-72893", "서울 강서구 마곡중앙8로 71",   "SI"),
    SeedCompany("CUS-055", "쿠팡",                 "PRIVATE", "ETC", "120-88-00767", "서울 송파구 송파대로 570",      "유통"),
]


PARTNERS: list[SeedCompany] = [
    SeedCompany("PAR-001", "메가존클라우드",     "PRIVATE", "SI",       "120-86-58947", "서울 강남구 영동대로 416",    "클라우드 SI"),
    SeedCompany("PAR-002", "베스핀글로벌",       "PRIVATE", "SI",       "211-86-89224", "서울 강남구 테헤란로 142",    "클라우드 SI"),
    SeedCompany("PAR-003", "다우데이타",         "PRIVATE", "SI",       "120-87-23911", "서울 영등포구 의사당대로 83", "유통/SI"),
    SeedCompany("PAR-004", "쌍용정보통신",       "PRIVATE", "SI",       "120-81-29385", "서울 중구 청계천로 100",      "SI"),
    SeedCompany("PAR-005", "투비소프트",         "PRIVATE", "SOLUTION", "220-81-23711", "경기 성남시 분당구 판교로 228","UI 솔루션"),
    SeedCompany("PAR-006", "더존비즈온",         "PRIVATE", "SOLUTION", "215-81-26116", "강원 춘천시 강원대학길 1",    "솔루션"),
    SeedCompany("PAR-007", "맨텍",               "PRIVATE", "SOLUTION", "120-81-23456", "서울 금천구 가산디지털2로 169","SLM 솔루션"),
    SeedCompany("PAR-008", "지티원",             "PRIVATE", "SOLUTION", "120-81-77345", "서울 금천구 가산디지털1로 168","DB/형상관리 솔루션"),
]


# ─── 고객사 담당자 풀 ──────────────────────────────────────────────
# 회사명과 무관하게 후보 리스트에서 랜덤 픽 → 회사명 도메인 이메일로 변환.

CUSTOMER_MANAGER_CANDIDATES: list[dict[str, str]] = [
    {"name": "김민수", "position": "팀장",   "department": "디지털전략팀"},
    {"name": "이지영", "position": "차장",   "department": "IT기획팀"},
    {"name": "박성호", "position": "부장",   "department": "정보시스템팀"},
    {"name": "정현우", "position": "대리",   "department": "운영혁신팀"},
    {"name": "최영진", "position": "수석",   "department": "디지털혁신실"},
    {"name": "한지원", "position": "과장",   "department": "IT운영팀"},
    {"name": "오세훈", "position": "팀장",   "department": "인프라관리팀"},
    {"name": "장미경", "position": "책임",   "department": "통합관제센터"},
    {"name": "윤상현", "position": "선임",   "department": "정보보안팀"},
    {"name": "임소연", "position": "수석",   "department": "DT전략팀"},
    {"name": "강동훈", "position": "이사",   "department": "IT본부"},
    {"name": "백승준", "position": "차장",   "department": "운영기획팀"},
    {"name": "신하늘", "position": "대리",   "department": "시스템운영팀"},
    {"name": "조은별", "position": "주임",   "department": "DT추진팀"},
    {"name": "노정민", "position": "과장",   "department": "ITSM운영팀"},
]


# ─── 사업기회 시나리오 풀 ───────────────────────────────────────────
# 50건. Phase 1 은 모두 FINDING 으로 생성. 단계는 Phase 2~ 에서 전이.
#
# target_stage 라이프사이클 (검토 의견 04_계약 / 06_유지보수 기반):
#
#   FINDING            : 발굴 단계 (활동 없음)
#   ACTIVITY           : 영업 활동 진행 중 (RFP 수령 전후)
#   BID_PROPOSING      : 입찰 제안서 제출 후 결과 대기
#   BID_LOST           : 실주 — BidResult.outcome=LOSS, 이후 단계 모두 없음
#   BID_WON            : 수주 → 수주보고 작성 단계
#   CONTRACT           : 계약 체결 완료, 사업 착수 전 (수주보고 → 계약 완료)
#   PROJECT            : 사업 수행 중 (납품 / 검수 진행)
#   MAINTENANCE_FREE   : 검수 완료 → 무상유지보수 진행 중 (대개 1년)
#   MAINTENANCE_PAID   : 무상 종료 후 유상유지보수 1년차 (별도 수주보고 + 유상계약)
#   MAINTENANCE_LONG   : 유상유지보수 장기 진행 중 (3~7년차, 연 단위 재계약)
#   MAINTENANCE_JP     : 일본 사업 특수 - 무상 없이 처음부터 유상유지보수
#
# 흐름 패턴 (검토의견 04 기준):
#   1. 수주보고 → 계약 → 무상유지보수 → 수주보고(유상) → 유상유지보수 (대다수)
#   2. 수주보고 + 매입계약 → 계약 → 무상 → ...
#   3. 수주보고만 (소액사업, 별도 계약서 없음)
#   4. 일본 사업: 수주보고 → 유상유지보수 직행
#
# project_type 은 ProductClass enum:
#   EMS, DASHBOARD, DATACENTER, RCA, DCA, ITSM, ITAM, SUPPORTING_TOOLS, CLOUD, BSM, E2E, ETC

@dataclass(frozen=True)
class OpportunityScenario:
    """customer_code 만 정해두고 회사/사업명 템플릿은 후처리에서 합성."""

    customer_code: str          # CUS-xxx (CUSTOMERS 의 code)
    project_type: str           # ProductClass
    name_template: str          # "{customer} ..." 형태
    expected_budget_won: int    # 원 단위 (-1 = 미정)
    competition: str            # 경쟁상황
    description: str            # 주요 사업 및 이슈
    sales_team: str             # 영업1본부 | 영업2본부 (담당 부서)
    target_stage: str           # 위 라이프사이클 라벨
    has_purchase_contract: bool = False  # 매입계약 동반 여부 (Phase 2~)
    free_maint_years: int = 1            # 무상유지보수 기간 (대부분 1, 드물게 3, 5)
    paid_maint_years_done: int = 0       # 유상유지보수 누적 진행 년수 (LONG 케이스용)


OPPORTUNITIES: list[OpportunityScenario] = [
    # ── 은행 (영업2본부)
    OpportunityScenario("CUS-001", "EMS",     "{customer} 코어뱅킹 현대화 2단계 모니터링 인프라 구축",        1_650_000_000, "삼성SDS, LG CNS 와 3파전 예상",        "코어뱅킹 인프라 자원(서버/네트워크/DB)의 통합 모니터링 체계 구축. 무중단 핵심.", "영업2본부", "PROJECT", has_purchase_contract=True),
    OpportunityScenario("CUS-002", "RCA",     "{customer} 운영자동화 솔루션 파일럿 구축",                       450_000_000, "신한DS, LG CNS",                     "장애 RCA 자동화 파일럿. 결과에 따라 본사업 발주 예정.", "영업2본부", "BID_PROPOSING"),
    OpportunityScenario("CUS-003", "ITSM",    "{customer} 차세대 ITSM 통합 고도화",                             880_000_000, "더존비즈온, BMC 파트너",             "ITSM/형상관리/소스코드취약점관리 통합. 금감원 권고사항 반영 필요.", "영업2본부", "MAINTENANCE_FREE", free_maint_years=1),
    OpportunityScenario("CUS-004", "DASHBOARD","{customer} 본부장 임원 대시보드 신규 구축",                     320_000_000, "단독 협상",                          "본부장 KPI 대시보드. 기존 EMS 와 연계.", "영업2본부", "PROJECT"),
    OpportunityScenario("CUS-005", "ITAM",    "{customer} IT 자산관리 고도화",                                  550_000_000, "지티원, 더존",                       "기업은행 정보화전략과 연계된 ITAM 고도화. 라이선스 통합.", "영업2본부", "ACTIVITY"),
    OpportunityScenario("CUS-006", "ITSM",    "{customer} 차세대 컨택센터 고도화 RFP 대응",                   1_200_000_000, "LG유플러스 컨소시엄",                "농협은행 컨택센터 시스템과의 연계 ITSM. RFP 분석 진행 중.", "영업2본부", "ACTIVITY"),
    OpportunityScenario("CUS-007", "E2E",     "{customer} IPT 구축 사업 모니터링 연계",                         420_000_000, "쌍용정보통신",                       "IPT 구축에 따른 E2E 가시성 확보. 통화 품질 SLA 관제.", "영업2본부", "FINDING"),
    OpportunityScenario("CUS-008", "BSM",     "{customer} 서비스 영향도 기반 BSM·RCA 대시보드 고도화",         1_120_000_000, "단독 협상 + AI혁신팀 협업",          "기존 BSM 위에 RCA 자동화 대시보드 확장. 카드 결제 SLA 영향도 가시화.", "영업2본부", "MAINTENANCE_LONG", paid_maint_years_done=4),
    OpportunityScenario("CUS-009", "ITSM",    "{customer} 카드 결제 서비스 통합 관제 운영",                     980_000_000, "삼성SDS",                            "결제 게이트웨이 ITSM 운영. 24x7 관제.", "영업2본부", "PROJECT"),
    OpportunityScenario("CUS-010", "RCA",     "{customer} 멀티클라우드 감사대응 통합관제 구축",                1_280_000_000, "메가존클라우드 협업",                "AWS/Azure 멀티클라우드 운영로그 통합. 감사대응(SOX) 요구사항 반영.", "영업2본부", "CONTRACT"),
    OpportunityScenario("CUS-011", "EMS",     "{customer} EMS 신규 구축 사업",                                  680_000_000, "엘지CNS, 다우데이타",                "캐피탈 신규 시스템 모니터링 인프라. 인프라 동기화 모니터링 포함.", "영업2본부", "ACTIVITY"),
    OpportunityScenario("CUS-012", "RCA",     "{customer} 차세대 트레이딩 시스템 통합관제 구축",              1_450_000_000, "한화시스템, 삼성SDS",                "트레이딩 시스템 마이크로초 단위 모니터링 + RCA. HTS/MTS 연계.", "영업2본부", "BID_PROPOSING"),
    OpportunityScenario("CUS-013", "ITSM",    "{customer} ITSM 재구축 사업",                                    760_000_000, "더존비즈온",                         "기존 ITSM 노후화로 전면 재구축. 통합형상관리 연계.", "영업2본부", "FINDING"),
    OpportunityScenario("CUS-014", "ITAM",    "{customer} ITRM IT포탈 통합 고도화",                             920_000_000, "지티원, 투비소프트",                 "농협생명 ITRM 통합 + IT포탈 UI 리뉴얼.", "영업2본부", "ACTIVITY"),
    OpportunityScenario("CUS-015", "ITSM",    "{customer} 콜센터 시스템 고도화 RFI 대응",                       380_000_000, "정보 수집 단계",                     "고객사 RFI 수령. 정식 RFP 발주 전 솔루션 소개.", "영업2본부", "FINDING"),
    # ── 공공 (영업1본부)
    OpportunityScenario("CUS-021", "BSM",     "{customer} 지능형 시설안전 GMS·WSS 2차 고도화",                   840_000_000, "맨텍, 단독에 가까움",                "1차 사업 무상유지보수 종료에 따른 고도화. 시설안전센서 BSM 연계.", "영업1본부", "MAINTENANCE_LONG", paid_maint_years_done=3),
    OpportunityScenario("CUS-022", "E2E",     "{customer} 터널 설비안전 GMS·WSS 운영 고도화",                    910_000_000, "단독",                              "터널 설비안전 통합 모니터링. 도로공사 자체 관제센터와 연계.", "영업1본부", "PROJECT"),
    OpportunityScenario("CUS-023", "E2E",     "{customer} 서비스 영향도 기반 E2E·BSM 관제 도입",              1_350_000_000, "LG CNS, 포스코ICT",                  "발전소 운영에 직결되는 E2E 영향도 가시화. BSM 정책 수립 컨설팅 포함.", "영업1본부", "BID_PROPOSING"),
    OpportunityScenario("CUS-024", "DATACENTER","{customer} 통합운영환경 운영 유지관리 (2025~2026)",          2_400_000_000, "LG CNS 외 4사 평가",                 "국가행정망 통합 운영 환경. 무중단 운영 SLA 99.99%.", "영업1본부", "MAINTENANCE_LONG", paid_maint_years_done=6),
    OpportunityScenario("CUS-025", "EMS",     "{customer} 정보시스템 모니터링 체계 구축",                       620_000_000, "삼성SDS, 다우데이타",                "기상청 슈퍼컴 + 일반업무 시스템 통합 모니터링.", "영업1본부", "PROJECT"),
    OpportunityScenario("CUS-026", "EMS",     "{customer} 통합모니터링시스템 구축 사업",                        540_000_000, "쌍용정보통신",                       "사전규격공개 의견 반영본 RFP 수령. 17개 교육지원청 통합.", "영업1본부", "ACTIVITY"),
    OpportunityScenario("CUS-027", "ITSM",    "{customer} 차세대 경영관리시스템 구축",                          780_000_000, "더존, 영림원소프트랩",               "ERP+ITSM 연계 경영관리. 산기원 자체 인사/회계 연동.", "영업1본부", "FINDING"),
    OpportunityScenario("CUS-028", "ITSM",    "{customer} ITSM 신규 구축",                                      460_000_000, "더존비즈온, 인프라웨어",             "ITSM 표준 운영절차 정립 + 시스템 구축. 1차 입찰 유찰.", "영업1본부", "ACTIVITY"),
    OpportunityScenario("CUS-029", "BSM",     "{customer} 역사 안전센서 기반 GMS·WSS 구축",                     720_000_000, "맨텍 협업",                          "지하철 역사 시설 안전 모니터링 + 알림.", "영업1본부", "FINDING"),
    OpportunityScenario("CUS-030", "CLOUD",   "{customer} 디지털변전소 클라우드 통합관제 PoC",                  280_000_000, "메가존클라우드, 베스핀",             "변전소 데이터 클라우드 수집 PoC. 본사업 발주 가능성 검토 중.", "영업1본부", "FINDING"),
    OpportunityScenario("CUS-031", "EMS",     "{customer} 댐 통합 운영 모니터링 고도화",                        480_000_000, "포스코ICT, 한화시스템",              "전국 댐 운영 데이터 통합 모니터링.", "영업1본부", "FINDING"),
    OpportunityScenario("CUS-032", "ITAM",    "{customer} 청구 시스템 운영자산 통합 관리",                       360_000_000, "쌍용정보통신",                       "건강보험 청구 시스템 ITAM. 30만 자산 통합.", "영업1본부", "ACTIVITY"),
    # ── 민간 대기업
    OpportunityScenario("CUS-041", "RCA",     "{customer} 5G 코어망 RCA 자동화 고도화",                       1_820_000_000, "LG유플러스 컨소시엄",                "5G 코어망 RCA. 장애 평균 복구시간 30분 → 5분.", "영업2본부", "MAINTENANCE_LONG", paid_maint_years_done=5),
    OpportunityScenario("CUS-042", "DASHBOARD","{customer} 네트워크 운영 가시성 대시보드 고도화",                420_000_000, "단독",                              "기존 NMS 위에 본부장급 임원 대시보드 신규.", "영업2본부", "PROJECT"),
    OpportunityScenario("CUS-043", "ITSM",    "{customer} 통합 ITSM 운영자동화 도입",                          1_020_000_000, "포스코ICT, 다우데이타",              "BMC Remedy 대체. 운영자동화 워크플로우 통합.", "영업2본부", "ACTIVITY"),
    OpportunityScenario("CUS-044", "BSM",     "{customer} 그룹사 통합 BSM 운영",                                 950_000_000, "단독 (그룹사 정책)",                 "삼성그룹사 통합 BSM. 계열사 SLA 가시화.", "영업2본부", "MAINTENANCE_PAID"),
    OpportunityScenario("CUS-045", "E2E",     "{customer} 본사 NMS 구축",                                       580_000_000, "쌍용정보통신",                       "건설부문 본사 네트워크 모니터링.", "영업2본부", "FINDING"),
    OpportunityScenario("CUS-046", "ITAM",    "{customer} 그룹 IT자산 통합 관리 PoC",                            220_000_000, "지티원",                             "현대차그룹 IT자산 통합 PoC.", "영업2본부", "FINDING"),
    OpportunityScenario("CUS-047", "ITSM",    "{customer} 포스코그룹 통합 운영자동화 사업",                    1_180_000_000, "내부 사업본부 (협업)",                "포스코ICT 자체 사업 → 솔루션 공급.", "영업2본부", "CONTRACT"),
    OpportunityScenario("CUS-048", "RCA",     "{customer} DevSecOps 운영 자동화 체계 도입",                     890_000_000, "베스핀, 메가존",                     "DevSecOps 파이프라인 RCA. 컨테이너 환경 가시화.", "영업2본부", "BID_PROPOSING"),
    OpportunityScenario("CUS-049", "CLOUD",   "{customer} NCP 운영자동화 솔루션 협력 검토",                     -1,             "협업 (공동 영업)",                   "네이버클라우드와 OEM 협력 가능성 타진.", "영업2본부", "FINDING"),
    OpportunityScenario("CUS-050", "DASHBOARD","{customer} 옴니채널 운영 가시성 확보 사업",                      720_000_000, "삼성SDS",                            "백화점 옴니채널(매장+온라인) 운영 가시성. POS-온라인 연결 SLA.", "영업2본부", "PROJECT"),
    OpportunityScenario("CUS-051", "EMS",     "{customer} 그룹 인프라 통합 모니터링 운영",                      640_000_000, "더존비즈온",                         "롯데정보통신 그룹 IT 인프라 통합 EMS.", "영업2본부", "MAINTENANCE_PAID"),
    OpportunityScenario("CUS-052", "ITSM",    "{customer} 방산 ITSM 보안 강화 사업",                            520_000_000, "한화시스템 자체 + 솔루션 공급",       "방산 보안 등급 적용된 ITSM. 망분리 환경.", "영업2본부", "ACTIVITY"),
    OpportunityScenario("CUS-053", "BSM",     "{customer} 통합 모니터링 시스템 구축",                           580_000_000, "쌍용정보통신",                       "KB파트너스 자체 운영 시스템 BSM 도입.", "영업2본부", "BID_PROPOSING"),
    OpportunityScenario("CUS-054", "ITSM",    "{customer} LG그룹 통합 ITSM 운영 컨설팅",                       1_100_000_000, "내부 사업본부 협업",                  "LG CNS 자체 사업 + 솔루션 공급 라이선스.", "영업2본부", "MAINTENANCE_LONG", paid_maint_years_done=4),
    OpportunityScenario("CUS-055", "RCA",     "{customer} 풀필먼트 센터 운영 RCA 자동화 PoC",                   190_000_000, "메가존클라우드",                     "물류센터 자동화 시스템 RCA PoC.", "영업2본부", "FINDING"),

    # ── 실주 (BID_LOST): 입찰 진행했으나 실주 → 이후 단계(수주/계약/사업/유지보수) 모두 없음
    OpportunityScenario("CUS-001", "ITAM",    "{customer} 통합 IT자산관리 표준화 사업",                          780_000_000, "지티원, 더존비즈온",                 "1차 PoC 통과했으나 본입찰에서 가격 차이로 실주. 지티원 채택.", "영업2본부", "BID_LOST"),
    OpportunityScenario("CUS-005", "BSM",     "{customer} 기업금융 시스템 BSM 신규 구축",                       640_000_000, "삼성SDS",                            "삼성SDS 컨소시엄에 실주. 기존 거래 관계 및 그룹사 정책 영향.", "영업2본부", "BID_LOST"),
    OpportunityScenario("CUS-013", "EMS",     "{customer} 차세대 시스템 EMS 도입",                              420_000_000, "다우데이타",                         "기술평가 1위였으나 가격평가에서 다우데이타에 역전. 실주.", "영업2본부", "BID_LOST"),
    OpportunityScenario("CUS-028", "ITAM",    "{customer} 자산관리시스템 신규 도입",                            310_000_000, "더존비즈온",                         "공공 표준업체 선정에 밀려 실주. 더존비즈온의 공공 레퍼런스 우위.", "영업1본부", "BID_LOST"),
    OpportunityScenario("CUS-046", "DASHBOARD","{customer} 그룹 임원 대시보드 시범 구축",                        180_000_000, "현대오토에버 (그룹사)",              "그룹 내부 SI 정책에 따라 현대오토에버로 결정. 실주.", "영업2본부", "BID_LOST"),
    OpportunityScenario("CUS-055", "ITSM",    "{customer} 풀필먼트 운영 ITSM 도입 검토",                        260_000_000, "단독 (자체 개발 결정)",              "고객사 내부 자체 개발로 방향 변경. 실주.", "영업2본부", "BID_LOST"),

    # ── 장기 유상유지보수 (MAINTENANCE_LONG): 과거 검수 완료 후 무상→유상 전환, 연 단위 재계약 중
    OpportunityScenario("CUS-030", "EMS",     "{customer} 전력거래소 운영 EMS 유지보수 (장기)",                  120_000_000, "단독 (다년차 운영)",                 "2021년 검수 완료. 1년 무상 후 2022년부터 유상유지보수 매년 갱신.", "영업1본부", "MAINTENANCE_LONG", paid_maint_years_done=4),
    OpportunityScenario("CUS-032", "EMS",     "{customer} 청구시스템 운영 EMS 유지보수 (장기)",                  98_000_000,  "단독 (다년차 운영)",                 "2019년 검수 완료. 무상 1년 + 유상 6년차 진행 중. 매년 재계약.", "영업1본부", "MAINTENANCE_LONG", paid_maint_years_done=6),
    OpportunityScenario("CUS-043", "ITSM",    "{customer} 통신 ITSM 운영 (장기)",                                180_000_000, "단독 (운영 중)",                     "2020년 구축 사업 → 무상 1년 → 유상 4년차. KT 자체 ITSM 통합 운영.", "영업2본부", "MAINTENANCE_LONG", paid_maint_years_done=4),

    # ── 일본 사업 (MAINTENANCE_JP): 무상유지보수 없이 처음부터 유상유지보수로 계약 발효
    OpportunityScenario("CUS-049", "EMS",     "{customer} 일본 법인 데이터센터 운영 EMS",                        220_000_000, "단독 (해외법인 계약)",                "네이버 일본 법인 DC. 일본 사업 관행으로 무상 없이 유상유지보수 직행. 2년차.", "영업2본부", "MAINTENANCE_JP", paid_maint_years_done=2),

    # ── 매입계약 동반 + 추가 사업기회
    OpportunityScenario("CUS-022", "EMS",     "{customer} 교통관리시스템 EMS 인프라 확장",                      540_000_000, "포스코ICT",                          "교통 CCTV/센서 추가에 따른 EMS 인프라 확장. DB 매입 동반.", "영업1본부", "CONTRACT", has_purchase_contract=True),
    OpportunityScenario("CUS-008", "ITSM",    "{customer} 카드 발급 시스템 ITSM 통합 고도화",                   720_000_000, "다우데이타",                         "카드 발급 라인 전체 ITSM 통합. 발급 SLA 30분 이내.", "영업2본부", "CONTRACT"),
    OpportunityScenario("CUS-031", "DASHBOARD","{customer} 광역상수도 운영 대시보드 신규",                       380_000_000, "쌍용정보통신, 한화시스템",           "광역상수도 4개 권역 운영 대시보드 통합.", "영업1본부", "CONTRACT"),
    OpportunityScenario("CUS-027", "EMS",     "{customer} 산학협력 시스템 모니터링 고도화",                     260_000_000, "단독",                              "산기원 산학협력 시스템 EMS. 연 1회 정기 발주.", "영업1본부", "ACTIVITY"),
]


def make_user_email_password() -> tuple[str, str]:
    """추가 유저 기본 비밀번호 (모든 시드 유저 동일)."""
    return ("seed-default", "1234abcd!")


# 추가 유저 기본 비밀번호
SEED_USER_PASSWORD = "1234abcd!"
