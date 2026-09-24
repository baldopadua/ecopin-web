'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchFilteredReports, fetchAvailableCrew } from '@/lib/api'
import { createCustomCleanupTask } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Checkbox from '@/components/ui/Checkbox'
import { OfficerGuard } from '@/components/auth/RequireRole'
import dynamic from 'next/dynamic'

// Dynamically import EcoPinMap to avoid SSR issues
const EcoPinMap = dynamic(() => import('@/components/map/EcoPinMap'), {
  ssr: false,
  loading: () => <div className="h-96 flex items-center justify-center">Loading map...</div>
})

// CustomMap component defined outside to prevent re-creation
function CustomMap({ selectedReports, onReportSelect, onClusterSelect }) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="h-96 flex items-center justify-center">Loading map...</div>

  return (
    <div className="h-96 rounded-lg overflow-hidden border border-border">
      <EcoPinMap 
        initialStatus="unresolved"
        initialValidationStatus="all"
        selectionMode={true}
        selectedReports={Array.from(selectedReports).sort()}
        onReportSelect={onReportSelect}
        onClusterSelect={onClusterSelect}
        hideFilterPanel={true}
      />
    </div>
  )
}

export default function CreateCustomCleanupTaskPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [reports, setReports] = useState([])
  const [selectedReports, setSelectedReports] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [notification, setNotification] = useState(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [availableCrew, setAvailableCrew] = useState([])
  const [selectedCrewIds, setSelectedCrewIds] = useState([])

  useEffect(() => {
    loadReports()
    loadAvailableCrew()
  }, [])

  useEffect(() => {
    // Preselect report if provided in URL
    const preselectId = searchParams.get('preselect')
    if (preselectId) {
      setSelectedReports(new Set([preselectId]))
    }
  }, [searchParams])

  const loadReports = async () => {
    setLoading(true)
    try {
      // Fetch all unresolved reports that are approved
      const data = await fetchFilteredReports()
      const eligibleReports = data.filter(r =>
        r.status === 'unresolved' && r.validation_status === 'approved'
      )
      setReports(eligibleReports)
    } catch (error) {
      console.error('Failed to load reports:', error)
      setNotification({ message: 'Failed to load reports', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableCrew = async () => {
    try {
      const data = await fetchAvailableCrew()
      setAvailableCrew(data)
    } catch (error) {
      console.error('Failed to load available crew:', error)
    }
  }

  const toggleReportSelection = useCallback((reportId) => {
    setSelectedReports(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(reportId)) {
        newSelected.delete(reportId)
      } else {
        newSelected.add(reportId)
      }
      return newSelected
    })
  }, [])

  const handleCreateTask = async () => {
    if (selectedReports.size === 0) {
      setNotification({ message: 'Please select at least one report', type: 'warning' })
      return
    }

    if (!taskTitle.trim()) {
      setNotification({ message: 'Please enter a task title', type: 'warning' })
      return
    }

    if (selectedCrewIds.length === 0) {
      setNotification({ message: 'Please assign at least one field crew member', type: 'warning' })
      return
    }

    setCreating(true)
    try {
      await createCustomCleanupTask({
        report_ids: Array.from(selectedReports),
        title: taskTitle,
        description: taskDescription,
        assigned_crew_ids: selectedCrewIds
      })
      setNotification({ message: 'Custom cleanup task created successfully', type: 'success' })
      setTimeout(() => {
        router.push('/dashboard/officer/operations')
      }, 1500)
    } catch (error) {
      console.error('Failed to create task:', error)
      setNotification({ message: 'Failed to create task. Please try again.', type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <OfficerGuard>
      <div className="p-8">
      <PageHeader
        title="Create Custom Cleanup Task"
        subtitle="Select reports on the map to create a custom cleanup task"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Cleanup Tasks', href: '/dashboard/officer/operations' },
          { label: 'Create Custom Task' }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-bold text-text-primary mb-4">Select Reports</h2>
            {loading ? (
              <div className="h-96 flex items-center justify-center">
                <p className="text-text-muted">Loading reports...</p>
              </div>
            ) : (
              <CustomMap 
                selectedReports={Array.from(selectedReports).sort()}
                onReportSelect={toggleReportSelection}
                onClusterSelect={(clusterReportIds) => {
                  setSelectedReports(prev => {
                    const next = new Set(prev)
                    clusterReportIds.forEach(id => next.add(id))
                    return next
                  })
                }}
              />
            )}
          </div>

          {/* Selected Reports Table */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-text-primary">Selected Reports ({selectedReports.size})</h2>
              {selectedReports.size > 0 && (
                <button
                  onClick={() => setSelectedReports(new Set())}
                  className="text-sm text-error hover:text-error/80"
                >
                  Clear Selection
                </button>
              )}
            </div>
            {loading ? (
              <p className="text-text-muted">Loading reports...</p>
            ) : selectedReports.size === 0 ? (
              <p className="text-text-muted">No reports selected. Click on map pins to select reports.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Title</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Issue Type</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Description</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.filter(report => selectedReports.has(report.id)).map(report => (
                      <tr key={report.id} className="border-b border-border hover:bg-surface-elevated">
                        <td className="py-3 px-4">
                          <span className="font-medium text-text-primary">{report.title}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-text-secondary">{report.issue_type}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-text-muted line-clamp-2 max-w-xs">{report.description || 'N/A'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => toggleReportSelection(report.id)}
                            className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer"
                            title="Remove report"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Task Details Section */}
        <div className="space-y-6">
          {/* Instructions */}
          <div className="card bg-info/10 border-info/20">
            <h3 className="font-semibold text-text-primary mb-2">Instructions</h3>
            <ul className="text-sm text-text-secondary space-y-1">
              <li>• Click on report pins on the map to select them</li>
              <li>• Or use the checkboxes in the table below</li>
              <li>• Select any unresolved reports for the cleanup task</li>
              <li>• Enter a title for your cleanup task</li>
              <li>• Click "Create Cleanup Task" to finalize</li>
            </ul>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-text-primary mb-4">Task Details</h2>
            <div className="space-y-4">
              <Input
                label="Task Title *"
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Enter task title"
              />
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Description
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Enter task description (optional)"
                  rows={4}
                  className="w-full input resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Assign to Field Crew *
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableCrew.length === 0 ? (
                    <p className="text-sm text-text-muted">No field crew members available</p>
                  ) : (
                      <div key={crew.id} className="flex items-center space-x-3 p-2 hover:bg-surface-elevated rounded-lg transition-colors">
                        <Checkbox
                          id={`crew-${crew.id}`}
                          checked={selectedCrewIds.includes(crew.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCrewIds(prev => [...prev, crew.id])
                            } else {
                              setSelectedCrewIds(prev => prev.filter(id => id !== crew.id))
                            }
                          }}
                        />
                        <label htmlFor={`crew-${crew.id}`} className="flex items-center gap-3 cursor-pointer flex-1">
                          {crew.avatar_url ? (
                            <img
                              src={crew.avatar_url}
                              alt={crew.full_name}
                              className="w-10 h-10 rounded-none object-cover border border-border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-none bg-accent-green flex items-center justify-center text-white font-bold text-lg">
                              {crew.full_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-text-primary">{crew.full_name}</p>
                          </div>
                        </label>
                      </div>
                  )}
                </div>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-text-muted">Reports Selected</span>
                  <span className="text-sm font-semibold text-text-primary">
                    {selectedReports.size}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-text-muted">Crew Assigned</span>
                  <span className="text-sm font-semibold text-text-primary">
                    {selectedCrewIds.length}
                  </span>
                </div>
              </div>
              <Button
                onClick={handleCreateTask}
                disabled={creating || selectedReports.size === 0 || !taskTitle.trim() || selectedCrewIds.length === 0}
                className="w-full"
              >
                {creating ? 'Creating Task...' : 'Create Cleanup Task'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.back()}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
    </OfficerGuard>
  )
}
