'use client'
import React, { createContext, useContext, useState, useCallback } from 'react'
import { generatePlan, commitPlan } from '@/lib/api/optimization'
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

  const startOptimization = useCallback(async (onSuccess, onError) => {
    if (isOptimizing) return
    setIsOptimizing(true)
    setGlobalNotification(null)

    const loadingSteps = [
      { percent: 25, message: 'Calculating MCDA priority scores...' },
      { percent: 45, message: 'Mapping hotzones to cleanup tasks...' },
      { percent: 60, message: 'Finding available field crews...' },
      { percent: 80, message: 'Executing greedy assignment algorithm...' },
      { percent: 90, message: 'Generating simulated routes & ETA...' },
    ]
    
    let stepIndex = 0
    const progressInterval = setInterval(() => {
      if (stepIndex < loadingSteps.length) {
        setOptimizationProgress(loadingSteps[stepIndex])
        stepIndex++
      }
    }, 1500)

    try {
      const result = await generatePlan()
      clearInterval(progressInterval)

      if (result.plan) {
        setOptimizationProgress({ percent: 100, message: 'Optimization pipeline completed!' })
        
        const generatedDraft = { 
          ...result.plan, 
          status: 'draft_plan', 
          selectedCount: result.selectedCount, 
          omittedCount: result.omittedLoggedCount,
          capacityUtilized: result.capacityUtilized
        }
        setDraftPlan(generatedDraft)
        
        setGlobalNotification({ 
          message: `Draft plan generated! ${result.selectedCount} tasks selected.`, 
          type: 'success', 
          link: '/dashboard/officer/optimization' 
        })
        if (onSuccess) onSuccess(result)
      } else {
        setOptimizationProgress({ percent: 100, message: 'Done' })
        setGlobalNotification({ message: result.message || 'No tasks to optimize', type: 'info' })
        if (onSuccess) onSuccess(result)
      }
    } catch (error) {
      clearInterval(progressInterval)
      console.error('Optimization error:', error)
      setGlobalNotification({ message: error.message || 'Failed to generate optimization', type: 'error' })
      if (onError) onError(error)
    } finally {
      setTimeout(() => setIsOptimizing(false), 2000)
    }
  }, [isOptimizing])

  const commitOptimization = useCallback(async (planId, options, onSuccess, onError) => {
    if (isOptimizing) return
    setIsOptimizing(true)
    setGlobalNotification(null)

    const loadingSteps = [
      { percent: 30, message: 'Assigning tasks to field crews...' },
      { percent: 50, message: 'Calculating shortest path routes...' },
      { percent: 75, message: 'Fetching OpenStreetMap OSRM routing data...' },
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
      
      setOptimizationProgress({ percent: 100, message: 'Routes finalized and committed!' })
      setGlobalNotification({ 
        message: 'Routes have been finalized and crews dispatched!', 
        type: 'success', 
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
    <TaskContext.Provider value={{ isOptimizing, optimizationProgress, draftPlan, setDraftPlan, startOptimization, commitOptimization }}>
      {children}
      
      {/* Global Notification Toast */}
      {globalNotification && !isOptimizing && (
        <div className={`fixed bottom-6 right-6 z-[9999] p-4 border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff] flex items-center gap-4 ${
          globalNotification.type === 'success' ? 'bg-[#ccff00] text-black' : 
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
          <button onClick={() => setGlobalNotification(null)} className="ml-4 font-black hover:opacity-80">✕</button>
        </div>
      )}

      {/* Global Progress Toast */}
      {isOptimizing && (
        <div className="fixed bottom-6 right-6 z-[9999] p-4 bg-surface-elevated border-2 border-border shadow-[4px_4px_0px_0px_#1a1a1a] min-w-[300px]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono font-bold text-accent-green uppercase">
              {optimizationProgress.message || 'Processing...'}
            </span>
            <span className="text-xs font-mono text-text-muted">{optimizationProgress.percent}%</span>
          </div>
          <div className="w-full h-2 bg-black/20 dark:bg-white/10 rounded-full overflow-hidden">
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
