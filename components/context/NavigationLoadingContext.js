'use client'
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const NavigationLoadingContext = createContext({
  isLoading: false,
  targetName: '',
  startLoading: () => {},
  stopLoading: () => {},
})

export function useNavigationLoading() {
  return useContext(NavigationLoadingContext)
}

// Friendly page name lookup for smooth contextual indicator
export function getRouteTitle(urlPath) {
  if (!urlPath) return 'Workspace'
  const path = urlPath.split('?')[0].replace(/\/+$/, '')

  const routeMap = {
    '/dashboard': 'Command Center',
    '/dashboard/officer': 'Command Center',
    '/dashboard/officer/map-grid': 'Map Grid',
    '/dashboard/officer/hotzone-intel': 'Hotzone Intel',
    '/dashboard/officer/operations': 'Operations',
    '/dashboard/officer/operations/create': 'Create Operation',
    '/dashboard/officer/optimization': 'Route Optimization',
    '/dashboard/officer/crew-management': 'Crew Management',
    '/dashboard/officer/reports': 'Reports Archive',
    '/dashboard/officer/metrics': 'System Metrics',
    '/dashboard/spatial-scan': 'Spatial Scan',
    '/dashboard/field-crew': 'Field Operations',
    '/dashboard/field-crew/tasks': 'Operations',
    '/dashboard/field-crew/my-route': 'My Route',
    '/dashboard/field-crew/raw-data': 'Raw Data',
    '/dashboard/map-grid': 'Map Grid',
    '/dashboard/admin': 'Admin Console',
    '/dashboard/admin/users': 'User Management',
    '/dashboard/admin/settings': 'System Settings',
    '/dashboard/admin/infrastructure': 'Infrastructure Health',
    '/dashboard/admin/optimization-settings': 'Optimization Parameters',
    '/dashboard/admin/sweeper-settings': 'Sweeper Configurations',
    '/dashboard/admin/audit-logs': 'Audit Logs',
    '/dashboard/admin/sys-logs': 'System Logs',
    '/dashboard/profile': 'User Profile',
    '/dashboard/raw-data': 'Raw Data',
  }

  if (routeMap[path]) return routeMap[path]
  if (path.startsWith('/dashboard/field-crew/operations/')) return 'Operation Details'
  if (path.startsWith('/dashboard/officer/operations/')) return 'Operation Details'
  if (path.startsWith('/dashboard/officer/hotzone-intel/')) return 'Hotzone Analysis'
  if (path.startsWith('/dashboard/officer/optimization/')) return 'Optimization Run'
  if (path.startsWith('/dashboard/raw-data/')) return 'Report Details'
  return 'Workspace'
}

export function NavigationLoadingProvider({ children }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [targetName, setTargetName] = useState('Workspace')
  const safetyTimeoutRef = useRef(null)
  const isNavigatingRef = useRef(false)

  const stopLoading = useCallback(() => {
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current)
    isNavigatingRef.current = false
    setIsLoading(false)
  }, [])

  const startLoading = useCallback((destinationUrl) => {
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current)
    isNavigatingRef.current = true
    if (destinationUrl) {
      setTargetName(getRouteTitle(destinationUrl))
    }
    setIsLoading(true)

    // Safety timeout: auto-clear if navigation halts
    safetyTimeoutRef.current = setTimeout(() => {
      isNavigatingRef.current = false
      setIsLoading(false)
    }, 4000)
  }, [])

  // When pathname or searchParams change, the new route has mounted.
  // Immediately dismiss the loading overlay on the next animation frame for snappy navigation.
  useEffect(() => {
    if (!isNavigatingRef.current) return

    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current)

    const frame = requestAnimationFrame(() => {
      isNavigatingRef.current = false
      setIsLoading(false)
    })

    return () => cancelAnimationFrame(frame)
  }, [pathname, searchParams])

  // Global click interceptor for internal links targeting /dashboard routes
  useEffect(() => {
    const handleClick = (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const anchor = e.target.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      const target = anchor.getAttribute('target')
      if (!href || href.startsWith('#') || target === '_blank') return

      try {
        const url = new URL(href, window.location.href)
        if (url.origin === window.location.origin) {
          const currentUrl = new URL(window.location.href)
          if (url.pathname !== currentUrl.pathname || url.search !== currentUrl.search) {
            startLoading(url.pathname)
          }
        }
      } catch {
        // Ignore invalid URLs
      }
    }

    document.addEventListener('click', handleClick, { capture: true })
    return () => {
      document.removeEventListener('click', handleClick, { capture: true })
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current)
    }
  }, [startLoading])

  // Intercept Next.js router.push & router.replace via window.history to catch programmatic transitions
  useEffect(() => {
    if (typeof window === 'undefined') return

    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    const handleNavigation = (urlArg) => {
      if (!urlArg) return
      try {
        const dest = new URL(String(urlArg), window.location.href)
        if (dest.origin === window.location.origin && dest.pathname.startsWith('/dashboard')) {
          if (dest.pathname !== window.location.pathname) {
            // Next.js App Router performs history manipulations during React render/insertion phase.
            // Defer React state dispatch out of the synchronous render/insertion call stack.
            queueMicrotask(() => {
              startLoading(dest.pathname)
            })
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }

    window.history.pushState = function (state, title, url) {
      handleNavigation(url)
      return originalPushState.apply(this, arguments)
    }

    window.history.replaceState = function (state, title, url) {
      handleNavigation(url)
      return originalReplaceState.apply(this, arguments)
    }

    return () => {
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
    }
  }, [startLoading])

  return (
    <NavigationLoadingContext.Provider value={{ isLoading, targetName, startLoading, stopLoading }}>
      {children}
    </NavigationLoadingContext.Provider>
  )
}
