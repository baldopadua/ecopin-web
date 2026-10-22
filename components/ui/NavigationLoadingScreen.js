'use client'
import { useEffect, useId, useRef } from 'react'
import Image from 'next/image'
import { useNavigationLoading } from '@/components/context/NavigationLoadingContext'
import styles from './NavigationLoadingScreen.module.css'

export default function NavigationLoadingScreen() {
  const { isLoading, targetName } = useNavigationLoading()
  const dialogRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!isLoading) return
    const dialog = dialogRef.current
    // The modal top layer escapes the workspace scrollport and makes the sidebar inert.
    const scrollports = [document.documentElement, document.body, document.getElementById('workspace-content')].filter(Boolean)
    const previousOverflow = scrollports.map(element => element.style.overflow)
    scrollports.forEach(element => { element.style.overflow = 'hidden' })
    dialog.showModal()
    dialog.focus({ preventScroll: true })
    return () => {
      dialog.close()
      scrollports.forEach((element, index) => { element.style.overflow = previousOverflow[index] })
    }
  }, [isLoading])

  if (!isLoading) return null

  return (
    <dialog ref={dialogRef} className={styles.overlay} aria-labelledby={titleId}
      tabIndex={-1} onCancel={event => event.preventDefault()}>
      <div className={styles.content} role="status" aria-live="polite" aria-label="Loading workspace view">
        <div className={styles.emblem} aria-hidden="true">
          <svg className={styles.ring} viewBox="0 0 96 96" fill="none">
            <circle className={styles.track} cx="48" cy="48" r="44" />
            <circle className={styles.arc} cx="48" cy="48" r="44" pathLength="100" />
          </svg>
          <Image src="/Solo Logo Light.png" width={26} height={40} alt="" className={`${styles.logo} dark:hidden`} priority />
          <Image src="/Solo Logo Dark.png" width={26} height={40} alt="" className={`${styles.logo} hidden dark:block`} priority />
        </div>
        <h2 id={titleId} className={styles.title}>{targetName ? `Opening ${targetName}` : 'Opening your workspace'}</h2>
        <p className={styles.subtitle}>Getting your page ready. One moment.</p>
      </div>
    </dialog>
  )
}
