'use client'
import React, { createContext, useContext, useState, useCallback } from 'react'
import { generatePlan, getPlanJob, getDispatchPlan, commitPlan } from '@/lib/api/optimization'
import { useRouter } from 'next/navigation'

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
      while (job.status !== 'completed' && job.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 2000))
        job = await getPlanJob(queued.jobId)
        setPlanningJob(job)
        setOptimizationProgress(job.status === 'running'
          ? { percent: 65, message: 'Solver is building routes' }
          : { percent: 20, message: 'Planning job queued' })
      }
      if (job.status === 'failed') throw new Error(`Planning failed: ${job.errorCode || 'unknown error'}`)
      if (!job.planId) throw new Error('Completed job has no draft plan')
      const result = await getDispatchPlan(job.planId)
      const selectedCount = result.items.filter(item => item.is_selected && item.item_type !== 'bundled_report').length
      const generatedDraft = {
        ...result.plan, status: 'draft_plan', selectedCount,
        omittedCount: result.items.filter(item => !item.is_selected).length,
        capacityUtilized: result.capacity.generalist?.used || result.capacity.used || 0,
        groups: result.groups, rejectedBundles: result.rejectedBundles,
        capacity: result.capacity
      }
      setDraftPlan(generatedDraft)
      setOptimizationProgress({ percent: 100, message: 'Draft plan ready' })
      setGlobalNotification({ message: `Draft plan generated with ${selectedCount} tasks.`,
        type: 'success', link: '/dashboard/officer/optimization' })
      if (onSuccess) onSuccess({ ...result, plan: generatedDraft,
        selectedCount, omittedLoggedCount: generatedDraft.omittedCount })
    } catch (error) {
      console.error('Optimization error:', error)
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

      const pending = result.routing_status === 'needs_replan' || result.routing_status === 'routing'
      setOptimizationProgress({ percent: 100, message: pending ? 'Reports claimed; routing needs attention' : 'Routes published' })
      setGlobalNotification({
        message: pending ? 'Reports claimed; routes pending. Retry the same plan within 30 minutes.' : 'Routes published and crews dispatched.',
        type: pending ? 'warning' : 'success',
        link: '/dashboard/officer/optimization'
      })
      if (onSuccess) onSuccess(result)
    } catch (error) {
      clearInterval(progressInterval)
      setGlobalNotification({ message: error.message || 'Failed to commit plan', type: 'error' })
      if (onError) onError(error)
    } finally {
      setTimeout(() => setIsOptimizing(false), 2000)
    }
  }, [isOptimizing])

  return (
    <TaskContext.Provider value={{ isOptimizing, optimizationProgress, planningJob, draftPlan, setDraftPlan, startOptimization, commitOptimization }}>
      {children}

      {/* Global Notification Toast */}
      {globalNotification && !isOptimizing && (
        <div className={`fixed bottom-6 right-6 z-[9999] p-4 border border-border  shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff] flex items-center gap-4 ${
          globalNotification.type === 'success' ? 'bg-[#ccff00] text-text-primary' :
          globalNotification.type === 'error' ? 'bg-error text-white' : 'bg-surface-elevated text-text-primary'
        }`}>
          <p className="font-bold">{globalNotification.message}</p>
          {globalNotification.link && (
            <button
              onClick={() => { setGlobalNotification(null); router.push(globalNotification.link) }}
              className="underline font-bold text-sm hover:opacity-80"
            >
              View Here
            </button>
          )}
          <button onClick={() => setGlobalNotification(null)} className="ml-4 font-bold hover:opacity-80">✕</button>
        </div>
      )}

      {/* Global Progress Toast */}
      {isOptimizing && (
        <div className="fixed bottom-6 right-6 z-[9999] p-4 bg-surface-elevated border border-border shadow-sm min-w-[300px]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono font-bold text-accent-green uppercase">
              {optimizationProgress.message || 'Processing...'}
            </span>
            <span className="text-xs font-mono text-text-muted">{optimizationProgress.percent}%</span>
          </div>
          <div className="w-full h-2 bg-black/20 dark:bg-surface/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ccff00] transition-all duration-500 ease-out"
              style={{ width: `${optimizationProgress.percent}%` }}
            ></div>
          </div>
        </div>
      )}
    </TaskContext.Provider>
  )
}
