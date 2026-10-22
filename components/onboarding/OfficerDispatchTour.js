'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useUser } from '@/components/auth/UserContext'
import { useNavigationLoading } from '@/components/context/NavigationLoadingContext'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { readTourStatus, saveTourStatus, subscribeTour } from '@/lib/officer-tour.mjs'
import styles from './OfficerDispatchTour.module.css'

const steps = [
  {
    title: 'Review hotzones', location: 'Command Center → Hotzone Intel',
    target: '[data-command-panel]:has([aria-label="View all Critical Hotzones"]) h2',
    description: 'Start with the reports behind each hotzone before choosing work for today.',
    checks: ['Open a hotzone to review its location, citizen evidence and report status.', 'Compare severity and priority with other areas that need attention.'],
    tip: 'A priority score helps you review work; it does not dispatch a crew.',
  },
  {
    title: 'Check crew readiness', location: 'Crew Management',
    target: 'a[href="/dashboard/officer/crew-management"]',
    description: 'Check that there is a staffed, available crew with room for more work.',
    checks: ['Review crew availability, shift hours and unfinished assignments.', 'Check task limits, vehicle capacity and recorded starting loads. Missing load information may exclude a crew from Mixed planning.'],
    tip: 'Unfinished tasks stay assigned and already consume crew capacity.',
  },
  {
    title: 'Generate routes', location: 'Optimization → Dispatch settings',
    target: '[data-tour="route-generation"]',
    description: 'Open Run Optimization and choose the kind of work you want to plan.',
    checks: ['Choose Cluster, Sweeper or Mixed focus. Mixed combines clusters with eligible nearby reports.', 'Choose the transport mode and review advanced settings, then select Generate Route Proposal.'],
    tip: 'Generate creates a draft. It does not publish routes or assign new work yet.',
  },
  {
    title: 'Review the proposal', location: 'Optimization → Route proposal',
    target: '[data-tour="route-generation"]',
    description: 'Check what the plan can safely fit before you confirm it.',
    checks: ['Review assigned crews, stop order, travel estimates and the route map.', 'Check capacity notes and work left in the backlog. Mixed planning sizes groups to the remaining crew capacity.'],
    tip: 'Task slots are one limit. Remaining time, vehicle load and crew qualifications also matter.',
  },
  {
    title: 'Confirm dispatch', location: 'Optimization → Confirm and dispatch crews',
    target: '[data-tour="route-generation"]',
    description: 'Publish the reviewed plan only when you are ready to send the crews.',
    checks: ['Select Confirm and dispatch crews on the proposal.', 'Wait for route publication to succeed. If it fails, read the specific message and review the affected settings before retrying.'],
    tip: 'This is the step that publishes routes to field crews. The tutorial never performs it for you.',
  },
  {
    title: 'Dispatch and monitor crews', location: 'Command Center → Active Targets / Operations',
    target: '[data-command-panel]:has([aria-label="View all Active Targets"]) h2',
    description: 'After successful dispatch, follow the assigned work through to completion.',
    checks: ['Open Active Targets or Operations to inspect task status and linked reports.', 'Review field updates and cleanup evidence. Unfinished assignments continue to count toward the next plan.'],
    tip: 'You can replay this walkthrough anytime from Profile & account → Onboarding.',
  },
]

export default function OfficerDispatchTour() {
  const user = useUser()
  const { isLoading } = useNavigationLoading()
  const status = useSyncExternalStore(subscribeTour, () => readTourStatus(user?.id), () => null)
  const [step, setStep] = useState(0)
  const cardRef = useRef(null)
  const highlightRef = useRef(null)
  const headingRef = useRef(null)
  const open = Boolean(user?.id && status === 'new' && !isLoading)
  const current = steps[step]
  const close = () => saveTourStatus(user.id, 'dismissed')

  useEffect(() => {
    if (!open) return
    const card = cardRef.current
    const highlight = highlightRef.current
    const target = document.querySelector(current.target)
    target?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
    headingRef.current?.focus({ preventScroll: true })

    const position = () => {
      const rect = target?.getBoundingClientRect()
      const { width, height } = card.getBoundingClientRect()
      const gap = 16
      let left = (window.innerWidth - width) / 2
      let top = (window.innerHeight - height) / 2
      highlight.hidden = !rect || !rect.width || !rect.height
      if (!highlight.hidden) {
        Object.assign(highlight.style, {
          left: `${rect.left - 4}px`, top: `${rect.top - 4}px`,
          width: `${rect.width + 8}px`, height: `${rect.height + 8}px`,
        })
        left = rect.left
        top = rect.bottom + gap
        if (top + height > window.innerHeight - gap) top = rect.top - height - gap
      }
      card.style.left = `${Math.max(gap, Math.min(left, window.innerWidth - width - gap))}px`
      card.style.top = `${Math.max(gap, Math.min(top, window.innerHeight - height - gap))}px`
    }
    position()
    const observer = new ResizeObserver(position)
    observer.observe(card)
    if (target) observer.observe(target)
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [open, current])

  return <Dialog open={open} onClose={close} label="Daily dispatch tutorial" className={styles.tour}>
    <div ref={highlightRef} className={styles.highlight} data-tour-highlight aria-hidden="true" />
    <div ref={cardRef} className={styles.card} data-tour-card>
      <div className={styles.topline}>
        <span>Daily dispatch · Step {step + 1} of {steps.length}</span>
        <button type="button" className={styles.skip} onClick={close}>Skip tour</button>
      </div>
      <progress className={styles.progress} value={step + 1} max={steps.length} aria-label="Tutorial progress" />
      <div aria-live="polite" aria-atomic="true">
        <p className={styles.location}>{current.location}</p>
        <h2 ref={headingRef} tabIndex={-1}>{current.title}</h2>
        <p>{current.description}</p>
        <ul className={styles.checklist}>{current.checks.map(check => <li key={check}>{check}</li>)}</ul>
        <p className={styles.tip}>{current.tip}</p>
      </div>
      <div className={styles.actions}>
        <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
        <Button type="button" onClick={() => step === steps.length - 1 ? saveTourStatus(user.id, 'completed') : setStep(step + 1)}>
          {step === steps.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </div>
      <Link href="/dashboard/profile#onboarding-heading" className={styles.settings} onClick={close}>Manage tutorial in Profile</Link>
    </div>
  </Dialog>
}
