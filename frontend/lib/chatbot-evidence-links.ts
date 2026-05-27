// 인수인계 메모: 근거 문서 이동 링크 매퍼입니다. AI evidence 메타데이터를 실제 ERP 화면 URL로 변환합니다.
// 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
"use client"

import type { ChatbotEvidence } from "@/lib/chatbot-api"

export type EvidenceNavigationLink = {
  href: string
  label: string
}

type NumericRouteOptions = {
  metadataKeys?: string[]
  sourcePrefixes?: string[]
  includeDbPk?: boolean
}

const SOURCE_TAB_LINKS: Record<string, EvidenceNavigationLink> = {
  MAINTENANCE: { href: "/maintenance?tab=free", label: "유지보수 탭 열기" },
  MAINTENANCE_QUOTE: { href: "/contract?tab=maintenance", label: "유지보수 탭 열기" },
  MAINTENANCE_QUOTATION: { href: "/contract?tab=maintenance", label: "유지보수 탭 열기" },
  CUSTOMER_SUPPORT: { href: "/maintenance?tab=support", label: "고객지원 탭 열기" },
  MODULE: { href: "/activity/standard-pricing", label: "표준 단가 열기" },
}

const SOURCE_TYPE_ALIASES: Record<string, string> = {
  견적서: "QUOTATION",
  사업기회: "PROJECT_OPPORTUNITY",
  "고객/협력사": "COMPANY",
  담당자: "CONTACT",
  첨부파일: "ATTACHMENT",
  계약: "CONTRACT",
  라이선스: "LICENSE",
  프로젝트: "PROJECT",
  청구: "BILLING",
  사후영업: "POST_SALES",
  유지보수: "MAINTENANCE",
  고객지원: "CUSTOMER_SUPPORT",
  "유지보수 견적": "MAINTENANCE_QUOTE",
  모듈: "MODULE",
}

export function buildEvidenceNavigationLink(evidence: ChatbotEvidence): EvidenceNavigationLink | null {
  return buildEvidenceNavigationLinkInternal(evidence, 0)
}

function buildEvidenceNavigationLinkInternal(
  evidence: ChatbotEvidence,
  depth: number,
): EvidenceNavigationLink | null {
  const sourceType = normalizeSourceType(evidence.sourceType)

  if (sourceType === "ATTACHMENT" && depth < 2) {
    // 첨부파일 근거는 직접 상세 화면이 없으므로 parent/root 문서로 한 번 더 매핑한다.
    const parentSourceType = firstMetadataText(evidence, ["parentSourceType", "rootSourceType"])
    const parentSourceId = firstMetadataText(evidence, ["parentSourceId", "rootSourceId"])
    if (parentSourceType && parentSourceId) {
      return buildEvidenceNavigationLinkInternal(
        {
          ...evidence,
          sourceType: parentSourceType,
          sourceId: parentSourceId,
        },
        depth + 1,
      )
    }
    return null
  }

  if (sourceType === "PROJECT_OPPORTUNITY" || sourceType === "OPPORTUNITY") {
    // 사업기회는 숫자 id보다 opportunityCode 라우팅을 우선 사용한다.
    const id = firstMetadataText(evidence, ["opportunityCode", "rootOpportunityCode"]) ?? evidence.sourceId
    return detailLink(`/finding/opportunities/${encodePath(id)}?tab=opportunities`, "사업기회 화면 열기")
  }

  if (sourceType === "COMPANY") {
    const companyType = firstMetadataText(evidence, ["companyType", "customerType"])?.toUpperCase()
    const category = companyType === "PARTNER" || companyType === "SOLUTION" ? "partners" : "customers"
    const id = firstMetadataText(evidence, ["companyCode", "customerCode"]) ?? evidence.sourceId
    return detailLink(`/finding/${category}/${encodePath(id)}?tab=${category}`, "회사 화면 열기")
  }

  if (sourceType === "CONTACT") {
    const customerId = firstMetadataText(evidence, ["companyCode", "customerCode"])
    if (customerId) {
      return detailLink(`/finding/customers/${encodePath(customerId)}?tab=customers`, "고객사 화면 열기")
    }
    return tabLink("/finding?tab=customers", "고객사 탭 열기")
  }

  if (sourceType === "SALES_ACTIVITY" || sourceType === "POST_SALES") {
    const id = numericRouteId(evidence, { metadataKeys: ["activityId"], sourcePrefixes: ["ACTIVITY-"] })
    return id
      ? detailLink(`/activity/activities/${id}?tab=activities`, "영업활동 화면 열기")
      : tabLink("/activity?tab=activities", "활동 현황 탭 열기")
  }

  if (sourceType === "QUOTATION") {
    const id = numericRouteId(evidence, { metadataKeys: ["quotationId"], sourcePrefixes: ["QUOTATION-"] })
    return id
      ? detailLink(`/activity/quotations/${id}?tab=quotations`, "견적서 화면 열기")
      : tabLink("/activity?tab=quotations", "견적 관리 탭 열기")
  }

  if (sourceType === "RFP" || sourceType === "RFP_ANALYSIS") {
    const id = numericRouteId(evidence, {
      metadataKeys: ["rfpAnalyzeResultId"],
      sourcePrefixes: ["RFP-ANALYSIS-", "RFP-"],
    })
    return id ? detailLink(`/bid/rfp/${id}?tab=rfp`, "RFP 분석 화면 열기") : tabLink("/bid?tab=rfp", "RFP 분석 탭 열기")
  }

  if (sourceType === "PRB") {
    const id = numericRouteId(evidence, { metadataKeys: ["prbId"], sourcePrefixes: ["PRB-"] })
    return id ? detailLink(`/bid/prb/${id}?tab=prb`, "PRB 화면 열기") : tabLink("/bid?tab=prb", "PRB 탭 열기")
  }

  if (sourceType === "PRB_RESULT") {
    const id = numericRouteId(evidence, { metadataKeys: ["prbResultId"], sourcePrefixes: ["PRBR-", "PRB-RESULT-"] })
    return id
      ? detailLink(`/bid/prb-result/${id}?tab=prb-result`, "PRB 결과 화면 열기")
      : tabLink("/bid?tab=prb-result", "PRB 결과 탭 열기")
  }

  if (sourceType === "PROPOSAL") {
    const id = numericRouteId(evidence, { metadataKeys: ["proposalId"], sourcePrefixes: ["PROPOSAL-"] })
    return id
      ? detailLink(`/bid/proposal/${id}?tab=proposal`, "제안서 화면 열기")
      : tabLink("/bid?tab=proposal", "제안서 탭 열기")
  }

  if (sourceType === "BID_RESULT" || sourceType === "LOST") {
    const id = numericRouteId(evidence, { metadataKeys: ["bidResultId"], sourcePrefixes: ["BID-", "BID-RESULT-"] })
    return id
      ? detailLink(`/bid/result/${id}?tab=result`, "입찰 결과 화면 열기")
      : tabLink("/bid?tab=result", "입찰 결과 탭 열기")
  }

  if (sourceType === "ORDER_REPORT" || sourceType === "WON") {
    const id = numericRouteId(evidence, { metadataKeys: ["orderReportId"], sourcePrefixes: ["ORDER-REPORT-", "WON-"] })
    return id
      ? detailLink(`/contract/orders/${id}?tab=orders`, "수주보고 화면 열기")
      : tabLink("/contract?tab=orders", "수주보고 탭 열기")
  }

  if (sourceType === "CONTRACT") {
    const id = numericRouteId(evidence, { metadataKeys: ["contractId"], sourcePrefixes: ["CONTRACT-"] })
    return id
      ? detailLink(`/contract/contracts/${id}?tab=contracts`, "계약 화면 열기")
      : tabLink("/contract?tab=contracts", "계약 탭 열기")
  }

  if (sourceType === "LICENSE") {
    const id = numericRouteId(evidence, { metadataKeys: ["licenseId"], sourcePrefixes: ["LICENSE-"] })
    return id
      ? detailLink(`/contract/licenses/${id}?tab=licenses`, "라이선스 화면 열기")
      : tabLink("/contract?tab=licenses", "라이선스 탭 열기")
  }

  if (sourceType === "PROJECT") {
    const id = numericRouteId(evidence, { metadataKeys: ["projectId"], sourcePrefixes: ["PROJECT-"] })
    return id ? detailLink(`/project/results/${id}?tab=results`, "사업 화면 열기") : tabLink("/project?tab=results", "사업 탭 열기")
  }

  if (sourceType === "PROJECT_RESULT_REPORT") {
    const id = numericRouteId(evidence, {
      metadataKeys: ["projectId"],
      sourcePrefixes: ["PROJECT-"],
      includeDbPk: false,
    })
    return id
      ? detailLink(`/project/results/${id}?tab=results`, "결과보고 화면 열기")
      : tabLink("/project?tab=results", "결과보고 탭 열기")
  }

  if (sourceType === "BILLING") {
    const id = numericRouteId(evidence, { metadataKeys: ["billingId"], sourcePrefixes: ["BILLING-"] })
    return id
      ? detailLink(`/project/billingAndCollection/${id}?tab=billingAndCollection`, "청구 화면 열기")
      : tabLink("/project?tab=billingAndCollection", "청구 및 수금 탭 열기")
  }

  return SOURCE_TAB_LINKS[sourceType] ?? null
}

