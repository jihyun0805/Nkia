"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { useChatbotPrefill } from "@/lib/use-chatbot-prefill"
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
import { UserIdPicker } from "@/components/erp/user-id-picker"
import { subscribeWorkflowUpdates } from "@/lib/activity-request-workflow"
import { type ActivityRequestRecord } from "@/lib/activity-data"
import { type ProposalProductGroup, type ProposalRecord, type ProposalType } from "@/lib/bid-data"
import { loadBackendActivityRequests } from "@/lib/sales-activity-request-backend"
import { loadBackendFindingData, type FindingBackendData } from "@/lib/finding-backend"
import { loadBackendProposalDetailById, loadBackendProposals, saveBackendProposal, type ProposalBackendDetail } from "@/lib/proposal-backend"
import { currentUser } from "@/lib/current-user"
import { useBackendUsers } from "@/lib/use-backend-users"
import { resolveUserId } from "@/lib/user-utils"

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
  customerName: string
  opportunityCode: string
  opportunityName: string
  proposalType: ProposalType
  productGroup: ProposalProductGroup | ""
  requestDate: string
  proposalDeadline: string
  salesRep: string
  contactName: string
}

const emptyForm: FormState = {
  requestId: "",
  customerCode: "",
  customerName: "",
  opportunityCode: "",
  opportunityName: "",
  proposalType: "자체 제안",
  productGroup: "",
  requestDate: "",
  proposalDeadline: "",
  salesRep: "",
  contactName: "",
}

function toProposalType(requestType: string): ProposalType {
  return requestType === "SI 제안서 작성" ? "SI 제안" : "자체 제안"
}

function normalizeLookupText(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.()/]/g, "")
}

function getMissingCodeMessage(field: "customer" | "opportunity") {
  if (field === "customer") return "고객사 코드가 선택되지 않았습니다. 선택 후 다시 시도해주십시오."
  return "사업기회 코드가 선택되지 않았습니다. 선택 후 다시 시도해주십시오."
}

function isBackendRequestId(value: string) {
  return /^\d+$/.test(value)
}

