'use client'

import { useEffect, useRef } from 'react'
import styles from './Dialog.module.css'

// Native modal stacking keeps nested evidence viewers isolated and returns focus.
export default function Dialog({ open, onClose, children, label, labelledBy, className = '', dismissible = true }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const previousFocus = open ? document.activeElement : null
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
    return () => {
      if (dialog.open) dialog.close()
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [open])
  return <dialog ref={ref} className={`${styles.dialog} ${className}`} aria-label={label} aria-labelledby={labelledBy}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const controls = [...event.currentTarget.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')]
        .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length)
      const first = controls[0]
      const last = controls.at(-1)
      if (!first) { event.preventDefault(); event.currentTarget.focus(); return }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }}
    onCancel={event => { event.preventDefault(); if (dismissible) onClose?.() }}
    onClick={event => { if (event.target === event.currentTarget && dismissible) onClose?.() }}>
    {children}
  </dialog>
}
