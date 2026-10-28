'use client'
import Link from 'next/link'
import { useUser } from '@/components/auth/UserContext'
import { AlertTriangle } from 'lucide-react'
import useUrgencyQueue from './useUrgencyQueue'
import styles from './UrgencyQueue.module.css'

export default function UrgencyAlert() {
  const user=useUser()
  const queue=useUrgencyQueue()
  if (!['officer','admin'].includes(user?.role)) return null
  if (queue.isError) return <div className={styles.alert} role="status">
    <span>Urgency alerts could not refresh. Open the queue or try again.</span>
    <button type="button" onClick={()=>queue.refetch()}>Retry alerts</button>
    <Link href="/dashboard/officer/urgent-verification">Urgent queue</Link>
  </div>
  const count=queue.data?.total ?? 0
  if (!count) return null
  return <div className={styles.alert} role="status" aria-live="polite" aria-atomic="true">
    <AlertTriangle size={20} aria-hidden="true" />
    <span><strong>{count} urgent {count===1?'report needs':'reports need'} verification.</strong> Review before dispatch.</span>
    <Link href="/dashboard/officer/urgent-verification">Review urgent reports</Link>
  </div>
}
