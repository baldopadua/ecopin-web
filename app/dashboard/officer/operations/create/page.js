'use client'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchFilteredReports, fetchAvailableCrew, fetchReportsByClusterId, fetchCleanupTasks, fetchDispatchBlocks } from '@/lib/api'
import { createCustomCleanupTask } from '@/lib/api'
import { readSessionKey, triggerSessionExpired } from '@/lib/auth-token.mjs'
import { backendFetch as fetch } from '../../../../../lib/backend-fetch.mjs'
import PageHeader from '@/components/layout/PageHeader'
import PageTabs from '@/components/ui/PageTabs'
import Notification from '@/components/ui/Notification'
import Input from '@/components/ui/Input'
import Checkbox from '@/components/ui/Checkbox'
import { CrewChoices, OperationChoices } from './OperationChoices'
import styles from './OperationCreate.module.css'
import { OfficerGuard } from '@/components/auth/RequireRole'
import dynamic from 'next/dynamic'
import { reportDiagnostic } from '../../../../../lib/diagnostics.mjs';

// Dynamically import EcoPinMap to avoid SSR issues
const EcoPinMap = dynamic(() => import('@/components/map/EcoPinMap'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map...</div>
})

// CustomMap component defined outside to prevent re-creation
function CustomMap({ selectedReports, allowedReportIds, onReportSelect, onClusterSelect, reports = [] }) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate center from selected reports if any
  const mapCenter = useMemo(() => {
    if (!selectedReports || selectedReports.length === 0 || !reports || reports.length === 0) return null
    const selectedSet = new Set(selectedReports.map(String))
    const matched = reports.filter(r => selectedSet.has(String(r.id)) && (r.latitude || r.lat || r.location))
    if (matched.length > 0) {
      const first = matched[0]
      let lat = first.latitude || first.lat
      let lng = first.longitude || first.lng
      if (!lat && first.location) {
        try {
          if (typeof first.location === 'object' && first.location.coordinates) {
            lng = first.location.coordinates[0]
            lat = first.location.coordinates[1]
          }
        } catch {}
      }
      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        return { lat: parseFloat(lat), lng: parseFloat(lng) }
      }
    }
    return null
  }, [selectedReports, reports])

  if (!mounted) return <div className={styles.mapLoading}>Loading map...</div>

  return (
    <div className={styles.map}>
      <EcoPinMap 
        reports={reports}
        centerLat={mapCenter?.lat}
        centerLng={mapCenter?.lng}
        initialStatus="unresolved"
        initialValidationStatus="all"
        selectionMode={true}
        allowedReportIds={allowedReportIds}
        selectedReports={Array.from(selectedReports).sort()}
        onReportSelect={onReportSelect}
        onClusterSelect={onClusterSelect}
        hideFilterPanel={true}
      />
    </div>
  )
}

const STRATEGIES = [
  { id: 'standard', name: 'Standard Dispatch', config: { aging_factor: 1.5, max_escalation_cap: 10.0, max_detour_minutes: 5.0, max_detour_time_per_task: 15.0, max_route_distance_km: 50.0, max_route_duration_minutes: 480.0 } },
  { id: 'thorough', name: 'Thorough Cleanup', config: { aging_factor: 1.5, max_escalation_cap: 10.0, max_detour_minutes: 10.0, max_detour_time_per_task: 30.0, max_route_distance_km: 75.0, max_route_duration_minutes: 600.0 } },
  { id: 'backlog', name: 'Backlog Crusher', config: { aging_factor: 3.0, max_escalation_cap: 20.0, max_detour_minutes: 5.0, max_detour_time_per_task: 15.0, max_route_distance_km: 40.0, max_route_duration_minutes: 360.0 } }
]

import { autoAssignCrewsToRoutes } from '@/lib/crewAssignment.mjs'

