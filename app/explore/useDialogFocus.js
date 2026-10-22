'use client'

import { useEffect } from 'react'

export default function useDialogFocus(active, onClose) {
  useEffect(() => {
    if (!active) return
    const dialog = document.querySelector('[data-explore-dialog]')
    if (!dialog) return
    const previousFocus = document.activeElement
    const siblings = []
    // Isolate the modal without making an ancestor of the dialog inert.
    for (let branch = dialog; branch.parentElement; branch = branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling === branch) continue
        siblings.push([sibling, sibling.inert])
        sibling.inert = true
      }
      if (branch.parentElement === document.body) break
    }
    const controls = () => [...dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')]
      .filter(element => !element.disabled && element.getClientRects().length)
    ;(controls()[0] || dialog).focus()
    const handleKey = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
      if (event.key !== 'Tab') return
      const focusable = controls()
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first) { event.preventDefault(); dialog.focus(); return }
      if (!dialog.contains(document.activeElement) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault(); first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus()
      }
    }
    document.addEventListener('keydown', handleKey, true)
    return () => {
      document.removeEventListener('keydown', handleKey, true)
      siblings.forEach(([sibling, inert]) => { sibling.inert = inert })
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [active, onClose])
}
