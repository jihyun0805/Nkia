"use client"

import { useState } from "react"
import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface HeaderProps {
  title: string
  description?: string
}

const initialNotifications = [
  {
    id: "notice-1",
    title: "견적서 수정 요청",
    category: "활동",
    description: "LG CNS 견적서에 수정 요청이 등록되었습니다.",
  },
  {
    id: "notice-2",
    title: "PRB 검토 대기",
    category: "입찰",
    description: "국방부 ITSM 도입 건이 본부장 검토 대기 상태입니다.",
  },
  {
    id: "notice-3",
    title: "유지보수 종료 예정",
    category: "유지보수",
    description: "삼성SDS EMS 유상유지보수 계약이 종료 예정입니다.",
  },
] as const

export function Header({ title, description }: HeaderProps) {
  const [notifications, setNotifications] = useState([...initialNotifications])

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="검색..." 
              className="pl-9 w-64 bg-background"
            />
          </div>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">알림</h4>
                  <p className="text-sm text-muted-foreground">최근 확인이 필요한 항목입니다.</p>
                </div>
                <Badge variant="secondary">{notifications.length}건</Badge>
              </div>
              <Separator />
              {notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{notification.title}</p>
                        <Badge variant="outline">{notification.category}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{notification.description}</p>
                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setNotifications((prev) =>
                              prev.filter((item) => item.id !== notification.id),
                            )
                          }
                        >
                          확인
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  확인이 필요한 알림이 없습니다.
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  )
}
