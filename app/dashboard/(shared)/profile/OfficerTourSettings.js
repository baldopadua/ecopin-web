'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/components/auth/UserContext'
import Button from '@/components/ui/Button'
import { readTourStatus, saveTourStatus, subscribeTour } from '@/lib/officer-tour.mjs'
import styles from './Profile.module.css'

export default function OfficerTourSettings() {
  const user = useUser()
  const router = useRouter()
  const status = useSyncExternalStore(subscribeTour, () => readTourStatus(user.id), () => null)
  const [message, setMessage] = useState('')
  const sectionRef = useRef(null)
  useEffect(() => {
    if (window.location.hash !== '#onboarding-heading') return
    const section = sectionRef.current
    const header = section.closest('main')?.querySelector('header')
    section.style.scrollMarginTop = `${(header?.getBoundingClientRect().height || 0) + 24}px`
    section.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [])
  const save = value => {
    const persisted = saveTourStatus(user.id, value)
    setMessage(persisted ? 'Tutorial preference saved.' : 'Browser storage is unavailable. This preference applies for this visit only.')
  }

  return <section ref={sectionRef} className={styles.card} aria-labelledby="onboarding-heading">
    <div className={styles.cardHeader}>
      <div>
        <h2 id="onboarding-heading">Onboarding</h2>
        <p id="tutorial-description" className={styles.cardDescription}>Follow Hotzone review → Route Generation → Dispatch with a guided tour of the Command Center. Preferences are saved for your account in this browser.</p>
      </div>
    </div>
    <label className="flex items-center gap-3 min-h-11 cursor-pointer">
      <input type="checkbox" role="switch" className="h-5 w-5" checked={status !== null && status !== 'disabled'} disabled={status === null}
        aria-describedby="tutorial-description" onChange={event => save(event.target.checked ? 'new' : 'disabled')} />
      <span>Daily dispatch tutorial</span>
    </label>
    <p className={`${styles.cardDescription} mb-4`}>When enabled, the tour opens on your next Command Center visit until you finish or skip it. Replay enables the tutorial and starts from step one.</p>
    <Button type="button" disabled={status === null} onClick={() => { save('new'); router.push('/dashboard/officer') }}>Replay tutorial</Button>
    <p role="status" className={styles.cardDescription}>{message}</p>
  </section>
}
