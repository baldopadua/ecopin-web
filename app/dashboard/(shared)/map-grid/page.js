'use client'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { fetchCleanupTasks } from '@/lib/api'

import { useUser } from '@/components/auth/UserContext'
import { reportDiagnostic } from '../../../../lib/diagnostics.mjs';

const EcoPinMap = dynamic(
  () => import('@/components/map/EcoPinMap'),
  { ssr: false, loading: () => <div className="h-screen w-full bg-background" /> }
)
const CrewTaskLayer = dynamic(
  () => import('@/components/map/CrewTaskLayer'),
  { ssr: false }
)

function MapContent() {
  const searchParams = useSearchParams()
  const user = useUser()
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const id = searchParams.get('id')
  const validationStatus = searchParams.get('validationStatus')
  const status = searchParams.get('status')

  const [allTasks, setAllTasks] = useState([])
  const [taskStatusFilter, setTaskStatusFilter] = useState('all')

  useEffect(() => {
    if (user?.role === 'field_crew') {
      fetchCleanupTasks(false) // fetch all
        .then(tasks => {
          setAllTasks(tasks)
        })
        .catch(error => {
          reportDiagnostic('error', 'map', "Failed to fetch tasks for field_crew map grid:", error)
        })
    }
  }, [user?.role])

  const filteredTasks = allTasks.filter(t => {
    if (taskStatusFilter === 'all') return true
    return t.status === taskStatusFilter
  })

  return (
    <div className="h-screen flex flex-col">
      <div className="p-8 pb-0">
        <PageHeader 
          title="Map Grid"
          subtitle="View validated environmental reports on the map"
          breadcrumbs={[
            { label: 'Dashboard', href: user?.role === 'officer' ? '/dashboard/officer' : user?.role === 'field_crew' ? '/dashboard/field-crew' : '/dashboard' },
            { label: 'Map Grid' }
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          {user?.role === 'field_crew' ? (
            <div className="flex gap-4 items-center bg-surface-elevated border border-border p-3 shadow-sm rounded-lg">
              <span className="font-mono text-xs uppercase tracking-widest text-text-muted font-bold">Crew Task Filters:</span>
              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className="bg-background border border-border text-text-primary text-sm font-mono p-1.5 focus:border-[#ccff00] outline-none rounded"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          ) : <div />}

          <div
            className="flex items-center gap-3 bg-surface-elevated border border-border px-3.5 py-2 rounded-lg text-xs font-mono text-text-secondary shadow-sm ml-auto"
            title="Dashed blue line (#0052cc) represents the task micro-route connecting cluster centroid to constituent report sub-pins."
          >
            <span className="font-bold text-text-muted uppercase tracking-wider text-[11px]">Map Legend:</span>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center w-8 h-4 bg-primary/10 border border-primary/30 rounded"
                aria-hidden="true"
              >
                <span className="w-5 border-t-2 border-dashed border-[#0052cc] dark:border-[#3b82f6]" />
              </span>
              <span className="text-text-primary">
                Task micro-route (<code className="text-[#0052cc] dark:text-[#3b82f6] font-bold">#0052cc</code>): Centroid to sub-pins
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 relative z-0">
        <EcoPinMap 
          centerLat={lat ? parseFloat(lat) : null} 
          centerLng={lng ? parseFloat(lng) : null} 
          focusReportId={id} 
          initialValidationStatus={validationStatus}
          initialStatus={status}
          hideClusters={user?.role === 'field_crew'}
          hidePins={user?.role === 'field_crew'}
          hideFilterPanel={user?.role === 'field_crew'}
        >
          {user?.role === 'field_crew' && <CrewTaskLayer tasks={filteredTasks} />}
        </EcoPinMap>
      </div>
    </div>
  )
}

export default function MapViewPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-background" />}>
      <MapContent />
    </Suspense>
  )
}
