/**
 * Hangul/Roman aware fuzzy matching for form autocomplete.
 *
 * 사용 예: 사용자가 "엘지기업"을 치면 "LG / lg / 엘지 / 엘쥐" 모두 후보로 잡힘.
 * - 한영 변환은 자주 쓰는 회사명/약어 사전 기반.
 * - 공백·기호·대소문자·NFD 분해는 모두 정규화.
 * - 자모 초성도 후보에 포함 ("ㅋㅋㅇㅂ" → "카카오뱅크" 류).
 */

const HANGUL_ROMAN_DICT: Record<string, string[]> = {
  // 영문 약어 ↔ 한글 발음 (양방향)
  lg: ["엘지", "엘쥐"],
  엘지: ["lg"],
  엘쥐: ["lg", "엘지"],
  sk: ["에스케이"],
  에스케이: ["sk"],
  kt: ["케이티"],
  케이티: ["kt"],
  ktdg: ["케이티디지코"],
  kb: ["케이비", "국민"],
  케이비: ["kb"],
  nh: ["엔에이치", "농협"],
  엔에이치: ["nh"],
  ibk: ["아이비케이", "기업"],
  아이비케이: ["ibk"],
  bnk: ["비엔케이"],
  비엔케이: ["bnk"],
  dgb: ["디지비"],
  디지비: ["dgb"],
  ku: ["케이유"],
  케이유: ["ku"],
  cj: ["씨제이"],
  씨제이: ["cj"],
  hd: ["에이치디", "현대"],
  현대: ["hyundai", "hd"],
  hyundai: ["현대"],
  samsung: ["삼성"],
  삼성: ["samsung"],
  lotte: ["롯데"],
  롯데: ["lotte"],
  hana: ["하나"],
  하나: ["hana"],
  shinhan: ["신한"],
  신한: ["shinhan"],
  woori: ["우리"],
  우리: ["woori"],
  kakao: ["카카오"],
  카카오: ["kakao"],
  naver: ["네이버"],
  네이버: ["naver"],
  poscoceo: ["포스코"],
  포스코: ["posco"],
  posco: ["포스코"],
  // 흔한 접미어
  주식회사: ["회사", ""],
  회사: ["주식회사", ""],
  기업: [""],
  그룹: [""],
  코퍼레이션: ["corp", ""],
  corp: ["코퍼레이션", ""],
  inc: [""],
  ltd: [""],
  컴퍼니: ["co", ""],
  co: ["컴퍼니", ""],
}

/** 입력값의 의미 없는 기호·공백 제거 + 소문자 + NFKC. */
export function normalizeForMatch(value: string): string {
  if (!value) return ""
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_.,()/&]+/g, "")
}

/** 한글 음절을 초성 자모 1글자로 분리. (가→ㄱ, 카→ㅋ) */
const HANGUL_BASE = 0xac00
const HANGUL_END = 0xd7a3
const CHOSEONG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ",
  "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const

export function toChoseong(value: string): string {
  let out = ""
  for (const ch of value) {
    const code = ch.charCodeAt(0)
    if (code >= HANGUL_BASE && code <= HANGUL_END) {
      const idx = Math.floor((code - HANGUL_BASE) / (21 * 28))
      out += CHOSEONG[idx]
    } else {
      out += ch
    }
  }
  return out
}

/**
 * 한 단어에 대해 사전 치환을 적용해 가능한 변형들을 반환.
 * 큰 사전이 아니라 짧은 키워드(2~5자) 기준으로 부분 치환.
 */
function expandWithDictionary(value: string): Set<string> {
  const variants = new Set<string>([value])
  for (const [from, tos] of Object.entries(HANGUL_ROMAN_DICT)) {
    if (!value.includes(from)) continue
    for (const to of tos) {
      const replaced = value.split(from).join(to)
      if (replaced.length > 0 && replaced !== value) {
        variants.add(replaced)
      }
    }
  }
  return variants
}

/** 한 문자열에서 매칭에 사용할 모든 정규화 변형들을 만든다. */
export function buildMatchKeys(value: string): string[] {
  const base = normalizeForMatch(value)
  if (!base) return []
  const dictExpanded = expandWithDictionary(base)
  const keys = new Set<string>()
  for (const v of dictExpanded) {
    if (v) keys.add(v)
  }
  // 초성 키도 추가 (한글이 포함된 경우만 의미 있음)
  const choseong = toChoseong(base)
  if (choseong && choseong !== base) {
    keys.add(choseong)
  }
  return Array.from(keys)
}

export type FuzzyMatchKind = "exact" | "prefix" | "contains" | "choseong" | "loose"

export type FuzzyHit<T> = {
  item: T
  score: number
  kind: FuzzyMatchKind
}

/**
 * 후보 리스트에 대해 query와의 유사도를 계산해 매치된 항목만 점수 내림차순으로 반환.
 *
 * @param query        사용자가 입력한 문자열
 * @param items        검사 대상 객체 배열
 * @param getCandidates 한 객체에서 매칭에 쓸 문자열들(이름, 별칭, 코드 등)을 반환
 * @param limit        최대 반환 개수 (기본 10)
 */
export function fuzzyMatch<T>(
  query: string,
  items: T[],
  getCandidates: (item: T) => Array<string | null | undefined>,
  limit = 10,
): FuzzyHit<T>[] {
  const queryKeys = buildMatchKeys(query)
  if (queryKeys.length === 0) return []

  const queryChoseong = toChoseong(normalizeForMatch(query))
  const hits: FuzzyHit<T>[] = []

  for (const item of items) {
    const rawCandidates = getCandidates(item).filter((c): c is string => Boolean(c && c.trim()))
    if (rawCandidates.length === 0) continue

    let bestScore = 0
    let bestKind: FuzzyMatchKind = "loose"
    let matched = false

    for (const candidate of rawCandidates) {
      const candidateKeys = buildMatchKeys(candidate)
      for (const ck of candidateKeys) {
        for (const qk of queryKeys) {
          if (!qk) continue
          if (ck === qk) {
            if (bestScore < 100) { bestScore = 100; bestKind = "exact" }
            matched = true
            continue
          }
          if (ck.startsWith(qk) || qk.startsWith(ck)) {
            const score = qk.length >= 2 ? 80 : 60
            if (score > bestScore) { bestScore = score; bestKind = "prefix" }
            matched = true
            continue
          }
          if (ck.includes(qk) || (qk.length >= 2 && qk.includes(ck))) {
            const score = 50 + Math.min(qk.length, 10)
            if (score > bestScore) { bestScore = score; bestKind = "contains" }
            matched = true
          }
        }
        // 초성 매칭 (쿼리 자체가 자모일 때)
        if (queryChoseong && queryChoseong.length >= 2 && /^[ㄱ-ㅎ]+$/.test(queryChoseong)) {
          const ckChoseong = toChoseong(ck)
          if (ckChoseong.includes(queryChoseong)) {
            if (bestScore < 40) { bestScore = 40; bestKind = "choseong" }
            matched = true
          }
        }
      }
    }

    if (matched) {
      hits.push({ item, score: bestScore, kind: bestKind })
    }
  }

  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, limit)
}

/** 단순 boolean 매치: 어떤 변형으로든 contain되면 true. */
export function fuzzyContains(query: string, candidate: string): boolean {
  const queryKeys = buildMatchKeys(query)
  const candidateKeys = buildMatchKeys(candidate)
  for (const qk of queryKeys) {
    for (const ck of candidateKeys) {
      if (ck.includes(qk) || qk.includes(ck)) return true
    }
  }
  return false
}
