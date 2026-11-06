'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useUser } from '@/components/auth/UserContext'
import { useNavigationLoading } from '@/components/context/NavigationLoadingContext'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { readTourStatus, saveTourStatus, subscribeTour } from '@/lib/officer-tour.mjs'
import styles from './OfficerDispatchTour.module.css'

const steps = [
  {
    "title": "Start the daily review",
    "path": "/dashboard/officer",
    "target": "[data-tour=\"route-generation\"]",
    "location": "Command Center → Run Optimization",
    "description": "Review activity totals, Active Targets and Priority Hotzones before planning the day.",
    "checks": [
      "Open Active Targets to inspect ongoing work.",
      "Run Optimization opens route planning, which we will visit after reviewing reports and crews."
    ]
  },
  {
    "title": "Verify urgent requests",
    "path": "/dashboard/officer/urgent-verification",
    "target": "[data-tour=\"urgency-queue\"]",
    "location": "Urgent verification → Requests",
    "description": "Review citizen urgency requests and their evidence before approving a response.",
    "checks": [
      "Use status filters and open reports to inspect evidence.",
      "Prepare dispatch starts planning for an approved incident. Approval and dispatch are separate actions."
    ]
  },
  {
    "title": "Review individual reports",
    "path": "/dashboard/officer/reports",
    "target": "[data-tour=\"reports-list\"]",
    "location": "Reports → Report list",
    "description": "Search citizen reports and review their validation and response states.",
    "checks": [
      "Open a report to inspect its details and evidence.",
      "Resolve required manual review before dispatching eligible work."
    ]
  },
  {
    "title": "Review priority hotzones",
    "path": "/dashboard/officer/hotzone-intel",
    "target": "[data-tour=\"hotzone-list\"]",
    "location": "Hotzone Intel → Hotzone list",
    "description": "Compare areas needing attention, then open a hotzone to inspect its reports.",
    "checks": [
      "Use search and filters to narrow the list.",
      "Review severity, priority, location and evidence before selecting work."
    ]
  },
  {
    "title": "Inspect locations on the map",
    "path": "/dashboard/officer/map-grid",
    "target": "[aria-label=\"Environmental reports map\"]",
    "location": "Map Grid → Environmental reports map",
    "description": "Locate reports, hotzones and assigned cleanup work geographically.",
    "checks": [
      "Use Controls and filters to narrow the map.",
      "Select map markers to inspect the location and linked evidence."
    ]
  },
  {
    "title": "Check crew readiness",
    "path": "/dashboard/officer/crew-management",
    "target": "[data-tour=\"crew-views\"]",
    "location": "Crew Management → Manage Members / Performance & CSAT",
    "description": "Check the roster and existing workload before assigning more work.",
    "checks": [
      "Manage Members shows squads and unassigned personnel.",
      "Review assigned tasks and capacity. Performance & CSAT shows crew outcomes and resident feedback."
    ]
  },
  {
    "title": "Create a task manually",
    "path": "/dashboard/officer/operations",
    "target": "[data-tour=\"create-task\"]",
    "location": "Operations → Create cleanup task",
    "description": "Use manual creation to group specific reports into an assignment.",
    "checks": [
      "Create cleanup task opens report selection and assignment.",
      "The next two steps show that page without saving an assignment."
    ]
  },
  {
    "title": "Select the reports",
    "reveal": "[data-tour-view=reports]",
    "path": "/dashboard/officer/operations/create",
    "target": "[aria-label=\"Report selection\"]",
    "location": "Create cleanup task → Reports",
    "description": "Select unresolved reports using map pins or report checkboxes.",
    "checks": [
      "Search by title, type or ID and review the selected count.",
      "Already assigned or restricted reports are excluded from eligible work."
    ]
  },
  {
    "title": "Enter details and assign crew",
    "reveal": "[data-tour-view=details]",
    "path": "/dashboard/officer/operations/create",
    "target": "[aria-label=\"Task details\"]",
    "location": "Create cleanup task → Task details",
    "description": "Enter the title, priority and description, then choose field crew.",
    "checks": [
      "Review the selected reports and assigned crew summary.",
      "Create Cleanup Task saves a real assignment. This guide does not press it."
    ]
  },
  {
    "title": "Configure route planning",
    "path": "/dashboard/officer/optimization",
    "target": "[data-tour=\"dispatch-settings\"]",
    "location": "Optimization → Dispatch settings",
    "description": "Choose Cluster, Sweeper or Mixed focus and review travel settings.",
    "checks": [
      "Mixed combines clusters with eligible nearby reports.",
      "Review advanced settings and remaining crew capacity. Unfinished assignments already consume capacity."
    ]
  },
  {
    "title": "Generate a draft",
    "path": "/dashboard/officer/optimization",
    "target": "[data-tour=\"generate-proposal\"]",
    "location": "Optimization → Generate Route Proposal",
    "description": "This button calculates a proposal using the selected settings.",
    "checks": [
      "Generation creates a draft; it does not publish routes.",
      "Review any generation error before retrying. The guide never runs the solver for you."
    ]
  },
  {
    "title": "Review the route proposal",
    "path": "/dashboard/officer/optimization",
    "target": "[data-tour=\"route-proposal\"]",
    "location": "Optimization → Dispatch proposal ready (below settings)",
    "description": "Once a draft exists, inspect crews, stop order, route map and travel estimates.",
    "checks": [
      "Review capacity notes and work left in the backlog.",
      "Check available time, vehicle load and crew qualifications before confirmation."
    ],
    "unavailable": "No draft proposal is visible. After generation, Dispatch proposal ready appears below Dispatch settings."
  },
  {
    "title": "Confirm dispatch",
    "path": "/dashboard/officer/optimization",
    "target": "[data-tour=\"confirm-dispatch\"]",
    "location": "Optimization → Proposal → Confirm and dispatch to field crews",
    "description": "The button at the bottom of the proposal publishes reviewed routes to crews.",
    "checks": [
      "Confirm only after reviewing the plan and wait for the success message.",
      "If publication fails, review the specific error before retrying."
    ],
    "unavailable": "The confirmation button appears at the bottom of an eligible draft. No dispatch is performed during this tour."
  },
  {
    "title": "Monitor and review cleanup work",
    "path": "/dashboard/officer/operations",
    "target": "[data-tour=\"operations-list\"]",
    "location": "Operations → Task list",
    "description": "Follow assignments through pending, in-progress and completed states.",
    "checks": [
      "Search or filter by status, then open a task for linked reports, field updates and cleanup evidence.",
      "Unfinished assignments continue to count toward the next plan."
    ]
  },
  {
    "title": "Print the operations summary",
    "path": "/dashboard/officer/operations",
    "target": "a[href=\"/dashboard/operations-summary\"]",
    "location": "Operations → Print operations summary",
    "description": "Open the printable summary to report on cleanup operations.",
    "checks": [
      "Review the summary before printing or sharing.",
      "Use Crew Management → Performance & CSAT and Metrics for follow-up analysis."
    ]
  },
  {
    "title": "Review outcomes",
    "path": "/dashboard/officer/metrics",
    "target": "#overview-panel h2",
    "location": "Metrics → How are reports progressing?",
    "description": "Review report activity, response outcomes, barangay workloads and resident ratings.",
    "checks": [
      "Compare report categories and response states.",
      "Use these results for the next daily review. Replay the guide from Profile & account → Onboarding."
    ]
  },
  {
    "title": "Plan the next inspection",
    "path": "/dashboard/spatial-scan",
    "target": "[aria-label=\"Spatial forecast map\"]",
    "location": "Spatial Scan → Hotspot forecast",
    "description": "Review forecast areas to plan the next inspection.",
    "checks": [
      "Compare risk levels and available forecast snapshots. Forecasts guide inspection; they do not dispatch crews.",
      "Return to Command Center for the next daily review. Replay this walkthrough from Profile & account → Onboarding."
    ]
  }
]

