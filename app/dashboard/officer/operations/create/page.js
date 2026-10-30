'use client'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchFilteredReports, fetchAvailableCrew, fetchReportsByClusterId, fetchCleanupTasks, fetchDispatchBlocks } from '@/lib/api'
import { createCustomCleanupTask } from '@/lib/api'
import { readSessionKey, triggerSessionExpired } from '@/lib/auth-token.mjs'
import { getPreviewReportIds } from '@/lib/cleanup-task-dispatch.mjs'
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
        photoPins={true}
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

export default function CreateCleanupTaskPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [compactView, setCompactView] = useState('map')
  
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

  return (
    <OfficerGuard>
      <div className={`workspace-page ${styles.page}`}>
        <PageHeader className={styles.pageHeader}
          title="Create Cleanup Task"
          subtitle="Select reports on the map and assign a crew to create a cleanup task"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Cleanup Tasks', href: '/dashboard/officer/operations' },
            { label: 'Create Task' }
          ]}
        />
        <aside className={styles.autoNotice}>
          <p>Need routes planned automatically? Use Route Optimization to generate and dispatch crew routes.</p>
          <Link href="/dashboard/officer/optimization" className={styles.primary}>Open Route Optimization</Link>
        </aside>
        <div className="workspace-fill">
        <>
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
        </>
        {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
        </div>
      </div>
    </OfficerGuard>
  )
}
