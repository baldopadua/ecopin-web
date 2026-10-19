'use client'

import { useCallback, useEffect, useState } from 'react'

// Match pagination to the table's allocated space; rows keep their natural height.
export default function useTablePageSize({ rowHeight = 64, minRows = 1, resetKey = '' } = {}) {
  const [container, setContainer] = useState(null)
  const containerRef = useCallback(node => setContainer(node), [])
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    if (!container) return
    const desktop = matchMedia('(min-width: 1024px) and (min-height: 700px)')
    let measuredRowHeight = 0
    let measuredWidth = 0
    const measure = () => {
      if (!desktop.matches) { setPageSize(10); return }
      if (container.clientWidth !== measuredWidth) { measuredWidth = container.clientWidth; measuredRowHeight = 0 }
      if (!container.querySelector('[aria-busy="true"]')) {
        for (const row of container.querySelectorAll('tbody tr')) measuredRowHeight = Math.max(measuredRowHeight, row.getBoundingClientRect().height)
      }
      const header = container.querySelector('thead')?.getBoundingClientRect().height || 48
      const available = container.clientHeight - header - 2
      if (available > 0) setPageSize(Math.max(minRows, Math.floor(available / (measuredRowHeight || rowHeight))))
    }
    const observer = new ResizeObserver(measure)
    const contentObserver = new MutationObserver(measure)
    observer.observe(container)
    contentObserver.observe(container, { childList: true, subtree: true, characterData: true })
    desktop.addEventListener('change', measure)
    measure()
    return () => { observer.disconnect(); contentObserver.disconnect(); desktop.removeEventListener('change', measure) }
  }, [container, rowHeight, minRows, resetKey])

  return { containerRef, pageSize }
}