function detailLink(href: string, label: string): EvidenceNavigationLink {
  return { href, label }
}

function tabLink(href: string, label: string): EvidenceNavigationLink {
  return { href, label }
}

function numericRouteId(evidence: ChatbotEvidence, options: NumericRouteOptions): string | null {
  // 대부분의 상세 페이지는 숫자 PK 라우트라서 metadata → dbPk → sourceId 순서로 숫자 후보를 찾는다.
  const metadataKeys = options.metadataKeys ?? []
  const candidates = [
    ...metadataKeys.map((key) => firstMetadataText(evidence, [key])),
    options.includeDbPk === false ? null : firstMetadataText(evidence, ["dbPk"]),
  ]

  for (const candidate of candidates) {
    const numeric = numericText(candidate)
    if (numeric) return numeric
  }

  const sourceId = numericText(evidence.sourceId)
  if (sourceId) return sourceId

  for (const prefix of options.sourcePrefixes ?? []) {
    const numeric = numericTextAfterPrefix(evidence.sourceId, prefix)
    if (numeric) return numeric
  }

  return null
}

function firstMetadataText(evidence: ChatbotEvidence, keys: string[]) {
  const metadata = evidence.metadata ?? {}
  for (const key of keys) {
    const value = metadata[key]
    const text = valueToText(value)
    if (text) return text
  }
  return null
}

function valueToText(value: unknown) {
  if (typeof value === "string") return value.trim() || null
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value))
  return null
}

function numericText(value: string | null | undefined) {
  const text = value?.trim()
  if (!text || !/^\d+$/.test(text)) return null
  return text
}

function numericTextAfterPrefix(value: string | null | undefined, prefix: string) {
  const text = value?.trim()
  if (!text || !text.toUpperCase().startsWith(prefix.toUpperCase())) return null
  return numericText(text.slice(prefix.length))
}

function encodePath(value: string) {
  return encodeURIComponent(value.trim())
}

function normalizeSourceType(sourceType: string) {
  const trimmed = sourceType.trim()
  return SOURCE_TYPE_ALIASES[trimmed] ?? trimmed.toUpperCase()
}
