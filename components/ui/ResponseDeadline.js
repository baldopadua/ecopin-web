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

export default function ResponseDeadline({ report, details = false, compact = false, brief = false, statement = false }) {
  const time = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  const deadline = time === null ? null : responseDeadline(report, time)
  if (!deadline) return null
  const Icon = deadline.state === 'scheduled' ? Clock : TriangleAlert
  const tone = deadline.state === 'overdue'
    ? { rule: 'border-red-700 dark:border-red-300', label: 'text-red-700 dark:text-red-300' }
    : deadline.state === 'at_risk'
      ? { rule: 'border-amber-700 dark:border-amber-300', label: 'text-amber-800 dark:text-amber-300' }
      : { rule: 'border-gray-300 dark:border-white/25', label: '' }
  if (statement) {
    const when = new Date(deadline.deadlineAt).toLocaleString(undefined, { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    const lead = deadline.state === 'overdue' ? 'Overdue by' : 'Due in'
    return <div data-response-deadline={deadline.state} className="py-4 border-t border-[var(--landing-border)]">
      <p className="flex items-baseline gap-2">
        <span className="text-sm opacity-80">{lead}</span>
        <span className={`text-2xl font-medium tabular-nums ${tone.label}`}>{deadline.timeLabel.replace(/ (overdue|left)$/, '')}</span>
      </p>
      <p className="mt-1 text-sm opacity-80">Response target {deadline.state === 'overdue' ? 'was' : 'is'} <time dateTime={deadline.deadlineAt}>{when}</time>. Cleanup may take longer.</p>
    </div>
  }
  if (brief) {
    const lead = deadline.state === 'overdue' ? 'Overdue by' : 'Due in'
    return <div data-response-deadline={deadline.state} className="shrink-0 text-right leading-tight" aria-label={`${deadline.label}, ${deadline.timeLabel}`}>
      <span className="block text-xs opacity-80">{lead}</span>
      <span className={`block text-base font-medium tabular-nums ${tone.label}`}>{deadline.timeLabel.replace(/ (overdue|left)$/, '')}</span>
    </div>
  }
  if (compact) {
    return <p data-response-deadline={deadline.state} className="mt-1 flex items-start gap-2 text-sm leading-snug">
      <Icon size={16} className={`mt-0.5 shrink-0 ${tone.label}`} aria-hidden="true" />
      <span><span className={`font-medium ${tone.label}`}>{deadline.label}</span> <span className="opacity-80">{deadline.timeLabel}</span></span>
    </p>
  }
  const date = new Date(deadline.deadlineAt).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })
  return <div data-response-deadline={deadline.state} className={`my-2 border-l-[3px] pl-3 py-0.5 text-sm leading-snug ${tone.rule}`}>
    <div className="flex items-start gap-2">
      <Icon size={16} className={`mt-0.5 shrink-0 ${tone.label}`} aria-hidden="true" />
      <div>
        <span className={`block font-medium ${tone.label}`}>{deadline.label}</span>
        <span className="block opacity-80">{deadline.timeLabel}</span>
      </div>
    </div>
    {details && <>
      <div className="mt-2 opacity-80">Target response: <time dateTime={deadline.deadlineAt}>{date}</time></div>
      <p className="mt-1 opacity-80">Target time for response; cleanup completion may take longer.</p>
    </>}
  </div>
}
