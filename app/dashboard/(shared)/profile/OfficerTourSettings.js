'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/components/auth/UserContext'
import Button from '@/components/ui/Button'
import { readTourStatus, saveTourStatus, subscribeTour } from '@/lib/officer-tour.mjs'
import styles from './Profile.module.css'
import tourStyles from './OfficerTourSettings.module.css'

export default function OfficerTourSettings({ onNotify }) {
  const user = useUser()
  const router = useRouter()
  const status = useSyncExternalStore(subscribeTour, () => readTourStatus(user.id), () => null)
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
    onNotify({
      type: persisted ? 'success' : 'warning',
      message: persisted ? 'Tutorial preference saved.' : 'Browser storage is unavailable. This preference applies for this visit only.',
    })
  }

  return <section ref={sectionRef} className={styles.card} aria-labelledby="onboarding-heading">
    <div className={`${styles.cardHeader} ${tourStyles.header}`}>
      <div>
        <h2 id="onboarding-heading">Onboarding</h2>
        <p id="tutorial-description" className={styles.cardDescription}>Learn the daily dispatch workflow, from reviewing hotzones to monitoring crews. This walkthrough explains each step without creating tasks or publishing routes.</p>
      </div>
    </div>
    <div className={tourStyles.rows}>
      <label className={tourStyles.row}>
        <span className={tourStyles.copy}>
          <span className={tourStyles.label}>Daily dispatch tutorial</span>
          <span id="tutorial-auto-description" className={tourStyles.description}>Show the guide on your next Command Center visit until you finish or skip it.</span>
        </span>
        <span className={tourStyles.switch}>
          <input type="checkbox" role="switch" aria-label="Daily dispatch tutorial"
            checked={status !== null && status !== 'disabled'} disabled={status === null}
            aria-describedby="tutorial-auto-description" onChange={event => save(event.target.checked ? 'new' : 'disabled')} />
          <span className={tourStyles.track} aria-hidden="true" />
        </span>
      </label>
      <div className={`${tourStyles.row} ${tourStyles.replay}`}>
        <div className={tourStyles.copy}>
          <h3 className={tourStyles.label}>Walk through it again</h3>
          <p className={tourStyles.description}>Replay all six steps from the beginning. This also turns the tutorial on.</p>
        </div>
        <Button type="button" variant="secondary" disabled={status === null} onClick={() => { save('new'); router.push('/dashboard/officer') }}>Replay tutorial</Button>
      </div>
    </div>
    <p className={tourStyles.note}>Saved for your account in this browser only. Settings do not carry over to other devices.</p>
  </section>
}
