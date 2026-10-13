'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { readAuthToken, subscribeAuthToken } from '@/lib/auth-token.mjs'

export default function usePublicAccount() {
  const token = useSyncExternalStore(subscribeAuthToken, readAuthToken, () => null)
  const [account, setAccount] = useState(null)
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL || ''}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
    }).then(async response => {
      if (!response.ok) return { user: null, invalid: response.status === 401 }
      return response.json()
    }).then(result => {
      if (!controller.signal.aborted) setAccount({ token, user: result.user, invalid: result.invalid })
    }).catch(() => {})
    return () => controller.abort()
  }, [token])
  const current = account?.token === token ? account : null
  return { user: current?.user, hasSession: Boolean(token) && !current?.invalid }
}
