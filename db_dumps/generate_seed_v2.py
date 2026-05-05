#!/usr/bin/env python3
"""
generate_seed_v2.py

기존 dump 파일을 읽어서 새로운 seed SQL 파일을 생성합니다.
추가 내용:
  - product_module (IDs 95001-95132) : POLESTAR 제품 카탈로그
  - sales_activity (IDs 13001-13020) : 영업 활동 20건
  - quotation (IDs 16001-16006) : 견적 6건
  - quotation_solution_item (IDs 16101-16130) : 견적 솔루션 아이템
  - prb (IDs 17001-17006) : PRB 6건
  - prb_result (IDs 18001-18006) : PRB 결과 6건
  - project_result_report (IDs 22001-22002) : 프로젝트 결과 보고서 2건
  - maintenance_quotation DDL + 데이터 (IDs 31001-31003)
"""

import re
import random

# ──────────────────────────────────────────────
# 경로 설정
# ──────────────────────────────────────────────
BASE_DIR = "/home/yusin/devdev/S14P31S106/db_dumps"
SOURCE_FILE = f"{BASE_DIR}/orbis_local_testtesttt_20260505_094731.sql"
OUTPUT_FILE = f"{BASE_DIR}/orbis_local_testtesttt_20260505_seed_v2.sql"

# ──────────────────────────────────────────────
# 공통 헬퍼
# ──────────────────────────────────────────────
CREATED_BY = "seed:v2"
NULL = r"\N"

def ts(dt_str: str) -> str:
    return dt_str

def base_cols(id_, created_at, updated_at=None):
    """id, created_at, created_by, deleted, deleted_at, deleted_by, updated_at, updated_by"""
    if updated_at is None:
        updated_at = created_at
    return f"{id_}\t{created_at}\t{CREATED_BY}\tf\t{NULL}\t{NULL}\t{updated_at}\t{CREATED_BY}"

# ──────────────────────────────────────────────
# 1. product_module 데이터 (95001-95132)
# ──────────────────────────────────────────────

# 라이선스 원본 데이터 파싱
# 형식: (license_code, 대분류, 중분류, product_group, 소분류(=product_name))
# 빈 셀은 위 행에서 상속

