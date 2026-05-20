"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useChatbotPrefill } from "@/lib/use-chatbot-prefill"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { UserIdPicker } from "@/components/erp/user-id-picker"
import { PrbRegistrationForm } from "@/components/erp/prb-registration-form"
import { toast } from "@/hooks/use-toast"
import { currentUser } from "@/lib/current-user"
import {
  getPrbById,
  getPrbResults,
  getPrbs,
  subscribePrbResultUpdates,
  subscribePrbUpdates,
  type PrbRecord,
  type PrbResultRecord,
} from "@/lib/bid-data"
import {
  deleteBackendPrbResult,
  loadBackendPrbResultHistoryRecord,
  loadBackendPrbResultHistoryRecords,
  loadBackendPrbResults,
  saveBackendPrbResult,
  type BackendPrbResultHistoryListItem,
} from "@/lib/prb-result-backend"
import { useBackendUsers } from "@/lib/use-backend-users"

type PrbResultRegistrationFormProps = {
  prbResultId?: string
  allowDelete?: boolean
}

type AttendeeOpinionForm = {
  participant: string
  opinion: string
  decision: string
}

type FormState = {
  prbId: string
  meetingDate: string
  location: string
  riskFactors: string
  attendeeOpinions: AttendeeOpinionForm[]
  overallOpinion: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeAttendeeOpinions(
  attendeeOpinions: AttendeeOpinionForm[] = [],
) {
  const next = attendeeOpinions.slice(0, 7).map((item) => ({
    participant: item.participant || "",
    opinion: item.opinion || "",
    decision: item.decision || "",
  }))

  while (next.length < 7) {
    next.push({
      participant: "",
      opinion: "",
      decision: "",
    })
  }

  return next
}

function createDefaultAttendees() {
  return normalizeAttendeeOpinions([])
}

function createEmptyForm(prb?: PrbRecord | null): FormState {
  return {
    prbId: "",
    meetingDate: today(),
    location: "",
    riskFactors: "",
    attendeeOpinions: createDefaultAttendees(),
    overallOpinion: "",
  }
}

function TableInput({
  value,
  onChange,
  readOnly = false,
  type = "text",
  placeholder,
  className = "",
}: {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  type?: "text" | "date"
  placeholder?: string
  className?: string
}) {
  return (
    <Input
      type={type}
      readOnly={readOnly}
      placeholder={placeholder}
      value={value}
      className={`h-10 rounded-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-0 ${className}`}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
    />
  )
}

function TableTextarea({
  value,
  onChange,
  rows = 3,
  readOnly = false,
  className = "",
}: {
  value: string
  onChange?: (value: string) => void
  rows?: number
  readOnly?: boolean
  className?: string
}) {
  return (
    <Textarea
      rows={rows}
      readOnly={readOnly}
      value={value}
      className={`min-h-0 resize-none rounded-none border-0 bg-transparent px-3 py-2 shadow-none focus-visible:ring-0 ${className}`}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
    />
  )
}

function createFormFromResult(result: PrbResultRecord, prb?: PrbRecord | null): FormState {
  return {
    prbId: result.prbId,
    meetingDate: result.meetingDate || result.createdDate,
    location: result.location || "",
    riskFactors: result.riskFactors || "",
    attendeeOpinions:
      result.attendeeOpinions.length > 0
        ? normalizeAttendeeOpinions(result.attendeeOpinions)
        : createDefaultAttendees(),
    overallOpinion: result.overallOpinion || "",
  }
}

export function PrbResultRegistrationForm({ prbResultId, allowDelete = false }: PrbResultRegistrationFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(createEmptyForm())
  const [selectedPrb, setSelectedPrb] = useState<PrbRecord | null>(null)
  const [selectionPrbs, setSelectionPrbs] = useState<PrbRecord[]>([])
  const [selectionOpen, setSelectionOpen] = useState(false)
  const [selectionValue, setSelectionValue] = useState("")
  const [validationMessage, setValidationMessage] = useState("")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [existingResult, setExistingResult] = useState<PrbResultRecord | null>(null)
  const [detailTab, setDetailTab] = useState("document")
  const [historyRecords, setHistoryRecords] = useState<BackendPrbResultHistoryListItem[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null)
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<PrbResultRecord | null>(null)
  const backendUsers = useBackendUsers()

  // 챗봇 create_draft (prb_result) prefill
  const { values: chatbotPrefill, hasPrefill: hasChatbotPrefill, clear: clearChatbotPrefill } = useChatbotPrefill()
  const prefillAppliedRef = useRef(false)
  useEffect(() => {
    if (!hasChatbotPrefill || prefillAppliedRef.current) return
    if (prbResultId) return
    prefillAppliedRef.current = true
    const slot = chatbotPrefill
    setForm((cur) => {
      const next: FormState = { ...cur, attendeeOpinions: [...cur.attendeeOpinions] }
      if (slot.result_meeting_date) next.meetingDate = slot.result_meeting_date
      if (slot.result_meeting_location) next.location = slot.result_meeting_location
      if (slot.result_summary) next.overallOpinion = slot.result_summary
      // participants: 콤마/세미콜론 분리해서 attendeeOpinions 의 participant 채움
      if (slot.participants) {
        const names = slot.participants
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean)
        next.attendeeOpinions = next.attendeeOpinions.map((item, idx) => ({
          ...item,
          participant: names[idx] || item.participant,
        }))
      }
      return next
    })
    if (slot.prb_report_reference) {
      setSelectionValue(slot.prb_report_reference)
    }
    const applied = Object.keys(slot).length
    if (applied > 0) {
      toast({ title: "챗봇이 PRB 결과 초안 prefill", description: `${applied}개 슬롯 반영 — 확인 후 저장하세요.` })
    }
    const id = window.setTimeout(() => clearChatbotPrefill(), 100)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChatbotPrefill])

  useEffect(() => {
    let cancelled = false

    const sync = () => {
      if (cancelled) return
      const allPrbs = getPrbs()
      const allResults = getPrbResults()
      const loadedResult = prbResultId ? getPrbResults().find((item) => item.id === prbResultId) ?? null : null
      setExistingResult(loadedResult)

      if (loadedResult) {
        const matchedPrb = getPrbById(loadedResult.prbId)
        setForm(createFormFromResult(loadedResult, matchedPrb))
        setSelectedPrb(matchedPrb)
        setSelectionPrbs([])
        setSelectionOpen(false)
        setSelectionValue(loadedResult.prbId)
        return
      }

      const registeredPrbIds = new Set(allResults.map((item) => item.prbId))
      const candidates = allPrbs
        .filter((item) => item.author === currentUser.name && item.status === "승인" && !registeredPrbIds.has(item.id))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

      setSelectionPrbs(candidates)

      if (candidates.length === 1) {
        const candidate = candidates[0]
        setSelectedPrb(candidate)
        setSelectionValue(candidate.id)
        setForm((current) => ({
          ...current,
          prbId: candidate.id,
          attendeeOpinions: normalizeAttendeeOpinions(current.attendeeOpinions),
        }))
        setSelectionOpen(false)
        return
      }

      if (candidates.length > 1) {
        setSelectedPrb(null)
        setSelectionValue((current) => current || candidates[0].id)
        setSelectionOpen(true)
        return
      }

      setSelectedPrb(null)
      setSelectionValue("")
      setForm(createEmptyForm())
    }

    sync()
    void loadBackendPrbResults().catch(() => undefined)
    const unsubscribePrb = subscribePrbUpdates(sync)
    const unsubscribeResult = subscribePrbResultUpdates(sync)
    return () => {
      cancelled = true
      unsubscribePrb()
      unsubscribeResult()
    }
  }, [prbResultId])

  useEffect(() => {
    let cancelled = false

    if (!prbResultId) {
      setHistoryRecords([])
      setSelectedHistoryId(null)
      setSelectedHistoryDetail(null)
      return () => {
        cancelled = true
      }
    }

    setHistoryRecords([])
    setSelectedHistoryId(null)
    setSelectedHistoryDetail(null)

    void loadBackendPrbResultHistoryRecords(prbResultId)
      .then((records) => {
        if (!cancelled) {
          setHistoryRecords(
            records
              .filter((record): record is BackendPrbResultHistoryListItem & { historyId: number; version: number } =>
                typeof record.historyId === "number" && typeof record.version === "number",
              )
              .sort((a, b) => (b.version ?? 0) - (a.version ?? 0)),
          )
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryRecords([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [prbResultId])

  useEffect(() => {
    let cancelled = false

    if (selectedHistoryId == null) {
      setSelectedHistoryDetail(null)
      if (existingResult) {
        const matchedPrb = getPrbById(existingResult.prbId)
        setForm(createFormFromResult(existingResult, matchedPrb))
        setSelectedPrb(matchedPrb)
      }
      return () => {
        cancelled = true
      }
    }

    void loadBackendPrbResultHistoryRecord(selectedHistoryId)
      .then((record) => {
        if (!cancelled) {
          const matchedPrb = getPrbById(record.prbId)
          setSelectedHistoryDetail(record)
          setForm(createFormFromResult(record, matchedPrb))
          setSelectedPrb(matchedPrb)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedHistoryDetail(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedHistoryId, existingResult])

  const appliedPrb = useMemo(
    () => selectedPrb ?? (form.prbId ? getPrbById(form.prbId) : null),
    [form.prbId, selectedPrb],
  )
  const historyRows = historyRecords.map((item) => ({
    key: `backend:${item.historyId}`,
    historyId: item.historyId,
    versionLabel: `v${item.version ?? ""}`,
    documentDate: (item.createdAt ?? "").slice(0, 10),
    documentCode: item.prbResultId != null ? String(item.prbResultId) : String(item.historyId ?? ""),
  }))
  const attendeeUsers = useMemo(
    () => {
      const safeUsers = Array.isArray(backendUsers) ? backendUsers : []
      return [currentUser, ...safeUsers.filter((user) => user.id !== currentUser.id)]
    },
    [backendUsers],
  )

  const applyPrb = (prb: PrbRecord) => {
    setSelectedPrb(prb)
    setSelectionValue(prb.id)
      setForm((current) => ({
        ...current,
        prbId: prb.id,
        meetingDate: current.meetingDate || prb.createdDate,
        attendeeOpinions: normalizeAttendeeOpinions(current.attendeeOpinions),
      }))
  }

  const updateAttendee = (index: number, field: keyof AttendeeOpinionForm, value: string) => {
    setForm((current) => ({
      ...current,
      attendeeOpinions: current.attendeeOpinions.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }))
  }

  const handleSave = async () => {
    if (!appliedPrb) {
      setValidationMessage("결과보고 대상 PRB 보고서를 먼저 선택해주십시오.")
      return
    }

    try {
      const saved = await saveBackendPrbResult({
        id: prbResultId,
        prbId: appliedPrb.id,
        customerCode: appliedPrb.customerCode,
        customer: appliedPrb.customer,
        opportunityCode: appliedPrb.opportunityCode,
        opportunity: appliedPrb.opportunity,
        proposalDeadline: appliedPrb.proposalDeadline,
        createdDate: existingResult?.createdDate ?? today(),
        author: currentUser.name,
        meetingDate: form.meetingDate,
        location: form.location,
        riskFactors: form.riskFactors,
        attendeeOpinions: form.attendeeOpinions,
        overallOpinion: form.overallOpinion,
      })

      toast({
        title: "PRB 결과보고 저장 완료",
        description: "PRB 결과보고가 저장되었습니다.",
      })

      router.push(`/bid/prb-result/${saved.id}`)
    } catch (error) {
      toast({
        title: "PRB 결과보고 저장 실패",
        description: error instanceof Error ? error.message : "PRB 결과보고를 저장하지 못했습니다.",
      })
    }
  }

  const handleDelete = async () => {
    if (!prbResultId) return

    try {
      await deleteBackendPrbResult(prbResultId)
      toast({
        title: "PRB 결과보고 삭제 완료",
        description: "PRB 결과보고가 삭제되었습니다.",
      })
      setIsDeleteOpen(false)
      router.push("/bid")
    } catch (error) {
      toast({
        title: "PRB 결과보고 삭제 실패",
        description: error instanceof Error ? error.message : "PRB 결과보고를 삭제하지 못했습니다.",
      })
      setIsDeleteOpen(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{prbResultId ? "PRB 결과 수정" : "PRB 결과 등록"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <Tabs value={detailTab} onValueChange={setDetailTab} className="space-y-6">
              <TabsList>
                <TabsTrigger value="document">PRB 결과</TabsTrigger>
                <TabsTrigger value="history">변경 이력</TabsTrigger>
              </TabsList>
              <TabsContent value="document" className="mt-0 space-y-8">
                {selectedHistoryDetail && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedHistoryId(null)
                        setSelectedHistoryDetail(null)
                      }}
                    >
                      현재 버전 보기
                    </Button>
                  </div>
                )}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">1. PRB 보고서</h3>
                <p className="text-sm text-muted-foreground">승인 완료된 PRB 보고서를 불러와 결과보고의 기준 문서로 사용합니다.</p>
              </div>
              {!prbResultId && selectionPrbs.length > 1 && (
                <Button type="button" variant="outline" onClick={() => setSelectionOpen(true)}>
                  PRB 보고서 선택
                </Button>
              )}
            </div>

            {!appliedPrb ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                {selectionPrbs.length === 0
                  ? "로그인한 영업대표 기준으로 승인 완료되었고 아직 결과보고가 작성되지 않은 PRB 보고서가 없습니다."
                  : "결과보고를 작성할 PRB 보고서를 선택해주십시오."}
              </div>
            ) : (
              <PrbRegistrationForm prbId={appliedPrb.id} documentOnly readOnly />
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">2. PRB 결과</h3>
              <p className="text-sm text-muted-foreground">일시, 장소, 참석자, 결과를 자유 입력합니다.</p>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-[920px] w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-[100px]" />
                  <col className="w-[160px]" />
                  <col className="w-[420px]" />
                  <col className="w-[104px]" />
                </colgroup>
                <tbody>
                  <tr>
                    <th colSpan={4} className="border border-slate-400 px-3 py-3 text-center text-3xl font-bold">
                      PRB 결과 보고서
                    </th>
                  </tr>
                  <tr>
                    <th className="border border-slate-400 bg-slate-50 px-3 py-2 text-center font-semibold">일시</th>
                    <td colSpan={3} className="border border-slate-400">
                      <TableInput
                        type="date"
                        value={form.meetingDate}
                        onChange={(value) => setForm((current) => ({ ...current, meetingDate: value }))}
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className="border border-slate-400 bg-slate-50 px-3 py-2 text-center font-semibold">장소</th>
                    <td colSpan={3} className="border border-slate-400">
                      <TableInput value={form.location} onChange={(value) => setForm((current) => ({ ...current, location: value }))} />
                    </td>
                  </tr>
                  <tr>
                    <th className="border border-slate-400 bg-slate-50 px-3 py-2 text-center font-semibold">리스크 요인</th>
                    <td colSpan={3} className="border border-slate-400">
                      <TableTextarea value={form.riskFactors} onChange={(value) => setForm((current) => ({ ...current, riskFactors: value }))} rows={5} />
                    </td>
                  </tr>
                  {form.attendeeOpinions.map((item, index) => (
                    <tr key={`attendee-${index}`}>
                      {index === 0 && (
                        <th rowSpan={7} className="border border-slate-400 bg-slate-50 px-3 py-2 text-center font-semibold">
                          참석자 의견
                        </th>
                      )}
                      <td className="border border-slate-400 px-2 py-1">
                        <UserIdPicker
                          value={item.participant}
                          users={attendeeUsers}
                          onValueChange={(value) => updateAttendee(index, "participant", value)}
                          placeholder="사용자를 선택하세요"
                        />
                      </td>
                      <td className="border border-slate-400 px-2">
                        <TableInput
                          value={item.opinion}
                          onChange={(value) => updateAttendee(index, "opinion", value)}
                          placeholder="의견을 입력하세요"
                        />
                      </td>
                      <td className="border border-slate-400 px-2">
                        <Select value={item.decision || "미정"} onValueChange={(value) => updateAttendee(index, "decision", value === "미정" ? "" : value)}>
                          <SelectTrigger className="border-0 shadow-none focus:ring-0">
                            <SelectValue placeholder="찬/반" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="미정">미정</SelectItem>
                            <SelectItem value="찬성">찬성</SelectItem>
                            <SelectItem value="반대">반대</SelectItem>
                            <SelectItem value="조건부">조건부</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <th colSpan={2} className="border border-slate-400 bg-slate-50 px-3 py-2 text-center font-semibold">종합 의견</th>
                    <td colSpan={2} className="border border-slate-400">
                      <TableTextarea value={form.overallOpinion} onChange={(value) => setForm((current) => ({ ...current, overallOpinion: value }))} rows={6} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

              </TabsContent>
              <TabsContent value="history" className="mt-0">
                <div className="rounded-lg border">
                  <table className="w-full table-fixed border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-center font-semibold">
                        <th className="border-b border-r px-3 py-3">버전</th>
                        <th className="border-b border-r px-3 py-3">등록일자</th>
                        <th className="border-b border-r px-3 py-3">PRB 결과 코드</th>
                        <th className="border-b px-3 py-3">보기</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.length > 0 ? (
                        historyRows.map((entry) => (
                          <tr key={entry.key}>
                            <td className="border-r border-t px-3 py-3 text-center">{entry.versionLabel}</td>
                            <td className="border-r border-t px-3 py-3 text-center">{entry.documentDate}</td>
                            <td className="border-r border-t px-3 py-3 text-center">{entry.documentCode}</td>
                            <td className="border-t px-3 py-3 text-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (typeof entry.historyId !== "number") return
                                  setSelectedHistoryId(entry.historyId)
                                  setDetailTab("document")
                                }}
                              >
                                보기
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                            변경 이력이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>

          {!selectedHistoryDetail && (
          <div className="flex justify-end gap-2 border-t pt-6">
            <Button variant="outline" asChild>
              <Link href={prbResultId ? `/bid/prb-result/${prbResultId}` : "/bid"}>취소</Link>
            </Button>
            {allowDelete && prbResultId && (
              <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
                삭제
              </Button>
            )}
            <Button onClick={handleSave}>저장</Button>
          </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={selectionOpen} onOpenChange={setSelectionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>PRB 보고서 선택</AlertDialogTitle>
            <AlertDialogDescription>승인 완료된 PRB 보고서가 여러 건입니다. 결과보고를 작성할 대상을 선택해주십시오.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>대상 PRB 보고서</Label>
            <Select value={selectionValue} onValueChange={setSelectionValue}>
              <SelectTrigger>
                <SelectValue placeholder="PRB 보고서를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {selectionPrbs.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.id} / {item.customer} / {item.opportunity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setSelectionOpen(false)}>취소</Button>
            <AlertDialogAction
              onClick={(event) => {
                const target = selectionPrbs.find((item) => item.id === selectionValue)
                if (!target) {
                  event.preventDefault()
                  return
                }
                applyPrb(target)
              }}
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(validationMessage)} onOpenChange={(open) => { if (!open) setValidationMessage("") }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>입력 확인</AlertDialogTitle>
            <AlertDialogDescription>{validationMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setValidationMessage("")}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>PRB 결과보고를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제 후에는 PRB 결과보고 상세 정보를 다시 확인할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
