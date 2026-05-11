"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { Textarea } from "@/components/ui/textarea"
import { PrbRegistrationForm } from "@/components/erp/prb-registration-form"
import { toast } from "@/hooks/use-toast"
import { currentUser } from "@/lib/current-user"
import {
  getPrbById,
  deletePrbResult,
  getPrbResultById,
  getPrbResults,
  getPrbs,
  savePrbResult,
  subscribePrbResultUpdates,
  subscribePrbUpdates,
  type PrbRecord,
  type PrbResultRecord,
} from "@/lib/bid-data"

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

function createDefaultAttendees() {
  return Array.from({ length: 7 }, (_, index) => ({
    participant: `참석자 ${index + 1}`,
    opinion: "",
    decision: "",
  }))
}

function createEmptyForm(): FormState {
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
  className = "",
}: {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  className?: string
}) {
  return (
    <Input
      readOnly={readOnly}
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

function createFormFromResult(result: PrbResultRecord): FormState {
  return {
    prbId: result.prbId,
    meetingDate: result.meetingDate || result.createdDate,
    location: result.location || "",
    riskFactors: result.riskFactors || "",
    attendeeOpinions: result.attendeeOpinions.length > 0 ? result.attendeeOpinions : createDefaultAttendees(),
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

  const existingResult = useMemo(() => (prbResultId ? getPrbResultById(prbResultId) : null), [prbResultId])

  useEffect(() => {
    const sync = () => {
      const allPrbs = getPrbs()
      const allResults = getPrbResults()

      if (existingResult) {
        const matchedPrb = getPrbById(existingResult.prbId)
        setForm(createFormFromResult(existingResult))
        setSelectedPrb(matchedPrb)
        setSelectionPrbs([])
        setSelectionOpen(false)
        setSelectionValue(existingResult.prbId)
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
        setForm((current) => ({ ...current, prbId: candidate.id }))
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
    }

    sync()
    const unsubscribePrb = subscribePrbUpdates(sync)
    const unsubscribeResult = subscribePrbResultUpdates(sync)
    return () => {
      unsubscribePrb()
      unsubscribeResult()
    }
  }, [existingResult])

  const appliedPrb = useMemo(
    () => selectedPrb ?? (form.prbId ? getPrbById(form.prbId) : null),
    [form.prbId, selectedPrb],
  )

  const applyPrb = (prb: PrbRecord) => {
    setSelectedPrb(prb)
    setSelectionValue(prb.id)
    setForm((current) => ({
      ...current,
      prbId: prb.id,
      meetingDate: current.meetingDate || prb.createdDate,
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

  const handleSave = () => {
    if (!appliedPrb) {
      setValidationMessage("결과보고 대상 PRB 보고서를 먼저 선택해주십시오.")
      return
    }

    const saved = savePrbResult({
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

    router.push(`/bid/prb-result/${saved.id}`)
  }

  const handleDelete = () => {
    if (!prbResultId) return

    const result = deletePrbResult(prbResultId)
    if (result.status === "not_found") {
      toast({
        title: "PRB 결과보고 삭제 실패",
        description: "삭제할 PRB 결과보고를 찾지 못했습니다.",
      })
      setIsDeleteOpen(false)
      return
    }

    toast({
      title: "PRB 결과보고 삭제 완료",
      description: "PRB 결과보고가 삭제되었습니다.",
    })
    setIsDeleteOpen(false)
    router.push("/bid")
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{prbResultId ? "PRB 결과 수정" : "PRB 결과 등록"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
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
                  <col className="w-[100px]" />
                  <col />
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
                      <TableInput value={form.meetingDate} onChange={(value) => setForm((current) => ({ ...current, meetingDate: value }))} />
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
                      <td className="border border-slate-400 bg-slate-50 px-3 py-2 font-medium">
                        <TableInput value={item.participant} onChange={(value) => updateAttendee(index, "participant", value)} />
                      </td>
                      <td className="border border-slate-400">
                        <TableTextarea value={item.opinion} onChange={(value) => updateAttendee(index, "opinion", value)} rows={4} />
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
