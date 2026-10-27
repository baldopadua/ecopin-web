'use client'

import styles from './PageTabs.module.css'

export default function PageTabs({ label, tabs, value, onChange, disabled = false }) {
  const selectWithKeyboard = (event, index) => {
    if (disabled) return
    let next
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = tabs.length - 1
    if (next === undefined) return
    event.preventDefault()
    onChange(tabs[next].id)
    event.currentTarget.parentElement.children[next]?.focus()
  }

  return (
    <div className={styles.tabs} role="tablist" aria-label={label} aria-disabled={disabled || undefined}>
      {tabs.map(({ id, label: text, icon: Icon }, index) => (
        <button key={id} type="button" role="tab" id={`${id}-tab`} aria-controls={`${id}-panel`}
          aria-selected={value === id} tabIndex={value === id ? 0 : -1}
          disabled={disabled}
          className={styles.tab} onClick={() => { if (!disabled) onChange(id) }}
          onKeyDown={event => selectWithKeyboard(event, index)}>
          {Icon && <Icon size={18} aria-hidden="true" />}
          {text}
        </button>
      ))}
    </div>
  )
}
