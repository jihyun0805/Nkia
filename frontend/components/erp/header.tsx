"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { ChatbotModal } from "@/components/erp/chatbot-modal";
import { ManagementReportModal } from "@/components/erp/management-report-modal";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAlarms } from "@/hooks/use-alarms";
import { getAlarmNavigationUrl, alarmNeedsConfirmation, type AlarmResponse } from "@/lib/api/alarm";
import { dismissWorkflowNotification, getWorkflowNotifications, subscribeWorkflowUpdates, type WorkflowNotification } from "@/lib/activity-request-workflow";
import { loadBackendActivityRequests } from "@/lib/sales-activity-request-backend";
import { currentUser } from "@/lib/current-user";

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  const router = useRouter();
  const { alarms, markAsRead, markAllAsRead } = useAlarms();
  const [legacyNotifications, setLegacyNotifications] = useState<WorkflowNotification[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<AlarmResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    const sync = () => setLegacyNotifications(getWorkflowNotifications(currentUser.name));

    loadBackendActivityRequests().catch(() => undefined);
    sync();

    const unsubscribe = subscribeWorkflowUpdates(() => {
      if (!cancelled) sync();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const totalCount = alarms.length + legacyNotifications.length;

  const handleAlarmConfirm = async (alarm: AlarmResponse) => {
    await markAsRead(alarm.id);
    setConfirmDialog(null);
    setPopoverOpen(false);
    const url = getAlarmNavigationUrl(alarm.type, alarm.targetId);
    if (url) router.push(url);
  };

  const handleAlarmDismiss = async (alarm: AlarmResponse) => {
    await markAsRead(alarm.id);
    setConfirmDialog(null);
  };

  const handleAlarmClick = (alarm: AlarmResponse) => {
    if (alarmNeedsConfirmation(alarm.type)) {
      setConfirmDialog(alarm);
      return;
    }
    markAsRead(alarm.id);
    const url = getAlarmNavigationUrl(alarm.type, alarm.targetId);
    if (url) {
      setPopoverOpen(false);
      router.push(url);
    }
  };

  const getConfirmButtonLabel = (alarm: AlarmResponse | null) => {
    if (!alarm) return "확인";
    if (alarm.type === "BILLING_ISSUE_REQUEST") return "등록 화면으로 이동";
    if (alarm.type === "BILLING_COLLECTION_REQUEST") return "수금 처리 화면으로 이동";
    return "확인";
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>

        <div className="flex items-center gap-4">
          <ChatbotModal />
          <ManagementReportModal />

          {/* 알림창 */}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                {totalCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">{totalCount}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 space-y-3 max-h-[520px] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">알림</h4>
                  <p className="text-sm text-muted-foreground">확인이 필요한 알림입니다.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{totalCount}건</Badge>
                  {alarms.length > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllAsRead}>
                      모두 읽음
                    </Button>
                  )}
                </div>
              </div>
              <Separator />

              {totalCount > 0 ? (
                <div className="space-y-3">
                  {/* 백엔드 알림 */}
                  {alarms.map((alarm) => (
                    <div key={`alarm-${alarm.id}`} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <p className="font-medium text-sm">{alarm.senderName}</p>
                        <span className="text-xs text-muted-foreground">{alarm.createdAt?.slice(0, 10)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{alarm.message}</p>
                      <div className="mt-3 flex justify-end gap-2">
                        {alarmNeedsConfirmation(alarm.type) ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleAlarmDismiss(alarm)}>
                              아니오
                            </Button>
                            <Button size="sm" onClick={() => setConfirmDialog(alarm)}>
                              확인
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleAlarmClick(alarm)}>
                            확인
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* 기존 워크플로우 알림 */}
                  {legacyNotifications.map((notification) => (
                    <div key={`legacy-${notification.id}`} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <Badge variant="outline">{notification.category}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{notification.description}</p>
                      <div className="mt-3 flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => dismissWorkflowNotification(notification.id)}>
                          확인
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">확인이 필요한 알림이 없습니다.</div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 확인/아니오가 필요한 알림 다이얼로그 */}
      <Dialog
        open={!!confirmDialog}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>알림</DialogTitle>
            <DialogDescription className="text-foreground pt-2">{confirmDialog?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => confirmDialog && handleAlarmDismiss(confirmDialog)}>
              아니오
            </Button>
            <Button onClick={() => confirmDialog && handleAlarmConfirm(confirmDialog)}>{getConfirmButtonLabel(confirmDialog)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
