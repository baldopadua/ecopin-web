'use client'
import { useEffect, useRef } from 'react'
import PageLoadingIndicator from './PageLoadingIndicator'
import { useNavigationLoading } from '@/components/context/NavigationLoadingContext'
import styles from './NavigationLoadingScreen.module.css'

export default function NavigationLoadingScreen() {
  const { isLoading, targetName } = useNavigationLoading()
  const dialogRef = useRef(null)

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
    <dialog ref={dialogRef} className={styles.overlay} aria-label={targetName ? `Opening ${targetName}` : 'Opening your page'}
      tabIndex={-1} onCancel={event => event.preventDefault()}>
      <PageLoadingIndicator label={targetName ? `Opening ${targetName}` : 'Opening your page'} />
    </dialog>
  )
}
