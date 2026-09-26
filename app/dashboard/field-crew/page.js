'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCleanupTasks } from '@/lib/api'
import { useUser } from '@/components/auth/UserContext'
import { FieldCrewGuard } from '@/components/auth/RequireRole'
import { MapPin, AlertCircle, CheckCircle, Navigation } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'

export default function FieldCrewCommandCenter() {
  const router = useRouter()
  const user = useUser()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTasks = async () => {
      try {
        // Fetch tasks assigned to current user using backend filter
        const myTasks = await fetchCleanupTasks(true)
        
        // Sort: In Progress first, then Pending. Urgent first.
        myTasks.sort((a, b) => {
           if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
           if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
           if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
           return 0;
        })
        setTasks(myTasks)
      } catch (error) {
        console.error('Failed to load tasks:', error)
      } finally {
        setLoading(false)
      }
    }
    loadTasks()
  }, [])

  const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'pending')
  const completedTasks = tasks.filter(t => t.status === 'completed')
  
  const currentObjective = activeTasks.length > 0 ? activeTasks[0] : null
  const queueTasks = activeTasks.slice(1)

  return (
    <FieldCrewGuard>
      <div className="min-h-screen bg-background text-text-primary p-4 md:p-8 font-sans">
        
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:flex-wrap gap-4">
           <div>
             <h1 className="text-3xl font-bold text-text-primary">Field Operations</h1>
             <p className="text-text-secondary mt-1">Welcome back{user?.full_name ? `, ${user.full_name}` : ''}. Here are your assignments.</p>
           </div>
           <div className="flex gap-4">
             {loading ? (
                <>
                  <div className="bg-surface border-2 border-border px-4 py-2 w-28 h-16 animate-pulse rounded-sm" />
                  <div className="bg-surface border-2 border-border px-4 py-2 w-28 h-16 animate-pulse rounded-sm" />
                </>
             ) : (
                <>
                  <div className="bg-surface border-2 border-[#1A1A1A] px-4 py-2 text-center rounded-sm">
                     <p className="font-mono text-xs text-text-muted font-bold uppercase tracking-widest">Completed</p>
                     <p className="text-2xl font-bold text-success">{completedTasks.length}</p>
                  </div>
                  <div className="bg-surface border-2 border-[#1A1A1A] px-4 py-2 text-center rounded-sm">
                     <p className="font-mono text-xs text-text-muted font-bold uppercase tracking-widest">Pending</p>
                     <p className="text-2xl font-bold text-warning">{activeTasks.length}</p>
                  </div>
                </>
             )}
           </div>
        </header>

        {/* Progress Bar Widget */}
        {!loading && tasks.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-end mb-2">
              <span className="font-mono text-sm tracking-widest text-text-secondary uppercase">Shift Progress</span>
              <span className="font-mono text-sm font-bold">{completedTasks.length} / {tasks.length} Tasks Completed</span>
            </div>
            <div className="h-4 bg-border w-full rounded-sm overflow-hidden border-2 border-[#1A1A1A]">
              <div 
                className="h-full bg-[#ccff00] transition-all duration-500 border-r-2 border-[#1A1A1A]"
                style={{ width: `${(completedTasks.length / tasks.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Current Objective (Takes up 2 columns on large screens) */}
           <div className="lg:col-span-2">
              <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                 <AlertCircle className="w-5 h-5 text-primary" />
                 Current Objective
              </h2>
              
              {loading ? (
                 <div className="bg-surface border border-border p-8 animate-pulse flex flex-col gap-4 rounded-sm">
                    <div className="h-8 bg-border w-1/2 rounded-sm"></div>
                    <div className="h-4 bg-border w-3/4 rounded-sm"></div>
                    <div className="h-12 bg-border w-full rounded-sm mt-4"></div>
                 </div>
              ) : currentObjective ? (
                 <div 
                   className="bg-surface border-2 border-[#1A1A1A] p-6 md:p-8 flex flex-col h-full border-t-4 border-t-primary rounded-sm transition-transform hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
                   style={{ boxShadow: '4px 4px 0px 0px #1A1A1A' }}
                 >
                    <div className="flex justify-between items-start mb-4">
                       <StatusBadge status={currentObjective.status} type="task" />
                       {currentObjective.priority === 'urgent' && (
                          <span className="bg-[#FF0000] text-white font-mono font-bold px-3 py-1 rounded-sm text-xs tracking-widest uppercase">
                             URGENT
                          </span>
                       )}
                    </div>
                    
                    <h3 className="text-3xl font-bold text-text-primary mb-3">
                       {currentObjective.title}
                    </h3>
                    
                    <p className="text-text-secondary text-lg mb-8 leading-relaxed">
                       {currentObjective.description || 'No description provided.'}
                    </p>
                    
                    <div className="mt-auto pt-6 border-t border-border flex flex-col sm:flex-row gap-4">
                       <button 
                         onClick={() => router.push(`/dashboard/field-crew/operations/${currentObjective.id}`)}
                         className="flex-1 bg-[#ccff00] text-black border-2 border-[#1A1A1A] font-bold text-lg py-4 px-6 rounded-sm transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none flex justify-center items-center gap-2"
                         style={{ boxShadow: '2px 2px 0px 0px #1A1A1A' }}
                       >
                         <CheckCircle className="w-6 h-6" />
                         {currentObjective.status === 'in_progress' ? 'Continue Task' : 'Start Task'}
                       </button>
                       <button 
                         onClick={() => router.push(`/dashboard/map-grid`)}
                         className="flex-1 bg-background border-2 border-[#1A1A1A] text-text-primary font-bold text-lg py-4 px-6 rounded-sm transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none flex justify-center items-center gap-2"
                         style={{ boxShadow: '2px 2px 0px 0px #1A1A1A' }}
                       >
                         <Navigation className="w-6 h-6 text-primary" />
                         View on Map
                       </button>
                    </div>
                 </div>
              ) : (
                 <div className="bg-surface border border-border border-dashed p-12 flex flex-col items-center justify-center text-center rounded-sm">
                    <CheckCircle className="w-16 h-16 text-success/50 mb-4" />
                    <h3 className="text-2xl font-bold text-text-primary mb-2">You're all caught up!</h3>
                    <p className="text-text-secondary">There are no active tasks assigned to you right now.</p>
                 </div>
              )}
           </div>

           {/* Up Next / Queue */}
           <div className="lg:col-span-1 flex flex-col">
              <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                 Up Next
              </h2>
              
              <div className="bg-surface border border-border shadow-sm p-4 flex-1 overflow-y-auto rounded-sm min-h-[400px]">
                 {loading ? (
                    <div className="space-y-4">
                       {[1,2,3].map(i => (
                          <div key={i} className="h-24 bg-border/50 animate-pulse rounded-sm"></div>
                       ))}
                    </div>
                 ) : queueTasks.length > 0 ? (
                    <div className="space-y-4">
                       {queueTasks.map((task) => (
                          <div 
                             key={task.id}
                             onClick={() => router.push(`/dashboard/field-crew/operations/${task.id}`)}
                             className="border-2 border-[#1A1A1A] p-4 hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none shadow-[4px_4px_0px_0px_#1A1A1A] cursor-pointer transition-all bg-background rounded-sm"
                          >
                             <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-text-primary line-clamp-1 pr-2">{task.title}</h4>
                                {task.priority === 'urgent' && <span className="w-3 h-3 rounded-full bg-error flex-shrink-0 mt-1"></span>}
                             </div>
                             <div className="flex items-center gap-2 text-text-muted text-sm mb-3">
                                <MapPin className="w-4 h-4" />
                                <span className="line-clamp-1">{task.location || 'Location unspecified'}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-sm">
                                   {task.task_type || 'CLEANUP'}
                                </span>
                                <StatusBadge status={task.status} type="task" />
                             </div>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="h-full flex items-center justify-center text-center p-6">
                       <p className="text-text-muted">No additional tasks in your queue.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
        
      </div>
    </FieldCrewGuard>
  )
}