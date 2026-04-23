"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { activityTypeOptions, type ActivityRecord } from "@/lib/activity-data"

const automaticLocationTypes = ["이메일", "전화", "영상회의"]

type ActivityFormFieldsProps = {
  defaultValues?: Partial<ActivityRecord>
}

export function ActivityFormFields({ defaultValues }: ActivityFormFieldsProps) {
  const [activityType, setActivityType] = useState(defaultValues?.type ?? "")
  const [location, setLocation] = useState(defaultValues?.location ?? "")
  const isAutomaticLocation = automaticLocationTypes.includes(activityType)
  const locationValue = isAutomaticLocation ? activityType : location

  const handleActivityTypeChange = (nextType: string) => {
    setActivityType(nextType)
    if (automaticLocationTypes.includes(nextType)) {
      setLocation(nextType)
      return
    }

    if (automaticLocationTypes.includes(activityType)) {
      setLocation("")
    }
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>고객사 *</Label>
          <Input defaultValue={defaultValues?.customer} placeholder="고객사를 입력하세요" />
        </div>
        <div className="space-y-2">
          <Label>사업기회</Label>
          <Input defaultValue={defaultValues?.opportunity} placeholder="사업기회를 입력하세요" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>활동일 *</Label>
          <Input type="date" defaultValue={defaultValues?.date} />
        </div>
        <div className="space-y-2">
          <Label>활동 구분 *</Label>
          <Select value={activityType} onValueChange={handleActivityTypeChange}>
            <SelectTrigger><SelectValue placeholder="선택하세요" /></SelectTrigger>
            <SelectContent>
              {activityTypeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
