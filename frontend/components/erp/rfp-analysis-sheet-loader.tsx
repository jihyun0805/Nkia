"use client"

import dynamic from "next/dynamic"

const RfpAnalysisSheet = dynamic(
  () => import("@/components/erp/rfp-analysis-sheet").then((module) => module.RfpAnalysisSheet),
  {
    ssr: false,
    loading: () => (
      <div className="border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        RFP 분석 상세를 불러오는 중입니다.
      </div>
    ),
  },
)

type RfpAnalysisSheetLoaderProps = {
  requestId?: string
  title: string
  blankMode?: boolean
}

export function RfpAnalysisSheetLoader(props: RfpAnalysisSheetLoaderProps) {
  const title = props.requestId && !props.blankMode ? "RFP 분석 상세" : props.title
  return <RfpAnalysisSheet {...props} title={title} />
}
