"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CustomerAutocomplete } from "@/components/erp/entity-customer-autocomplete"
import { EntityAutocomplete } from "@/components/erp/entity-autocomplete"
import {
  activityContentOptions,
  activityModeOptions,
  requestOptionalActivityContents,
  type ActivityRecord,
} from "@/lib/activity-data"
import { type EntitySuggestion } from "@/lib/entity-suggestions-api"
import { type CustomerRecord, type OpportunityRecord } from "@/lib/finding-data"

const automaticLocationModes = ["이메일", "전화", "영상회의"]

type ActivityFormFieldsProps = {
  defaultValues?: Partial<ActivityRecord>
  registrantValue?: string
  onRegistrantChange?: (value: string) => void
  customerValue?: string
  onCustomerSelect?: (customer: CustomerRecord | null) => void
  onCustomerValueChange?: (value: string) => void
  onUnregisteredCustomerAttempt?: () => void
  opportunityValue?: string
  opportunityOptions?: OpportunityRecord[]
  onOpportunityChange?: (value: string) => void
  onOpportunitySuggestionSelect?: (suggestion: EntitySuggestion | null) => void
  requesterValue?: string
  onRequesterChange?: (value: string) => void
  values?: {
    date: string
    activityMode: string
    activityContent: string
    location: string
    attendees: string
    content: string
    issues: string
    nextAction: string
  }
  onValuesChange?: (
    updater: (current: {
      date: string
      activityMode: string
      activityContent: string
      location: string
      attendees: string
      content: string
      issues: string
      nextAction: string
    }) => {
      date: string
      activityMode: string
      activityContent: string
      location: string
      attendees: string
      content: string
      issues: string
      nextAction: string
    },
  ) => void
}

