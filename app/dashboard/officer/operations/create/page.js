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

const STRATEGIES = [
  { id: 'standard', name: 'Standard Dispatch', config: { aging_factor: 1.5, max_escalation_cap: 10.0, max_detour_minutes: 5.0, max_detour_time_per_task: 15.0 } },
  { id: 'thorough', name: 'Thorough Cleanup', config: { aging_factor: 1.5, max_escalation_cap: 10.0, max_detour_minutes: 10.0, max_detour_time_per_task: 30.0 } },
  { id: 'backlog', name: 'Backlog Crusher', config: { aging_factor: 3.0, max_escalation_cap: 20.0, max_detour_minutes: 5.0, max_detour_time_per_task: 15.0 } }
]

export default function CreateCleanupTaskPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState('manual') // 'manual' or 'auto'
  
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

  // Auto-Generate Settings
  const [autoSettings, setAutoSettings] = useState({
    aging_factor: STRATEGIES[0].config.aging_factor,
    max_escalation_cap: STRATEGIES[0].config.max_escalation_cap,
    max_detour_minutes: STRATEGIES[0].config.max_detour_minutes,
    max_detour_time_per_task: STRATEGIES[0].config.max_detour_time_per_task
  })
  const [generatedTasks, setGeneratedTasks] = useState(null)
  const [generating, setGenerating] = useState(false)
  
  const [strategy, setStrategy] = useState('standard')
  const [showAdvanced, setShowAdvanced] = useState(false)


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
      setNotification({ message: 'Cleanup task created successfully', type: 'success' })
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

  const handlePreviewRoutes = async () => {
    setGenerating(true)
    setGeneratedTasks(null)
    
    try {
      const res = await fetch('/api/tasks/auto-generate/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: autoSettings
        })
      })
      
      if (!res.ok) throw new Error('Failed to generate routes')
      
      const data = await res.json()
      
      // Map tasks to add crew selection arrays and title input
      const preparedTasks = data.tasks.map((task, idx) => ({
        ...task,
        title: `Auto Route #${idx+1} (${task.primary_target_is_cluster ? 'Cluster' : 'Point'})`,
        assigned_crew_ids: []
      }))
      
      setGeneratedTasks(preparedTasks)
      setNotification({ message: 'Preview generated successfully!', type: 'success' })
    } catch (error) {
      console.error(error)
      setNotification({ message: 'Error generating routes', type: 'error' })
    } finally {
      setGenerating(false)
    }
  }

  const handleConfirmAndDispatch = async () => {
    if (!generatedTasks || generatedTasks.length === 0) return
    
    const unassigned = generatedTasks.some(t => t.assigned_crew_ids.length === 0)
    if (unassigned) {
       setNotification({ message: 'Please assign crew to all generated routes before confirming.', type: 'warning' })
       return
    }

    setCreating(true)
    try {
      for (const task of generatedTasks) {
        const pScore = task.primary_priority;
        const priorityStr = pScore >= 15 ? 'high' : pScore >= 8 ? 'medium' : 'low';
        
        const reportIds = [task.primary_target_id, ...task.included_reports.map(r => r.report_id)];
        
        await createCustomCleanupTask({
          report_ids: reportIds,
          title: task.title,
          description: `Auto-generated route (Detour: ${task.cumulative_detour_minutes.toFixed(1)} mins). Includes primary ${task.primary_target_is_cluster ? 'cluster' : 'report'}.`,
          priority: priorityStr,
          assigned_crew_ids: task.assigned_crew_ids
        })
      }
      
      setNotification({ message: 'Tasks dispatched successfully!', type: 'success' })
      setTimeout(() => {
        router.push('/dashboard/officer/operations')
      }, 1500)
    } catch (error) {
      console.error(error)
      setNotification({ message: 'Error dispatching tasks', type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <OfficerGuard>
      <div className="p-8">
      <PageHeader
        title="Create Cleanup Task"
        subtitle="Select reports on the map manually or auto-generate optimal routes"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Cleanup Tasks', href: '/dashboard/officer/operations' },
          { label: 'Create Task' }
        ]}
      />

      {/* Mode Toggle */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 py-3 font-mono font-bold uppercase tracking-widest border border-border transition-all ${
            mode === 'manual' 
              ? 'bg-accent-green text-white border-border shadow-sm' 
              : 'bg-transparent text-text-muted border-border hover:border-text-primary'
          }`}
        >
          Manual Mode
        </button>
        <button
          onClick={() => setMode('auto')}
          className={`flex-1 py-3 font-mono font-bold uppercase tracking-widest border border-border transition-all ${
            mode === 'auto' 
              ? 'bg-accent-blue text-white border-border shadow-sm' 
              : 'bg-transparent text-text-muted border-border hover:border-text-primary'
          }`}
        >
          Auto-Generate Routes
        </button>
      </div>

      {mode === 'manual' ? (
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
                <li>• Or use the checkboxes in the table below</li>
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
                         className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-widest border border-border ${taskPriority === p ? (p==='high' ? 'bg-error text-white border-error' : p==='medium' ? 'bg-warning text-text-primary border-warning' : 'bg-success text-white border-success') : 'bg-transparent text-text-muted border-border hover:border-white'}`}
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
                                className="w-10 h-10 rounded-xl object-cover border border-border"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-accent-green flex items-center justify-center text-white font-bold text-lg">
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
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* AUTO-GENERATE MODE */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="card">
              <h2 className="text-lg font-bold text-text-primary mb-4">Auto-Route Setup</h2>
              <div className="space-y-4">
                
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Routing Strategy</label>
                  <select 
                    className="w-full input" 
                    value={strategy} 
                    onChange={(e) => {
                      const val = e.target.value
                      setStrategy(val)
                      if (val !== 'custom') {
                        const strat = STRATEGIES.find(s => s.id === val)
                        setAutoSettings(prev => ({
                          ...prev,
                          ...strat.config
                        }))
                      }
                    }}
                  >
                    {STRATEGIES.map(s => (
                      <option key={s.id} value={s.id}>{s.name} - {s.desc}</option>
                    ))}
                    <option value="custom">Custom (Advanced)</option>
                  </select>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full bg-surface-elevated p-3 text-left font-medium text-sm flex justify-between items-center hover:bg-border transition-colors"
                  >
                    <span>Advanced Route Tweaks</span>
                    <span>{showAdvanced ? '▲' : '▼'}</span>
                  </button>
                  {showAdvanced && (
                    <div className="p-4 bg-surface space-y-4 border-t border-border">
                      <Input
                        label="Aging Factor (per day)"
                        type="number"
                        step="0.1"
                        value={autoSettings.aging_factor}
                        onChange={(e) => {
                          setStrategy('custom')
                          setAutoSettings({...autoSettings, aging_factor: parseFloat(e.target.value)})
                        }}
                      />
                      <Input
                        label="Max Escalation Cap (points)"
                        type="number"
                        step="1.0"
                        value={autoSettings.max_escalation_cap}
                        onChange={(e) => {
                          setStrategy('custom')
                          setAutoSettings({...autoSettings, max_escalation_cap: parseFloat(e.target.value)})
                        }}
                      />
                      <Input
                        label="Max extra driving per stop (mins)"
                        type="number"
                        step="0.5"
                        value={autoSettings.max_detour_minutes}
                        onChange={(e) => {
                          setStrategy('custom')
                          setAutoSettings({...autoSettings, max_detour_minutes: parseFloat(e.target.value)})
                        }}
                      />
                      <Input
                        label="Total allowed detour time (mins)"
                        type="number"
                        step="1.0"
                        value={autoSettings.max_detour_time_per_task}
                        onChange={(e) => {
                          setStrategy('custom')
                          setAutoSettings({...autoSettings, max_detour_time_per_task: parseFloat(e.target.value)})
                        }}
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={handlePreviewRoutes}
                  disabled={generating}
                  className="w-full btn-primary py-3 font-bold uppercase tracking-widest text-xs mt-4"
                >
                  {generating ? 'Calculating Routes...' : 'Preview Routes'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {generatedTasks ? (
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-text-primary">Review Proposed Routes</h2>
                  <button
                    onClick={handleConfirmAndDispatch}
                    disabled={creating}
                    className="btn-primary py-2 px-4 text-xs font-bold uppercase tracking-widest"
                  >
                    {creating ? 'Dispatching...' : 'Confirm & Dispatch'}
                  </button>
                </div>

                <div className="space-y-4">
                  {generatedTasks.map((task, idx) => (
                    <div key={idx} className="border border-border p-4 rounded-lg bg-surface-elevated">
                      <div className="flex justify-between items-start mb-3">
                        <Input 
                          value={task.title}
                          onChange={(e) => {
                            const nt = [...generatedTasks]
                            nt[idx].title = e.target.value
                            setGeneratedTasks(nt)
                          }}
                          className="font-bold text-lg"
                        />
                        <div className="text-right">
                          <span className="text-xs text-text-muted block">Primary Priority</span>
                          <span className="font-mono text-accent-blue font-bold">{task.primary_priority.toFixed(1)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary mb-3">
                        Includes primary {task.primary_target_is_cluster ? 'cluster' : 'report'} ({task.primary_target_id.substring(0,6)}) 
                        and {task.included_reports.length} detour reports.
                        (Total Detour: {task.cumulative_detour_minutes.toFixed(1)} mins)
                      </p>

                      <div className="mt-3">
                        <label className="block text-sm font-medium text-text-primary mb-2">Assign Crew:</label>
                        <div className="flex flex-wrap gap-2">
                          {availableCrew.map(crew => (
                            <label key={crew.id} className="flex items-center gap-2 text-sm bg-surface p-2 rounded border border-border cursor-pointer">
                              <Checkbox 
                                id={`g-crew-${idx}-${crew.id}`}
                                checked={task.assigned_crew_ids.includes(crew.id)}
                                onChange={(e) => {
                                  const nt = [...generatedTasks]
                                  if (e.target.checked) {
                                    nt[idx].assigned_crew_ids.push(crew.id)
                                  } else {
                                    nt[idx].assigned_crew_ids = nt[idx].assigned_crew_ids.filter(id => id !== crew.id)
                                  }
                                  setGeneratedTasks(nt)
                                }}
                              />
                              {crew.full_name}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card h-full flex items-center justify-center border-dashed border border-border bg-transparent">
                <div className="text-center p-8">
                  <div className="text-4xl mb-4">🗺️</div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">Ready to Auto-Generate</h3>
                  <p className="text-text-muted">Configure the auto-route setup on the left and click "Preview Routes" to let the system bundle tasks automatically.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
