'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchFilteredReports } from '@/lib/api'
import { createCustomCleanupTask } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'
import dynamic from 'next/dynamic'

// Dynamically import EcoPinMap to avoid SSR issues
const EcoPinMap = dynamic(() => import('@/components/map/EcoPinMap'), {
  ssr: false,
  loading: () => <div className="h-96 flex items-center justify-center">Loading map...</div>
})

// CustomMap component defined outside to prevent re-creation
function CustomMap({ selectedReports, onReportSelect }) {
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

  useEffect(() => {
    loadReports()
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
      // Fetch all unresolved reports
      const data = await fetchFilteredReports()
      const unresolvedReports = data.filter(r => r.status === 'unresolved')
      setReports(unresolvedReports)
    } catch (error) {
      console.error('Failed to load reports:', error)
      setNotification({ message: 'Failed to load reports', type: 'error' })
    } finally {
      setLoading(false)
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

    setCreating(true)
    try {
      await createCustomCleanupTask({
        report_ids: Array.from(selectedReports),
        title: taskTitle,
        description: taskDescription
      })
      setNotification({ message: 'Custom cleanup task created successfully', type: 'success' })
      setTimeout(() => {
        router.push('/dashboard/cleanup-tasks')
      }, 1500)
    } catch (error) {
      console.error('Failed to create task:', error)
      setNotification({ message: 'Failed to create task. Please try again.', type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Create Custom Cleanup Task"
        subtitle="Select reports on the map to create a custom cleanup task"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Cleanup Tasks', href: '/dashboard/cleanup-tasks' },
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
                  className="text-sm text-red-600 hover:text-red-700"
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
                      <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Location</th>
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
                          <span className="text-sm text-text-muted">
                            {report.latitude && report.longitude
                              ? `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}` 
                              : 'N/A'
                            }
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => toggleReportSelection(report.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
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
          <div className="card">
            <h2 className="text-lg font-bold text-text-primary mb-4">Task Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Enter task title"
                  className="w-full input"
                />
              </div>
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
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-text-muted">Reports Selected</span>
                  <span className="text-sm font-semibold text-text-primary">
                    {selectedReports.size}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCreateTask}
                disabled={creating || selectedReports.size === 0 || !taskTitle.trim()}
                className="btn-primary w-full"
              >
                {creating ? 'Creating Task...' : 'Create Cleanup Task'}
              </button>
              <button
                onClick={() => router.back()}
                className="btn-secondary w-full"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="card bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-text-primary mb-2">Instructions</h3>
            <ul className="text-sm text-text-secondary space-y-1">
              <li>• Click on report pins on the map to select them</li>
              <li>• Or use the checkboxes in the table below</li>
              <li>• Select any unresolved reports for the cleanup task</li>
              <li>• Enter a title for your cleanup task</li>
              <li>• Click "Create Cleanup Task" to finalize</li>
            </ul>
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
  )
}
