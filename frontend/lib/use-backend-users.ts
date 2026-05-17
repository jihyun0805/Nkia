"use client"

import { useEffect, useState } from "react"
import { loadAuthSession, subscribeAuthSession } from "@/lib/auth-session"
import { loadBackendUsers, type BackendUserSummary } from "@/lib/workflow-backend"

let cachedUsers: BackendUserSummary[] | null = null
let inflight: Promise<BackendUserSummary[]> | null = null
let cachedSessionKey: string | null = null

function getSessionKey() {
  const session = loadAuthSession()
  return session?.accessToken?.trim() || session?.email?.trim() || null
}

async function fetchOnce(force = false): Promise<BackendUserSummary[]> {
  const sessionKey = getSessionKey()
  const isCacheValid = cachedUsers && cachedUsers.length > 0 && cachedSessionKey === sessionKey

  if (!force && isCacheValid) return cachedUsers ?? []
  if (inflight) return inflight

  if (force) {
    cachedUsers = null
    cachedSessionKey = null
  }

  inflight = loadBackendUsers()
    .then((users) => {
      cachedUsers = Array.isArray(users) ? users : []
      cachedSessionKey = sessionKey
      return cachedUsers
    })
    .catch(() => {
      cachedUsers = []
      cachedSessionKey = null
      return cachedUsers
    })
    .finally(() => {
      inflight = null
    })
  return inflight ?? Promise.resolve([])
}

/** 자사 사용자 목록을 모듈 단위로 캐시해 폼 어디서나 즉시 사용. */
export function useBackendUsers(): BackendUserSummary[] {
  const [users, setUsers] = useState<BackendUserSummary[]>(cachedUsers ?? [])

  useEffect(() => {
    let cancelled = false

    const syncUsers = (force = false) => {
      void fetchOnce(force).then((u) => {
        if (!cancelled) setUsers(u)
      })
    }

    syncUsers()

    const unsubscribe = subscribeAuthSession(() => {
      syncUsers(true)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return users
}

/** 외부에서 캐시 무효화가 필요할 때 (회원 정보 변경 등) */
export function clearBackendUsersCache() {
  cachedUsers = null
  cachedSessionKey = null
  inflight = null
}
