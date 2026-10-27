'use client'
import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react'
import styles from './Notification.module.css'

export default function Notification({ message, type = 'info', duration = 6000, onClose, actionLabel, onAction, progress }) {
  const [paused, setPaused] = useState(false)
  const isProgress = typeof progress === 'number'
  useEffect(() => {
    if (paused || isProgress || type === 'error' || type === 'warning' || !duration || !onClose) return
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose, type, message, paused, isProgress])
  const Icon = isProgress ? Loader2 : type === 'success' ? CheckCircle : type === 'error' || type === 'warning' ? AlertCircle : Info
  const tone = ['success', 'error', 'warning'].includes(type) ? type : 'info'
  const title = isProgress ? 'Optimization in progress' : { success: 'Success', error: 'Something went wrong', warning: 'Attention needed', info: 'Update' }[tone]
  return <div className={`${styles.toast} ${styles[tone]}`} role={type === 'error' ? 'alert' : 'status'} aria-atomic="true"
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) }}>
    <span className={styles.icon}><Icon size={20} aria-hidden="true" className={isProgress ? `animate-spin ${styles.spinner}` : undefined} /></span>
    <div className={styles.content}>
      <p className={styles.title}>{title}</p>
      <p className={styles.message}>{message}</p>
      {isProgress && <div className={styles.progress}>
        <progress max={100} value={progress} aria-label="Optimization progress" />
        <span aria-hidden="true">{progress}%</span>
      </div>}
      {actionLabel && onAction && <button type="button" onClick={onAction} className={styles.action}>{actionLabel}</button>}
    </div>
    {onClose && <button type="button" onClick={onClose} aria-label="Dismiss notification" className={styles.close}><X size={18} aria-hidden="true" /></button>}
  </div>
}
