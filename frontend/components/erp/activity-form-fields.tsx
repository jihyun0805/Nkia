"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CustomerAutocomplete } from "@/components/erp/customer-autocomplete"
import {
  activityContentOptions,
  activityModeOptions,
  requestOptionalActivityContents,
  type ActivityRecord,
} from "@/lib/activity-data"
import { currentUser } from "@/lib/current-user"
import { type CustomerRecord, type OpportunityRecord } from "@/lib/finding-data"

const automaticLocationModes = ["이메일", "전화", "영상회의"]

type ActivityFormFieldsProps = {
  defaultValues?: Partial<ActivityRecord>
  customerValue?: string
  customerCodeValue?: string
  onCustomerSelect?: (customer: CustomerRecord | null) => void
  onUnregisteredCustomerAttempt?: () => void
  opportunityValue?: string
  opportunityCodeValue?: string
  opportunityOptions?: OpportunityRecord[]
  onOpportunityChange?: (value: string) => void
  requesterValue?: string
  onRequesterChange?: (value: string) => void
  requestIdValue?: string
}

export function ActivityFormFields({
  defaultValues,
  customerValue,
  customerCodeValue,
  onCustomerSelect,
  onUnregisteredCustomerAttempt,
  opportunityValue,
  opportunityCodeValue,
  opportunityOptions,
  onOpportunityChange,
  requesterValue,
  onRequesterChange,
  requestIdValue,
}: ActivityFormFieldsProps) {
  const [activityMode, setActivityMode] = useState(defaultValues?.activityMode ?? "")
  const [activityContent, setActivityContent] = useState(defaultValues?.activityContent ?? "")
  const [location, setLocation] = useState(defaultValues?.location ?? "")
  const registrant = defaultValues?.registrant ?? currentUser.name
  const requester = typeof requesterValue === "string" ? requesterValue : defaultValues?.requester ?? ""
  const linkedRequestId = typeof requestIdValue === "string" ? requestIdValue : defaultValues?.requestId ?? ""
  const opportunity = typeof opportunityValue === "string" ? opportunityValue : defaultValues?.opportunity ?? ""
  const isAutomaticLocation = automaticLocationModes.includes(activityMode)
  const locationValue = isAutomaticLocation ? activityMode : location
  const needsActivityRequest = activityContent !== "" && !requestOptionalActivityContents.includes(activityContent)

  useEffect(() => {
    setActivityMode(defaultValues?.activityMode ?? "")
  }, [defaultValues?.activityMode])

  useEffect(() => {
    setActivityContent(defaultValues?.activityContent ?? "")
  }, [defaultValues?.activityContent])

  useEffect(() => {
    setLocation(defaultValues?.location ?? "")
  }, [defaultValues?.location])

  const handleActivityModeChange = (nextMode: string) => {
    setActivityMode(nextMode)
    if (automaticLocationModes.includes(nextMode)) {
      setLocation(nextMode)
      return
    }

    if (automaticLocationModes.includes(activityMode)) {
      setLocation("")
    }
  }

  return (
    <>
      <div className="space-y-2">
        <Label>등록자</Label>
        <Input value={registrant} readOnly />
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
        <div className="space-y-2">
          <Label>활동요청ID</Label>
          <Input value={linkedRequestId} readOnly placeholder="활동 요청 없이 등록하는 경우 비워집니다" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>고객사 *</Label>
          {typeof customerValue === "string" && onCustomerSelect ? (
            <CustomerAutocomplete
              value={customerValue}
              onSelect={onCustomerSelect}
              placeholder="고객사명을 입력하세요"
              onUnregisteredAttempt={onUnregisteredCustomerAttempt}
            />
          ) : (
            <Input defaultValue={defaultValues?.customer} placeholder="고객사를 입력하세요" />
          )}
          <p className="text-sm text-muted-foreground">
            등록된 고객사만 선택할 수 있으며 고객코드가 함께 승계됩니다.
          </p>
        </div>
        <div className="space-y-2">
          <Label>고객사 코드</Label>
          <Input value={customerCodeValue || "-"} readOnly />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>사업기회</Label>
          {onOpportunityChange && opportunityOptions ? (
            <Select
              value={opportunity}
              onValueChange={onOpportunityChange}
              disabled={!customerCodeValue}
            >
              <SelectTrigger>
                <SelectValue placeholder={customerCodeValue ? "사업기회를 선택하세요" : "고객사를 먼저 선택하세요"} />
              </SelectTrigger>
              <SelectContent>
                {opportunityOptions.map((item) => (
                  <SelectItem key={item.id} value={item.name}>
                    {item.name}
                  </SelectItem>
                ))}
                <SelectItem value="미확인">미확인</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input defaultValue={defaultValues?.opportunity} placeholder="사업기회를 입력하세요" />
          )}
        </div>
        <div className="space-y-2">
          <Label>사업기회 코드</Label>
          <Input value={opportunityCodeValue || "-"} readOnly />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>활동일 *</Label>
          <Input type="date" defaultValue={defaultValues?.date} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>활동형태 *</Label>
            <Select value={activityMode} onValueChange={handleActivityModeChange}>
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
            <Select value={activityContent} onValueChange={setActivityContent}>
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
            {activityContent !== "" && !needsActivityRequest && (
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
            onChange={(event) => setLocation(event.target.value)}
            placeholder="활동 장소를 입력하세요"
            readOnly={isAutomaticLocation}
          />
        </div>
        <div className="space-y-2">
          <Label>참석자</Label>
          <Input defaultValue={defaultValues?.attendees} placeholder="참석자를 입력하세요" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>주요 내용 *</Label>
        <Textarea defaultValue={defaultValues?.content} rows={4} />
      </div>
      <div className="space-y-2">
        <Label>고객 관심 사항 / 이슈</Label>
        <Textarea defaultValue={defaultValues?.issues} rows={3} />
      </div>
      <div className="space-y-2">
        <Label>다음 할 일</Label>
        <Textarea defaultValue={defaultValues?.nextAction} rows={3} />
      </div>
    </>
  )
}
