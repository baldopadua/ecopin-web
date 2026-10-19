'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useUser } from '@/components/auth/UserContext'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { readTourStatus, saveTourStatus, subscribeTour } from '@/lib/officer-tour.mjs'
import styles from './OfficerDispatchTour.module.css'

const steps = [
  {
    title: 'Review hotzones',
    target: '[data-command-panel]:has([aria-label="View all Critical Hotzones"]) h2',
    description: 'Start in Critical Hotzones. Open Hotzone Intel to review report details, severity, and priority scores before deciding which areas need attention today.',
  },
  {
    title: 'Generate routes',
    target: '[data-tour="route-generation"]',
    description: 'Open Run Optimization, choose your dispatch focus and settings, then select Generate Route Proposal. Check the proposed stops, crew assignments, and any tasks left in the backlog.',
  },
  {
    title: 'Dispatch and monitor crews',
    target: '[data-command-panel]:has([aria-label="View all Active Targets"]) h2',
    description: 'After reviewing the proposal in Optimization, select Confirm and dispatch to field crews to publish the routes. Return to Active Targets or Operations to monitor progress. This tutorial never generates or dispatches anything.',
  },
]

export default function OfficerDispatchTour() {
  const user = useUser()
  const status = useSyncExternalStore(subscribeTour, () => readTourStatus(user?.id), () => null)
  const [step, setStep] = useState(0)
  const cardRef = useRef(null)
  const highlightRef = useRef(null)
  const headingRef = useRef(null)
  const open = Boolean(user?.id && status === 'new')
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
      <div aria-live="polite" aria-atomic="true">
        <h2 ref={headingRef} tabIndex={-1}>{current.title}</h2>
        <p>{current.description}</p>
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