RAW_LICENSE_DATA = """license001	EMS	EMS	Framework	Framework	POLESTAR Single Manager
license002		EMS	SMS	SMS	POLESTAR Server Management for Unix
license003		EMS			POLESTAR Server Management for Windows/Linux
license004		EMS	VMM_Guest	VMM_Guest	POLESTAR Guest O/S for Windows
license005		EMS			POLESTAR Guest O/S for Linux
license006		EMS	VMM_Host	VMM_Host	POLESTAR Host O/S for VMware
license007		EMS			POLESTAR Host O/S for Hyper-V
license008		EMS			POLESTAR Host O/S for OpenStack
license009		EMS	NMS	NMS	POLESTAR Network Management
license010		EMS			POLESTAR Network Alive Management
license011		EMS			POLESTAR Network Management
license012		EMS			POLESTAR Network Management
license013	Dashboard	Dashboard	TMS	TMS	POLESTAR Traffic Management
license014	상면관리	상면관리	DPM	DPM	POLESTAR DPM for Oracle
license015	RCA	RCA		DPM	POLESTAR DPM for MS-SQL
license016	DCA	DCA		DPM	POLESTAR DPM for Sybase
license017	ITSM	ITSM		DPM	POLESTAR DPM for Tibero
license018		ITSM		DPM	POLESTAR DPM for Uni/SQL
license019		ITSM		DPM	POLESTAR DPM for Informix
license020		ITSM		DPM	POLESTAR DPM for DB2
license021		ITSM		DPM	POLESTAR DPM
license022		ITSM	WPM	WPM	POLESTAR WPM for Websphere
license023		ITSM		WPM	POLESTAR WPM for Weblogic
license024		ITSM		WPM	POLESTAR WPM for JEUS
license025	ITAM	ITAM		WPM	POLESTAR WPM
license026		ITAM	APM	APM	POLESTAR Web Performance Probe
license027		ITAM		APM	Web Application Performance Manager
license028		ITAM		APM	POLESTAR Active Agent ( URL )
license029		ITAM	SAP	SAP	POLESTAR SAP Management Manager
license030		ITAM		SAP	POLESTAR SAP Management
license031		ITAM	FMS	FMS	POLESTAR FMS Manager
license032		ITAM		FMS	항온항습기(HAVC) Agent
license033		ITAM		FMS	UPS Agent
license034	SupportingTools	SupportingTools		FMS	누수 Agent
license035	CLOUD	CLOUD		FMS	MM Agent
license036		CLOUD		FMS	소방 Agent
license037	BSM	BSM		FMS	영상 Agent
license038	E2E	E2E		FMS	데이터수집장치
license039		E2E		FMS	온습도센서
license040	AIOTION	AIOTION		FMS	누수센서 1식
license041		AIOTION		FMS	구축 공사, 시운전 교육
license042			Dashboard	Dashboard	POLESTAR Standard Dashboard
license043					POLESTAR Advanced Dashboard
license044			POLESTAR_Dashboard	POLESTAR_Dashboard	POLESTAR Dashboard Manager
license045					POLESTAR Dashboard Premium View
license046					POLESTAR Dashboard Adapter
license047			POLESTAR_상면관리	POLESTAR_상면관리	POLESTAR Rack Management (상면관리, 2D)
license048					POLESTAR Datacenter Operation Management Suite(2D 2.5D)
license049			POLESTAR_RCA	POLESTAR_RCA	POLESTAR RCA Manager
license050					POLESTAR RCA Adapter
license051			AutomationSuite	AutomationSuite	POLESTAR Automation Manager
license052					POLESTAR Automation Server Agent
license053					POLESTAR Automation Network Agent
license054			Portal	Portal	POLESTAR IT Service Portal
license055			CMDB	CMDB	POLESTAR CMDB(Configuration management DB)
license056					Configuration UI Generator (원장 화면 자동생성기)
license057			BPM	BPM	POLESTAR Process Designer
license058					POLESTAR Form Designer
license059			wDesk_ServiceSupport	wDesk_ServiceSupport	POLESTAR Service Desk Management
license060					POLESTAR wDesk Request Management
license061					POLESTAR wDesk Incident Management
license062					POLESTAR wDesk Problem Management
license063					POLESTAR wDesk Change Management
license064					POLESTAR wDesk Configuration Management
license065					POLESTAR wDesk Release Management
license066			wDesk_ServiceDelivery	wDesk_ServiceDelivery	POLESTAR wDesk Capacity Management
license067					POLESTAR wDesk Availability Management
license068					POLESTAR Business Continuity Management(BCM, 서비스연속성관리)
license069					POLESTAR Service Level Management
license070			ApplicationManagement	ApplicationManagement	Version Control Management(형상관리)
license071					Deploy Management (배포관리)
license072					Code Inspect Management
license073					Test Scenario Manaement(테스트 시나리오관리)
license074			PMS	PMS	POLESTAR Project Planning Management (프로젝트 계획관리)
license075					POLESTAR Project Progress Management (프로젝트 수행관리)
license076					POLESTAR Resource Management (프로젝트 자원관리)
license077			Billing	Billing	POLESTAR Billing Enterprise  Framework
license078					POLESTAR Contract Administration & Management
license079					POLESTAR Unit Price Management
license080					Cost Distribution Manaement
license081			AMDB	AMDB	POLESTAR AMDB(Asset management DB)
license082			도입	도입	Implementation project management (도입사업관리)
license083					Purchase Contract Manaement (구매계약관리)
license084					Installation inspection management (검수관리)
license085			운영관리	운영관리	Asset Operation management (운영관리)
license086					Asset Investigation Management (실사관리)
license087					Idle Assets Management (유휴관리)
license088					Reuse Asset Management (재사용관리)
license089					Asset Rental Management (대여관리)
license090					Asset Carry-in/out Management (반출입관리)
license091			폐기관리	폐기관리	Unavailable Assets Management (불용관리)
license092					Selling/Disposal Assets Management (매각/폐기관리)
license093			재무관리	재무관리	Asset Depreciation Management (감가상각관리)
license094			소프트웨어관리	소프트웨어관리	SW Group Management (Server) 그룹관리(서버용)
license095					SW Group Management (End User Computing) 그룹관리(PC용)
license096					SW license Management (라이선스 할당/회수관리)
license097					SW Discovery Management (수집관리)
license098			유지보수관리	유지보수관리	Maintenance Contract Management (유지보수 계약관리)
license099					Maintenance Performance Management (유지보수 실적관리)
license100			바코드_QR_RFID	바코드_QR_RFID	바코드_QR_RFID
license101			AutoDiscovery_optional	AutoDiscovery_optional	POLESTAR ITAM Manager
license102					POLESTAR Auto Discovery Agent
license103					POLESTAR Auto Discovery Node
license104			ReportingTool_비정형보고서	ReportingTool_비정형보고서	POLESTAR Report Manager (form 4개 기본 제공)
license105					for Additional Form
license106			PCM	PCM	POLESTAR Public Cloud for EC2(EFS, VPC 포함)
license107					POLESTAR Public Cloud for Lambda
license108					POLESTAR Public Cloud for S3
license109					POLESTAR Public Cloud for RDS
license110					POLESTAR Public Cloud for DynamoDB
license111					POLESTAR Public Cloud for Direct Connect
license112					POLESTAR Public Cloud for Route 53
license113					POLESTAR Public Cloud for CloudFront
license114					POLESTAR Public Cloud for Amazon API Gateway
license115					POLESTAR Public Cloud for AWS Config
license116					POLESTAR Public Cloud for AWS CloudTrail
license117					POLESTAR Public Cloud for Auto Scailing Group
license118					POLESTAR Public Cloud for Billing
license119			KCM	KCM	POLESTAR WorkNode for Kubernates
license120					POLESTAR WorkNode for Pivotal
license121					POLESTAR WorkNode for OpenShift
license122			POLESTAR_BSM	POLESTAR_BSM	POLESTAR Business Service Management
license123			POLESTAR_E2E	POLESTAR_E2E	POLESTAR E2E for Service
license124			DataInterface_Optional	DataInterface_Optional	POLESTAR Data Adapter
license125			WSS	WSS	MFL-센서
license126					센서 브라켓
license127					게이트웨이
license128					AIOTION IoT Framework for WSS
license129					AIOTION AI Analytics
license130			GMS	GMS	AIOTION IoT Framework for GMS
license131					AIOTION RuleChain
license132					AIOTION Dashboard for GMS"""

# 대분류 -> product_class 매핑
MAJOR_CLASS_MAP = {
    "EMS": "EMS",
    "Dashboard": "DASHBOARD",
    "상면관리": "DATACENTER",
    "RCA": "RCA",
    "DCA": "DCA",
    "ITSM": "ITSM",
    "ITAM": "ITAM",
    "SupportingTools": "SUPPORTING_TOOLS",
    "CLOUD": "CLOUD",
    "BSM": "BSM",
    "E2E": "E2E",
    "AIOTION": "SUPPORTING_TOOLS",  # enum에 없으므로 SUPPORTING_TOOLS로
}

# 중분류 -> product_class 매핑 (대분류가 비어있는 경우)
GROUP_CLASS_MAP = {
    "Dashboard": "DASHBOARD",
    "POLESTAR_Dashboard": "DASHBOARD",
    "POLESTAR_상면관리": "DATACENTER",
    "POLESTAR_RCA": "RCA",
    "AutomationSuite": "ITSM",
    "Portal": "ITSM",
    "CMDB": "ITSM",
    "BPM": "ITSM",
    "wDesk_ServiceSupport": "ITSM",
    "wDesk_ServiceDelivery": "ITSM",
    "ApplicationManagement": "ITSM",
    "PMS": "ITSM",
    "Billing": "ITSM",
    "AMDB": "ITAM",
    "도입": "ITAM",
    "운영관리": "ITAM",
    "폐기관리": "ITAM",
    "재무관리": "ITAM",
    "소프트웨어관리": "ITAM",
    "유지보수관리": "ITAM",
    "바코드_QR_RFID": "ITAM",
    "AutoDiscovery_optional": "ITAM",
    "ReportingTool_비정형보고서": "SUPPORTING_TOOLS",
    "DataInterface_Optional": "SUPPORTING_TOOLS",
    "PCM": "CLOUD",
    "KCM": "CLOUD",
    "POLESTAR_BSM": "BSM",
    "POLESTAR_E2E": "E2E",
    "WSS": "E2E",
    "GMS": "E2E",
}

