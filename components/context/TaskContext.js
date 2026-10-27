'use client'
import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { generatePlan, getPlanJob, getDispatchPlan, commitPlan, disassemblePlan, cancelPlanJob } from '@/lib/api/optimization'
import { useRouter } from 'next/navigation'
import Notification from '@/components/ui/Notification'
import { reportDiagnostic } from '../../lib/diagnostics.mjs';
import { dispatchResultNotice } from '../../lib/dispatch-result-notice.mjs';

const TaskContext = createContext()

export function useTask() {
  return useContext(TaskContext)
}

export function TaskProvider({ children }) {
  const router = useRouter()
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationProgress, setOptimizationProgress] = useState({ percent: 0, message: '' })
  const [globalNotification, setGlobalNotification] = useState(null)
  const [draftPlan, setDraftPlan] = useState(null)
  const [planningJob, setPlanningJob] = useState(null)
  const cancelRequestedRef = useRef(false)
  const abortControllerRef = useRef(null)
  const currentJobIdRef = useRef(null)

  const cancelOptimization = useCallback(async () => {
    cancelRequestedRef.current = true
    const activeJobId = currentJobIdRef.current || planningJob?.jobId

    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort()
      } catch (_) {}
    }

    setIsOptimizing(false)
    setPlanningJob(null)
    setOptimizationProgress({ percent: 0, message: '' })
    setGlobalNotification({
      message: 'Plan generation cancelled. Dispatch settings unlocked.',
      type: 'info'
    })

    if (activeJobId) {
      try {
        await cancelPlanJob(activeJobId)
      } catch (err) {
        reportDiagnostic('warn', 'dispatch', 'Notice: Could not notify backend of cancellation', err)
      }
    }
  }, [planningJob?.jobId])

  const startOptimization = useCallback(async (settings = {}, onSuccess, onError) => {
    if (isOptimizing) return
    cancelRequestedRef.current = false
    abortControllerRef.current = new AbortController()
    currentJobIdRef.current = null
    const signal = abortControllerRef.current.signal

    setIsOptimizing(true)
    setGlobalNotification(null)

    try {
      const queued = await generatePlan(settings, { signal })
      if (cancelRequestedRef.current) {
        if (queued?.jobId) {
          void cancelPlanJob(queued.jobId).catch(() => {})
        }
        return
      }
      if (!queued.jobId) throw new Error('Planning service returned no job ID')
      currentJobIdRef.current = queued.jobId
      setPlanningJob({ jobId: queued.jobId, status: queued.status || 'queued' })
      setOptimizationProgress({ percent: 20, message: 'Planning job queued' })

      const startTime = Date.now()
      let pollCount = 0
      let job = queued
      let pollRateLimitAttempts = 0
      while (job.status !== 'completed' && job.status !== 'failed') {
        if (cancelRequestedRef.current) return
        if (Date.now() - startTime > 90000) {
          throw new Error('Planning job timed out. Please check if the optimization worker is running and try again.')
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
        if (cancelRequestedRef.current) return
        pollCount++
        try {
          job = await getPlanJob(queued.jobId, { signal })
        } catch (pollErr) {
          if (cancelRequestedRef.current) return
          if ((pollErr.status === 429 || pollErr.isRateLimited) && pollRateLimitAttempts < 2) {
            pollRateLimitAttempts++
            setOptimizationProgress({
              percent: 30,
              message: 'Server busy, waiting a moment before checking job status...'
            })
            await new Promise(resolve => setTimeout(resolve, 5000))
            if (cancelRequestedRef.current) return
            continue
          }
          throw pollErr
        }
        if (cancelRequestedRef.current) return
        setPlanningJob(job)

        if (job.status === 'running') {
          const elapsedSec = Math.max(1, Math.round((Date.now() - startTime) / 1000))
          let stepMessage = 'Solver is building routes'
          let stepPercent = 65

          if (pollCount === 1) {
            stepMessage = 'Analyzing clusters and fleet availability...'
            stepPercent = 40
          } else if (pollCount === 2) {
            stepMessage = 'Calculating travel matrix and traffic buffers...'
            stepPercent = 55
          } else if (pollCount === 3) {
            stepMessage = 'Assigning candidate routes to field crews...'
            stepPercent = 68
          } else if (pollCount === 4) {
            stepMessage = 'Solving Vehicle Routing Problem (VRP)...'
            stepPercent = 78
          } else if (pollCount === 5) {
            stepMessage = 'Balancing crew shift capacity and load limits...'
            stepPercent = 85
          } else if (pollCount === 6) {
            stepMessage = 'Optimizing stop sequences and turnaround times...'
            stepPercent = 89
          } else {
            stepPercent = Math.min(95, 90 + Math.floor((pollCount - 7) / 2))
            stepMessage = `Refining route solution (${elapsedSec}s elapsed)...`
          }

          setOptimizationProgress({ percent: stepPercent, message: stepMessage })
        } else if (job.status === 'queued') {
          const elapsedSec = Math.max(1, Math.round((Date.now() - startTime) / 1000))
          setOptimizationProgress({
            percent: 20,
            message: pollCount > 1 ? `Waiting in solver queue (${elapsedSec}s elapsed)...` : 'Planning job queued'
          })
        }
      }
      if (cancelRequestedRef.current) return
      if (job.status === 'failed') throw new Error(`Planning failed: ${job.errorCode || 'unknown error'}`)
      if (!job.planId) throw new Error('Completed job has no draft plan')
      setOptimizationProgress({ percent: 96, message: 'Loading draft route plan...' })
      const result = await getDispatchPlan(job.planId, { signal })
      if (cancelRequestedRef.current) return
      const selectedCount = result.items.filter(item => item.is_selected && item.item_type !== 'bundled_report').length
      const unselectedItems = result.items.filter(item => !item.is_selected && item.item_type !== 'bundled_report')
      const outsideBufferCount = new Set((result.rejectedBundles || [])
        .filter(entry => entry.reason === 'outside_buffer' && entry.report_id)
        .map(entry => entry.report_id)).size
      const capacityFiltering = result.plan?.capacity_breakdown?.capacity_filtering ||
        result.plan?.solver_diagnostics?.capacity_filtering ||
        result.capacity?.capacity_filtering || null
      const generatedDraft = {
        ...result.plan, status: 'draft_plan', selectedCount,
        omittedCount: unselectedItems.length,
        outsideBufferCount,
        plannedCrewCount: result.plannedCrewCount || 0,
        proposedRoutes: result.proposedRoutes || [],
        capacityUtilized: result.capacity?.used || 0,
        groups: result.groups, rejectedBundles: result.rejectedBundles,
        capacity: result.capacity,
        capacity_filtering: capacityFiltering
      }
      setDraftPlan(generatedDraft)
      setOptimizationProgress({ percent: 100, message: 'Draft plan ready' })
      if (capacityFiltering?.alert_message) {
        setGlobalNotification({
          message: capacityFiltering.alert_message,
          type: 'info'
        })
      } else {
        setGlobalNotification({
          message: `Draft plan generated with ${selectedCount} tasks.`,
          type: selectedCount ? 'success' : 'warning'
        })
      }
      if (onSuccess) onSuccess({ ...result, plan: generatedDraft,
        selectedCount, omittedLoggedCount: generatedDraft.omittedCount, capacityFiltering })
    } catch (error) {
      if (cancelRequestedRef.current || error?.name === 'AbortError') {
        return
      }
      reportDiagnostic('error', 'ui', 'Optimization error:', error)
      setGlobalNotification({ message: error.message || 'Failed to generate optimization', type: 'error' })
      if (onError) onError(error)
    } finally {
      if (!cancelRequestedRef.current) {
        setIsOptimizing(false)
      }
    }
  }, [isOptimizing])


  const commitOptimization = useCallback(async (planId, options, onSuccess, onError) => {
    if (isOptimizing) return
    setIsOptimizing(true)
    setGlobalNotification(null)

    const commitStartTime = Date.now()
    const loadingSteps = [
      { percent: 30, message: 'Assigning tasks to field crews...' },
      { percent: 50, message: 'Calculating routes...' },
      { percent: 75, message: 'Validating travel and work capacity...' },
      { percent: 90, message: 'Finalizing optimization run...' },
    ]
    let stepIndex = 0
    const progressInterval = setInterval(() => {
      if (stepIndex < loadingSteps.length) {
        setOptimizationProgress(loadingSteps[stepIndex])
        stepIndex++
      } else {
        const elapsedSec = Math.max(1, Math.round((Date.now() - commitStartTime) / 1000))
        setOptimizationProgress({
          percent: Math.min(96, 90 + Math.floor((stepIndex - loadingSteps.length) / 2)),
          message: `Finalizing optimization run (${elapsedSec}s elapsed)...`
        })
        stepIndex++
      }
    }, 2000)

    try {
      const result = await commitPlan(planId, options)
      clearInterval(progressInterval)

      const isFailed = result.routing_status === 'failed' || result.routing_status === 'needs_replan'
      const isPending = result.routing_status === 'routing'
      const isEmpty = result.routing_status === 'empty' || !result.tasks?.length

      let toastMessage = 'Dispatch Confirmed! Routes have been published and assigned to field crews.'
      let toastType = 'success'

      const notice = dispatchResultNotice(result)
      if (notice) {
        toastMessage = notice.message
        toastType = notice.type
      }

      setOptimizationProgress({
        percent: 100,
        message: isFailed ? 'Routing failed' : isPending ? 'Routes computing...' : isEmpty ? 'No tasks scheduled' : 'Dispatch complete'
      })
      setGlobalNotification({
        message: toastMessage,
        type: toastType,
        link: !isEmpty && !isFailed && result.run?.id ? `/dashboard/officer/optimization/${result.run.id}` : null
      })
      if (!isFailed && !isEmpty) {
        setDraftPlan(null)
      }
      if (onSuccess && !isFailed) onSuccess(result)
      else if (onError && isFailed) onError(new Error(toastMessage))
    } catch (error) {
      clearInterval(progressInterval)
      setGlobalNotification({ message: error.message || 'Failed to dispatch plan. Reports remain safe in your backlog.', type: 'error' })
      if (onError) onError(error)
    } finally {
      setIsOptimizing(false)
    }
  }, [isOptimizing])

  const disassembleOptimization = useCallback(async (planOrRunId, onSuccess, onError) => {
    if (isOptimizing) return
    setIsOptimizing(true)
    setOptimizationProgress({ percent: 50, message: 'Disassembling plan and resetting backlog...' })
    setGlobalNotification(null)

    try {
      const result = await disassemblePlan(planOrRunId)
      setDraftPlan(prev => {
        if (prev && (prev.id === planOrRunId || prev.optimization_run_id === planOrRunId)) {
          return null
        }
        return prev
      })
      setOptimizationProgress({ percent: 100, message: 'Plan disassembled' })
      setGlobalNotification({
        message: result.message || 'Plan disassembled successfully. Backlog restored.',
        type: 'info'
      })
      if (onSuccess) onSuccess(result)
      return result
    } catch (error) {
      reportDiagnostic('error', 'ui', 'Failed to disassemble plan:', error)
      setGlobalNotification({
        message: error.message || 'Failed to disassemble plan',
        type: 'error'
      })
      if (onError) onError(error)
      throw error
    } finally {
      setIsOptimizing(false)
    }
  }, [isOptimizing])

  return (
    <TaskContext.Provider value={{ isOptimizing, optimizationProgress, planningJob, draftPlan, setDraftPlan, startOptimization, cancelOptimization, commitOptimization, disassembleOptimization }}>
      {children}

      {/* Global Notification Toast */}
      {globalNotification && !isOptimizing && (
        <Notification
          message={globalNotification.message}
          type={globalNotification.type}
          onClose={() => setGlobalNotification(null)}
          actionLabel={globalNotification.link ? 'View plan' : undefined}
          onAction={globalNotification.link ? () => { setGlobalNotification(null); router.push(globalNotification.link) } : undefined}
        />
      )}

      {/* Global Progress Toast */}
      {isOptimizing && (
        <Notification
          message={optimizationProgress.message || 'Processing…'}
          progress={optimizationProgress.percent}
          duration={0}
          actionLabel="Cancel"
          onAction={cancelOptimization}
          onClose={cancelOptimization}
        />
      )}
    </TaskContext.Provider>
  )
}
