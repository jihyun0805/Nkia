"use client"

import { useEffect, useMemo, useState } from "react"
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
import { getActivityRequests, subscribeWorkflowUpdates } from "@/lib/activity-request-workflow"
import { type ActivityRequestRecord } from "@/lib/activity-data"
import {
  getProposalById,
  getProposals,
  saveProposal,
  subscribeProposalUpdates,
  type ProposalAttachment,
  type ProposalProductGroup,
  type ProposalType,
} from "@/lib/bid-data"
import { getCustomerByCode, getCustomers, getOpportunities, type CustomerRecord, type OpportunityRecord } from "@/lib/finding-data"

type ProposalRegistrationFormProps = {
  initialRequestId?: string
  proposalId?: string
}

const proposalRequestTypes = new Set(["제안서 작성", "SI 제안서 작성"])
const proposalTypeOptions: ProposalType[] = ["자체 제안", "SI 제안"]
const productGroupOptions: ProposalProductGroup[] = ["EMS", "ITSM", "Automation", "WSS"]

type FormState = {
  requestId: string
  customerCode: string
  opportunityCode: string
  proposalType: ProposalType
  productGroup: ProposalProductGroup | ""
  requestDate: string
  proposalDeadline: string
  salesRep: string
  contactName: string
  attachments: ProposalAttachment[]
  attachmentNames: string[]
}

const emptyForm: FormState = {
  requestId: "",
  customerCode: "",
  opportunityCode: "",
  proposalType: "자체 제안",
  productGroup: "",
  requestDate: "",
  proposalDeadline: "",
  salesRep: "",
  contactName: "",
  attachments: [],
  attachmentNames: [],
}

function toProposalType(requestType: string): ProposalType {
  return requestType === "SI 제안서 작성" ? "SI 제안" : "자체 제안"
}

function getMissingCodeMessage(field: "request" | "customer" | "opportunity") {
  if (field === "request") return "활동 요청 코드가 선택되지 않았습니다. 선택 후 다시 시도해주십시오."
  if (field === "customer") return "고객사 코드가 선택되지 않았습니다. 선택 후 다시 시도해주십시오."
  return "사업기회 코드가 선택되지 않았습니다. 선택 후 다시 시도해주십시오."
}

