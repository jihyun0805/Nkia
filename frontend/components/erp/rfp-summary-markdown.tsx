type SummarySection = {
  title: string
  items: string[]
}

const SUMMARY_SECTION_TITLES = new Set([
  "사업기회 요약",
  "사업 개요",
  "사업 목적",
  "주요 구축 범위",
  "핵심 요구사항",
  "주요 리스크",
  "제안 전략 포인트",
  "추가 유의사항",
])

export function RfpSummaryMarkdown({ markdown }: { markdown: string }) {
  const sections = parseSummarySections(markdown)

  if (!sections.length) {
    return <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{markdown}</p>
  }

  return (
    <div className="space-y-4 text-sm leading-6">
      {sections.map((section) => (
        <section key={section.title} className="space-y-2">
          <h3 className="font-semibold text-foreground">{section.title}</h3>
          <ul className="ml-1 list-disc space-y-1 border-l border-border pl-6 text-muted-foreground">
            {section.items.map((item, index) => (
              <li key={`${section.title}-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function parseSummarySections(markdown: string): SummarySection[] {
  const sections: SummarySection[] = []
  let current: SummarySection | null = null

  const pushCurrent = () => {
    if (current && current.title) {
      sections.push(current)
    }
  }

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const heading = /^#{1,3}\s+(.+)$/.exec(line)
    if (heading || isSummarySectionTitle(line)) {
      pushCurrent()
      current = { title: normalizeTitle(heading ? heading[1] : line), items: [] }
      continue
    }

    const item = /^[-*]\s+(.+)$/.exec(line)
    if (item) {
      if (!current) current = { title: "\uc694\uc57d", items: [] }
      current.items.push(item[1].trim())
      continue
    }

    if (!current) current = { title: "\uc694\uc57d", items: [] }
    current.items.push(line)
  }

  pushCurrent()
  return sections
}

function normalizeTitle(title: string) {
  return title.replace(/[:\uFF1A]\s*$/, "").trim()
}

function isSummarySectionTitle(line: string) {
  return SUMMARY_SECTION_TITLES.has(normalizeTitle(line))
}
