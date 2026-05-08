export type ProductClassification = Record<string, Record<string, string[]>>;

export const productData: ProductClassification = {
  EMS: {
    Framework: [
      "POLESTAR Single Manager"
    ],
    SMS: [
      "POLESTAR Server Management for Unix",
      "POLESTAR Server Management for Windows/Linux"
    ],
    VMM_Guest: [
      "POLESTAR Guest O/S for Windows",
      "POLESTAR Guest O/S for Linux"
    ],
    VMM_Host: [
      "POLESTAR Host O/S for VMware",
      "POLESTAR Host O/S for Hyper-V",
      "POLESTAR Host O/S for OpenStack"
    ],
    NMS: [
      "POLESTAR Network Management",
      "POLESTAR Network Alive Management"
    ],
    TMS: [
      "POLESTAR Traffic Management"
    ],
    DPM: [
      "POLESTAR DPM for Oracle",
      "POLESTAR DPM for MS-SQL",
      "POLESTAR DPM for Sybase",
      "POLESTAR DPM for Tibero",
      "POLESTAR DPM for Uni/SQL",
      "POLESTAR DPM for Informix",
      "POLESTAR DPM for DB2",
      "POLESTAR DPM"
    ],
    WPM: [
      "POLESTAR WPM for Websphere",
      "POLESTAR WPM for Weblogic",
      "POLESTAR WPM for JEUS",
      "POLESTAR WPM"
    ],
    APM: [
      "POLESTAR Web Performance Probe",
      "Web Application Performance Manager",
      "POLESTAR Active Agent ( URL )"
    ],
    SAP: [
      "POLESTAR SAP Management Manager",
      "POLESTAR SAP Management"
    ],
    FMS: [
      "POLESTAR FMS Manager",
      "항온항습기(HAVC) Agent",
      "UPS Agent",
      "누수 Agent",
      "MM Agent",
      "소방 Agent",
      "영상 Agent",
      "데이터수집장치",
      "온습도센서",
      "누수센서 1식",
      "구축 공사, 시운전 교육"
    ],
    Dashboard: [
      "POLESTAR Standard Dashboard",
      "POLESTAR Advanced Dashboard"
    ]
  },
  Dashboard: {
    POLESTAR_Dashboard: [
      "POLESTAR Dashboard Manager",
      "POLESTAR Dashboard Premium View",
      "POLESTAR Dashboard Adapter"
    ]
  },
  상면관리: {
    POLESTAR_상면관리: [
      "POLESTAR Rack Management (상면관리, 2D)",
      "POLESTAR Datacenter Operation Management Suite(2D 2.5D)"
    ]
  },
  RCA: {
    POLESTAR_RCA: [
      "POLESTAR RCA Manager",
      "POLESTAR RCA Adapter"
    ]
  },
  DCA: {
    AutomationSuite: [
      "POLESTAR Automation Manager",
      "POLESTAR Automation Server Agent",
      "POLESTAR Automation Network Agent"
    ]
  },
  ITSM: {
    Portal: [
      "POLESTAR IT Service Portal"
    ],
    CMDB: [
      "POLESTAR CMDB(Configuration management DB)",
      "Configuration UI Generator (원장 화면 자동생성기)"
    ],
    BPM: [
      "POLESTAR Process Designer",
      "POLESTAR Form Designer"
    ],
    wDesk_ServiceSupport: [
      "POLESTAR Service Desk Management",
      "POLESTAR wDesk Request Management",
      "POLESTAR wDesk Incident Management",
      "POLESTAR wDesk Problem Management",
      "POLESTAR wDesk Change Management",
      "POLESTAR wDesk Configuration Management",
      "POLESTAR wDesk Release Management"
    ],
    wDesk_ServiceDelivery: [
      "POLESTAR wDesk Capacity Management",
      "POLESTAR wDesk Availability Management",
      "POLESTAR Business Continuity Management(BCM, 서비스연속성관리)",
      "POLESTAR Service Level Management"
    ],
    ApplicationManagement: [
      "Version Control Management(형상관리)",
      "Deploy Management (배포관리)",
      "Code Inspect Management",
      "Test Scenario Manaement(테스트 시나리오관리)"
    ],
    PMS: [
      "POLESTAR Project Planning Management (프로젝트 계획관리)",
      "POLESTAR Project Progress Management (프로젝트 수행관리)",
      "POLESTAR Resource Management (프로젝트 자원관리)"
    ],
    Billing: [
      "POLESTAR Billing Enterprise  Framework",
      "POLESTAR Contract Administration & Management",
      "POLESTAR Unit Price Management",
      "Cost Distribution Manaement"
    ]
  },
  ITAM: {
    AMDB: [
      "POLESTAR AMDB(Asset management DB)"
    ],
    도입: [
      "Implementation project management (도입사업관리)",
      "Purchase Contract Manaement (구매계약관리)",
      "Installation inspection management (검수관리)"
    ],
    운영관리: [
      "Asset Operation management (운영관리)",
      "Asset Investigation Management (실사관리)",
      "Idle Assets Management (유휴관리)",
      "Reuse Asset Management (재사용관리)",
      "Asset Rental Management (대여관리)",
      "Asset Carry-in/out Management (반출입관리)"
    ],
    폐기관리: [
      "Unavailable Assets Management (불용관리)",
      "Selling/Disposal Assets Management (매각/폐기관리)"
    ],
    재무관리: [
      "Asset Depreciation Management (감가상각관리)"
    ],
    소프트웨어관리: [
      "SW Group Management (Server) 그룹관리(서버용)",
      "SW Group Management (End User Computing) 그룹관리(PC용)",
      "SW license Management (라이선스 할당/회수관리)",
      "SW Discovery Management (수집관리)"
    ],
    유지보수관리: [
      "Maintenance Contract Management (유지보수 계약관리)",
      "Maintenance Performance Management (유지보수 실적관리)"
    ],
    바코드_QR_RFID: [
      "바코드_QR_RFID"
    ],
    AutoDiscovery_optional: [
      "POLESTAR ITAM Manager",
      "POLESTAR Auto Discovery Agent",
      "POLESTAR Auto Discovery Node"
    ]
  },
  SupportingTools: {
    ReportingTool_비정형보고서: [
      "POLESTAR Report Manager (form 4개 기본 제공)",
      "for Additional Form"
    ]
  },
  CLOUD: {
    PCM: [
      "POLESTAR Public Cloud for EC2(EFS, VPC 포함)",
      "POLESTAR Public Cloud for Lambda",
      "POLESTAR Public Cloud for S3",
      "POLESTAR Public Cloud for RDS",
      "POLESTAR Public Cloud for DynamoDB",
      "POLESTAR Public Cloud for Direct Connect",
      "POLESTAR Public Cloud for Route 53",
      "POLESTAR Public Cloud for CloudFront",
      "POLESTAR Public Cloud for Amazon API Gateway",
      "POLESTAR Public Cloud for AWS Config",
      "POLESTAR Public Cloud for AWS CloudTrail",
      "POLESTAR Public Cloud for Auto Scailing Group",
      "POLESTAR Public Cloud for Billing"
    ],
    KCM: [
      "POLESTAR WorkNode for Kubernates",
      "POLESTAR WorkNode for Pivotal",
      "POLESTAR WorkNode for OpenShift"
    ]
  },
  BSM: {
    POLESTAR_BSM: [
      "POLESTAR Business Service Management"
    ]
  },
  E2E: {
    POLESTAR_E2E: [
      "POLESTAR E2E for Service"
    ],
    DataInterface_Optional: [
      "POLESTAR Data Adapter"
    ]
  },
  AIOTION: {
    WSS: [
      "MFL-센서",
      "센서 브라켓",
      "게이트웨이",
      "AIOTION IoT Framework for WSS",
      "AIOTION AI Analytics"
    ],
    GMS: [
      "AIOTION IoT Framework for GMS",
      "AIOTION RuleChain",
      "AIOTION Dashboard for GMS"
    ]
  }
};
