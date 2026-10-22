'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import styles from './PublicSelect.module.css'

export default function PublicSelect({ id, label, value, options, onChange, hideLabel = false, className = '' }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [placement, setPlacement] = useState({ above: false, height: 320 })
  const root = useRef(null)
  const control = useRef(null)
  const selected = options.find(option => option.value === value) || options[0]
  useEffect(() => {
    if (!open) return
    const dismiss = event => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])
  useEffect(() => {
    if (!open) return
    const list = root.current?.querySelector('[role="listbox"]')
    const option = list?.querySelector(`[data-option-index="${active}"]`)
    if (!option) return
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight
  }, [active, open])
  const show = () => {
    const bounds = control.current.getBoundingClientRect()
    const below = innerHeight - bounds.bottom - 16
    const above = below < Math.min(options.length * 44, 220) && bounds.top > below
    setPlacement({ above, height: Math.min(320, Math.max(88, above ? bounds.top - 16 : below)) })
    setActive(Math.max(0, options.findIndex(option => option.value === value)))
    setOpen(true)
  }
  const choose = option => { onChange(option.value); setOpen(false); control.current?.focus() }
  const keyDown = event => {
    if (event.key === 'Tab') { setOpen(false); return }
    if (event.key === 'Escape') { setOpen(false); event.preventDefault(); return }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      if (!open) { show(); if (event.key === 'Home') setActive(0); if (event.key === 'End') setActive(options.length - 1); return }
      setActive(index => event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open) choose(options[active]); else show()
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      const index = options.findIndex(option => option.label.toLowerCase().startsWith(event.key.toLowerCase()))
      if (index >= 0) { setActive(index); if (!open) onChange(options[index].value) }
    }
  }
  return <div ref={root} className={`${styles.root} ${className}`}>
    <span id={`${id}-label`} className={hideLabel ? styles.hidden : styles.label}>{label}</span>
    <button ref={control} id={id} type="button" role="combobox" aria-label={label} aria-describedby={`${id}-value`} aria-expanded={open} aria-controls={`${id}-list`} aria-haspopup="listbox" aria-activedescendant={open ? `${id}-option-${active}` : undefined} className={styles.control} onClick={() => open ? setOpen(false) : show()} onKeyDown={keyDown}>
      <span id={`${id}-value`}>{selected?.label}</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <div id={`${id}-list`} role="listbox" aria-label={label} className={`${styles.list} ${placement.above ? styles.above : ''}`} style={{ maxHeight: placement.height }} data-native-scroll>
      {options.map((option, index) => <button key={option.value} id={`${id}-option-${index}`} data-option-index={index} type="button" role="option" aria-selected={option.value === value} tabIndex={-1} className={`${styles.option} ${index === active ? styles.active : ''}`} onPointerMove={() => setActive(index)} onClick={() => choose(option)}><span>{option.label}</span>{option.value === value && <Check size={16} aria-hidden="true" />}</button>)}
    </div>}
  </div>
}
