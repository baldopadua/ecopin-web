'use client'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { fetchCleanupTasks } from '@/lib/api'

import { useUser } from '@/components/auth/UserContext'

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
          console.error("Failed to fetch tasks for field_crew map grid:", error)
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
            { label: 'Dashboard', href: user?.role === 'field_crew' ? '/dashboard/field-crew' : '/dashboard' },
            { label: 'Map Grid' }
          ]}
        />
        {user?.role === 'field_crew' && (
          <div className="flex gap-4 items-center bg-surface-elevated border-2 border-border p-4 mb-4 shadow-[4px_4px_0px_0px_#1a1a1a]">
            <span className="font-mono text-xs uppercase tracking-widest text-text-muted font-bold">Crew Task Filters:</span>
            <select
              value={taskStatusFilter}
              onChange={(e) => setTaskStatusFilter(e.target.value)}
              className="bg-background border-2 border-border text-text-primary text-sm font-mono p-2 focus:border-[#ccff00] outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        )}
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
