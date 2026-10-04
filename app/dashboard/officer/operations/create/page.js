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
import Pagination from '@/components/ui/Pagination'
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
  const [taskPriority, setTaskPriority] = useState('medium')
  const [taskDescription, setTaskDescription] = useState('')
  const [availableCrew, setAvailableCrew] = useState([])
  const [selectedCrewIds, setSelectedCrewIds] = useState([])
  const [reportSearch, setReportSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredReports = useMemo(() => {
    return reports.filter(r => 
      (r.title && r.title.toLowerCase().includes(reportSearch.toLowerCase())) ||
      (r.issue_type && r.issue_type.toLowerCase().includes(reportSearch.toLowerCase())) ||
      (r.id && r.id.toLowerCase().includes(reportSearch.toLowerCase()))
    )
  }, [reports, reportSearch])

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage)
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredReports.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredReports, currentPage])

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
        priority: taskPriority,
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

          {/* Reports List Table */}
          <div className="flex flex-col h-[500px]">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h2 className="text-lg font-bold text-text-primary">Reports ({selectedReports.size} selected)</h2>
              {selectedReports.size > 0 && (
                <button
                  onClick={() => setSelectedReports(new Set())}
                  className="text-sm text-error hover:text-error/80"
                >
                  Clear Selection
                </button>
              )}
            </div>
            
            <div className="mb-4 shrink-0">
              <Input
                placeholder="Search reports by title, type, or ID..."
                value={reportSearch}
                onChange={(e) => {
                  setReportSearch(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>

            {loading ? (
              <p className="text-text-muted shrink-0">Loading reports...</p>
            ) : filteredReports.length === 0 ? (
              <p className="text-text-muted shrink-0">No reports found.</p>
            ) : (
              <div className="flex-1 overflow-y-auto min-h-0 ecopin-table-container !rounded-lg !border">
                <table className="ecopin-table">
                  <thead className="sticky top-0 bg-surface z-10">
                    <tr>
                      <th className="w-12"></th>
                      <th>Title</th>
                      <th>Issue Type</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReports.map(report => (
                      <tr 
                        key={report.id} 
                        className={selectedReports.has(report.id) ? 'bg-accent-green/10 hover:bg-accent-green/20' : ''}
                        onClick={() => toggleReportSelection(report.id)}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            id={`report-cb-${report.id}`}
                            checked={selectedReports.has(report.id)}
                            onChange={() => toggleReportSelection(report.id)}
                          />
                        </td>
                        <td>
                          <span className="font-bold">{report.title}</span>
                          <span className="block text-xs font-mono text-text-muted">#{report.id.substring(0, 6)}</span>
                        </td>
                        <td>
                          <span className="capitalize">{(report.issue_type || '').replace(/_/g, ' ')}</span>
                        </td>
                        <td>
                          <span className="line-clamp-2 max-w-xs">{report.description || 'N/A'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="pt-4 border-t border-border mt-4 shrink-0">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredReports.length}
                />
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
              <li>• Or use the checkboxes in the table below (you can search!)</li>
              <li>• You can select multiple unresolved reports to group them</li>
              <li>• Enter a title, priority, and assign field crew</li>
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
                  Priority Level *
                </label>
                <div className="flex gap-4">
                   {['low', 'medium', 'high'].map(p => (
                     <button
                       key={p}
                       onClick={() => setTaskPriority(p)}
                       className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-widest border-2 ${taskPriority === p ? (p==='high' ? 'bg-error text-white border-error' : p==='medium' ? 'bg-warning text-black border-warning' : 'bg-success text-white border-success') : 'bg-transparent text-text-muted border-border hover:border-white'}`}
                     >
                       {p}
                     </button>
                   ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Assign to Field Crew *
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableCrew.length === 0 ? (
                    <p className="text-sm text-text-muted">No field crew members available</p>
                  ) : (
                    availableCrew.map(crew => (
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
                    ))
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
              <button
                onClick={handleCreateTask}
                disabled={creating || selectedReports.size === 0 || !taskTitle.trim() || selectedCrewIds.length === 0}
                className="w-full btn-primary py-3 font-bold uppercase tracking-widest text-xs"
              >
                {creating ? 'Creating Task...' : 'Create Cleanup Task'}
              </button>
              <button
                onClick={() => router.back()}
                className="w-full btn-secondary py-3 font-bold uppercase tracking-widest text-xs"
              >
                Cancel
              </button>
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
