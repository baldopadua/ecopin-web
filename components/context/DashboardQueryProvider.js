'use client'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { getSessionMetadata, subscribeSession } from '@/lib/auth-token.mjs'
import { fetchPublicReports, fetchCleanupTasks, fetchClusters, getSystemStats } from '@/lib/api'
import { reconciledReportSummary } from '@/lib/report-lifecycle-summary.mjs'
import { createDashboardQueryClient, dashboardSessionScope, DASHBOARD_QUERY_KEY, DASHBOARD_DATA_CHANGED } from '@/lib/dashboard-query-client.mjs'

function ScopedQueries({ children }) {
  const [client] = useState(createDashboardQueryClient)
  useEffect(() => {
    const refresh = () => { void client.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY }) }
    window.addEventListener(DASHBOARD_DATA_CHANGED, refresh)
    return () => {
      window.removeEventListener(DASHBOARD_DATA_CHANGED, refresh)
      client.clear()
    }
  }, [client])
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

export default function DashboardQueryProvider({ children }) {
  const session = useSyncExternalStore(subscribeSession, getSessionMetadata, () => null)
  return <ScopedQueries key={dashboardSessionScope(session)}>{children}</ScopedQueries>
}

export function useDashboardReports() {
  return useQuery({ queryKey: [...DASHBOARD_QUERY_KEY, 'reports'], queryFn: () => fetchPublicReports({ throwOnError: true }) })
}

export function useDashboardReportLifecycle() {
  return useQuery({queryKey:[...DASHBOARD_QUERY_KEY,'system-stats'],queryFn:getSystemStats,select:data=>{
    const snapshot=reconciledReportSummary(data.reports)
    if(!snapshot)throw new Error('Report lifecycle snapshot is incomplete.')
    return snapshot
  }})
}

export function useDashboardSystemStats() {
  return useQuery({queryKey:[...DASHBOARD_QUERY_KEY,'system-stats'],queryFn:getSystemStats})
}

export function useDashboardTasks() {
  return useQuery({ queryKey: [...DASHBOARD_QUERY_KEY, 'tasks'], queryFn: () => fetchCleanupTasks() })
}

export function useDashboardClusters() {
  return useQuery({ queryKey: [...DASHBOARD_QUERY_KEY, 'clusters'], queryFn: () => fetchClusters({ throwOnError: true }) })
}