async function readFilesAsAttachments(fileList: FileList | null) {
  const files = Array.from(fileList ?? [])
  return Promise.all(
    files.map(
      (file) =>
        new Promise<ProposalAttachment>((resolve, reject) => {
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

export function ProposalRegistrationForm({ initialRequestId, proposalId }: ProposalRegistrationFormProps) {
  const router = useRouter()
  const [requests, setRequests] = useState<ActivityRequestRecord[]>([])
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [validationMessage, setValidationMessage] = useState("")

  useEffect(() => {
    const sync = () => {
      setRequests(getActivityRequests().filter((item) => proposalRequestTypes.has(item.type)))
      setCustomers(getCustomers())
      setOpportunities(getOpportunities())
    }

    sync()
    const unsubscribeWorkflow = subscribeWorkflowUpdates(sync)
    const unsubscribeProposal = subscribeProposalUpdates(sync)
    window.addEventListener("storage", sync)

    return () => {
      unsubscribeWorkflow()
      unsubscribeProposal()
      window.removeEventListener("storage", sync)
    }
  }, [])

  const existingProposal = useMemo(() => (proposalId ? getProposalById(proposalId) : null), [proposalId])
  const completedRequestIds = useMemo(() => {
    return new Set(
      getProposals()
        .filter((item) => item.id !== proposalId)
        .map((item) => item.requestId),
    )
  }, [proposalId, requests.length])

  const availableRequests = useMemo(
    () => requests.filter((request) => !completedRequestIds.has(request.id) || request.id === existingProposal?.requestId),
    [completedRequestIds, existingProposal?.requestId, requests],
  )

  useEffect(() => {
    if (existingProposal) {
      setForm({
        requestId: existingProposal.requestId,
        customerCode: existingProposal.customerCode,
        opportunityCode: existingProposal.opportunityCode,
        proposalType: existingProposal.proposalType,
        productGroup: existingProposal.productGroup,
        requestDate: existingProposal.requestDate,
        proposalDeadline: existingProposal.proposalDeadline,
        salesRep: existingProposal.salesRep,
        contactName: existingProposal.contactName,
        attachments: existingProposal.attachments ?? [],
        attachmentNames: existingProposal.attachmentNames ?? [],
      })
      return
    }

    if (initialRequestId) {
      const matchedRequest = availableRequests.find((item) => item.id === initialRequestId)
      if (matchedRequest) {
        applyRequest(matchedRequest)
      }
    }
  }, [availableRequests, existingProposal, initialRequestId])

  const selectedCustomer = customers.find((item) => item.id === form.customerCode) ?? null
  const customerOpportunities = opportunities.filter((item) => item.customerCode === form.customerCode)
  const selectedOpportunity = customerOpportunities.find((item) => item.id === form.opportunityCode)
    ?? opportunities.find((item) => item.id === form.opportunityCode)
    ?? null
  function applyRequest(request: ActivityRequestRecord) {
    const matchedOpportunity = request.opportunityCode
      ? opportunities.find((item) => item.id === request.opportunityCode) ?? null
      : null
    const matchedCustomer = request.customerCode
      ? getCustomerByCode(request.customerCode) ?? null
      : getCustomerByCode(matchedOpportunity?.customerCode ?? "") ?? null

    setForm((current) => ({
      ...current,
      requestId: request.id,
      customerCode: request.customerCode ?? matchedOpportunity?.customerCode ?? current.customerCode,
      opportunityCode: request.opportunityCode ?? current.opportunityCode,
      proposalType: toProposalType(request.type),
      productGroup: (matchedOpportunity?.product as ProposalProductGroup | undefined) ?? current.productGroup,
      requestDate: request.date,
      proposalDeadline: request.dueDate,
      salesRep: matchedOpportunity?.salesRep ?? current.salesRep,
      contactName: matchedCustomer?.contactName ?? matchedCustomer?.contact ?? current.contactName,
    }))
  }

  const handleRequestChange = (requestId: string) => {
    const matchedRequest = availableRequests.find((item) => item.id === requestId)
    if (!matchedRequest) {
      setForm((current) => ({ ...current, requestId }))
      return
    }

    applyRequest(matchedRequest)
  }

  const handleCustomerChange = (customerCode: string) => {
    const matchedCustomer = customers.find((item) => item.id === customerCode) ?? null
    setForm((current) => ({
      ...current,
      customerCode,
      opportunityCode:
        opportunities.find((item) => item.id === current.opportunityCode && item.customerCode === customerCode)?.id ?? "",
      contactName: matchedCustomer?.contactName ?? matchedCustomer?.contact ?? current.contactName,
    }))
  }

  const handleOpportunityChange = (opportunityCode: string) => {
    const matchedOpportunity = opportunities.find((item) => item.id === opportunityCode) ?? null
    setForm((current) => ({
      ...current,
      opportunityCode,
      customerCode: matchedOpportunity?.customerCode ?? current.customerCode,
      productGroup: (matchedOpportunity?.product as ProposalProductGroup | undefined) ?? current.productGroup,
      salesRep: matchedOpportunity?.salesRep ?? current.salesRep,
    }))
  }

  const handleComplete = () => {
    if (!form.requestId) {
      setValidationMessage(getMissingCodeMessage("request"))
      return
    }
    if (!form.customerCode) {
      setValidationMessage(getMissingCodeMessage("customer"))
      return
    }
    if (!form.opportunityCode) {
      setValidationMessage(getMissingCodeMessage("opportunity"))
      return
    }

    const matchedRequest = availableRequests.find((item) => item.id === form.requestId)
    const matchedCustomer = customers.find((item) => item.id === form.customerCode)
    const matchedOpportunity = opportunities.find((item) => item.id === form.opportunityCode)

    if (!matchedRequest || !matchedCustomer || !matchedOpportunity) {
      setValidationMessage("연계 대상 코드 정보를 확인할 수 없습니다. 선택 후 다시 시도해주십시오.")
      return
    }

    const saved = saveProposal({
      id: proposalId,
      requestId: matchedRequest.id,
      customerCode: matchedCustomer.id,
      customer: matchedCustomer.name,
      opportunityCode: matchedOpportunity.id,
      opportunity: matchedOpportunity.name,
      proposalType: form.proposalType,
      productGroup: (form.productGroup || matchedOpportunity.product) as ProposalProductGroup,
      requestDate: form.requestDate || matchedRequest.date,
      proposalDeadline: form.proposalDeadline || matchedRequest.dueDate,
      salesRep: form.salesRep || matchedOpportunity.salesRep || "",
      contactName: form.contactName || matchedCustomer.contactName || matchedCustomer.contact || "",
      attachments: form.attachments,
      attachmentNames: form.attachmentNames,
    })

    router.push(`/bid/proposal/${saved.id}`)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{proposalId ? "제안서 수정" : "제안서 등록"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>활동 요청 코드 *</Label>
              <Select value={form.requestId} onValueChange={handleRequestChange}>
                <SelectTrigger>
                  <SelectValue placeholder="활동 요청 코드를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {availableRequests.map((request) => (
                    <SelectItem key={request.id} value={request.id}>
                      {request.id} / {request.customer} / {request.opportunity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>고객사 코드 *</Label>
              <Select value={form.customerCode} onValueChange={handleCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="고객사 코드를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.id} / {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>고객사명</Label>
              <Input readOnly value={selectedCustomer?.name ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>사업기회 코드 *</Label>
              <Select value={form.opportunityCode} onValueChange={handleOpportunityChange}>
                <SelectTrigger>
                  <SelectValue placeholder="사업기회 코드를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {customerOpportunities.map((opportunity) => (
                    <SelectItem key={opportunity.id} value={opportunity.id}>
                      {opportunity.id} / {opportunity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>사업명</Label>
              <Input readOnly value={selectedOpportunity?.name ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>제안형태</Label>
              <Select value={form.proposalType} onValueChange={(value) => setForm((current) => ({ ...current, proposalType: value as ProposalType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {proposalTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>제품군</Label>
              <Select value={form.productGroup} onValueChange={(value) => setForm((current) => ({ ...current, productGroup: value as ProposalProductGroup }))}>
                <SelectTrigger>
                  <SelectValue placeholder="제품군을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {productGroupOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>요청일</Label>
              <Input type="date" value={form.requestDate} onChange={(event) => setForm((current) => ({ ...current, requestDate: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>제안서 마감일</Label>
              <Input type="date" value={form.proposalDeadline} onChange={(event) => setForm((current) => ({ ...current, proposalDeadline: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>영업대표</Label>
              <Input value={form.salesRep} onChange={(event) => setForm((current) => ({ ...current, salesRep: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>담당자</Label>
              <Input value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>첨부파일: 제안서</Label>
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
            <Button variant="outline" onClick={() => router.push(proposalId ? `/bid/proposal/${proposalId}` : "/bid")}>
              취소
            </Button>
            <Button onClick={handleComplete}>완료</Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(validationMessage)} onOpenChange={(open) => { if (!open) setValidationMessage("") }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>제안서 등록 확인</AlertDialogTitle>
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
