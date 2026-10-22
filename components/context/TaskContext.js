'use client'
import React, { createContext, useContext, useState, useCallback } from 'react'
import { generatePlan, getPlanJob, getDispatchPlan, commitPlan, disassemblePlan } from '@/lib/api/optimization'
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

  const startOptimization = useCallback(async (settings = {}, onSuccess, onError) => {
    if (isOptimizing) return
    setIsOptimizing(true)
    setGlobalNotification(null)

    try {
      const queued = await generatePlan(settings)
      if (!queued.jobId) throw new Error('Planning service returned no job ID')
      setPlanningJob({ jobId: queued.jobId, status: queued.status || 'queued' })
      setOptimizationProgress({ percent: 20, message: 'Planning job queued' })
      let job = queued
      let pollRateLimitAttempts = 0
      while (job.status !== 'completed' && job.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 2000))
        try {
          job = await getPlanJob(queued.jobId)
        } catch (pollErr) {
          if ((pollErr.status === 429 || pollErr.isRateLimited) && pollRateLimitAttempts < 2) {
            pollRateLimitAttempts++
            setOptimizationProgress({
              percent: 30,
              message: 'Server busy, waiting a moment before checking job status...'
            })
            await new Promise(resolve => setTimeout(resolve, 5000))
            continue
          }
          throw pollErr
        }
        setPlanningJob(job)
        setOptimizationProgress(job.status === 'running'
          ? { percent: 65, message: 'Solver is building routes' }
          : { percent: 20, message: 'Planning job queued' })
      }
      if (job.status === 'failed') throw new Error(`Planning failed: ${job.errorCode || 'unknown error'}`)
      if (!job.planId) throw new Error('Completed job has no draft plan')
      const result = await getDispatchPlan(job.planId)
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
      reportDiagnostic('error', 'ui', 'Optimization error:', error)
      setGlobalNotification({ message: error.message || 'Failed to generate optimization', type: 'error' })
      if (onError) onError(error)
    } finally {
      setIsOptimizing(false)
    }
  }, [isOptimizing])


  const commitOptimization = useCallback(async (planId, options, onSuccess, onError) => {
    if (isOptimizing) return
    setIsOptimizing(true)
    setGlobalNotification(null)

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
    <TaskContext.Provider value={{ isOptimizing, optimizationProgress, planningJob, draftPlan, setDraftPlan, startOptimization, commitOptimization, disassembleOptimization }}>
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
        />
      )}
    </TaskContext.Provider>
  )
}
