'use client'

import { useRef, useState, useEffect } from 'react'
import styles from './Explore.module.css'

export default function StatusTabs({ options, value, onChange, ariaLabel = 'Report status' }) {
  const containerRef = useRef(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 })

  useEffect(() => {
    if (!containerRef.current) return

    const activeButton = containerRef.current.querySelector('button[aria-pressed="true"]')
    if (activeButton) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const buttonRect = activeButton.getBoundingClientRect()
      const left = buttonRect.left - containerRect.left
      const width = buttonRect.width
      setIndicatorStyle({
        transform: `translateX(${left}px)`,
        width: `${width}px`,
        opacity: 1
      })
    } else {
      setIndicatorStyle(prev => ({ ...prev, opacity: 0 }))
    }
  }, [value, options])

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return
      const activeButton = containerRef.current.querySelector('button[aria-pressed="true"]')
      if (activeButton) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const buttonRect = activeButton.getBoundingClientRect()
        const left = buttonRect.left - containerRect.left
        const width = buttonRect.width
        setIndicatorStyle({
          transform: `translateX(${left}px)`,
          width: `${width}px`,
          opacity: 1
        })
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [value])

  return (
    <div ref={containerRef} className={styles.statusTabs} role="group" aria-label={ariaLabel}>
      <div
        className={styles.statusTabsIndicator}
        style={{
          transform: indicatorStyle.transform || 'translateX(0)',
          width: indicatorStyle.width || 0,
          opacity: indicatorStyle.opacity ?? 0
        }}
        aria-hidden="true"
      />
      {options.map(([optValue, optLabel]) => (
        <button
          key={optValue}
          type="button"
          aria-pressed={value === optValue}
          onClick={() => onChange(optValue)}
        >
          {optLabel}
        </button>
      ))}
    </div>
  )
}
