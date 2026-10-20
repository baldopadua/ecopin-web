'use client'
import { useEffect, useState, useCallback, useId } from 'react'
import Link from 'next/link'
import { UserPlus, UserMinus, Users, Search, ChevronDown, ChevronUp, ClipboardCheck } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'
import StatusBadge from '@/components/ui/StatusBadge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { getCrewsWithMembers, updateCrewMembers, getUnassignedFieldCrew } from '@/lib/api/optimization'
import { OfficerGuard } from '@/components/auth/RequireRole'
import styles from './CrewManagement.module.css'

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function Avatar({ user, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.full_name}
        className={`${sizeClass} ${styles.avatar}`}
      />
    )
  }
  return (
    <div className={`${sizeClass} ${styles.avatar} ${styles.initials}`}>
      {getInitials(user.full_name)}
    </div>
  )
}

function MemberChip({ user, onRemove, removing }) {
  return (
    <div className={styles.member}>
      <Avatar user={user} size="sm" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{user.full_name || 'Unnamed'}</p>
        <p className="text-xs text-text-muted truncate capitalize">{user.role?.replace('_', ' ') || 'Field Crew'}</p>
      </div>
      <button
        onClick={() => onRemove(user.id)}
        disabled={removing === user.id}
        title="Remove from crew"
        aria-label={`Remove ${user.full_name || 'member'} from crew`}
        className={styles.remove}
      >
        {removing === user.id
          ? <span className="text-sm">…</span>
          : <UserMinus size={18} aria-hidden="true" />
        }
      </button>
    </div>
  )
}