# product_class별 기본 가격 범위 (단위: 원)
CLASS_PRICE_RANGE = {
    "EMS": (80000000, 200000000),
    "DASHBOARD": (50000000, 150000000),
    "DATACENTER": (60000000, 180000000),
    "RCA": (70000000, 160000000),
    "DCA": (70000000, 160000000),
    "ITSM": (80000000, 250000000),
    "ITAM": (70000000, 200000000),
    "SUPPORTING_TOOLS": (50000000, 150000000),
    "CLOUD": (60000000, 200000000),
    "BSM": (100000000, 300000000),
    "E2E": (50000000, 180000000),
}


def parse_license_data():
    """라이선스 원본 데이터를 파싱하여 product_module 행 목록을 반환"""
    rows = []
    prev_major = ""
    prev_minor = ""   # 중분류(product_group 결정에 사용)
    prev_group = ""   # product_group
    prev_subgroup = ""  # 소분류 바로 위 행

    for line_no, line in enumerate(RAW_LICENSE_DATA.strip().split("\n"), 1):
        parts = line.split("\t")
        # 컬럼: [license_code, 대분류, 중분류, product_group, product_group2, product_name]
        # 일부 행은 컬럼 수가 다를 수 있으므로 6개로 패딩
        while len(parts) < 6:
            parts.append("")

        license_code = parts[0].strip()
        major = parts[1].strip()       # 대분류
        minor = parts[2].strip()       # 중분류
        pg1 = parts[3].strip()         # product_group (첫 번째)
        pg2 = parts[4].strip()         # product_group (두 번째, 보통 동일)
        product_name = parts[5].strip()

        # 상속 처리
        if major:
            prev_major = major
        else:
            major = prev_major

        if minor:
            prev_minor = minor
        else:
            minor = prev_minor

        # product_group: pg1 또는 pg2 중 비어있지 않은 것
        if pg1:
            prev_group = pg1
        elif pg2:
            prev_group = pg2
        product_group = prev_group

        # product_class 결정
        product_class = None
        if major and major in MAJOR_CLASS_MAP:
            product_class = MAJOR_CLASS_MAP[major]
        else:
            # 대분류가 없거나 매핑 안 됨 → 중분류로 추론
            if minor in GROUP_CLASS_MAP:
                product_class = GROUP_CLASS_MAP[minor]
            elif product_group in GROUP_CLASS_MAP:
                product_class = GROUP_CLASS_MAP[product_group]

        if product_class is None:
            # fallback: EMS
            product_class = "EMS"

        # 가격 결정
        lo, hi = CLASS_PRICE_RANGE.get(product_class, (50000000, 200000000))
        # 결정론적 가격을 위해 시드 사용
        rng = random.Random(hash(license_code) % (2**32))
        unit_price = rng.randint(lo // 10000000, hi // 10000000) * 10000000

        rows.append({
            "license_code": license_code,
            "product_class": product_class,
            "product_group": product_group,
            "product_name": product_name,
            "unit_price": unit_price,
        })

    return rows


def build_product_module_block():
    """product_module COPY 블록 (95001-95132) 생성"""
    rows = parse_license_data()
    lines = []
    created_at = "2026-02-01 09:00:00"
    for i, row in enumerate(rows, 1):
        id_ = 95000 + i
        line = (
            f"{id_}\t{created_at}\t{CREATED_BY}\tf\t{NULL}\t{NULL}\t{created_at}\t{CREATED_BY}\t"
            f"{row['license_code']}\tSEAT\t{row['product_class']}\t{row['product_group']}\t{row['product_name']}\t{row['unit_price']}"
        )
        lines.append(line)
    return lines


# ──────────────────────────────────────────────
# 2. sales_activity (IDs 13001-13020)
# ──────────────────────────────────────────────

SALES_USERS = [
    "f056cec6-3c07-5ba6-bb8c-df70fb8fdd88",   # 박유신
    "d314b48d-d650-52fe-9471-d0432424c46e",   # 김도현
    "813a5352-b4f6-5bee-9fcc-60d3e4956b32",   # 이서준
    "52bb14f9-de89-5382-8746-a4e91e617096",   # 강태윤
]

ACTIVITY_DATA = [
    # (id, opp_id, created_at, activity_dt, purpose, type_, content, interest, issue, location, next_activity, status)
    (13001, 12001, "2026-01-05 09:00:00", "2026-01-05 10:00:00",
     "CONSULTING", "OFFLINE_MEETING",
     "한국산업기술진흥원 담당자와 EMS 시연 진행. 실시간 모니터링 기능에 높은 관심 보임",
     "실시간 모니터링 및 대시보드 기능", "운영 인력 교육 일정 협의 필요",
     "한국산업기술진흥원 본사 회의실", "제품 데모 일정 확정", "COMPLETED"),

    (13002, 12001, "2026-01-12 10:00:00", "2026-01-12 14:00:00",
     "DEMO", "OFFLINE_MEETING",
     "EMS 핵심 기능 데모 진행 및 고객 현행 모니터링 환경 파악",
     "서버 및 네트워크 통합 모니터링", "기존 레거시 시스템 연동 방안 검토 필요",
     "엔키아 데모룸", "견적서 작성 및 제출", "COMPLETED"),

    (13003, 12002, "2026-01-08 09:00:00", "2026-01-08 11:00:00",
     "RFP_ANALYSIS", "VIDEO_MEETING",
     "KB국민은행 IT인프라팀과 코어뱅킹 모니터링 요구사항 협의. RFP 사전 분석 공유",
     "코어뱅킹 시스템 안정성 모니터링", "금융권 보안 정책 준수 방안 확인 필요",
     "화상회의", "기술 제안서 초안 작성", "COMPLETED"),

    (13004, 12002, "2026-01-20 14:00:00", "2026-01-20 15:00:00",
     "PRODUCT_INTRODUCTION", "EMAIL",
     "KB국민은행 담당자에게 POLESTAR EMS 제품 소개 자료 및 레퍼런스 사례 전달",
     "실시간 장애 알림 및 성능 분석", "대용량 트랜잭션 환경 적용 사례 추가 요청",
     "이메일", "방문 미팅 일정 조율", "COMPLETED"),

    (13005, 12003, "2026-01-15 10:00:00", "2026-01-15 14:00:00",
     "CONSULTING", "OFFLINE_MEETING",
     "삼성물산 RFP 분석 결과 공유 및 기술 제안서 초안 검토",
     "네트워크 통합 관제 및 이상 탐지", "멀티벤더 환경 연계 복잡도 높음",
     "삼성물산 건설부문 본사", "기술 협의 결과 반영한 제안서 최종 완성", "COMPLETED"),

    (13006, 12003, "2026-01-28 11:00:00", "2026-01-28 13:00:00",
     "PROPOSAL_WRITING", "VIDEO_MEETING",
     "삼성물산 RFP 기반 SI 제안서 작성 진행 상황 공유 및 피드백 수렴",
     "통합 대시보드 및 SLA 관리", "가격 경쟁력 확보 방안 논의",
     "화상회의", "최종 제안서 제출", "COMPLETED"),

    (13007, 12004, "2026-02-03 09:00:00", "2026-02-03 10:30:00",
     "CONSULTING", "CALL",
     "대한적십자사 ITSM 도입 관련 초기 요구사항 전화 인터뷰 진행",
     "서비스데스크 및 변경관리 프로세스", "비영리 기관 예산 집행 제약 확인 필요",
     "전화", "대면 미팅 일정 수립", "COMPLETED"),

    (13008, 12004, "2026-02-17 14:00:00", "2026-02-17 15:30:00",
     "DEMO", "OFFLINE_MEETING",
     "대한적십자사 ITSM 표준 프로세스 데모 및 wDesk 기능 시연",
     "장애관리 및 변경관리 자동화", "현업 담당자 교육 계획 수립 필요",
     "대한적십자사 본사 회의실", "견적서 제출 및 PRB 상정", "COMPLETED"),

    (13009, 12005, "2026-02-10 10:00:00", "2026-02-10 14:00:00",
     "RFP_ANALYSIS", "VIDEO_MEETING",
     "농협생명 ITSM 재구축 RFP 수령 및 분석 결과 공유",
     "CMDB 연계 및 서비스 카탈로그 관리", "대용량 자산 데이터 이행 계획 협의 필요",
     "화상회의", "기술 제안서 작성", "COMPLETED"),

    (13010, 12005, "2026-02-24 14:00:00", "2026-02-24 16:00:00",
     "CONSULTING", "OFFLINE_MEETING",
     "농협생명 IT팀과 현행 ITSM 운영 현황 파악 및 개선 방향 협의",
     "SLA 관리 및 서비스 연속성", "기존 데이터 마이그레이션 리스크 평가",
     "농협생명 본사 IT센터", "PRB 준비 및 견적 산출", "COMPLETED"),

    (13011, 12006, "2026-01-22 11:00:00", "2026-01-22 13:00:00",
     "PRODUCT_INTRODUCTION", "EMAIL",
     "국민연금공단 ITAM 솔루션 소개 자료 이메일 발송 및 도입 효과 설명",
     "자산 수명주기 관리 및 소프트웨어 라이선스 관리", "공공기관 조달 절차 확인 필요",
     "이메일", "제품 설명회 일정 조율", "COMPLETED"),

    (13012, 12006, "2026-02-05 14:00:00", "2026-02-05 15:30:00",
     "DEMO", "VIDEO_MEETING",
     "국민연금공단 ITAM 화상 데모 진행. 자산 자동 탐지 기능 중심 시연",
     "자동 탐지 및 소프트웨어 감사", "조달청 연계 방식 확인 필요",
     "화상회의", "현장 방문 데모 일정 수립", "COMPLETED"),

    (13013, 12007, "2026-03-04 10:00:00", "2026-03-04 11:30:00",
     "CONSULTING", "OFFLINE_MEETING",
     "우리은행 BSM 도입 필요성 협의 및 현행 모니터링 환경 파악",
     "비즈니스 서비스 맵 및 영향도 분석", "레거시 시스템 복잡도로 인한 구성 정보 수집 어려움",
     "우리은행 IT센터 회의실", "기술 제안서 작성", "COMPLETED"),

    (13014, 12007, "2026-03-18 14:00:00", "2026-03-18 16:00:00",
     "SI_PROPOSAL_WRITING", "VIDEO_MEETING",
     "우리은행 BSM 구축 SI 제안서 작성 진행 현황 공유 및 기술 검토",
     "서비스 토폴로지 및 종속성 관리", "서비스 영향도 분석 정확도 향상 방안 논의",
     "화상회의", "제안서 최종 제출 및 PRB 준비", "IN_PROGRESS"),

    (13015, 12008, "2026-02-14 10:00:00", "2026-02-14 14:00:00",
     "RFP_ANALYSIS", "VIDEO_MEETING",
     "한국전력공사 E2E 모니터링 RFP 분석 및 기술 검토 결과 공유",
     "엔드투엔드 서비스 추적 및 병목 분석", "광역 네트워크 구간 모니터링 커버리지 이슈",
     "화상회의", "현장 방문 및 데모 일정 수립", "COMPLETED"),

    (13016, 12008, "2026-02-28 14:00:00", "2026-02-28 15:30:00",
     "DEMO", "OFFLINE_MEETING",
     "한국전력공사 E2E 솔루션 현장 데모 진행 및 실제 운영 시나리오 시연",
     "서비스 구간별 응답시간 분석", "현장 인프라 환경과 제품 호환성 검증 필요",
     "한국전력공사 IT센터", "기술 협의 결과 반영 제안서 작성", "COMPLETED"),

    (13017, 12009, "2026-03-10 10:00:00", "2026-03-10 11:00:00",
     "CONSULTING", "CALL",
     "현대자동차 클라우드 모니터링 도입 관련 초기 상담 전화 미팅",
     "멀티클라우드 통합 관제", "AWS/Azure/GCP 멀티클라우드 지원 범위 확인",
     "전화", "화상 데모 일정 수립", "COMPLETED"),

    (13018, 12009, "2026-03-24 14:00:00", "2026-03-24 16:00:00",
     "DEMO", "VIDEO_MEETING",
     "현대자동차 PCM/KCM 클라우드 모니터링 화상 데모 진행",
     "퍼블릭 클라우드 비용 최적화 및 자원 가시성", "쿠버네티스 환경 자동 스케일링 연동 방안",
     "화상회의", "견적서 작성 및 제출", "COMPLETED"),

    (13019, 12010, "2026-04-02 10:00:00", "2026-04-02 14:00:00",
     "POC", "OFFLINE_MEETING",
     "LG CNS 데이터센터 관리 솔루션 POC 환경 구성 및 1차 결과 리뷰",
     "데이터센터 상면 및 전력 관리", "POC 환경과 실제 운영 환경 격차 최소화 방안 논의",
     "LG CNS 내부 POC 랩", "POC 최종 결과 보고 및 사업 제안", "COMPLETED"),

    (13020, 12010, "2026-04-16 14:00:00", "2026-04-16 15:30:00",
     "DOCUMENT_DELIVERY", "EMAIL",
     "LG CNS 데이터센터 관리 솔루션 최종 제안서 및 견적서 이메일 발송",
     "데이터센터 통합 관리 및 운영 효율화", "최종 가격 협상 필요",
     "이메일", "계약 협의 미팅 일정 수립", "IN_PROGRESS"),
]


def build_sales_activity_lines():
    lines = []
    user_cycle = SALES_USERS * 5  # 순환
    for i, row in enumerate(ACTIVITY_DATA):
        (id_, opp_id, created_at, activity_dt,
         purpose, type_, content, interest, issue, location, next_activity, status) = row
        line = (
            f"{id_}\t{created_at}\t{CREATED_BY}\tf\t{NULL}\t{NULL}\t{created_at}\t{CREATED_BY}\t"
            f"{content}\t{activity_dt}\t{purpose}\t{type_}\t{interest}\t{issue}\t{location}\t"
            f"{next_activity}\t{status}\t{opp_id}"
        )
        lines.append(line)
    return lines


# ──────────────────────────────────────────────
# 3. quotation (IDs 16001-16006)
# ──────────────────────────────────────────────

QUOTATION_DATA = [
    # (id, opp_id, created_at, code, date, supply, labor, consumer, total, note, payment)
    (16001, 12001, "2026-01-20 10:00:00",
     "Q-20260120-001", "2026-01-20",
     320000000, 480000000, 250000000, 1050000000,
     "EMS 통합 모니터링 구축, 유지보수 포함",
     "계약금 30%, 중도금 40%, 검수 후 30%"),

    (16002, 12002, "2026-01-25 10:00:00",
     "Q-20260125-001", "2026-01-25",
     450000000, 620000000, 380000000, 1450000000,
     "KB국민은행 코어뱅킹 모니터링 시스템 구축",
     "선금 20%, 1차중도 35%, 2차중도 25%, 준공 20%"),

    (16003, 12003, "2026-02-10 10:00:00",
     "Q-20260210-001", "2026-02-10",
     280000000, 390000000, 200000000, 870000000,
     "삼성물산 NMS 구축 및 운영 지원",
     "계약금 30%, 중도금 40%, 검수 후 30%"),

    (16004, 12005, "2026-02-28 10:00:00",
     "Q-20260228-001", "2026-02-28",
     520000000, 730000000, 420000000, 1670000000,
     "농협생명 ITSM 재구축 및 CMDB 연계",
     "선금 20%, 1차중도 35%, 2차중도 25%, 준공 20%"),

    (16005, 12007, "2026-03-20 10:00:00",
     "Q-20260320-001", "2026-03-20",
     680000000, 950000000, 550000000, 2180000000,
     "우리은행 BSM 구축, 레거시 연계 포함",
     "계약금 30%, 중도금 40%, 검수 후 30%"),

    (16006, 12009, "2026-04-05 10:00:00",
     "Q-20260405-001", "2026-04-05",
     340000000, 430000000, 280000000, 1050000000,
     "현대자동차 멀티클라우드 모니터링 구축",
     "선금 20%, 중도 50%, 준공 30%"),
]


def build_quotation_lines():
    lines = []
    for row in QUOTATION_DATA:
        (id_, opp_id, created_at, code, date,
         supply, labor, consumer, total, note, payment) = row
        line = (
            f"{id_}\t{created_at}\t{CREATED_BY}\tf\t{NULL}\t{NULL}\t{created_at}\t{CREATED_BY}\t"
            f"{consumer}\t{labor}\t{note}\t{payment}\t{code}\t{date}\t{supply}\t{total}\t{opp_id}"
        )
        lines.append(line)
    return lines


# ──────────────────────────────────────────────
# 4. quotation_solution_item (IDs 16101-16130)
# ──────────────────────────────────────────────

# product_module_id는 기존 93001-93046 중 선택
SOLUTION_ITEMS = [
    # quotation_id 16001 (EMS 관련)
    (16101, 16001, "2026-01-20 11:00:00", 93009, 150000000, 0, 1, 120000000),
    (16102, 16001, "2026-01-20 12:00:00", 93010, 130000000, 0, 1, 104000000),
    (16103, 16001, "2026-01-20 13:00:00", 93033, 110000000, 0, 1, 88000000),

    # quotation_id 16002 (코어뱅킹 모니터링)
    (16104, 16002, "2026-01-25 11:00:00", 93001, 180000000, 0, 1, 162000000),
    (16105, 16002, "2026-01-25 12:00:00", 93002, 220000000, 0, 1, 198000000),
    (16106, 16002, "2026-01-25 13:00:00", 93003, 120000000, 0, 1, 96000000),
    (16107, 16002, "2026-01-25 14:00:00", 93034, 130000000, 0, 1, 104000000),

    # quotation_id 16003 (NMS)
    (16108, 16003, "2026-02-10 11:00:00", 93009, 150000000, 0, 1, 112500000),
    (16109, 16003, "2026-02-10 12:00:00", 93011, 110000000, 0, 1, 82500000),

    # quotation_id 16004 (ITSM)
    (16110, 16004, "2026-02-28 11:00:00", 93005, 200000000, 0, 1, 208000000),
    (16111, 16004, "2026-02-28 12:00:00", 93006, 180000000, 0, 1, 187200000),
    (16112, 16004, "2026-02-28 13:00:00", 93007, 170000000, 0, 1, 136000000),
    (16113, 16004, "2026-02-28 14:00:00", 93008, 120000000, 0, 1, 96000000),

    # quotation_id 16005 (BSM)
    (16114, 16005, "2026-03-20 11:00:00", 93002, 220000000, 0, 2, 396000000),
    (16115, 16005, "2026-03-20 12:00:00", 93001, 180000000, 0, 1, 162000000),
    (16116, 16005, "2026-03-20 13:00:00", 93005, 200000000, 0, 1, 200000000),
    (16117, 16005, "2026-03-20 14:00:00", 93045, 200000000, 0, 1, 160000000),

    # quotation_id 16006 (Cloud)
    (16118, 16006, "2026-04-05 11:00:00", 93015, 140000000, 0, 1, 112000000),
    (16119, 16006, "2026-04-05 12:00:00", 93016, 110000000, 0, 1, 88000000),
    (16120, 16006, "2026-04-05 13:00:00", 93017, 150000000, 0, 1, 120000000),
]


def build_quotation_solution_item_lines():
    lines = []
    for row in SOLUTION_ITEMS:
        (id_, quot_id, created_at, pm_id, consumer_price, discount, qty, supply_price) = row
        consumer_total = consumer_price * qty
        supply_total = supply_price * qty
        line = (
            f"{id_}\t{created_at}\t{CREATED_BY}\tf\t{NULL}\t{NULL}\t{created_at}\t{CREATED_BY}\t"
            f"{consumer_price}\t{consumer_total}\t{discount}\tf\t{qty}\t{supply_price}\t{supply_total}\t{pm_id}\t{quot_id}"
        )
        lines.append(line)
    return lines


# ──────────────────────────────────────────────
# 5. prb (IDs 17001-17006)
# ──────────────────────────────────────────────

PRB_DATA = [
    # (id, opp_id, created_at, updated_at, sales_rep_id)
    (17001, 12001, "2026-01-22 09:00:00", "2026-01-24 17:30:00",
     "f056cec6-3c07-5ba6-bb8c-df70fb8fdd88"),
    (17002, 12002, "2026-01-27 09:00:00", "2026-01-29 17:30:00",
     "d314b48d-d650-52fe-9471-d0432424c46e"),
    (17003, 12003, "2026-02-12 09:00:00", "2026-02-14 17:30:00",
     "813a5352-b4f6-5bee-9fcc-60d3e4956b32"),
    (17004, 12005, "2026-03-02 09:00:00", "2026-03-04 17:30:00",
     "52bb14f9-de89-5382-8746-a4e91e617096"),
    (17005, 12007, "2026-03-22 09:00:00", "2026-03-24 17:30:00",
     "f056cec6-3c07-5ba6-bb8c-df70fb8fdd88"),
    (17006, 12009, "2026-04-07 09:00:00", "2026-04-09 17:30:00",
     "d314b48d-d650-52fe-9471-d0432424c46e"),
]


def build_prb_lines():
    lines = []
    for row in PRB_DATA:
        (id_, opp_id, created_at, updated_at, sales_rep) = row
        line = (
            f"{id_}\t{created_at}\t{CREATED_BY}\tf\t{NULL}\t{NULL}\t{updated_at}\t{CREATED_BY}\t"
            f"{opp_id}\t{sales_rep}"
        )
        lines.append(line)
    return lines


# ──────────────────────────────────────────────
# 6. prb_result (IDs 18001-18006)
# ──────────────────────────────────────────────

PRB_RESULT_DATA = [
    # (id, prb_id, created_at, updated_at)
    (18001, 17001, "2026-01-25 16:00:00", "2026-01-25 16:30:00"),
    (18002, 17002, "2026-01-30 16:00:00", "2026-01-30 16:30:00"),
    (18003, 17003, "2026-02-15 16:00:00", "2026-02-15 16:30:00"),
    (18004, 17004, "2026-03-05 16:00:00", "2026-03-05 16:30:00"),
    (18005, 17005, "2026-03-25 16:00:00", "2026-03-25 16:30:00"),
    (18006, 17006, "2026-04-10 16:00:00", "2026-04-10 16:30:00"),
]


def build_prb_result_lines():
    lines = []
    for row in PRB_RESULT_DATA:
        (id_, prb_id, created_at, updated_at) = row
        line = (
            f"{id_}\t{created_at}\t{CREATED_BY}\tf\t{NULL}\t{NULL}\t{updated_at}\t{CREATED_BY}\t"
            f"{prb_id}"
        )
        lines.append(line)
    return lines


# ──────────────────────────────────────────────
# 7. project_result_report (IDs 22001-22002)
# ──────────────────────────────────────────────

PROJECT_RESULT_REPORT_DATA = [
    # (id, project_id, created_at, updated_at, manager_id)
    (22001, 21003, "2026-02-15 17:00:00", "2026-02-15 17:30:00",
     "f056cec6-3c07-5ba6-bb8c-df70fb8fdd88"),
    (22002, 21005, "2026-04-20 17:00:00", "2026-04-20 17:30:00",
     "813a5352-b4f6-5bee-9fcc-60d3e4956b32"),
]


def build_project_result_report_lines():
    lines = []
    for row in PROJECT_RESULT_REPORT_DATA:
        (id_, proj_id, created_at, updated_at, manager_id) = row
        line = (
            f"{id_}\t{created_at}\t{CREATED_BY}\tf\t{NULL}\t{NULL}\t{updated_at}\t{CREATED_BY}\t"
            f"{manager_id}\t{proj_id}\t{NULL}"
        )
        lines.append(line)
    return lines


# ──────────────────────────────────────────────
# 8. maintenance_quotation 데이터 (IDs 31001-31003)
# ──────────────────────────────────────────────

MAINTENANCE_QUOTATION_DATA = [
    # (id, project_id, created_at, updated_at, ref_no, quot_date, payment_terms,
    #  total_amount, start_date, end_date, sp_maint_cost, monthly_supply, total_quot_amount, notes)
    (31001, 21003, "2026-01-10 10:00:00", "2026-01-10 11:00:00",
     "MQ-20260110-001", "2026-01-10", "계약 후 익월 말일 지급",
     150000000, "2026-02-01", "2027-01-31",
     12500000, 12500000, 150000000,
     "EMS 솔루션 유지보수 연간 계약. 24x7 장애 대응 포함"),

    (31002, 21003, "2026-02-15 10:00:00", "2026-02-15 11:00:00",
     "MQ-20260215-001", "2026-02-15", "분기별 균등 지급",
     240000000, "2026-03-01", "2027-02-28",
     20000000, 20000000, 240000000,
     "ITSM 솔루션 유지보수 연간 계약. 기능 개선 및 버전 업그레이드 포함"),

    (31003, 21005, "2026-03-20 10:00:00", "2026-03-20 11:00:00",
     "MQ-20260320-001", "2026-03-20", "선납 50%, 잔금 반기 지급",
     180000000, "2026-04-01", "2027-03-31",
     15000000, 15000000, 180000000,
     "AIOps 플랫폼 유지보수 연간 계약. 월간 기술 지원 세션 포함"),
]


def build_maintenance_quotation_lines():
    lines = []
    for row in MAINTENANCE_QUOTATION_DATA:
        (id_, proj_id, created_at, updated_at, ref_no, quot_date, payment_terms,
         total_amount, start_date, end_date, sp_maint_cost, monthly_supply,
         total_quot_amount, notes) = row
        # 기존 컬럼 + 새 컬럼 순서:
        # id, created_at, created_by, deleted, deleted_at, deleted_by, updated_at, updated_by,
        # project_id,
        # ref_no, quotation_date, payment_terms, total_amount, start_date, end_date,
        # sp_maintenance_cost, monthly_supply_price, total_quotation_amount, special_notes
        line = (
            f"{id_}\t{created_at}\t{CREATED_BY}\tf\t{NULL}\t{NULL}\t{updated_at}\t{CREATED_BY}\t"
            f"{proj_id}\t"
            f"{ref_no}\t{quot_date}\t{payment_terms}\t{total_amount}\t{start_date}\t{end_date}\t"
            f"{sp_maint_cost}\t{monthly_supply}\t{total_quot_amount}\t{notes}"
        )
        lines.append(line)
    return lines


# ──────────────────────────────────────────────
# DDL for maintenance_quotation ALTER + new tables
# ──────────────────────────────────────────────

MAINTENANCE_DDL = """
--
-- DDL: maintenance_quotation 컬럼 추가 (seed:v2)
--

ALTER TABLE maintenance_quotation
  ADD COLUMN IF NOT EXISTS ref_no character varying(255),
  ADD COLUMN IF NOT EXISTS quotation_date date,
  ADD COLUMN IF NOT EXISTS payment_terms character varying(255),
  ADD COLUMN IF NOT EXISTS total_amount bigint,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS sp_maintenance_cost bigint,
  ADD COLUMN IF NOT EXISTS monthly_supply_price bigint,
  ADD COLUMN IF NOT EXISTS total_quotation_amount bigint,
  ADD COLUMN IF NOT EXISTS special_notes text;

ALTER TABLE maintenance_quotation
  ADD CONSTRAINT IF NOT EXISTS uk_maintenance_quotation_ref_no UNIQUE (ref_no);

--
-- DDL: maintenance_service_info 테이블 생성 (seed:v2)
--

CREATE TABLE IF NOT EXISTS maintenance_service_info (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at timestamp(6),
  created_by varchar(255),
  deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamp(6),
  deleted_by varchar(255),
  updated_at timestamp(6),
  updated_by varchar(255),
  category varchar(255),
  content varchar(255),
  item varchar(255),
  product_module_id bigint REFERENCES product_module(id),
  quotation_id bigint REFERENCES maintenance_quotation(id)
);

--
-- DDL: maintenance_amount_reason 테이블 생성 (seed:v2)
--

CREATE TABLE IF NOT EXISTS maintenance_amount_reason (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at timestamp(6),
  created_by varchar(255),
  deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamp(6),
  deleted_by varchar(255),
  updated_at timestamp(6),
  updated_by varchar(255),
  amount bigint,
  months integer,
  quantity integer,
  remarks varchar(255),
  product_module_id bigint REFERENCES product_module(id),
  quotation_id bigint REFERENCES maintenance_quotation(id)
);
"""


# ──────────────────────────────────────────────
# SEQUENCE UPDATE SQL (새로 추가된 레코드 반영)
# ──────────────────────────────────────────────

SEQUENCE_UPDATES = """
--
-- Sequence updates for seed:v2 additions
--
SELECT pg_catalog.setval('public.product_module_id_seq', 95132, true);
SELECT pg_catalog.setval('public.sales_activity_id_seq', 13020, true);
SELECT pg_catalog.setval('public.quotation_id_seq', 16006, true);
SELECT pg_catalog.setval('public.quotation_solution_item_id_seq', 16120, true);
SELECT pg_catalog.setval('public.prb_id_seq', 17006, true);
SELECT pg_catalog.setval('public.prb_result_id_seq', 18006, true);
SELECT pg_catalog.setval('public.project_result_report_id_seq', 22002, true);
SELECT pg_catalog.setval('public.maintenance_quotation_id_seq', 31003, true);
"""


# ──────────────────────────────────────────────
# 메인 처리 로직
# ──────────────────────────────────────────────

def insert_after_copy_block(content: str, table_marker: str, new_lines: list) -> str:
    """
    'COPY public.<table_marker> ... FROM stdin;' 블록을 찾아서,
    해당 블록의 \\. 바로 앞에 새 라인들을 삽입합니다.
    """
    # COPY 블록 찾기: 테이블 이름 포함하는 COPY 문 다음의 \. 위치
    pattern = rf'(COPY public\.{re.escape(table_marker)} [^\n]+\nFROM stdin;\n)(.*?)(\\\.)(\n)'
    # stdin 바로 다음부터 \. 까지를 캡처
    # 더 정확한 패턴:
    pattern2 = rf'(COPY public\.{re.escape(table_marker)} \([^)]+\) FROM stdin;\n)(.*?)(\n\\\.)'

    match = re.search(pattern2, content, re.DOTALL)
    if not match:
        print(f"  [WARN] COPY 블록 미발견: {table_marker}")
        return content

    start, end = match.start(), match.end()
    existing_data = match.group(2)

    new_data_str = "\n".join(new_lines)
    if existing_data:
        replacement = match.group(1) + existing_data + "\n" + new_data_str + "\n\\."
    else:
        replacement = match.group(1) + new_data_str + "\n\\."

    return content[:start] + replacement + content[end:]


def process():
    print(f"[1] 기존 dump 파일 읽기: {SOURCE_FILE}")
    with open(SOURCE_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    # ── maintenance DDL을 파일 상단 (SET 명령어들 다음)에 삽입 ──
    print("[2] maintenance_quotation DDL 삽입")
    insert_point = "-- Data for Name: department;"
    content = content.replace(
        f"--\n{insert_point}",
        MAINTENANCE_DDL + f"\n--\n{insert_point}"
    )

    # ── product_module 새 행 추가 ──
    print("[3] product_module 행 추가 (95001-95132)")
    pm_lines = build_product_module_block()
    content = insert_after_copy_block(content, "product_module", pm_lines)

    # ── sales_activity 새 행 추가 ──
    print("[4] sales_activity 행 추가 (13001-13020)")
    sa_lines = build_sales_activity_lines()
    content = insert_after_copy_block(content, "sales_activity", sa_lines)

    # ── quotation 새 행 추가 ──
    print("[5] quotation 행 추가 (16001-16006)")
    q_lines = build_quotation_lines()
    content = insert_after_copy_block(content, "quotation", q_lines)

    # ── quotation_solution_item 새 행 추가 ──
    print("[6] quotation_solution_item 행 추가 (16101-16120)")
    qsi_lines = build_quotation_solution_item_lines()
    content = insert_after_copy_block(content, "quotation_solution_item", qsi_lines)

    # ── prb 새 행 추가 ──
    print("[7] prb 행 추가 (17001-17006)")
    prb_lines = build_prb_lines()
    content = insert_after_copy_block(content, "prb", prb_lines)

    # ── prb_result 새 행 추가 ──
    print("[8] prb_result 행 추가 (18001-18006)")
    prb_r_lines = build_prb_result_lines()
    content = insert_after_copy_block(content, "prb_result", prb_r_lines)

    # ── project_result_report 새 행 추가 ──
    print("[9] project_result_report 행 추가 (22001-22002)")
    prr_lines = build_project_result_report_lines()
    content = insert_after_copy_block(content, "project_result_report", prr_lines)

    # ── maintenance_quotation 새 데이터 추가 ──
    print("[10] maintenance_quotation 행 추가 (31001-31003)")
    mq_lines = build_maintenance_quotation_lines()
    # maintenance_quotation의 COPY 블록: 기존 컬럼만 있으므로 새 컬럼을 포함한 별도 INSERT 방식 사용
    # 기존 COPY 블록은 컬럼이 (id, ... project_id) 이므로,
    # 새 데이터는 새 컬럼이 추가된 후에 삽입해야 합니다.
    # 새 데이터는 기존 COPY 블록 뒤에 별도의 COPY 블록으로 추가합니다.
    mq_copy_block = (
        "\n\n"
        "--\n"
        "-- Data for Name: maintenance_quotation (seed:v2 additions); Type: TABLE DATA; Schema: public; Owner: -\n"
        "--\n\n"
        "COPY public.maintenance_quotation (id, created_at, created_by, deleted, deleted_at, deleted_by, "
        "updated_at, updated_by, project_id, ref_no, quotation_date, payment_terms, total_amount, "
        "start_date, end_date, sp_maintenance_cost, monthly_supply_price, total_quotation_amount, "
        "special_notes) FROM stdin;\n"
        + "\n".join(mq_lines)
        + "\n\\.\n"
    )
    # 기존 maintenance_quotation \. 다음에 삽입
    mq_pattern = r'(COPY public\.maintenance_quotation \([^)]+\) FROM stdin;\n.*?\n\\\.)'
    mq_match = re.search(mq_pattern, content, re.DOTALL)
    if mq_match:
        content = content[:mq_match.end()] + mq_copy_block + content[mq_match.end():]
    else:
        print("  [WARN] maintenance_quotation COPY 블록 미발견, 파일 끝에 추가")
        content += mq_copy_block

    # ── 시퀀스 업데이트 추가 ──
    print("[11] 시퀀스 업데이트 추가")
    dump_complete_marker = "-- PostgreSQL database dump complete"
    content = content.replace(
        f"--\n{dump_complete_marker}\n",
        SEQUENCE_UPDATES + f"\n--\n{dump_complete_marker}\n"
    )

    # ── 출력 파일 저장 ──
    print(f"[12] 출력 파일 저장: {OUTPUT_FILE}")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(content)

    # 검증
    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        out_content = f.read()

    pm_count = out_content.count("seed:v2") - out_content.count("CREATED_BY")  # 근사치
    line_count = out_content.count("\n")
    print(f"\n[완료] 출력 파일 라인 수: {line_count:,}")

    # 주요 ID 존재 여부 확인
    checks = [
        ("95001", "product_module 95001"),
        ("95132", "product_module 95132"),
        ("13001", "sales_activity 13001"),
        ("13020", "sales_activity 13020"),
        ("16001", "quotation 16001"),
        ("16006", "quotation 16006"),
        ("16101", "quotation_solution_item 16101"),
        ("17001", "prb 17001"),
        ("17006", "prb 17006"),
        ("18001", "prb_result 18001"),
        ("18006", "prb_result 18006"),
        ("22001", "project_result_report 22001"),
        ("22002", "project_result_report 22002"),
        ("31001", "maintenance_quotation 31001"),
        ("31003", "maintenance_quotation 31003"),
        ("MQ-20260110-001", "maintenance_quotation ref_no"),
        ("Q-20260120-001", "quotation code"),
        ("ALTER TABLE maintenance_quotation", "maintenance DDL"),
        ("CREATE TABLE IF NOT EXISTS maintenance_service_info", "maintenance_service_info DDL"),
        ("CREATE TABLE IF NOT EXISTS maintenance_amount_reason", "maintenance_amount_reason DDL"),
    ]
    print("\n[검증]")
    all_ok = True
    for key, desc in checks:
        found = key in out_content
        status = "OK" if found else "MISSING"
        if not found:
            all_ok = False
        print(f"  {status:7s} {desc}")

    if all_ok:
        print("\n모든 검증 항목 통과!")
    else:
        print("\n일부 항목 누락 - 로그를 확인하세요.")

    return all_ok


if __name__ == "__main__":
    success = process()
    import sys
    sys.exit(0 if success else 1)
