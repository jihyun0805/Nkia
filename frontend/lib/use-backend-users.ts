"use client"

import { useEffect, useState } from "react"
import { loadBackendUsers, type BackendUserSummary } from "@/lib/workflow-backend"

let cachedUsers: BackendUserSummary[] | null = null
let inflight: Promise<BackendUserSummary[]> | null = null

async function fetchOnce(): Promise<BackendUserSummary[]> {
  if (cachedUsers) return cachedUsers
  if (inflight) return inflight
  inflight = loadBackendUsers()
    .then((users) => {
      cachedUsers = Array.isArray(users) ? users : []
      return cachedUsers
    })
    .catch(() => {
      cachedUsers = []
      return cachedUsers
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** 자사 사용자 목록을 모듈 단위로 캐시해 폼 어디서나 즉시 사용. */
export function useBackendUsers(): BackendUserSummary[] {
  const [users, setUsers] = useState<BackendUserSummary[]>(cachedUsers ?? [])

  useEffect(() => {
    let cancelled = false
    if (cachedUsers && users.length > 0) return
    void fetchOnce().then((u) => {
      if (!cancelled) setUsers(u)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return users
}

/** 외부에서 캐시 무효화가 필요할 때 (회원 정보 변경 등) */
export function clearBackendUsersCache() {
  cachedUsers = null
}
