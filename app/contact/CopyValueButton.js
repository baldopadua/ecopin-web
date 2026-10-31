'use client'
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import styles from './contact.module.css'

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    // Clipboard API can be unavailable on insecure origins; fall back to a temporary selection.
    try {
      const area = document.createElement('textarea')
      area.value = value
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(area)
      return ok
    } catch {
      return false
    }
  }
}

/** Desktop browsers often have no tel:/mailto: handler, so every action also offers a copy fallback. */
export default function CopyValueButton({ value, label }) {
  const [state, setState] = useState('idle')
  async function handleClick() {
    setState((await copyText(value)) ? 'copied' : 'failed')
    setTimeout(() => setState('idle'), 2500)
  }
  return <button type="button" className={styles.copyButton} onClick={handleClick}>
    {state === 'copied' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
    <span>{state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed, select the text above' : label}</span>
    <span className="sr-only" role="status" aria-live="polite">{state === 'copied' ? `${label} done` : ''}</span>
  </button>
}
