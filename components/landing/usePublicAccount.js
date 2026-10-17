'use client'
import { useEffect, useSyncExternalStore } from 'react'
import { getSessionMetadata, subscribeSession, loadSessionMetadata } from '@/lib/auth-token.mjs'

export default function usePublicAccount() {
  const session = useSyncExternalStore(subscribeSession, getSessionMetadata, () => null)
  useEffect(() => { void loadSessionMetadata() }, [])
  return { user: session?.state === 'full' ? session.user : null, hasSession: session?.state === 'full' }
}
