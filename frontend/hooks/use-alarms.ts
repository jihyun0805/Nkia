"use client";

import { useState, useEffect, useCallback } from "react";
import { alarmApi, type AlarmResponse } from "@/lib/api/alarm";
import { loadAuthSession } from "@/lib/auth-session";

const POLL_INTERVAL = 30_000;
const ALARM_UPDATE_EVENT = "orbis-alarms-updated";
const CACHE_KEY_PREFIX = "orbis-alarm-cache-";
const CACHE_TTL_DAYS = 30;

// 캐시 타입
export interface CachedAlarm extends AlarmResponse {
  cachedAt: string; // 처음 저장된 시각
  dismissedAt: string | null; // 사용자가 "완료/처리하기" 누른 시각. null = 미처리
}

// 캐시 유틸
function getCacheKey(): string | null {
  const session = loadAuthSession();
  if (!session?.email) return null;
  return CACHE_KEY_PREFIX + session.email;
}

function loadCache(): Map<number, CachedAlarm> {
  const key = getCacheKey();
  if (!key || typeof window === "undefined") return new Map();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Map();
    const entries: CachedAlarm[] = JSON.parse(raw);
    return new Map(entries.map((e) => [e.id, e]));
  } catch {
    return new Map();
  }
}

function saveCache(map: Map<number, CachedAlarm>) {
  const key = getCacheKey();
  if (!key || typeof window === "undefined") return;

  const cutoff = Date.now() - CACHE_TTL_DAYS * 86_400_000;

  // 만료 기준: dismissedAt이 있으면 dismissedAt 기준, 없으면 cachedAt 기준
  const entries = Array.from(map.values()).filter((e) => {
    const refTime = e.dismissedAt ? new Date(e.dismissedAt).getTime() : new Date(e.cachedAt).getTime();
    return refTime > cutoff;
  });

  window.localStorage.setItem(key, JSON.stringify(entries));
}

function mergeIntoCache(cache: Map<number, CachedAlarm>, fresh: AlarmResponse[]): Map<number, CachedAlarm> {
  const next = new Map(cache);
  for (const alarm of fresh) {
    const existing = next.get(alarm.id);
    if (existing) {
      // 이미 있으면 isRead 상태만 갱신, dismissedAt 등은 유지
      next.set(alarm.id, { ...existing, isRead: alarm.isRead });
    } else {
      next.set(alarm.id, {
        ...alarm,
        cachedAt: new Date().toISOString(),
        dismissedAt: null,
      });
    }
  }
  return next;
}

// 이벤트
export function emitAlarmUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ALARM_UPDATE_EVENT));
  }
}

export function useAlarms() {
  const [unread, setUnread] = useState<AlarmResponse[]>([]);

  const fetchAlarms = useCallback(async () => {
    if (!loadAuthSession()) return;
    try {
      const res = await alarmApi.getUnreadAlarms();
      const fresh = res.data ?? [];

      const cache = loadCache();
      const updated = mergeIntoCache(cache, fresh);
      saveCache(updated);

      setUnread(fresh);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAlarms();
    const interval = setInterval(fetchAlarms, POLL_INTERVAL);
    const handleUpdate = () => fetchAlarms();
    window.addEventListener(ALARM_UPDATE_EVENT, handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener(ALARM_UPDATE_EVENT, handleUpdate);
    };
  }, [fetchAlarms]);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await alarmApi.markAsRead(id);

      const cache = loadCache();
      const entry = cache.get(id);
      if (entry) {
        cache.set(id, { ...entry, isRead: true });
        saveCache(cache);
      }

      setUnread((prev) => prev.filter((a) => a.id !== id));
    } catch {}
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await alarmApi.markAllAsRead();

      const cache = loadCache();
      for (const [id, entry] of cache) {
        cache.set(id, { ...entry, isRead: true });
      }
      saveCache(cache);

      setUnread([]);
    } catch {
      // ignore
    }
  }, []);

  return { alarms: unread, markAsRead, markAllAsRead, refetch: fetchAlarms };
}

// useAlarmHistory — 나의 업무용
export function useAlarmHistory() {
  const [pending, setPending] = useState<CachedAlarm[]>([]);
  const [completed, setCompleted] = useState<CachedAlarm[]>([]);

  const reload = useCallback(() => {
    const cache = loadCache();
    const now = Date.now();
    const cutoff = now - CACHE_TTL_DAYS * 86_400_000;

    const all = Array.from(cache.values()).filter((e) => {
      // dismissedAt 기준 30일, 없으면 cachedAt 기준 30일
      const refTime = e.dismissedAt ? new Date(e.dismissedAt).getTime() : new Date(e.cachedAt).getTime();
      return refTime > cutoff;
    });

    const sortedDesc = [...all].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setPending(sortedDesc.filter((e) => e.dismissedAt === null));
    setCompleted(sortedDesc.filter((e) => e.dismissedAt !== null));
  }, []);

  useEffect(() => {
    reload();
    const handleUpdate = () => reload();
    window.addEventListener(ALARM_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(ALARM_UPDATE_EVENT, handleUpdate);
  }, [reload]);

  // 완료 처리 — dismissedAt 기록, 30일 후 자동 만료
  const dismiss = useCallback(
    (id: number) => {
      const cache = loadCache();
      const entry = cache.get(id);
      if (entry) {
        cache.set(id, { ...entry, dismissedAt: new Date().toISOString() });
        saveCache(cache);
      }
      reload();
    },
    [reload],
  );

  // 대기 중 전체 완료 처리
  const dismissAll = useCallback(() => {
    const cache = loadCache();
    const now = new Date().toISOString();
    for (const [id, entry] of cache) {
      if (entry.dismissedAt === null) {
        cache.set(id, { ...entry, dismissedAt: now });
      }
    }
    saveCache(cache);
    reload();
  }, [reload]);

  return { pending, completed, dismiss, dismissAll, reload };
}