function CrewCard({ crew, onAdd, onRemove, unassigned, notification, setNotification }) {
  const [removing, setRemoving] = useState(null)
  const [search, setSearch] = useState('')
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [showTasksPanel, setShowTasksPanel] = useState(false)
  const addPanelId = useId()

  const activeTaskCount = crew.active_task_count ?? crew.assigned_tasks_count ?? 0
  const maxTasks = crew.max_tasks_per_shift || 10
  const isAtCapacity = crew.is_at_capacity || activeTaskCount >= maxTasks

  const handleRemove = async (userId) => {
    setRemoving(userId)
    try {
      await onRemove(crew.id, userId)
    } catch (err) {
      setNotification({ message: err.message, type: 'error' })
    } finally {
      setRemoving(null)
    }
  }

  const handleAdd = async (userId) => {
    try {
      await onAdd(crew.id, userId)
      setSearch('')
    } catch (err) {
      setNotification({ message: err.message, type: 'error' })
    }
  }

  const filtered = unassigned.filter(u =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const statusColor =
    crew.availability_status === 'available' ? styles.available
    : crew.availability_status === 'on_route' ? styles.onRoute
    : styles.unavailable

  return (
    <div className={styles.card}>
      {/* Crew Header */}
      <div className={styles.crewHeader}>
        <div>
          <h2 className="font-semibold text-text-primary text-lg">{crew.name}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-sm text-text-muted">
              {crew.shift_start?.slice(0, 5)} – {crew.shift_end?.slice(0, 5)}
            </span>
            <span className="text-xs text-text-muted">·</span>
            <span className="text-sm text-text-muted">Max. {crew.max_tasks_per_shift} tasks</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAtCapacity ? (
            <span className={`${styles.badge} ${styles.workloadCapacity}`}>
              At Capacity ({activeTaskCount} / {maxTasks} tasks)
            </span>
          ) : activeTaskCount > 0 ? (
            <span className={`${styles.badge} ${styles.workloadActive}`}>
              {activeTaskCount} active task{activeTaskCount > 1 ? 's' : ''} ({activeTaskCount} / {maxTasks})
            </span>
          ) : (
            <span className={`${styles.badge} ${styles.workloadAvailable}`}>
              Available · 0 active tasks
            </span>
          )}
          <span className={`${styles.badge} ${statusColor}`}>
            {crew.availability_status?.replace('_', ' ')}
          </span>
          <span className={styles.badge} aria-label={`${crew.members?.length || 0} members`}>
            <Users size={16} aria-hidden="true" />
            {crew.members?.length || 0}
          </span>
        </div>
      </div>

      {/* Members */}
      <div className="p-5">
        {(crew.members || []).length === 0 ? (
          <p className="text-sm text-text-muted">No members assigned yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {crew.members.map(member => (
              <MemberChip
                key={member.id}
                user={member}
                onRemove={handleRemove}
                removing={removing}
              />
            ))}
          </div>
        )}

        {/* Add Members */}
        <div className="mt-4">
          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className={styles.addButton}
            aria-expanded={showAddPanel}
            aria-controls={addPanelId}
          >
            <UserPlus size={18} aria-hidden="true" />
            Add member
            {showAddPanel ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showAddPanel && (
            <div id={addPanelId} className={styles.addPanel}>
              <div className="relative mb-3">
                <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search by name…"
                  aria-label={`Search people to add to ${crew.name}`}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={styles.search}
                />
              </div>
              {filtered.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-2">
                  {unassigned.length === 0
                    ? 'All field crew users are already assigned to a crew.'
                    : 'No users match your search.'}
                </p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {filtered.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleAdd(user.id)}
                      className={styles.candidate}
                    >
                      <Avatar user={user} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{user.full_name || 'Unnamed'}</p>
                        <p className="text-xs text-text-muted truncate capitalize">{user.role?.replace('_', ' ') || 'Field Crew'}</p>
                      </div>
                      <UserPlus size={18} className={styles.addIcon} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Assigned Tasks Section */}
        <div className={styles.assignedTasksSection}>
          <button
            type="button"
            onClick={() => setShowTasksPanel(!showTasksPanel)}
            className={styles.assignedTasksToggle}
            aria-expanded={showTasksPanel}
          >
            <span className="flex items-center gap-2">
              <ClipboardCheck size={16} aria-hidden="true" />
              <span>Currently Assigned Tasks ({activeTaskCount})</span>
            </span>
            {showTasksPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showTasksPanel && (
            <div className={styles.assignedTaskList}>
              {(crew.active_tasks || []).length === 0 ? (
                <p className="text-xs text-text-muted text-center py-3">
                  No active cleanup tasks currently assigned to this crew.
                </p>
              ) : (
                (crew.active_tasks || []).map(task => (
                  <Link
                    key={task.id}
                    href={`/dashboard/officer/operations/${task.id}`}
                    className={styles.assignedTaskItem}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={styles.assignedTaskTitle}>{task.title || `Task #${task.id?.slice(0, 8)}`}</p>
                      {task.location_name && (
                        <p className="text-xs text-text-muted truncate mt-0.5">{task.location_name}</p>
                      )}
                    </div>
                    <div className={styles.assignedTaskMeta}>
                      <StatusBadge status={task.status} type="task" />
                      <span className="text-xs text-workspace-link font-medium">Open →</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TasksView({ crews }) {
  const crewsWithTasks = crews.filter(c => (c.active_tasks || []).length > 0)
  const totalTasks = crews.reduce((acc, c) => acc + (c.active_tasks || []).length, 0)

  return (
    <div className={styles.tasksView}>
      {crewsWithTasks.length === 0 ? (
        <div className={`${styles.card} p-8 text-center`}>
          <ClipboardCheck size={32} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-muted">No tasks currently assigned to any crew.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {crewsWithTasks.map(crew => (
            <div key={crew.id} className={styles.card}>
              <div className={styles.crewTasksHeader}>
                <div>
                  <h3 className="font-semibold text-text-primary text-lg">{crew.name}</h3>
                  <p className="text-sm text-text-muted mt-1">
                    {(crew.active_tasks || []).length} task{(crew.active_tasks || []).length > 1 ? 's' : ''} assigned
                  </p>
                </div>
                <span className={`${styles.badge} ${styles.workloadBadge}`}>
                  {(crew.active_tasks || []).length} / {crew.max_tasks_per_shift || 10}
                </span>
              </div>
              <div className={styles.tasksList}>
                {(crew.active_tasks || []).map(task => (
                  <Link
                    key={task.id}
                    href={`/dashboard/officer/operations/${task.id}`}
                    className={styles.taskRow}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={styles.taskTitle}>{task.title || `Task #${task.id?.slice(0, 8)}`}</p>
                      {task.location_name && (
                        <p className="text-xs text-text-muted truncate mt-0.5">{task.location_name}</p>
                      )}
                    </div>
                    <div className={styles.taskMeta}>
                      <StatusBadge status={task.status} type="task" />
                      <span className="text-xs text-workspace-link font-medium">Open →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MembersView({ crews, unassigned, onAdd, onRemove, notification, setNotification }) {
  return (
    <div className="space-y-4">
      {crews.length === 0 ? (
        <div className={`${styles.card} p-8 text-center`}>
          <Users size={32} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-muted">No crews found. Create one in Optimization Settings.</p>
        </div>
      ) : (
        crews.map(crew => (
          <CrewCard
            key={crew.id}
            crew={crew}
            unassigned={unassigned}
            onAdd={onAdd}
            onRemove={onRemove}
            notification={notification}
            setNotification={setNotification}
          />
        ))
      )}
    </div>
  )
}

function CrewManagementContent() {
  const [crews, setCrews] = useState([])
  const [unassigned, setUnassigned] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [unassignedSearch, setUnassignedSearch] = useState('')
  const [viewMode, setViewMode] = useState('tasks')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [crewData, unassignedData] = await Promise.all([
        getCrewsWithMembers(),
        getUnassignedFieldCrew(),
      ])
      setCrews(crewData || [])
      setUnassigned(unassignedData || [])
    } catch (err) {
      setNotification({ message: 'Failed to load crew data', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAdd = async (crewId, userId) => {
    // Optimistic: move user from unassigned to crew
    const user = unassigned.find(u => u.id === userId)
    if (!user) return

    setUnassigned(prev => prev.filter(u => u.id !== userId))
    setCrews(prev => prev.map(c =>
      c.id === crewId ? { ...c, members: [...(c.members || []), user] } : c
    ))

    try {
      await updateCrewMembers(crewId, userId, 'add')
      setNotification({ message: `${user.full_name || 'User'} added to crew`, type: 'success' })
    } catch (err) {
      // Revert optimistic update
      setUnassigned(prev => [...prev, user])
      setCrews(prev => prev.map(c =>
        c.id === crewId ? { ...c, members: (c.members || []).filter(m => m.id !== userId) } : c
      ))
      setNotification({ message: err.message || 'Failed to add member', type: 'error' })
    }
  }

  const handleRemove = async (crewId, userId) => {
    const crew = crews.find(c => c.id === crewId)
    const user = crew?.members?.find(m => m.id === userId)
    if (!user) return

    // Optimistic: move user back to unassigned
    setCrews(prev => prev.map(c =>
      c.id === crewId ? { ...c, members: (c.members || []).filter(m => m.id !== userId) } : c
    ))
    setUnassigned(prev => [user, ...prev])

    try {
      await updateCrewMembers(crewId, userId, 'remove')
      setNotification({ message: `${user.full_name || 'User'} removed from crew`, type: 'success' })
    } catch (err) {
      // Revert optimistic update
      setCrews(prev => prev.map(c =>
        c.id === crewId ? { ...c, members: [...(c.members || []), user] } : c
      ))
      setUnassigned(prev => prev.filter(u => u.id !== userId))
      setNotification({ message: err.message || 'Failed to remove member', type: 'error' })
    }
  }

  const filteredUnassigned = unassigned.filter(u =>
    (u.full_name || '').toLowerCase().includes(unassignedSearch.toLowerCase())
  )

  const totalAssignedTasks = crews.reduce((acc, c) => acc + (c.active_task_count ?? c.assigned_tasks_count ?? 0), 0)
  const atCapacityCount = crews.filter(c => c.is_at_capacity || ((c.active_task_count ?? 0) >= (c.max_tasks_per_shift || 10))).length

  return (
    <div className={`workspace-page workspace-page--flow ${styles.page}`}>
      <PageHeader
        title="Crew Tasks"
        subtitle="View and manage tasks assigned to each crew"
        breadcrumbs={[
          { label: 'Officer', href: '/dashboard/officer' },
          { label: 'Crew Tasks' }
        ]}
      >
        <div className={styles.viewToggle}>
          <button
            onClick={() => setViewMode('tasks')}
            className={`${styles.toggleButton} ${viewMode === 'tasks' ? styles.toggleButtonActive : ''}`}
          >
            Tasks View
          </button>
          <button
            onClick={() => setViewMode('members')}
            className={`${styles.toggleButton} ${viewMode === 'members' ? styles.toggleButtonActive : ''}`}
          >
            Manage Members
          </button>
        </div>
      </PageHeader>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Overview Banner */}
      {!loading && (
        <div className={styles.summaryBanner}>
          <div className={styles.summaryStat}>
            <ClipboardCheck size={18} className="text-success" aria-hidden="true" />
            <span><strong>{totalAssignedTasks}</strong> Total Tasks Assigned</span>
          </div>
          <span className="text-text-muted">·</span>
          <div className={styles.summaryStat}>
            <Users size={18} className="text-workspace-link" aria-hidden="true" />
            <span><strong>{crews.length}</strong> Squads Active</span>
          </div>
          {atCapacityCount > 0 && (
            <>
              <span className="text-text-muted">·</span>
              <div className={styles.summaryStat}>
                <span className="text-error font-medium">⚠️ <strong>{atCapacityCount}</strong> squad{atCapacityCount > 1 ? 's' : ''} at capacity</span>
              </div>
            </>
          )}
          {viewMode === 'members' && (
            <>
              <span className="text-text-muted">·</span>
              <div className={styles.summaryStat}>
                <span><strong>{unassigned.length}</strong> unassigned personnel</span>
              </div>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 min-w-0 space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div>
            <SkeletonCard />
          </div>
        </div>
      ) : (
        <div className={viewMode === 'tasks' ? 'mt-6' : 'grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6'}>
          {/* Main Content Area */}
          <div className={viewMode === 'tasks' ? 'min-w-0' : 'lg:col-span-2 min-w-0'}>
            {viewMode === 'tasks' ? (
              <TasksView crews={crews} />
            ) : (
              <MembersView
                crews={crews}
                unassigned={unassigned}
                onAdd={handleAdd}
                onRemove={handleRemove}
                notification={notification}
                setNotification={setNotification}
              />
            )}
          </div>

          {/* Unassigned Panel - only in Members view */}
          {viewMode === 'members' && (
            <div className="lg:col-span-1">
            <div className={styles.card}>
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <Users size={16} />
                  Unassigned
                  <span className={`${styles.badge} ml-auto`}>
                    {unassigned.length}
                  </span>
                </h2>
                <p className="text-xs text-text-muted mt-1">
                  Field crew users not yet in any team.
                </p>
              </div>

              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search by name…"
                    aria-label="Search unassigned crew members"
                    value={unassignedSearch}
                    onChange={e => setUnassignedSearch(e.target.value)}
                    className={styles.search}
                  />
                </div>
              </div>

              <div className="overflow-y-auto max-h-[60vh]">
                {filteredUnassigned.length === 0 ? (
                  <div className="p-6 text-center text-text-muted text-sm">
                    {unassigned.length === 0
                      ? '✓ All field crew users are assigned.'
                      : 'No users match your search.'}
                  </div>
                ) : (
                  filteredUnassigned.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 border-b border-border/50 last:border-0"
                    >
                      <Avatar user={user} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary truncate">{user.full_name || 'Unnamed'}</p>
                        <p className="text-xs text-text-muted truncate capitalize">{user.role?.replace('_', ' ') || 'Field Crew'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CrewManagementPage() {
  return (
    <OfficerGuard>
      <CrewManagementContent />
    </OfficerGuard>
  )
}

