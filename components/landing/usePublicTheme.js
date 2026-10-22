'use client'

import { useSyncExternalStore } from 'react'

function subscribe(onChange) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

export default function usePublicTheme() {
  const isDark = useSyncExternalStore(subscribe, () => document.documentElement.classList.contains('dark'), () => false)
  function toggleTheme() {
    document.documentElement.classList.toggle('dark', !isDark)
    localStorage.setItem('theme', isDark ? 'light' : 'dark')
  }
  return { isDark, toggleTheme }
}
