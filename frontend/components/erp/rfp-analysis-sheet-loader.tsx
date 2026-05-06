"use client"

import dynamic from "next/dynamic"

const RfpAnalysisSheet = dynamic(
  () => import("@/components/erp/rfp-analysis-sheet").then((module) => module.RfpAnalysisSheet),
  { ssr: false },
)

type RfpAnalysisSheetLoaderProps = {
  requestId?: string
  title: string
  blankMode?: boolean
}

export function RfpAnalysisSheetLoader(props: RfpAnalysisSheetLoaderProps) {
  return <RfpAnalysisSheet {...props} />
}
