"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
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
import {
  getBidResultById,
  getBidResultByProposalId,
  getProposals,
  saveBidResult,
  subscribeBidResultUpdates,
  subscribeProposalUpdates,
  type BidOutcome,
  type BidResultAttachment,
  type ProposalRecord,
} from "@/lib/bid-data"

type BidResultRegistrationFormProps = {
  proposalId?: string
  bidResultId?: string
}

type FormState = {
  proposalId: string
  bidDate: string
  result: BidOutcome
  amount: string
  competitor: string
  reason: string
  attachments: BidResultAttachment[]
  attachmentNames: string[]
}

const outcomeOptions: BidOutcome[] = ["수주", "실주"]

const emptyForm: FormState = {
  proposalId: "",
  bidDate: "",
  result: "수주",
  amount: "",
  competitor: "",
  reason: "",
  attachments: [],
  attachmentNames: [],
}

async function readFilesAsAttachments(fileList: FileList | null) {
  const files = Array.from(fileList ?? [])
  return Promise.all(
    files.map(
      (file) =>
        new Promise<BidResultAttachment>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            resolve({
              name: file.name,
              mimeType: file.type,
              url: typeof reader.result === "string" ? reader.result : undefined,
            })
          }
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(file)
        }),
    ),
  )
}

export function BidResultRegistrationForm({ proposalId, bidResultId }: BidResultRegistrationFormProps) {
  const router = useRouter()
  const [proposals, setProposals] = useState<ProposalRecord[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [validationMessage, setValidationMessage] = useState("")

  useEffect(() => {
    const sync = () => setProposals(getProposals())
    sync()
    const unsubscribeProposal = subscribeProposalUpdates(sync)
    const unsubscribeBidResult = subscribeBidResultUpdates(sync)
    window.addEventListener("storage", sync)

    return () => {
      unsubscribeProposal()
      unsubscribeBidResult()
      window.removeEventListener("storage", sync)
    }
  }, [])

  const existingResult = useMemo(() => (bidResultId ? getBidResultById(bidResultId) : null), [bidResultId])
  const registeredProposalIds = useMemo(
    () =>
      new Set(
        proposals
          .map((proposal) => {
            const matchedResult = getBidResultByProposalId(proposal.id)
            return matchedResult?.proposalId
          })
          .filter((value): value is string => Boolean(value) && value !== existingResult?.proposalId),
      ),
    [existingResult?.proposalId, proposals],
  )

  const availableProposals = useMemo(
    () => proposals.filter((proposal) => !registeredProposalIds.has(proposal.id) || proposal.id === existingResult?.proposalId),
    [existingResult?.proposalId, proposals, registeredProposalIds],
  )

  useEffect(() => {
    if (existingResult) {
      setForm({
        proposalId: existingResult.proposalId,
        bidDate: existingResult.bidDate,
        result: existingResult.result,
        amount: existingResult.amount,
        competitor: existingResult.competitor,
        reason: existingResult.reason,
        attachments: existingResult.attachments ?? [],
        attachmentNames: existingResult.attachmentNames ?? [],
      })
      return
    }

    if (proposalId) {
      const matchedProposal = availableProposals.find((item) => item.id === proposalId)
      if (matchedProposal) {
        setForm((current) => ({
          ...current,
          proposalId: matchedProposal.id,
          bidDate: current.bidDate || matchedProposal.proposalDeadline,
        }))
      }
    }
  }, [availableProposals, existingResult, proposalId])

  const selectedProposal = availableProposals.find((item) => item.id === form.proposalId) ?? null

  const handleComplete = () => {
    if (!form.proposalId) {
      setValidationMessage("제안서 코드가 선택되지 않았습니다. 선택 후 다시 시도해주십시오.")
      return
    }

    if (!selectedProposal) {
      setValidationMessage("연계된 제안서 정보를 확인할 수 없습니다. 다시 선택해주십시오.")
      return
    }

    const saved = saveBidResult({
      id: bidResultId,
      proposalId: selectedProposal.id,
      requestId: selectedProposal.requestId,
      customerCode: selectedProposal.customerCode,
      customer: selectedProposal.customer,
      opportunityCode: selectedProposal.opportunityCode,
      opportunity: selectedProposal.opportunity,
      proposalType: selectedProposal.proposalType,
      productGroup: selectedProposal.productGroup,
      proposalDeadline: selectedProposal.proposalDeadline,
      salesRep: selectedProposal.salesRep,
      bidDate: form.bidDate || selectedProposal.proposalDeadline,
      result: form.result,
      amount: form.amount,
      competitor: form.competitor,
      reason: form.reason,
      attachments: form.attachments,
      attachmentNames: form.attachmentNames,
    })

    router.push(`/bid/result/${saved.id}`)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{bidResultId ? "입찰 결과 수정" : "입찰 결과 등록"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>제안서 코드 *</Label>
              <Select value={form.proposalId} onValueChange={(value) => setForm((current) => ({ ...current, proposalId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="제안서 코드를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {availableProposals.map((proposal) => (
                    <SelectItem key={proposal.id} value={proposal.id}>
                      {proposal.id} / {proposal.customer} / {proposal.opportunity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>고객사</Label>
              <Input readOnly value={selectedProposal?.customer ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>사업명</Label>
              <Input readOnly value={selectedProposal?.opportunity ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>제안형태</Label>
              <Input readOnly value={selectedProposal?.proposalType ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>제품군</Label>
              <Input readOnly value={selectedProposal?.productGroup ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>제안서 마감일</Label>
              <Input readOnly value={selectedProposal?.proposalDeadline ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>영업대표</Label>
              <Input readOnly value={selectedProposal?.salesRep ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>입찰 결과 *</Label>
              <Select value={form.result} onValueChange={(value) => setForm((current) => ({ ...current, result: value as BidOutcome }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {outcomeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>입찰일</Label>
              <Input type="date" value={form.bidDate} onChange={(event) => setForm((current) => ({ ...current, bidDate: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>금액</Label>
              <Input value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>경쟁사</Label>
              <Input value={form.competitor} onChange={(event) => setForm((current) => ({ ...current, competitor: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>결과 사유</Label>
              <Textarea rows={4} value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>첨부파일</Label>
              <Input
                type="file"
                onChange={async (event) => {
                  const attachments = await readFilesAsAttachments(event.target.files)
                  setForm((current) => ({
                    ...current,
                    attachments,
                    attachmentNames: attachments.map((file) => file.name),
                  }))
                }}
              />
              <Input
                readOnly
                value={form.attachmentNames.length > 0 ? form.attachmentNames.join(", ") : "등록된 첨부파일이 없습니다."}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-6">
            <Button variant="outline" asChild>
              <Link href={bidResultId ? `/bid/result/${bidResultId}` : "/bid"}>취소</Link>
            </Button>
            <Button onClick={handleComplete}>완료</Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(validationMessage)} onOpenChange={(open) => { if (!open) setValidationMessage("") }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>입찰 결과 등록 확인</AlertDialogTitle>
            <AlertDialogDescription>{validationMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setValidationMessage("")}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