export default function OfficerDispatchTour() {
  const user = useUser()
  const pathname = usePathname()
  const router = useRouter()
  const { isLoading } = useNavigationLoading()
  const status = useSyncExternalStore(subscribeTour, () => readTourStatus(user?.id), () => null)
  const [step, setStep] = useState(0)
  const cardRef = useRef(null)
  const highlightRef = useRef(null)
  const headingRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [targetFound, setTargetFound] = useState(false)
  const current = steps[step]
  const active = Boolean(user?.role === 'officer' && status === 'new' && (started || pathname === '/dashboard/officer'))
  const open = active && !isLoading
  const go = next => {
    setStarted(true)
    setStep(next)
    if (pathname !== steps[next].path) router.push(steps[next].path, { scroll: false })
  }
  const close = () => {
    saveTourStatus(user.id, 'dismissed')
    setStarted(false)
    setStep(0)
  }

  useEffect(() => {
    if (!open) return
    const card = cardRef.current
    const highlight = highlightRef.current
    let target = null
    headingRef.current?.focus({ preventScroll: true })

    const position = () => {
      const found = pathname === current.path ? document.querySelector(current.target) : null
      // Only reveal presentation tabs; tutorial steps never activate workflow actions.
      if (found && !found.getClientRects().length && current.reveal) {
        const tab = document.querySelector(current.reveal)
        if (tab?.getAttribute('aria-pressed') === 'false') tab.click()
      }
      if (found !== target || (found && highlight.hidden && found.getClientRects().length)) {
        target = found
        target?.scrollIntoView({ block: window.innerWidth < 640 ? 'start' : 'center', inline: 'nearest', behavior: 'instant' })
      }
      setTargetFound(Boolean(target?.getClientRects().length))
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
        if (rect.left >= width + gap * 2) {
          left = rect.left - width - gap
          top = rect.top
        } else if (rect.right + width + gap * 2 <= window.innerWidth) {
          left = rect.right + gap
          top = rect.top
        } else if (top + height > window.innerHeight - gap) {
          top = rect.top >= height + gap * 2 ? rect.top - height - gap : window.innerHeight - height - gap
        }
      }
      card.style.left = `${Math.max(gap, Math.min(left, window.innerWidth - width - gap))}px`
      card.style.top = `${Math.max(gap, Math.min(top, window.innerHeight - height - gap))}px`
    }
    position()
    const observer = new ResizeObserver(position)
    observer.observe(card)
    const mutations = new MutationObserver(position)
    const workspace = document.getElementById('workspace-content')
    if (workspace) {
      observer.observe(workspace)
      mutations.observe(workspace, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-view', 'hidden'] })
    }
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    return () => {
      observer.disconnect()
      mutations.disconnect()
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [open, current, pathname])

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
        {!targetFound && <p className={styles.tip} role="status">{pathname !== current.path ? 'Opening the next workflow page…' : current.unavailable || 'This section is loading or unavailable. Check the page for an error, or skip ahead and return later.'}</p>}
        <p className={styles.tip}>Guided preview only. No tasks are created and no crews are dispatched.</p>
      </div>
      <div className={styles.actions}>
        <Button type="button" variant="secondary" disabled={step === 0} onClick={() => go(step - 1)}>Back</Button>
        <Button type="button" onClick={() => {
          if (step === steps.length - 1) { saveTourStatus(user.id, 'completed'); setStarted(false); setStep(0) }
          else go(step + 1)
        }}>
          {step === steps.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </div>
      <Link href="/dashboard/profile#onboarding-heading" className={styles.settings} onClick={close}>Manage tutorial in Profile</Link>
    </div>
  </Dialog>
}
