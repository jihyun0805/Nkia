"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { ChatbotModal } from "@/components/erp/chatbot-modal"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { currentUser } from "@/lib/current-user"
import {
  dismissWorkflowNotification,
  getWorkflowNotifications,
  subscribeWorkflowUpdates,
  type WorkflowNotification,
} from "@/lib/activity-request-workflow"

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([])

  useEffect(() => {
    const sync = () => setNotifications(getWorkflowNotifications(currentUser.name))

    sync()
    return subscribeWorkflowUpdates(sync)
  }, [])

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
          <ChatbotModal />

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
                      <div className="mt-3 flex justify-end gap-2">
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={notification.href}>열기</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => dismissWorkflowNotification(notification.id)}
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
