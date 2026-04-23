const STATUS_GROUPS = [
  ["활성", "비활성"],
  ["진행중", "완료", "예정"],
  ["진행중", "종료", "종료예정", "미체결"],
  ["발행완료", "수금완료", "대기"],
  ["승인완료", "검토중", "승인", "반려"],
  ["전달완료", "수정요청", "접수대기"],
  ["요청", "접수완료"],
  ["분석완료", "분석중", "입수"],
  ["수주", "실주"],
  ["발굴", "유망", "진행중"],
  ["발급완료", "사용중", "만료"],
  ["계약체결", "견적서전달", "검토중"],
] as const

export function isStatusField(label: string) {
  return label.includes("상태")
}

export function getStatusOptions(currentValue: string) {
  const matchedGroup = STATUS_GROUPS.find((group) => group.includes(currentValue as never))
  if (matchedGroup) return [...matchedGroup]
  return currentValue ? [currentValue] : ["진행중", "완료", "예정"]
}