export function ActivityFormFields({
  defaultValues,
  registrantValue,
  onRegistrantChange,
  customerValue,
  onCustomerSelect,
  onCustomerValueChange,
  onUnregisteredCustomerAttempt,
  opportunityValue,
  opportunityOptions,
  onOpportunityChange,
  onOpportunitySuggestionSelect,
  requesterValue,
  onRequesterChange,
  values,
  onValuesChange,
}: ActivityFormFieldsProps) {
  const [activityMode, setActivityMode] = useState(defaultValues?.activityMode ?? "")
  const [activityContent, setActivityContent] = useState(defaultValues?.activityContent ?? "")
  const [location, setLocation] = useState(defaultValues?.location ?? "")
  const [date, setDate] = useState(defaultValues?.date ?? "")
  const [attendees, setAttendees] = useState(defaultValues?.attendees ?? "")
  const [content, setContent] = useState(defaultValues?.content ?? "")
  const [issues, setIssues] = useState(defaultValues?.issues ?? "")
  const [nextAction, setNextAction] = useState(defaultValues?.nextAction ?? "")
  const [registrant, setRegistrant] = useState(registrantValue ?? defaultValues?.registrant ?? "")
  const requester = typeof requesterValue === "string" ? requesterValue : defaultValues?.requester ?? ""
  const linkedRequestId = defaultValues?.requestId ?? ""
  const opportunity = typeof opportunityValue === "string" ? opportunityValue : defaultValues?.opportunity ?? ""
  const resolvedDate = values?.date ?? date
  const resolvedActivityMode = values?.activityMode ?? activityMode
  const resolvedActivityContent = values?.activityContent ?? activityContent
  const resolvedLocation = values?.location ?? location
  const resolvedAttendees = values?.attendees ?? attendees
  const resolvedContent = values?.content ?? content
  const resolvedIssues = values?.issues ?? issues
  const resolvedNextAction = values?.nextAction ?? nextAction
  const isAutomaticLocation = automaticLocationModes.includes(resolvedActivityMode)
  const locationValue = isAutomaticLocation ? resolvedActivityMode : resolvedLocation
  const needsActivityRequest = resolvedActivityContent !== "" && !requestOptionalActivityContents.includes(resolvedActivityContent)

  const updateValues = (
    updater: (current: {
      date: string
      activityMode: string
      activityContent: string
      location: string
      attendees: string
      content: string
      issues: string
      nextAction: string
    }) => {
      date: string
      activityMode: string
      activityContent: string
      location: string
      attendees: string
      content: string
      issues: string
      nextAction: string
    },
  ) => {
    const current = {
      date: resolvedDate,
      activityMode: resolvedActivityMode,
      activityContent: resolvedActivityContent,
      location: resolvedLocation,
      attendees: resolvedAttendees,
      content: resolvedContent,
      issues: resolvedIssues,
      nextAction: resolvedNextAction,
    }
    const next = updater(current)

    if (onValuesChange) {
      onValuesChange(() => next)
      return
    }

    setDate(next.date)
    setActivityMode(next.activityMode)
    setActivityContent(next.activityContent)
    setLocation(next.location)
    setAttendees(next.attendees)
    setContent(next.content)
    setIssues(next.issues)
    setNextAction(next.nextAction)
  }

  useEffect(() => {
    setActivityMode(defaultValues?.activityMode ?? "")
  }, [defaultValues?.activityMode])

  useEffect(() => {
    setActivityContent(defaultValues?.activityContent ?? "")
  }, [defaultValues?.activityContent])

  useEffect(() => {
    setLocation(defaultValues?.location ?? "")
  }, [defaultValues?.location])

  useEffect(() => {
    setDate(defaultValues?.date ?? "")
  }, [defaultValues?.date])

  useEffect(() => {
    setAttendees(defaultValues?.attendees ?? "")
  }, [defaultValues?.attendees])

  useEffect(() => {
    setContent(defaultValues?.content ?? "")
  }, [defaultValues?.content])

  useEffect(() => {
    setIssues(defaultValues?.issues ?? "")
  }, [defaultValues?.issues])

  useEffect(() => {
    setNextAction(defaultValues?.nextAction ?? "")
  }, [defaultValues?.nextAction])

  useEffect(() => {
    setRegistrant(registrantValue ?? defaultValues?.registrant ?? "")
  }, [registrantValue, defaultValues?.registrant])

  const handleActivityModeChange = (nextMode: string) => {
    updateValues((current) => ({
      ...current,
      activityMode: nextMode,
      location: automaticLocationModes.includes(nextMode)
        ? nextMode
        : automaticLocationModes.includes(current.activityMode)
          ? ""
          : current.location,
    }))
  }

  return (
    <>
      <div className="space-y-2 md:w-1/2">
        <Label>등록자</Label>
        <Input
          value={registrant}
          onChange={(event) => {
            const next = event.target.value
            setRegistrant(next)
            onRegistrantChange?.(next)
          }}
          placeholder="등록자명을 입력하세요"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>요청자</Label>
          {typeof requesterValue === "string" && onRequesterChange ? (
            <Input
              value={requester}
              onChange={(event) => onRequesterChange(event.target.value)}
              placeholder="요청자가 없는 경우 비워둘 수 있습니다"
            />
          ) : (
            <Input defaultValue={defaultValues?.requester} placeholder="요청자가 없는 경우 비워둘 수 있습니다" />
          )}
          {!linkedRequestId && (
            <p className="text-sm text-muted-foreground">
              활동 요청과 연결되지 않은 활동은 요청자 없이 등록할 수 있습니다.
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>고객사 *</Label>
          {typeof customerValue === "string" && onCustomerSelect ? (
            <CustomerAutocomplete
              value={customerValue}
              onSelect={onCustomerSelect}
              onValueChange={onCustomerValueChange}
              placeholder="고객사명을 입력하세요"
              onUnregisteredAttempt={onUnregisteredCustomerAttempt}
            />
          ) : (
            <Input defaultValue={defaultValues?.customer} placeholder="고객사를 입력하세요" />
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>사업기회</Label>
          {onOpportunityChange && opportunityOptions ? (
            <EntityAutocomplete
              value={opportunity}
              target="opportunities"
              onValueChange={onOpportunityChange}
              onSelect={(suggestion) => {
                if (suggestion) {
                  onOpportunitySuggestionSelect?.(suggestion)
                  return
                }
                onOpportunitySuggestionSelect?.(null)
              }}
              disabled={!customerValue}
              allowCustomValue
              placeholder={customerValue ? "사업기회를 입력하세요" : "고객사를 먼저 선택하세요"}
              emptyMessage="등록된 사업기회가 없습니다."
              filterSuggestion={(suggestion) =>
                !customerValue ||
                suggestion.metadata.customerCode === customerValue ||
                suggestion.metadata.customerId === customerValue
              }
            />
          ) : (
            <Input defaultValue={defaultValues?.opportunity} placeholder="사업기회를 입력하세요" />
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>활동일 *</Label>
          <Input type="date" value={resolvedDate} onChange={(event) => updateValues((current) => ({ ...current, date: event.target.value }))} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>활동형태 *</Label>
            <Select value={resolvedActivityMode} onValueChange={handleActivityModeChange}>
              <SelectTrigger><SelectValue placeholder="선택하세요" /></SelectTrigger>
              <SelectContent>
                {activityModeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>활동내용 *</Label>
            <Select value={resolvedActivityContent} onValueChange={(value) => updateValues((current) => ({ ...current, activityContent: value }))}>
              <SelectTrigger><SelectValue placeholder="선택하세요" /></SelectTrigger>
              <SelectContent>
                {activityContentOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {needsActivityRequest && !linkedRequestId && (
              <p className="text-sm text-muted-foreground">
                상담/기타를 제외한 활동내용은 일반적으로 활동 요청을 받아 진행합니다.
              </p>
            )}
            {resolvedActivityContent !== "" && !needsActivityRequest && (
              <p className="text-sm text-muted-foreground">
                상담/기타 유형은 활동 요청 없이 영업대표가 직접 등록하는 경우가 많습니다.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>장소</Label>
          <Input
            value={locationValue}
            onChange={(event) => updateValues((current) => ({ ...current, location: event.target.value }))}
            placeholder="활동 장소를 입력하세요"
            readOnly={isAutomaticLocation}
          />
        </div>
        <div className="space-y-2">
          <Label>참석자</Label>
          <Input
            value={resolvedAttendees}
            onChange={(event) => updateValues((current) => ({ ...current, attendees: event.target.value }))}
            placeholder="참석자 이름 또는 사번을 쉼표로 구분해 입력하세요"
          />
          <p className="text-sm text-muted-foreground">저장 시 백엔드에는 사용자 ID 배열로 전달됩니다.</p>
        </div>
      </div>
      <div className="space-y-2">
        <Label>주요 내용 *</Label>
        <Textarea value={resolvedContent} onChange={(event) => updateValues((current) => ({ ...current, content: event.target.value }))} rows={4} />
      </div>
      <div className="space-y-2">
        <Label>고객 관심 사항 / 이슈</Label>
        <Textarea value={resolvedIssues} onChange={(event) => updateValues((current) => ({ ...current, issues: event.target.value }))} rows={3} />
      </div>
      <div className="space-y-2">
        <Label>다음 할 일</Label>
        <Textarea value={resolvedNextAction} onChange={(event) => updateValues((current) => ({ ...current, nextAction: event.target.value }))} rows={3} />
      </div>
    </>
  )
}