export default function CreateCleanupTaskPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState('manual') // 'manual' or 'auto'
  const [compactView, setCompactView] = useState('map')
  const [autoView, setAutoView] = useState('setup')
  const [routeIndex, setRouteIndex] = useState(0)
  
  const [reports, setReports] = useState([])
  const [selectedReports, setSelectedReports] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [notification, setNotification] = useState(null)
  const [existingTasks, setExistingTasks] = useState([])
  
  const [taskTitle, setTaskTitle] = useState('')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [taskDescription, setTaskDescription] = useState('')
  
  const [availableCrew, setAvailableCrew] = useState([])
  const [selectedCrewIds, setSelectedCrewIds] = useState([])
  
  const [reportSearch, setReportSearch] = useState('')

  // Auto-Generate Settings
  const [autoSettings, setAutoSettings] = useState({
    aging_factor: STRATEGIES[0].config.aging_factor,
    max_escalation_cap: STRATEGIES[0].config.max_escalation_cap,
    max_detour_minutes: STRATEGIES[0].config.max_detour_minutes,
    max_detour_time_per_task: STRATEGIES[0].config.max_detour_time_per_task,
    max_route_distance_km: STRATEGIES[0].config.max_route_distance_km,
    max_route_duration_minutes: STRATEGIES[0].config.max_route_duration_minutes
  })
  const [generationScope, setGenerationScope] = useState('batch')
  const [generatedTasks, setGeneratedTasks] = useState(null)
  const [generationError, setGenerationError] = useState(null)
  const [generating, setGenerating] = useState(false)
  
  const [strategy, setStrategy] = useState('standard')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [advancedPage, setAdvancedPage] = useState(0)


  const filteredReports = useMemo(() => {
    const list = reports.filter(r => 
      (r.title && r.title.toLowerCase().includes(reportSearch.toLowerCase())) ||
      (r.issue_type && r.issue_type.toLowerCase().includes(reportSearch.toLowerCase())) ||
      (r.id && r.id.toLowerCase().includes(reportSearch.toLowerCase()))
    )

    // Pin selected reports to the top of the list
    return list.slice().sort((a, b) => {
      const aSel = selectedReports.has(String(a.id)) ? 1 : 0
      const bSel = selectedReports.has(String(b.id)) ? 1 : 0
      if (aSel !== bSel) return bSel - aSel
      return 0
    })
  }, [reports, reportSearch, selectedReports])

  const allowedReportIds = useMemo(() => reports.map(r => r.id), [reports])

  useEffect(() => {
    loadReports()
    loadAvailableCrew()
  }, [])

  const hasPreselectedRef = useRef(false)

  useEffect(() => {
    if (reports.length === 0 || hasPreselectedRef.current) return

    // 1. Check session state for report IDs
    let sessionReportIds = []
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('dispatch_report_ids') || sessionStorage.getItem('preselected_report_ids')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            sessionReportIds = parsed.map(String).filter(Boolean)
          }
          sessionStorage.removeItem('dispatch_report_ids')
          sessionStorage.removeItem('preselected_report_ids')
        }
      } catch (err) {
        reportDiagnostic('warn', 'dispatch', 'Failed to parse report IDs from sessionStorage', err)
      }
    }

    // 2. Check query params for report IDs
    const rawReportIds = searchParams.get('report_ids') || searchParams.get('reports') || searchParams.get('reportIds')
    const queryReportIds = rawReportIds
      ? rawReportIds.split(',').map(s => s.trim()).filter(Boolean)
      : []

    // 3. Check preselect or cluster_id parameter
    const preselectParam = searchParams.get('preselect') || searchParams.get('cluster_id')
    const preselectReportIds = []
    let preselectClusterId = null

    if (preselectParam) {
      if (preselectParam.includes(',')) {
        preselectReportIds.push(...preselectParam.split(',').map(s => s.trim()).filter(Boolean))
      } else {
        const directMatch = reports.find(r => String(r.id) === String(preselectParam))
        if (directMatch) {
          preselectReportIds.push(String(directMatch.id))
        } else {
          preselectClusterId = preselectParam
        }
      }
    }

    // Combine explicit target report IDs
    const targetReportIds = new Set([...sessionReportIds, ...queryReportIds, ...preselectReportIds].map(String))

    // Find all matching eligible reports in local state
    const matchedReportIds = reports
      .filter(r => targetReportIds.has(String(r.id)))
      .map(r => String(r.id))

    if (matchedReportIds.length > 0) {
      setSelectedReports(new Set(matchedReportIds))
      const matchedSet = new Set(matchedReportIds)
      setReports(prev => {
        const pinned = prev.filter(r => matchedSet.has(String(r.id)))
        const others = prev.filter(r => !matchedSet.has(String(r.id)))
        return [...pinned, ...others]
      })
      hasPreselectedRef.current = true
    } else if (preselectClusterId) {
      const clusterReports = reports.filter(r => String(r.cluster_id) === String(preselectClusterId))
      if (clusterReports.length > 0) {
        const clusterIds = clusterReports.map(r => String(r.id))
        const clusterIdSet = new Set(clusterIds)
        setSelectedReports(new Set(clusterIds))
        setReports(prev => {
          const pinned = prev.filter(r => clusterIdSet.has(String(r.id)))
          const others = prev.filter(r => !clusterIdSet.has(String(r.id)))
          return [...pinned, ...others]
        })
        hasPreselectedRef.current = true
      } else {
        fetchReportsByClusterId(preselectClusterId).then(fetched => {
          if (Array.isArray(fetched) && fetched.length > 0) {
            const fetchedIdSet = new Set(fetched.map(r => String(r.id)))
            setReports(prev => {
              const remaining = prev.filter(r => !fetchedIdSet.has(String(r.id)))
              return [...fetched, ...remaining]
            })
            setSelectedReports(new Set(fetched.map(r => String(r.id))))
          }
        }).catch(err => {
          reportDiagnostic('warn', 'dispatch', 'Failed to fetch cluster reports for preselection:', err)
        }).finally(() => {
          hasPreselectedRef.current = true
        })
      }
    } else if (targetReportIds.size > 0) {
      setSelectedReports(new Set(targetReportIds))
      hasPreselectedRef.current = true
    }

    // Prefill title & priority if available
    const titleParam = searchParams.get('title')
    if (titleParam && !taskTitle) {
      setTaskTitle(titleParam)
    }
    const priorityParam = searchParams.get('priority')
    if (priorityParam && ['low', 'medium', 'high', 'urgent'].includes(priorityParam.toLowerCase())) {
      setTaskPriority(priorityParam.toLowerCase() === 'urgent' ? 'high' : priorityParam.toLowerCase())
    }
  }, [searchParams, reports, taskTitle])

  const loadReports = async () => {
    setLoading(true)
    try {
      const preselectClusterParam = searchParams.get('preselect') || searchParams.get('cluster_id')

      const [reportsData, tasksData, blocksData, clusterReportsData] = await Promise.all([
        fetchFilteredReports(),
        fetchCleanupTasks().catch(() => []),
        fetchDispatchBlocks().catch(() => []),
        (preselectClusterParam && !preselectClusterParam.includes(','))
          ? fetchReportsByClusterId(preselectClusterParam).catch(() => [])
          : Promise.resolve([])
      ])

      const activeTasks = Array.isArray(tasksData) ? tasksData.filter(t => !['completed', 'cancelled'].includes(t.status)) : []
      setExistingTasks(activeTasks)
      const claimedReportIds = new Set(activeTasks.flatMap(t => (t.report_ids || []).map(String)))

      const blockedReportIds = new Set(Array.isArray(blocksData) ? blocksData.map(b => String(b.report_id)).filter(Boolean) : [])
      const blockedClusterIds = new Set(Array.isArray(blocksData) ? blocksData.map(b => String(b.cluster_id)).filter(Boolean) : [])

      // Merge public reports and constituent cluster reports by id
      const allReportsMap = new Map()
      ;(reportsData || []).forEach(r => allReportsMap.set(String(r.id), r))
      if (Array.isArray(clusterReportsData)) {
        clusterReportsData.forEach(r => {
          const id = String(r.id)
          const existing = allReportsMap.get(id)
          allReportsMap.set(id, { ...existing, ...r })
        })
      }
      const combinedReports = Array.from(allReportsMap.values())

      const isApprovedValidation = (val) => {
        const v = (val || '').toLowerCase().trim()
        return v === 'approved' || v === 'validated' || v === 'automatically_valid'
      }

      const isUnresolvedStatus = (st) => {
        const s = (st || '').toLowerCase().trim()
        return s === 'unresolved' || s === 'submitted' || s === 'pending' || s === 'open' || s === 'new'
      }

      const eligibleReports = combinedReports.filter(r => {
        const id = String(r.id)
        const cId = r.cluster_id ? String(r.cluster_id) : null
        return (
          isUnresolvedStatus(r.status) &&
          isApprovedValidation(r.validation_status) &&
          !claimedReportIds.has(id) &&
          !blockedReportIds.has(id) &&
          !(cId && blockedClusterIds.has(cId))
        )
      })

      const rawReportIds = searchParams.get('report_ids') || searchParams.get('reports') || searchParams.get('reportIds')
      const targetQueryIds = rawReportIds
        ? rawReportIds.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
        : []
      const clusterReportIds = Array.isArray(clusterReportsData)
        ? clusterReportsData.map(r => String(r.id).toLowerCase())
        : []
      const targetPreselectIds = new Set([...targetQueryIds, ...clusterReportIds])
      const targetClusterId = preselectClusterParam ? String(preselectClusterParam).toLowerCase() : null

      const isTarget = (r) => {
        const id = String(r.id).toLowerCase()
        const cId = r.cluster_id ? String(r.cluster_id).toLowerCase() : null
        return (
          targetPreselectIds.has(id) ||
          (targetClusterId && (cId === targetClusterId || id === targetClusterId))
        )
      }

      const pinned = eligibleReports.filter(isTarget)
      const others = eligibleReports.filter(r => !isTarget(r))
      setReports([...pinned, ...others])
    } catch (error) {
      reportDiagnostic('error', 'dispatch', 'Failed to load reports:', error)
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
      reportDiagnostic('error', 'dispatch', 'Failed to load available crew:', error)
    }
  }

  const toggleReportSelection = useCallback((reportId) => {
    const strId = String(reportId)
    setSelectedReports(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(strId)) {
        newSelected.delete(strId)
      } else {
        newSelected.add(strId)
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
      setNotification({ message: 'Please assign a field crew', type: 'warning' })
      return
    }

    // Resolve selected crew team IDs to individual member profile IDs
    const memberProfileIds = []
    selectedCrewIds.forEach(crewId => {
      const crewTeam = availableCrew.find(c => c.id === crewId)
      if (crewTeam?.members?.length > 0) {
        crewTeam.members.forEach(m => memberProfileIds.push(m.id))
      } else {
        memberProfileIds.push(crewId)
      }
    })
    const uniqueMemberIds = [...new Set(memberProfileIds)]

    setCreating(true)
    try {
      await createCustomCleanupTask({
        report_ids: Array.from(selectedReports),
        title: taskTitle,
        description: taskDescription,
        priority: taskPriority,
        field_crew_id: selectedCrewIds[0] || null,
        assigned_crew_ids: uniqueMemberIds
      })
      setNotification({ message: 'Cleanup task created successfully', type: 'success' })
      setTimeout(() => {
        router.push('/dashboard/officer/operations')
      }, 1500)
    } catch (error) {
      reportDiagnostic('error', 'dispatch', 'Failed to create task:', error)
      const message = error?.message || 'Failed to create task. Please try again.'
      setNotification({ message, type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  const handlePreviewRoutes = async () => {
    setGenerating(true)
    setGeneratedTasks(null)
    setRouteIndex(0)
    setAutoView('routes')
    setGenerationError(null)
    
    try {
      if (!readSessionKey()) {
        triggerSessionExpired()
        throw new Error('Please sign in again to preview tasks')
      }
      const res = await fetch('/api/tasks/auto-generate/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: autoSettings
        })
      })
      
      const data = await res.json()

      if (res.status === 401) triggerSessionExpired()
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to generate tasks')
      }

      if (!data.tasks || data.tasks.length === 0) {
        setGeneratedTasks([])
        setNotification({ message: 'No eligible unresolved reports found for task generation.', type: 'info' })
        return
      }
      
      // Map tasks to add crew selection arrays and title input with workload-balanced crew assignment
      const proposals = generationScope === 'single'
        ? [...data.tasks].sort((a, b) => b.primary_priority - a.primary_priority).slice(0, 1)
        : data.tasks
      const preparedTasks = autoAssignCrewsToRoutes(proposals, availableCrew, existingTasks)
      setRouteIndex(0)
      setAutoView('routes')
      
      setGeneratedTasks(preparedTasks)
      const assignedCount = preparedTasks.filter(t => t.assigned_crew_ids?.length > 0).length
      setNotification({
        message: availableCrew.length > 0
          ? `Generated ${preparedTasks.length} cleanup task(s) and auto-assigned crews (${assignedCount}/${preparedTasks.length} assigned).`
          : `Generated ${preparedTasks.length} proposed cleanup task(s)!`,
        type: 'success'
      })
    } catch (error) {
      reportDiagnostic('error', 'dispatch', 'Route generation failed:', error)
      const message = error.message || 'Error generating tasks'
      setGenerationError(message)
      setNotification({ message, type: 'error' })
    } finally {
      setGenerating(false)
    }
  }

  const handleConfirmAndDispatch = async () => {
    if (!generatedTasks || generatedTasks.length === 0) return
    
    const unassigned = generatedTasks.some(t => t.assigned_crew_ids.length === 0)
    if (unassigned) {
       setNotification({ message: 'Please assign crew to all proposed cleanup tasks before confirming.', type: 'warning' })
       return
    }

    setCreating(true)
    try {
      for (const task of generatedTasks) {
        const pScore = task.primary_priority;
        const priorityStr = pScore >= 15 ? 'high' : pScore >= 8 ? 'medium' : 'low';
        
        let primaryReportIds = []
        if (task.primary_target_is_cluster) {
          // If primary target is a cluster, resolve it to its constituent reports
          try {
            const clusterReports = await fetchReportsByClusterId(task.primary_target_id)
            if (Array.isArray(clusterReports) && clusterReports.length > 0) {
              primaryReportIds = clusterReports.map(r => r.id)
            } else if (Array.isArray(task.included_reports) && task.included_reports.length > 0) {
              primaryReportIds = task.included_reports.map(r => r.report_id)
            } else {
              primaryReportIds = [task.primary_target_id]
            }
          } catch {
            primaryReportIds = Array.isArray(task.included_reports) && task.included_reports.length > 0
              ? task.included_reports.map(r => r.report_id)
              : [task.primary_target_id]
          }
        } else {
          primaryReportIds = [task.primary_target_id]
        }

        const detourReportIds = (task.included_reports || []).map(r => r.report_id)
        const combinedReportIds = [...new Set([...primaryReportIds, ...detourReportIds])]

        // Resolve crew team IDs to individual member profile IDs
        const taskMemberIds = []
        task.assigned_crew_ids.forEach(crewId => {
          const crewTeam = availableCrew.find(c => c.id === crewId)
          if (crewTeam?.members?.length > 0) {
            crewTeam.members.forEach(m => taskMemberIds.push(m.id))
          } else {
            taskMemberIds.push(crewId)
          }
        })
        const uniqueCrewMemberIds = [...new Set(taskMemberIds)]
        
        await createCustomCleanupTask({
          report_ids: combinedReportIds,
          title: task.title,
          description: `Auto-generated cleanup task (Detour: ${(task.cumulative_detour_minutes ?? 0).toFixed(1)} mins). Includes primary ${task.primary_target_is_cluster ? 'cluster' : 'report'}.`,
          priority: priorityStr,
          field_crew_id: task.assigned_crew_ids[0] || null,
          assigned_crew_ids: uniqueCrewMemberIds
        })
      }
      
      setNotification({ message: 'Tasks dispatched successfully!', type: 'success' })
      setTimeout(() => {
        router.push('/dashboard/officer/operations')
      }, 1500)
    } catch (error) {
      reportDiagnostic('error', 'dispatch', error)
      const message = error?.message || 'Error dispatching tasks'
      setNotification({ message, type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  const activeRouteIndex = Math.min(routeIndex, Math.max(0, (generatedTasks?.length || 0) - 1))

  return (
    <OfficerGuard>
      <div className={`workspace-page ${styles.page}`}>
        <PageHeader className={styles.pageHeader}
          title="Create Cleanup Task"
          subtitle="Select reports on the map manually or auto-generate cleanup tasks"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Cleanup Tasks', href: '/dashboard/officer/operations' },
            { label: 'Create Task' }
          ]}
        />
        <PageTabs label="Task creation mode" value={mode} onChange={setMode}
          tabs={[{ id: 'manual', label: 'Manual mode' }, { id: 'auto', label: 'Auto-generate tasks' }]} />
        <div role="tabpanel" id={`${mode}-panel`} aria-labelledby={`${mode}-tab`} className="workspace-fill">
        {mode === 'manual' ? <>
          <div className={styles.viewTabs} role="group" aria-label="Manual workspace view">
            {[['map', 'Map'], ['reports', 'Reports'], ['details', 'Task details']].map(([id, label]) =>
              <button key={id} type="button" aria-pressed={compactView === id} onClick={() => setCompactView(id)}>{label}</button>)}
          </div>
          <div className={styles.manualWorkspace} data-view={compactView}>
            <section className={`${styles.panel} ${styles.mapPanel}`} aria-label="Select reports on map">
              <h2>Select reports</h2>
              {loading ? <div className={styles.mapLoading} role="status">Loading reports…</div>
                : <CustomMap selectedReports={Array.from(selectedReports).sort()} allowedReportIds={allowedReportIds} reports={reports}
                  onReportSelect={toggleReportSelection} onClusterSelect={clusterReportIds => {
                    setSelectedReports(prev => {
                      const next = new Set(prev)
                      const strClusterIds = (clusterReportIds || []).map(String)
                      const eligibleIds = new Set(reports.map(r => String(r.id)))
                      const validClusterIds = strClusterIds.filter(id => eligibleIds.has(id))
                      if (validClusterIds.length === 0) return prev

                      // Toggle behavior: if all reports in cluster are already selected, deselect them; otherwise select all
                      const allSelected = validClusterIds.every(id => next.has(id))
                      if (allSelected) {
                        validClusterIds.forEach(id => next.delete(id))
                      } else {
                        validClusterIds.forEach(id => next.add(id))
                      }
                      return next
                    })
                  }} />}
              <p className={styles.instructions}>Select map pins or report checkboxes to group unresolved reports. Enter task details, assign field crew, then create the task.</p>
            </section>
            <section className={`${styles.panel} ${styles.reportsPanel}`} aria-label="Report selection">
              <div className={styles.panelHeader}><h2>Reports ({selectedReports.size} selected)</h2>
                <button type="button" className={styles.clear} disabled={!selectedReports.size} onClick={() => setSelectedReports(new Set())}>Clear</button>
              </div>
              <Input aria-label="Search reports" placeholder="Search title, type or ID" value={reportSearch} onChange={event => setReportSearch(event.target.value)} />
              <OperationChoices key={reportSearch} items={loading ? [] : filteredReports} label="Reports"
                empty={loading ? 'Loading reports…' : reports.length ? 'No matching reports found.' : 'No unassigned reports available. Reports already assigned or restricted by dispatch access blocks are excluded.'}>
                {report => {
                  const isSelected = selectedReports.has(String(report.id))
                  return (
                    <div className={`${styles.reportRow} ${isSelected ? styles.selectedReportRow : ''}`}>
                      <Checkbox id={`report-cb-${report.id}`} aria-label={`Select ${report.title || report.id}`}
                        checked={isSelected} onChange={() => toggleReportSelection(report.id)} />
                      <label htmlFor={`report-cb-${report.id}`}>
                        <strong>{report.title || 'Untitled report'}</strong>
                        <small>#{report.id.substring(0, 6)} · {(report.issue_type || '').replace(/_/g, ' ')}</small>
                        <span>{report.description || 'No description provided.'}</span>
                      </label>
                    </div>
                  )
                }}
              </OperationChoices>
            </section>
            <section className={`${styles.panel} ${styles.detailsPanel}`} aria-label="Task details">
              <h2>Task details</h2>
              <div className={styles.detailFields}>
                <Input label="Task Title *" value={taskTitle} onChange={event => setTaskTitle(event.target.value)} placeholder="Enter task title" />
                <div className={styles.field}>
                  <label htmlFor="task-priority">Priority Level *</label>
                  <select id="task-priority" className="input" value={taskPriority} onChange={event => setTaskPriority(event.target.value)}>
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                </div>
                <div className={`${styles.field} ${styles.fullField}`}>
                  <label htmlFor="task-description">Description</label>
                  <textarea id="task-description" className="input" rows={2} value={taskDescription}
                    onChange={event => setTaskDescription(event.target.value)} placeholder="Task description (optional)" />
                </div>
              </div>
              <div className={styles.crewField} role="group" aria-label="Assign to Field Crew">
                <span className={styles.fieldLabel}>Assign to Field Crew *</span>
                <CrewChoices crews={availableCrew} selected={selectedCrewIds} onChange={setSelectedCrewIds} />
              </div>
              <div className={styles.summary} role="status"><span>Reports selected: <strong>{selectedReports.size}</strong></span><span>Crew assigned: <strong>{selectedCrewIds.length > 0 ? (availableCrew.find(c => c.id === selectedCrewIds[0])?.name || 'Selected') : 'None'}</strong></span></div>
              <button type="button" onClick={handleCreateTask} className={styles.primary}
                disabled={creating || !selectedReports.size || !taskTitle.trim() || !selectedCrewIds.length}>
                {creating ? 'Creating Task…' : 'Create Cleanup Task'}
              </button>
            </section>
          </div>
        </> : <>
          <div className={styles.viewTabs} role="group" aria-label="Auto workspace view">
            <button type="button" aria-pressed={autoView === 'setup'} onClick={() => setAutoView('setup')}>Task setup</button>
            <button type="button" aria-pressed={autoView === 'routes'} onClick={() => setAutoView('routes')}>Proposed tasks</button>
          </div>
          <div className={styles.autoWorkspace} data-view={autoView}>
            <section className={`${styles.panel} ${styles.setup}`} aria-label="Auto-task setup">
              <div className={styles.panelHeader}>
                <h2>Auto-task setup</h2>
                <button type="button" className={styles.secondary} aria-expanded={showAdvanced} aria-controls="route-tweaks" onClick={() => setShowAdvanced(value => !value)}>
                  Advanced route tweaks {showAdvanced ? '−' : '+'}
                </button>
              </div>
              <div className={`${styles.field} ${styles.strategyField}`}>
                <label htmlFor="routing-strategy">Routing Strategy</label>
                <select id="routing-strategy" className="input" value={strategy} onChange={event => {
                  const value = event.target.value
                  setStrategy(value)
                  if (value !== 'custom') setAutoSettings(prev => ({ ...prev, ...STRATEGIES.find(item => item.id === value).config }))
                }}>
                  {STRATEGIES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  <option value="custom">Custom (Advanced)</option>
                </select>
              </div>
              <div className={`${styles.field} ${styles.strategyField}`}>
                <label htmlFor="generation-scope">Generate</label>
                <select id="generation-scope" className="input" value={generationScope} disabled={generating || creating}
                  onChange={event => { setGenerationScope(event.target.value); setGeneratedTasks(null); setGenerationError(null); setRouteIndex(0) }}>
                  <option value="single">Single highest-priority task</option>
                  <option value="batch">Tasks for eligible backlog</option>
                </select>
              </div>
              {showAdvanced && <div id="route-tweaks" className={styles.advanced} data-page={advancedPage}>
                {[
                  ['aging_factor', 'Aging Factor (per day)', '0.1'],
                  ['max_escalation_cap', 'Max Escalation Cap (points)', '1.0'],
                  ['max_detour_minutes', 'Max extra driving per stop (mins)', '0.5'],
                  ['max_detour_time_per_task', 'Total allowed detour time (mins)', '1.0'],
                  ['max_route_distance_km', 'Max Route Distance Limit (km)', '5.0'],
                  ['max_route_duration_minutes', 'Shift cap (mins)', '15.0'],
                ].map(([key, label, step], index) => <div key={key} className={styles.tweakField} data-tweak-page={Math.floor(index / 2)}>
                  <Input label={label} type="number" step={step} value={autoSettings[key]}
                    onChange={event => { setStrategy('custom'); setAutoSettings(prev => ({ ...prev, [key]: parseFloat(event.target.value) })) }} />
                </div>)}
              </div>}
              {showAdvanced && <nav className={`${styles.pager} ${styles.advancedPager}`} aria-label="Advanced settings pages">
                <button type="button" disabled={advancedPage === 0} onClick={() => setAdvancedPage(value => value - 1)}>Previous settings</button>
                <span role="status">{advancedPage + 1} of 3</span>
                <button type="button" disabled={advancedPage === 2} onClick={() => setAdvancedPage(value => value + 1)}>Next settings</button>
              </nav>}
              <button type="button" onClick={handlePreviewRoutes} disabled={generating} className={styles.primary}>
                {generating ? 'Generating Tasks…' : 'Preview Tasks'}
              </button>
            </section>
            {generationError ? <section className={`${styles.panel} ${styles.autoState}`} role="alert">
              <h2 className={styles.warning}>Task Generation Failed</h2><p>{generationError}</p>
              <button type="button" className={styles.secondary} onClick={handlePreviewRoutes} disabled={generating}>Retry Generation</button>
            </section> : generatedTasks?.length ? <section className={styles.panel} aria-label="Review proposed cleanup tasks">
              <div className={styles.panelHeader}><h2>Proposed cleanup tasks</h2>
                <button type="button" className={styles.primary} onClick={handleConfirmAndDispatch} disabled={creating}>{creating ? 'Dispatching…' : 'Confirm & Dispatch'}</button>
              </div>
              {generatedTasks.slice(activeRouteIndex, activeRouteIndex + 1).map(task => {
                const idx = activeRouteIndex
                return <div key={idx} className={styles.routeCard}>
                  <Input label="Task title" value={task.title} onChange={event => {
                    const next = [...generatedTasks]; next[idx] = { ...next[idx], title: event.target.value }; setGeneratedTasks(next)
                  }} />
                  <div className={styles.routeFacts}>
                    <p>Primary priority: <strong>{task.primary_priority.toFixed(1)}</strong></p>
                    <p>{task.primary_target_is_cluster ? 'Cluster' : 'Report'} {task.primary_target_id?.substring(0, 6)} · {(task.included_reports || []).length} detour stops</p>
                    <p>Detour: {(task.cumulative_detour_minutes ?? 0).toFixed(1)} mins</p>
                    <p>Est. travel: {task.estimated_distance_km != null ? `~${Math.ceil(task.estimated_distance_km / 30 * 60)} min` : 'unavailable'}</p>
                    <p>Shift cap: {autoSettings.max_route_duration_minutes ?? 480} min</p>
                    {task.estimated_distance_km != null && <p className={autoSettings.max_route_distance_km && task.estimated_distance_km > autoSettings.max_route_distance_km ? styles.warning : ''}>
                      Distance: {task.estimated_distance_km.toFixed(1)} km {autoSettings.max_route_distance_km ? `/ ${autoSettings.max_route_distance_km} km max` : ''}
                      {autoSettings.max_route_distance_km && task.estimated_distance_km > autoSettings.max_route_distance_km && ' (Exceeds Limit)'}
                    </p>}
                  </div>
                  <p className={styles.instructions}>Travel assumes 30 km/h; cleanup time is excluded.</p>
                  <div className={styles.crewField} role="group" aria-label="Assign task crew">
                    <span className={styles.fieldLabel}>Assign crew</span>
                    <CrewChoices crews={availableCrew} selected={task.assigned_crew_ids} onChange={ids => {
                      const next = [...generatedTasks]; next[idx] = { ...next[idx], assigned_crew_ids: ids }; setGeneratedTasks(next)
                    }} />
                  </div>
                </div>
              })}
              <nav className={styles.pager} aria-label="Proposed task pages">
                <button type="button" disabled={activeRouteIndex === 0} onClick={() => setRouteIndex(activeRouteIndex - 1)}>Previous task</button>
                <span role="status">Task {activeRouteIndex + 1} of {generatedTasks.length}</span>
                <button type="button" disabled={activeRouteIndex >= generatedTasks.length - 1} onClick={() => setRouteIndex(activeRouteIndex + 1)}>Next task</button>
              </nav>
            </section> : <section className={`${styles.panel} ${styles.autoState}`} aria-live="polite">
              <h2>{generating ? 'Generating tasks…' : generatedTasks ? 'No Tasks Generated' : 'Ready to Auto-Generate'}</h2>
              <p>{generatedTasks ? 'No eligible, unassigned reports match the routing criteria.' : 'Choose a routing strategy and preview cleanup tasks. Each proposal becomes a separate task when dispatched.'}</p>
              {generatedTasks && <button type="button" className={styles.secondary} onClick={handlePreviewRoutes} disabled={generating}>Refresh & Retry</button>}
            </section>}
          </div>
        </>}
        {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
        </div>
      </div>
    </OfficerGuard>
  )
}