export function ProposalRegistrationForm({ initialRequestId, proposalId }: ProposalRegistrationFormProps) {
  const router = useRouter()
  const users = useBackendUsers()
  const [requests, setRequests] = useState<ActivityRequestRecord[]>([])
  const [proposals, setProposals] = useState<ProposalRecord[]>([])
  const [findingData, setFindingData] = useState<FindingBackendData>({ opportunities: [], customers: [], partners: [] })
  const [form, setForm] = useState<FormState>(emptyForm)
  const [validationMessage, setValidationMessage] = useState("")
  const [proposalDetail, setProposalDetail] = useState<ProposalBackendDetail | null>(null)
  const selectedSalesRepId = resolveUserId(form.salesRep, users)
  const proposalDetailAppliedRef = useRef(false)
  const initialRequestAppliedRef = useRef(false)

  // 챗봇 create_draft 액션 prefill
  const { values: chatbotPrefill, hasPrefill: hasChatbotPrefill, clear: clearChatbotPrefill } = useChatbotPrefill()
  const prefillAppliedRef = useRef(false)
  useEffect(() => {
    if (!hasChatbotPrefill || prefillAppliedRef.current) return
    if (proposalId || initialRequestId) return  // 기존 데이터 로드 시 prefill 비활성
    prefillAppliedRef.current = true
    setForm((cur) => ({
      ...cur,
      customerCode: chatbotPrefill.customer_code || cur.customerCode,
      customerName: chatbotPrefill.customer_name || cur.customerName,
      opportunityCode: chatbotPrefill.opportunity_code || cur.opportunityCode,
      opportunityName: chatbotPrefill.opportunity_name || cur.opportunityName,
      proposalType: (chatbotPrefill.proposal_type as ProposalType) || cur.proposalType,
      productGroup: (chatbotPrefill.product_family as ProposalProductGroup) || cur.productGroup,
      requestDate: chatbotPrefill.requested_at || cur.requestDate,
      proposalDeadline: chatbotPrefill.submission_deadline || cur.proposalDeadline,
      salesRep: chatbotPrefill.sales_representative || cur.salesRep,
      contactName: chatbotPrefill.manager || cur.contactName,
    }))
    const applied = Object.keys(chatbotPrefill).length
    if (applied > 0) {
      toast({ title: "챗봇이 제안서 초안 prefill", description: `${applied}개 슬롯 반영 — 확인 후 저장하세요.` })
    }
    const id = window.setTimeout(() => clearChatbotPrefill(), 100)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChatbotPrefill])

  useEffect(() => {
    let cancelled = false

    void loadBackendActivityRequests()
      .then((records) => {
        if (!cancelled) {
          setRequests(records.filter((item) => proposalRequestTypes.has(item.type) && isBackendRequestId(item.id)))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRequests([])
        }
      })

    void loadBackendFindingData()
      .then((data) => {
        if (!cancelled) {
          setFindingData(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFindingData({ opportunities: [], customers: [], partners: [] })
        }
      })

    const sync = () => {
      if (cancelled) return
      void loadBackendActivityRequests()
        .then((records) => {
          if (!cancelled) {
            setRequests(records.filter((item) => proposalRequestTypes.has(item.type) && isBackendRequestId(item.id)))
          }
        })
        .catch(() => {
          if (!cancelled) {
            setRequests([])
          }
        })
      void loadBackendFindingData()
        .then((data) => {
          if (!cancelled) {
            setFindingData(data)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setFindingData({ opportunities: [], customers: [], partners: [] })
          }
        })
    }

    const unsubscribeWorkflow = subscribeWorkflowUpdates(sync)
    window.addEventListener("storage", sync)

    return () => {
      cancelled = true
      unsubscribeWorkflow()
      window.removeEventListener("storage", sync)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void loadBackendProposals()
      .then((records) => {
        if (!cancelled) {
          setProposals(records)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProposals([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!proposalId) {
      setProposalDetail(null)
      return
    }

    let cancelled = false
    void loadBackendProposalDetailById(proposalId)
      .then((detail) => {
        if (!cancelled) {
          setProposalDetail(detail)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProposalDetail(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [proposalId])

  useEffect(() => {
    proposalDetailAppliedRef.current = false
  }, [proposalId])

  useEffect(() => {
    initialRequestAppliedRef.current = false
  }, [initialRequestId])

  function resolveCustomerFromRequest(request: ActivityRequestRecord) {
    const byCode = request.customerCode
      ? findingData.customers.find((item) => item.id === request.customerCode)
      : null
    if (byCode) return byCode

    const byName = request.customer
      ? findingData.customers.find((item) => normalizeLookupText(item.name) === normalizeLookupText(request.customer))
      : null
    if (byName) return byName

    return null
  }

  function resolveOpportunityFromRequest(request: ActivityRequestRecord, customerCode?: string) {
    const byCode = request.opportunityCode
      ? findingData.opportunities.find((item) => item.id === request.opportunityCode)
      : null
    if (byCode) return byCode

    const customerScoped = request.opportunity
      ? findingData.opportunities.find(
          (item) =>
            (item.customerCode === (customerCode ?? request.customerCode ?? "") ||
              normalizeLookupText(item.customer) === normalizeLookupText(request.customer)) &&
            normalizeLookupText(item.name) === normalizeLookupText(request.opportunity),
        )
      : null
    if (customerScoped) return customerScoped

    const byName = request.opportunity
      ? findingData.opportunities.find((item) => normalizeLookupText(item.name) === normalizeLookupText(request.opportunity))
      : null
    if (byName) return byName

    return null
  }

  const completedRequestIds = new Set(
    proposals
      .map((proposal) => {
        const proposalTypeLabel = proposal.proposalType === "SI 제안" ? "SI 제안서 작성" : "제안서 작성"
        const matchedRequest = requests.find((request) => {
          if (request.type !== proposalTypeLabel) return false

          const requestCustomerCode = request.customerCode ?? ""
          const requestOpportunityCode = request.opportunityCode ?? ""

          if (requestCustomerCode && requestCustomerCode === proposal.customerCode) return true
          if (requestOpportunityCode && requestOpportunityCode === proposal.opportunityCode) return true

          return (
            request.customer === proposal.customer &&
            request.opportunity === proposal.opportunity
          )
        })

        return matchedRequest?.id ?? null
      })
      .filter((requestId): requestId is string => Boolean(requestId)),
  )
  const availableRequests = requests.filter(
    (request) => !completedRequestIds.has(request.id) || request.id === proposalDetail?.requestId,
  )

  useEffect(() => {
    if (!proposalDetail || proposalDetailAppliedRef.current) return

    proposalDetailAppliedRef.current = true
    setForm({
      requestId: proposalDetail.requestId,
      customerCode: proposalDetail.customerCode,
      customerName: proposalDetail.customer,
      opportunityCode: proposalDetail.opportunityCode,
      opportunityName: proposalDetail.opportunity,
      proposalType: proposalDetail.proposalType,
      productGroup: proposalDetail.productGroup,
      requestDate: proposalDetail.requestDate,
      proposalDeadline: proposalDetail.proposalDeadline,
      salesRep: proposalDetail.salesRep,
      contactName: proposalDetail.contactName,
    })
  }, [proposalDetail])

  useEffect(() => {
    if (proposalDetail || !initialRequestId || initialRequestAppliedRef.current) return

    const matchedRequest = requests.find((item) => item.id === initialRequestId)
    if (matchedRequest) {
      initialRequestAppliedRef.current = true
      applyRequest(matchedRequest)
    }
  }, [initialRequestId, proposalDetail, requests, findingData.customers, findingData.opportunities])

  function applyRequest(request: ActivityRequestRecord) {
    const matchedCustomer = resolveCustomerFromRequest(request)
    const matchedOpportunity = resolveOpportunityFromRequest(request, matchedCustomer?.id)
    const resolvedCustomerCode = matchedCustomer?.id ?? matchedOpportunity?.customerCode ?? request.customerCode ?? ""
    const resolvedCustomerName = matchedCustomer?.name ?? request.customer ?? ""
    const resolvedOpportunityCode = matchedOpportunity?.id ?? request.opportunityCode ?? ""
    const resolvedOpportunityName = matchedOpportunity?.name ?? request.opportunity ?? ""

    setForm((current) => ({
      ...current,
      requestId: request.id,
      customerCode: resolvedCustomerCode || current.customerCode,
      customerName: resolvedCustomerName || current.customerName,
      opportunityCode: resolvedOpportunityCode || current.opportunityCode,
      opportunityName: resolvedOpportunityName || current.opportunityName,
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

  const handleComplete = () => {
    if (!form.customerCode) {
      const matchedCustomer = findingData.customers.find((item) => item.name === form.customerName)
      if (!matchedCustomer) {
        setValidationMessage(getMissingCodeMessage("customer"))
        return
      }
    }
    if (!form.opportunityCode) {
      const matchedOpportunity = findingData.opportunities.find((item) => item.name === form.opportunityName)
      if (!matchedOpportunity) {
        setValidationMessage(getMissingCodeMessage("opportunity"))
        return
      }
    }
    const matchedRequest = availableRequests.find((item) => item.id === form.requestId)
    const matchedCustomer =
      findingData.customers.find((item) => item.id === form.customerCode) ??
      findingData.customers.find((item) => item.name === form.customerName)
    const matchedOpportunity =
      findingData.opportunities.find((item) => item.id === form.opportunityCode) ??
      findingData.opportunities.find((item) => item.name === form.opportunityName)

    if (!matchedCustomer || !matchedOpportunity) {
      setValidationMessage("연계 대상 코드 정보를 확인할 수 없습니다. 선택 후 다시 시도해주십시오.")
      return
    }

    void saveBackendProposal({
      proposalId,
      requestId: matchedRequest?.id || form.requestId || undefined,
      customerCode: matchedCustomer.id,
      customerName: form.customerName || matchedCustomer.name,
      opportunityCode: matchedOpportunity.id,
      opportunityName: form.opportunityName || matchedOpportunity.name,
      projectOpportunityId: matchedOpportunity.backendId,
      proposalType: form.proposalType,
      productGroup: (form.productGroup || matchedOpportunity.product) as ProposalProductGroup,
      requestDate: form.requestDate || matchedRequest?.date || "",
      proposalDeadline: form.proposalDeadline || matchedRequest?.dueDate || "",
      salesRep: form.salesRep || matchedOpportunity.salesRep || "",
      contactName: form.contactName || matchedCustomer.contactName || matchedCustomer.contact || "",
    })
      .then((savedId) => {
        router.push(`/bid/proposal/${savedId}`)
      })
      .catch((error) => {
        setValidationMessage(error instanceof Error ? error.message : "제안서를 저장하지 못했습니다.")
      })
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
              <Label>고객사코드 *</Label>
              <Input value={form.customerCode} readOnly className="text-foreground" />
            </div>
            <div className="space-y-2">
              <Label>사업기회코드 *</Label>
              <Input value={form.opportunityCode} readOnly className="text-foreground" />
            </div>
            <div className="space-y-2">
              <Label>고객사명 *</Label>
              <Input value={form.customerName} readOnly className="text-foreground" />
            </div>
            <div className="space-y-2">
              <Label>사업명 *</Label>
              <Input value={form.opportunityName} readOnly className="text-foreground" />
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
              <UserIdPicker
                value={selectedSalesRepId}
                users={users}
                onValueChange={(v) =>
                  setForm((current) => ({
                    ...current,
                    salesRep: users.find((user) => user.id === v)?.name ?? current.salesRep,
                  }))
                }
                placeholder="영업대표를 선택하세요"
              />
            </div>
            <div className="space-y-2">
              <Label>담당자</Label>
              <Input value={currentUser.name} readOnly className="text-foreground" />
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
