'use client'

import { useSyncExternalStore } from 'react'
import { Clock, TriangleAlert } from 'lucide-react'
import { responseDeadline } from '@/lib/response-deadline.mjs'

const listeners = new Set()
let now = null
let timer
function tick() {
  now = Date.now()
  listeners.forEach(listener => listener())
}
function subscribe(listener) {
  listeners.add(listener)
  if (listeners.size === 1) {
    tick()
    timer = setInterval(tick, 30000)
    window.addEventListener('focus', tick)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      clearInterval(timer)
      window.removeEventListener('focus', tick)
      now = null
    }
  }
}
const snapshot = () => now
const serverSnapshot = () => null

export default function ResponseDeadline({ report, details = false }) {
  const time = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  const deadline = time === null ? null : responseDeadline(report, time)
  if (!deadline) return null
  const Icon = deadline.state === 'scheduled' ? Clock : TriangleAlert
  const color = deadline.state === 'overdue'
    ? 'text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
    : deadline.state === 'at_risk'
      ? 'text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
      : 'text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/15'
  const date = new Date(deadline.deadlineAt).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })
  return <div data-response-deadline={deadline.state} className={`my-2 rounded-lg border px-3 py-2 text-xs leading-relaxed ${color}`}>
    <div className="flex items-start gap-2">
      <Icon size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span><strong>{deadline.label}</strong> · {deadline.timeLabel}</span>
    </div>
    {details && <>
      <div className="mt-1">Target response: <time dateTime={deadline.deadlineAt}>{date}</time></div>
      <p className="mt-1">Target time for response; cleanup completion may take longer.</p>
    </>}
  </div>
}
