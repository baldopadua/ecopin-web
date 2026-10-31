'use client'
import { useEffect, useState, useCallback, useMemo, useId } from 'react'
import Link from 'next/link'
import { UserPlus, UserMinus, Users, Search, ChevronDown, ChevronUp, ClipboardCheck, Download } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'
import StatusBadge from '@/components/ui/StatusBadge'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { getCrewsWithMembers, updateCrewMembers, getUnassignedFieldCrew } from '@/lib/api/optimization'
import { fetchCrewPerformance } from '@/lib/api'
import { OfficerGuard } from '@/components/auth/RequireRole'
import styles from './CrewManagement.module.css'
import { getCsatEntry, CSAT_SCALE } from '@/lib/helpers/csatScale'


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
    <img
      src="/icons/users.png"
      alt={user.full_name}
      className={`${sizeClass} ${styles.avatar}`}
    />
  )
}

/** Citizen sentiment info from the canonical CSAT scale (lib/helpers/csatScale.js). */
function getSatisfactionInfo(rating) {
  const entry = getCsatEntry(rating)
  if (!entry) return { emoji: '—', label: 'Unrated', scoreText: 'N/A', tone: 'neutral' }
  const tone = entry.rating >= 4 ? 'positive' : entry.rating === 3 ? 'neutral' : entry.rating === 2 ? 'warning' : 'negative'
  return { emoji: entry.emoji, label: entry.label, scoreText: Number(rating).toFixed(1), tone }
}

function MemberChip({ user, onRemove, removing }) {
  return (
    <div className={styles.member}>
      <Avatar user={user} size="sm" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{user.full_name || 'Unnamed'}</p>
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
            <span className="text-sm text-text-muted">·</span>
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
                        <p className="text-sm font-medium text-text-primary truncate">{user.full_name || 'Unnamed'}</p>
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

function MemberTasksModal({ member, onClose }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all') // 'all' | 'rated' | 'high' | 'unrated'
  const [sortBy, setSortBy] = useState('recent') // 'recent' | 'oldest' | 'rating_desc' | 'speed_asc'
  const itemsPerPage = 4

  if (!member) return null

  const allTasks = member.tasks || []

  // Filter & sort tasks
  const filteredTasks = useMemo(() => {
    let list = allTasks

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((t) => (t.title || '').toLowerCase().includes(q))
    }

    // 2. Rating Filter
    if (ratingFilter === 'high') {
      list = list.filter((t) => (t.avg_rating || 0) >= 4.0)
    } else if (ratingFilter === 'rated') {
      list = list.filter((t) => t.avg_rating != null && t.avg_rating > 0)
    } else if (ratingFilter === 'unrated') {
      list = list.filter((t) => t.avg_rating == null)
    }

    // 3. Sorting
    if (sortBy === 'recent' || sortBy === 'oldest') {
      list = [...list].sort((a, b) => {
        const aTime = a.completed_at ? Date.parse(a.completed_at) || 0 : 0
        const bTime = b.completed_at ? Date.parse(b.completed_at) || 0 : 0
        return sortBy === 'recent' ? bTime - aTime : aTime - bTime
      })
    } else if (sortBy === 'rating_desc') {
      list = [...list].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
    } else if (sortBy === 'speed_asc') {
      list = [...list].sort((a, b) => (a.turnaround_hours ?? 999999) - (b.turnaround_hours ?? 999999))
    }

    return list
  }, [allTasks, searchQuery, ratingFilter, sortBy])

  // Reset pagination on search / filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, ratingFilter, sortBy])

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * itemsPerPage
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className="flex items-center gap-3">
            <Avatar user={member} size="md" />
            <div>
              <h3 className="font-medium text-lg text-text-primary">{member.full_name}</h3>
              <p className="text-xs text-text-muted">
                {member.role?.replace('_', ' ') || 'Field Crew'} · Individual performance
              </p>
            </div>
          </div>
          <button className={styles.modalCloseBtn} onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Member Metrics Header Summary */}
          <div className={styles.modalMetricsGrid}>
            <div className={styles.modalMetricCard}>
              <span className={styles.modalMetricLabel}>
                Tasks resolved
                
              </span>
              <span className={styles.modalMetricValue}>
                {member.performance?.total_completed || 0}
              </span>
              <span className="text-xs text-text-muted">Resolved by this person</span>
            </div>

            <div className={styles.modalMetricCard}>
              <span className={styles.modalMetricLabel}>
                Average speed
                
              </span>
              <span className={styles.modalMetricValue}>
                {member.performance?.avg_turnaround_hours != null
                  ? `${member.performance.avg_turnaround_hours}h`
                  : '—'}
              </span>
              <span className="text-xs text-text-muted">Assignment to done</span>
            </div>

            <div className={styles.modalMetricCard}>
              <span className={styles.modalMetricLabel}>
                Citizen CSAT
              </span>
              <span className={styles.modalMetricValue}>
                {member.performance?.avg_satisfaction_rating != null ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span>{getSatisfactionInfo(member.performance.avg_satisfaction_rating).emoji}</span>
                    <span>{member.performance.avg_satisfaction_rating}</span>
                  </span>
                ) : (
                  'N/A'
                )}
              </span>
              <span className="text-xs text-text-muted">
                {member.performance?.avg_satisfaction_rating != null
                  ? `${getSatisfactionInfo(member.performance.avg_satisfaction_rating).label} • `
                  : ''}
                {member.performance?.total_ratings_received || 0} reviews
              </span>
            </div>
          </div>

          {/* Modal Tasks Toolbar: Search & Filters */}
          <div className={styles.modalToolbar}>
            <div className={styles.modalSearchWrapper}>
              <Search size={15} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search completed tasks by title…"
                aria-label="Search completed tasks"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${styles.search} text-sm py-2 pl-9`}
              />
            </div>

            <div className={styles.modalFilters}>
              <span className={styles.filterLabel}>Rating</span>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className={styles.modalSelectInput}
                aria-label="Filter tasks by rating"
              >
                <option value="all">All ratings</option>
                <option value="high">High (4.0 and above)</option>
                <option value="rated">Has a citizen rating</option>
                <option value="unrated">Unrated</option>
              </select>

              <span className={styles.filterLabel}>Sort by</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={styles.modalSelectInput}
                aria-label="Sort completed tasks"
              >
                <option value="recent">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="rating_desc">Highest citizen rating</option>
                <option value="speed_asc">Fastest duration</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center mb-0.5 mt-1">
            <h4 className="text-sm font-semibold text-text-primary">Completed tasks</h4>
            <span className="text-xs text-text-muted">
              {filteredTasks.length > 0
                ? `Showing ${startIndex + 1}–${Math.min(startIndex + itemsPerPage, filteredTasks.length)} of ${filteredTasks.length}`
                : '0 tasks'}
            </span>
          </div>

          <div className={styles.modalTaskListContainer}>
            {filteredTasks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-text-muted text-sm border border-border border-dashed rounded-xl">
                {searchQuery || ratingFilter !== 'all'
                  ? 'No tasks match your search or filter criteria.'
                  : 'No completed tasks found for this member.'}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {paginatedTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/dashboard/officer/operations/${task.id}`}
                    className={styles.modalTaskItem}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {task.title}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary"><i aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--success)' }} />Resolved</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        <span>Completed: {task.completed_at ? new Date(task.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                        {task.turnaround_hours != null && (
                          <span>• {task.turnaround_hours}h duration</span>
                        )}
                        <span>• {task.reports_count || 1} report{(task.reports_count || 1) > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {task.avg_rating ? (
                        (() => {
                          const satInfo = getSatisfactionInfo(task.avg_rating)
                          return (
                            <span
                              className="inline-flex items-center gap-1.5 text-sm font-medium"
                              title={`Citizen Rating: ${satInfo.label} (${task.avg_rating})`}
                            >
                              <span className="text-sm leading-none">{satInfo.emoji}</span>
                              <span>{task.avg_rating}</span>
                              <span className="hidden sm:inline text-xs text-text-muted font-normal">• {satInfo.label}</span>
                            </span>
                          )
                        })()
                      ) : (
                        <span className="text-sm text-text-muted">No rating</span>
                      )}
                      <span className={styles.viewActionLink}>
                        Inspect <ChevronDown size={14} className="-rotate-90" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
          )}
          </div>
        </div>

        {totalPages > 1 && (
          <div className={styles.modalFooter}>
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
              itemsPerPage={itemsPerPage}
              totalItems={filteredTasks.length}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function CrewTeamTasksModal({ crew, onClose }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all') // 'all' | 'rated' | 'high' | 'unrated'
  const [sortBy, setSortBy] = useState('recent') // 'recent' | 'oldest' | 'rating_desc' | 'speed_asc'
  const itemsPerPage = 4

  if (!crew) return null

  const allTasks = crew.tasks || []

  // Filter & sort tasks
  const filteredTasks = useMemo(() => {
    let list = allTasks

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((t) => (t.title || '').toLowerCase().includes(q))
    }

    // 2. Rating Filter
    if (ratingFilter === 'high') {
      list = list.filter((t) => (t.avg_rating || 0) >= 4.0)
    } else if (ratingFilter === 'rated') {
      list = list.filter((t) => t.avg_rating != null && t.avg_rating > 0)
    } else if (ratingFilter === 'unrated') {
      list = list.filter((t) => t.avg_rating == null)
    }

    // 3. Sorting
    if (sortBy === 'recent' || sortBy === 'oldest') {
      list = [...list].sort((a, b) => {
        const aTime = a.completed_at ? Date.parse(a.completed_at) || 0 : 0
        const bTime = b.completed_at ? Date.parse(b.completed_at) || 0 : 0
        return sortBy === 'recent' ? bTime - aTime : aTime - bTime
      })
    } else if (sortBy === 'rating_desc') {
      list = [...list].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
    } else if (sortBy === 'speed_asc') {
      list = [...list].sort((a, b) => (a.turnaround_hours ?? 999999) - (b.turnaround_hours ?? 999999))
    }

    return list
  }, [allTasks, searchQuery, ratingFilter, sortBy])

  // Reset pagination on search / filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, ratingFilter, sortBy])

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * itemsPerPage
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm">
              <Users size={18} />
            </div>
            <div>
              <h3 className="font-medium text-lg text-text-primary">{crew.name}</h3>
              <p className="text-xs text-text-muted">
                {crew.member_count || 0} crew members {crew.team_lead ? `• Lead: ${crew.team_lead.full_name}` : ''} · Crew performance
              </p>
            </div>
          </div>
          <button className={styles.modalCloseBtn} onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Crew Metrics Header Summary */}
          <div className={styles.modalMetricsGrid}>
            <div className={styles.modalMetricCard}>
              <span className={styles.modalMetricLabel}>
                Tasks resolved
                
              </span>
              <span className={styles.modalMetricValue}>
                {crew.performance?.total_completed || 0}
              </span>
              <span className="text-xs text-text-muted">Resolved by this crew</span>
            </div>

            <div className={styles.modalMetricCard}>
              <span className={styles.modalMetricLabel}>
                Average speed
                
              </span>
              <span className={styles.modalMetricValue}>
                {crew.performance?.avg_turnaround_hours != null
                  ? `${crew.performance.avg_turnaround_hours}h`
                  : '—'}
              </span>
              <span className="text-xs text-text-muted">Assignment to done</span>
            </div>

            <div className={styles.modalMetricCard}>
              <span className={styles.modalMetricLabel}>
                Citizen CSAT
              </span>
              <span className={styles.modalMetricValue}>
                {crew.performance?.avg_satisfaction_rating != null ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span>{getSatisfactionInfo(crew.performance.avg_satisfaction_rating).emoji}</span>
                    <span>{crew.performance.avg_satisfaction_rating}</span>
                  </span>
                ) : (
                  'N/A'
                )}
              </span>
              <span className="text-xs text-text-muted">
                {crew.performance?.avg_satisfaction_rating != null
                  ? `${getSatisfactionInfo(crew.performance.avg_satisfaction_rating).label} • `
                  : ''}
                {crew.performance?.total_ratings_received || 0} reviews
              </span>
            </div>
          </div>

          {/* Modal Tasks Toolbar: Search & Filters */}
          <div className={styles.modalToolbar}>
            <div className={styles.modalSearchWrapper}>
              <Search size={15} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search squad completed tasks by title…"
                aria-label="Search squad completed tasks"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${styles.search} text-sm py-2 pl-9`}
              />
            </div>

            <div className={styles.modalFilters}>
              <span className={styles.filterLabel}>Rating</span>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className={styles.modalSelectInput}
                aria-label="Filter squad tasks by rating"
              >
                <option value="all">All ratings</option>
                <option value="high">High (4.0 and above)</option>
                <option value="rated">Has a citizen rating</option>
                <option value="unrated">Unrated</option>
              </select>

              <span className={styles.filterLabel}>Sort by</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={styles.modalSelectInput}
                aria-label="Sort squad completed tasks"
              >
                <option value="recent">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="rating_desc">Highest citizen rating</option>
                <option value="speed_asc">Fastest duration</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center mb-0.5 mt-1">
            <h4 className="text-sm font-semibold text-text-primary">Completed tasks</h4>
            <span className="text-xs text-text-muted">
              {filteredTasks.length > 0
                ? `Showing ${startIndex + 1}–${Math.min(startIndex + itemsPerPage, filteredTasks.length)} of ${filteredTasks.length}`
                : '0 tasks'}
            </span>
          </div>

          <div className={styles.modalTaskListContainer}>
            {filteredTasks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-text-muted text-sm border border-border border-dashed rounded-xl">
                {searchQuery || ratingFilter !== 'all'
                  ? 'No tasks match your search or filter criteria.'
                  : 'No completed tasks found for this crew team.'}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {paginatedTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/dashboard/officer/operations/${task.id}`}
                    className={styles.modalTaskItem}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {task.title}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary"><i aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--success)' }} />Resolved</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        <span>Completed: {task.completed_at ? new Date(task.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                        {task.turnaround_hours != null && (
                          <span>• {task.turnaround_hours}h duration</span>
                        )}
                        <span>• {task.reports_count || 1} report{(task.reports_count || 1) > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {task.avg_rating ? (
                        (() => {
                          const satInfo = getSatisfactionInfo(task.avg_rating)
                          return (
                            <span
                              className="inline-flex items-center gap-1.5 text-sm font-medium"
                              title={`Citizen Rating: ${satInfo.label} (${task.avg_rating})`}
                            >
                              <span className="text-sm leading-none">{satInfo.emoji}</span>
                              <span>{task.avg_rating}</span>
                              <span className="hidden sm:inline text-xs text-text-muted font-normal">• {satInfo.label}</span>
                            </span>
                          )
                        })()
                      ) : (
                        <span className="text-sm text-text-muted">No rating</span>
                      )}
                      <span className={styles.viewActionLink}>
                        Inspect <ChevronDown size={14} className="-rotate-90" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {totalPages > 1 && (
          <div className={styles.modalFooter}>
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
              itemsPerPage={itemsPerPage}
              totalItems={filteredTasks.length}
            />
          </div>
        )}
      </div>
    </div>
  )
}


function PerformanceView({ performanceData, loading }) {
  const [selectedMember, setSelectedMember] = useState(null)
  const [selectedCrew, setSelectedCrew] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [csatFilter, setCsatFilter] = useState('all') // 'all' | 'high' | 'mid' | 'low' | 'unrated'
  const [sortBy, setSortBy] = useState('tasks_desc') // 'tasks_desc' | 'tasks_asc' | 'csat_desc' | 'speed_asc' | 'name_asc'
  const [memberPage, setMemberPage] = useState(1)
  const membersPerPage = 8

  // Filtered & Sorted Members
  const filteredMembers = useMemo(() => {
    let list = performanceData?.members || []

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((m) =>
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q)
      )
    }

    // 2. CSAT Rating Filter
    if (csatFilter === 'high') {
      list = list.filter((m) => (m.performance?.avg_satisfaction_rating || 0) >= 4.0)
    } else if (csatFilter === 'mid') {
      list = list.filter(
        (m) =>
          (m.performance?.avg_satisfaction_rating || 0) >= 2.5 &&
          (m.performance?.avg_satisfaction_rating || 0) < 4.0
      )
    } else if (csatFilter === 'low') {
      list = list.filter(
        (m) =>
          m.performance?.avg_satisfaction_rating != null &&
          m.performance?.avg_satisfaction_rating < 2.5
      )
    } else if (csatFilter === 'unrated') {
      list = list.filter((m) => m.performance?.avg_satisfaction_rating == null)
    }

    // 3. Sorting
    list = [...list].sort((a, b) => {
      const aTasks = a.performance?.total_completed || 0
      const bTasks = b.performance?.total_completed || 0
      const aCsat = a.performance?.avg_satisfaction_rating || 0
      const bCsat = b.performance?.avg_satisfaction_rating || 0
      const aSpeed = a.performance?.avg_turnaround_hours ?? 999999
      const bSpeed = b.performance?.avg_turnaround_hours ?? 999999
      const aName = (a.full_name || '').toLowerCase()
      const bName = (b.full_name || '').toLowerCase()

      switch (sortBy) {
        case 'tasks_desc':
          return bTasks - aTasks
        case 'tasks_asc':
          return aTasks - bTasks
        case 'csat_desc':
          return bCsat - aCsat
        case 'speed_asc':
          return aSpeed - bSpeed
        case 'name_asc':
          return aName.localeCompare(bName)
        default:
          return bTasks - aTasks
      }
    })

    return list
  }, [performanceData?.members, searchQuery, csatFilter, sortBy])

  // Pagination for Members Table
  const totalMemberPages = Math.ceil(filteredMembers.length / membersPerPage) || 1
  const safeMemberPage = Math.min(memberPage, totalMemberPages)
  const paginatedMembers = useMemo(() => {
    const start = (safeMemberPage - 1) * membersPerPage
    return filteredMembers.slice(start, start + membersPerPage)
  }, [filteredMembers, safeMemberPage, membersPerPage])

  // Reset to first page whenever search or filter changes
  useEffect(() => {
    setMemberPage(1)
  }, [searchQuery, csatFilter, sortBy])

  // Citizen satisfaction distribution: counts per rating, highest rating first, in the canonical CSAT colors
  const csatDistribution = useMemo(() => {
    const dist = performanceData?.overall?.rating_distribution || {}
    const total = CSAT_SCALE.reduce((sum, entry) => sum + (dist[entry.rating] || 0), 0)
    return {
      total,
      rows: [...CSAT_SCALE].reverse().map(entry => {
        const count = dist[entry.rating] || 0
        return { ...entry, count, percent: total > 0 ? (count / total) * 100 : 0 }
      })
    }
  }, [performanceData?.overall?.rating_distribution])

  // 1. Professional Formatted Spreadsheet Exporter (HTML .xls format opened natively with website blue theme in Excel)
  const handleExportPerformanceExcel = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]
    const generatedAt = new Date().toLocaleString()

    const crews = performanceData?.crews || []
    const members = performanceData?.members || []
    const overall = performanceData?.overall || {}

    // Gather unique completed operations
    const allCompletedTasks = []
    const seenTaskIds = new Set()
    for (const m of members) {
      if (Array.isArray(m.tasks)) {
        for (const t of m.tasks) {
          if (!seenTaskIds.has(t.id)) {
            seenTaskIds.add(t.id)
            allCompletedTasks.push({ ...t, member_name: m.full_name })
          }
        }
      }
    }

    const overallSat = getSatisfactionInfo(overall.avg_satisfaction_rating)

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
          body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; font-size: 11pt; color: #0f172a; background-color: #ffffff; }
          .title { font-size: 18pt; font-weight: bold; color: #0052cc; padding: 12px 0 4px 0; }
          .subtitle { font-size: 10pt; color: #64748b; margin-bottom: 16px; }
          .section-title { font-size: 13pt; font-weight: bold; color: #0f172a; background-color: #eff6ff; padding: 8px 12px; border-left: 4px solid #0052cc; margin-top: 20px; }
          table { border-collapse: collapse; width: 100%; margin-top: 8px; margin-bottom: 20px; }
          th { background-color: #0052cc; color: #ffffff; font-weight: 600; text-align: left; padding: 10px 12px; border: 1px solid #0043a8; font-size: 10.5pt; }
          td { padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 10pt; vertical-align: middle; }
          tr:nth-child(even) td { background-color: #f8fafc; }
          .num { text-align: right; font-variant-numeric: tabular-nums; }
          .center { text-align: center; }
          .stat-card-table { width: 100%; border: none; margin-bottom: 16px; }
          .stat-box { border: 1px solid #bfdbfe; background-color: #f0f7ff; padding: 12px 16px; border-radius: 8px; }
          .stat-label { font-size: 9.5pt; color: #475569; font-weight: 600; text-transform: uppercase; }
          .stat-val { font-size: 18pt; font-weight: bold; color: #0052cc; margin-top: 4px; }
          .badge-high { background-color: #d1fae5; color: #065f46; font-weight: bold; padding: 3px 8px; border-radius: 4px; display: inline-block; }
          .badge-mid { background-color: #fef3c7; color: #92400e; font-weight: bold; padding: 3px 8px; border-radius: 4px; display: inline-block; }
          .badge-low { background-color: #fee2e2; color: #991b1b; font-weight: bold; padding: 3px 8px; border-radius: 4px; display: inline-block; }
          .badge-unrated { background-color: #f1f5f9; color: #64748b; padding: 3px 8px; border-radius: 4px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="title">EcoPin City Performance & CSAT Report</div>
        <div class="subtitle">Generated on ${generatedAt} • Automated Operations & Citizen Satisfaction Audit</div>

        <!-- 1. Executive Summary -->
        <table class="stat-card-table" style="border:none;">
          <tr>
            <td style="border:none; width:33%; padding:6px;">
              <div class="stat-box">
                <div class="stat-label">Total Cleared Operations</div>
                <div class="stat-val">${overall.total_completed || 0} tasks</div>
              </div>
            </td>
            <td style="border:none; width:33%; padding:6px;">
              <div class="stat-box">
                <div class="stat-label">Average Response Duration</div>
                <div class="stat-val">${overall.avg_turnaround_hours != null ? `${overall.avg_turnaround_hours}h` : '—'}</div>
              </div>
            </td>
            <td style="border:none; width:34%; padding:6px;">
              <div class="stat-box">
                <div class="stat-label">Citizen Satisfaction (CSAT)</div>
                <div class="stat-val">
                  ${overallSat.emoji} ${overall.avg_satisfaction_rating != null ? overall.avg_satisfaction_rating : 'N/A'}
                  <span style="font-size:10pt; font-weight:normal; color:#64748b;">(${overallSat.label})</span>
                </div>
              </div>
            </td>
          </tr>
        </table>

        <!-- 2. Squad Teams -->
        <div class="section-title">1. Field Crew Squads Performance</div>
        <table>
          <thead>
            <tr>
              <th style="width:25%;">Squad Name</th>
              <th style="width:20%;">Team Lead</th>
              <th class="center" style="width:12%;">Crew Size</th>
              <th class="num" style="width:13%;">Resolved Tasks</th>
              <th class="num" style="width:15%;">Avg Speed</th>
              <th class="center" style="width:15%;">Citizen CSAT</th>
            </tr>
          </thead>
          <tbody>
            ${crews.map(c => {
              const sat = getSatisfactionInfo(c.performance?.avg_satisfaction_rating)
              const badgeClass = sat.scoreText === 'N/A' ? 'badge-unrated' : Number(sat.scoreText) >= 4 ? 'badge-high' : Number(sat.scoreText) >= 2.5 ? 'badge-mid' : 'badge-low'
              return `
                <tr>
                  <td><b>${c.name || 'Unnamed Squad'}</b></td>
                  <td>${c.team_lead?.full_name || '—'}</td>
                  <td class="center">${c.member_count || 0}</td>
                  <td class="num"><b>${c.performance?.total_completed || 0}</b></td>
                  <td class="num">${c.performance?.avg_turnaround_hours != null ? `${c.performance.avg_turnaround_hours}h` : '—'}</td>
                  <td class="center"><span class="${badgeClass}">${sat.emoji} ${sat.scoreText} (${sat.label})</span></td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>

        <!-- 3. Personnel Leaderboard -->
        <div class="section-title">2. Individual Crew Personnel Leaderboard</div>
        <table>
          <thead>
            <tr>
              <th style="width:25%;">Personnel Name</th>
              <th style="width:22%;">Email</th>
              <th class="center" style="width:13%;">Role</th>
              <th class="num" style="width:12%;">Tasks Done</th>
              <th class="num" style="width:13%;">Avg Speed</th>
              <th class="center" style="width:15%;">Citizen CSAT</th>
            </tr>
          </thead>
          <tbody>
            ${members.map(m => {
              const sat = getSatisfactionInfo(m.performance?.avg_satisfaction_rating)
              const badgeClass = sat.scoreText === 'N/A' ? 'badge-unrated' : Number(sat.scoreText) >= 4 ? 'badge-high' : Number(sat.scoreText) >= 2.5 ? 'badge-mid' : 'badge-low'
              return `
                <tr>
                  <td><b>${m.full_name || 'Crew Member'}</b></td>
                  <td>${m.email || '—'}</td>
                  <td class="center">${(m.role || 'field_crew').replace('_', ' ')}</td>
                  <td class="num"><b>${m.performance?.total_completed || 0}</b></td>
                  <td class="num">${m.performance?.avg_turnaround_hours != null ? `${m.performance.avg_turnaround_hours}h` : '—'}</td>
                  <td class="center"><span class="${badgeClass}">${sat.emoji} ${sat.scoreText} (${sat.label})</span></td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>

        <!-- 4. Operations Detail Log -->
        ${allCompletedTasks.length > 0 ? `
          <div class="section-title">3. Detailed Completed Cleanup Operations Log (${allCompletedTasks.length} tasks)</div>
          <table>
            <thead>
              <tr>
                <th style="width:30%;">Task Title</th>
                <th style="width:20%;">Completed By</th>
                <th class="center" style="width:15%;">Completed Date</th>
                <th class="num" style="width:12%;">Duration</th>
                <th class="center" style="width:13%;">Citizen CSAT</th>
                <th class="num" style="width:10%;">Reports</th>
              </tr>
            </thead>
            <tbody>
              ${allCompletedTasks.map(t => {
                const sat = getSatisfactionInfo(t.avg_rating)
                const badgeClass = sat.scoreText === 'N/A' ? 'badge-unrated' : Number(sat.scoreText) >= 4 ? 'badge-high' : Number(sat.scoreText) >= 2.5 ? 'badge-mid' : 'badge-low'
                return `
                  <tr>
                    <td><b>${t.title || 'Cleanup Task'}</b></td>
                    <td>${t.member_name || 'Field Crew'}</td>
                    <td class="center">${t.completed_at ? new Date(t.completed_at).toISOString().split('T')[0] : '—'}</td>
                    <td class="num">${t.turnaround_hours != null ? `${t.turnaround_hours}h` : '—'}</td>
                    <td class="center"><span class="${badgeClass}">${sat.emoji} ${sat.scoreText}</span></td>
                    <td class="num">${t.reports_count || 1}</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
        ` : ''}
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `ecopin_performance_report_${today}.xls`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [performanceData])

  // 3. Clean UTF-8 BOM CSV Exporter
  const handleExportPerformanceCSV = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""'
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return `"${str}"`
    }

    const rows = []
    rows.push(['=== ECOPIN PERFORMANCE & CSAT REPORT ===', `Exported: ${new Date().toLocaleString()}`].map(escapeCsv).join(','))
    rows.push(['Metric', 'Value'].map(escapeCsv).join(','))
    rows.push(['Total Tasks Resolved', performanceData?.overall?.total_completed || 0].map(escapeCsv).join(','))
    rows.push(['Average Resolution Hours', performanceData?.overall?.avg_turnaround_hours != null ? `${performanceData.overall.avg_turnaround_hours}h` : 'N/A'].map(escapeCsv).join(','))
    rows.push(['Overall Citizen CSAT Score', performanceData?.overall?.avg_satisfaction_rating != null ? performanceData.overall.avg_satisfaction_rating : 'N/A'].map(escapeCsv).join(','))
    rows.push(['Citizen Sentiment', getSatisfactionInfo(performanceData?.overall?.avg_satisfaction_rating).label].map(escapeCsv).join(','))
    rows.push(['Total Citizen Reviews Received', performanceData?.overall?.total_ratings_received || 0].map(escapeCsv).join(','))
    rows.push([])

    rows.push(['=== SQUAD / FIELD CREW TEAMS PERFORMANCE ==='].map(escapeCsv).join(','))
    rows.push(['Squad Name', 'Team Lead', 'Member Count', 'Tasks Resolved', 'Avg Turnaround (Hrs)', 'Citizen CSAT', 'Sentiment Tier', 'Reviews Count'].map(escapeCsv).join(','))
    for (const crew of (performanceData?.crews || [])) {
      const sat = getSatisfactionInfo(crew.performance?.avg_satisfaction_rating)
      rows.push([
        crew.name || 'Unnamed Squad',
        crew.team_lead?.full_name || 'No Lead',
        crew.member_count || 0,
        crew.performance?.total_completed || 0,
        crew.performance?.avg_turnaround_hours ?? '—',
        crew.performance?.avg_satisfaction_rating ?? 'N/A',
        sat.label,
        crew.performance?.total_ratings_received || 0
      ].map(escapeCsv).join(','))
    }
    rows.push([])

    rows.push(['=== INDIVIDUAL CREW PERSONNEL PERFORMANCE ==='].map(escapeCsv).join(','))
    rows.push(['Full Name', 'Email', 'Role', 'Tasks Completed', 'Avg Turnaround (Hrs)', 'Citizen CSAT', 'Sentiment Tier', 'Reviews Count'].map(escapeCsv).join(','))
    for (const member of (performanceData?.members || [])) {
      const sat = getSatisfactionInfo(member.performance?.avg_satisfaction_rating)
      rows.push([
        member.full_name || 'Unnamed Crew',
        member.email || '',
        member.role || 'field_crew',
        member.performance?.total_completed || 0,
        member.performance?.avg_turnaround_hours ?? '—',
        member.performance?.avg_satisfaction_rating ?? 'N/A',
        sat.label,
        member.performance?.total_ratings_received || 0
      ].map(escapeCsv).join(','))
    }

    // Prepend UTF-8 BOM (\uFEFF) for crisp Excel rendering with symbols
    const csvContent = '\uFEFF' + rows.join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `ecopin_performance_report_${today}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [performanceData])

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className={styles.perfHeader}>
        <div>
          <h2>Performance and CSAT</h2>
          <p>Turnaround and citizen satisfaction across all field crews and personnel.</p>
        </div>
        <div className={styles.exportActions}>
          <button type="button" className="btn-secondary" onClick={handleExportPerformanceExcel} disabled={!performanceData || (!performanceData.members?.length && !performanceData.crews?.length)} title="Download a formatted spreadsheet">
            <Download size={16} aria-hidden="true" />
            <span>Excel (.xls)</span>
          </button>
          <Link href="/dashboard/officer/crew-management/report" className="btn-secondary" title="Open the A4 report preview to print or save as PDF">
            <Download size={16} aria-hidden="true" />
            <span>PDF report</span>
          </Link>
          <button type="button" className={styles.textAction} onClick={handleExportPerformanceCSV} disabled={!performanceData || (!performanceData.members?.length && !performanceData.crews?.length)} title="Download raw CSV with UTF-8 support">
            CSV
          </button>
        </div>
      </div>

      <section className={styles.perfCardGrid} aria-label="Overall performance">
        <div className={styles.perfStatCard}>
          <span className={styles.statHeader}>Completed tasks</span>
          <span className={styles.statValue}>{performanceData?.overall?.total_completed || 0}</span>
          <p>Tasks resolved</p>
        </div>
        <div className={styles.perfStatCard}>
          <span className={styles.statHeader}>Average resolution</span>
          <span className={styles.statValue}>
            {performanceData?.overall?.avg_turnaround_hours != null ? `${performanceData.overall.avg_turnaround_hours}h` : '—'}
          </span>
          <p>From assignment to completion</p>
        </div>
        <div className={styles.perfStatCard}>
          <span className={styles.statHeader}>Citizen satisfaction</span>
          <span className={styles.statValue}>
            {performanceData?.overall?.avg_satisfaction_rating != null ? (
              <>
                <span aria-hidden="true">{getSatisfactionInfo(performanceData.overall.avg_satisfaction_rating).emoji}</span>{' '}
                {performanceData.overall.avg_satisfaction_rating}
                <span className={styles.statUnit}> / 5</span>
              </>
            ) : (
              <span className={styles.statEmpty}>No ratings yet</span>
            )}
          </span>
          <p>
            {performanceData?.overall?.avg_satisfaction_rating != null ? `${getSatisfactionInfo(performanceData.overall.avg_satisfaction_rating).label} · ` : ''}
            {performanceData?.overall?.total_ratings_received || 0} citizen reviews
          </p>
        </div>
      </section>

      <section className={styles.perfPanel} aria-labelledby="csat-distribution-title">
        <h3 id="csat-distribution-title" className={styles.panelTitle}>How citizens rated cleanups</h3>
        <p className={styles.panelNote}>Share of verified ratings at each level. <Link href="/dashboard/officer/metrics?tab=feedback" className="text-workspace-link underline underline-offset-4">Full CSAT analytics</Link></p>
        {csatDistribution.total === 0 ? (
          <p className={styles.panelNote}>No citizen reviews have been recorded yet.</p>
        ) : (
          <ul className={styles.distList}>
            {csatDistribution.rows.map(row => (
              <li key={row.rating}>
                <span className={styles.distLabel}><span aria-hidden="true">{row.emoji}</span> {row.rating} · {row.label}</span>
                <span className={styles.distTrack} aria-hidden="true"><span className={styles.distFill} style={{ width: `${row.percent}%`, backgroundColor: row.color }} /></span>
                <span className={styles.distCount}>{row.count} <span>({row.percent.toFixed(0)}%)</span></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Crew Teams Leaderboard Table */}
      <div className={styles.perfPanel}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h3 className={styles.panelTitle}>Crew teams</h3>
            <p className={styles.panelNote}>Select a team to see its completed tasks and ratings.</p>
          </div>
          <span className={styles.panelNote}>
            {(performanceData?.crews || []).length} active { (performanceData?.crews || []).length === 1 ? 'team' : 'teams'}
          </span>
        </div>
        <DataTable
          columns={[
            {
              key: 'name',
              label: 'Crew team',
              width: '30%',
              render: (name, row) => (
                <div className="flex flex-col">
                  <span className="font-medium text-text-primary">{name || 'Unnamed Crew'}</span>
                  {row.team_lead && (
                    <span className="text-xs text-text-muted">Lead: {row.team_lead.full_name}</span>
                  )}
                </div>
              )
            },
            {
              key: 'member_count',
              label: 'Members',
              width: '15%',
              render: (val) => <span className="text-sm text-text-secondary">{val || 0} crew</span>
            },
            {
              key: 'tasks',
              label: 'Resolved tasks',
              width: '20%',
              render: (_, row) => (
                <span className="font-medium text-text-primary">
                  {row.performance?.total_completed || 0}
                </span>
              )
            },
            {
              key: 'turnaround',
              label: 'Average turnaround',
              width: '20%',
              render: (_, row) => (
                <span>
                  {row.performance?.avg_turnaround_hours ? `${row.performance.avg_turnaround_hours} hrs` : '—'}
                </span>
              )
            },
            {
              key: 'rating',
              label: 'Citizen CSAT',
              width: '15%',
              render: (_, row) => {
                const satInfo = getSatisfactionInfo(row.performance?.avg_satisfaction_rating)
                if (!row.performance?.avg_satisfaction_rating) {
                  return <span className="text-xs text-text-muted">Unrated</span>
                }
                return (
                  <div className="flex items-center gap-1.5 font-medium" title={`${satInfo.label} (${row.performance.avg_satisfaction_rating})`}>
                    <span className="text-base leading-none">{satInfo.emoji}</span>
                    <span>{row.performance.avg_satisfaction_rating}</span>
                    <span className="text-xs text-text-muted">
                      ({row.performance?.total_ratings_received || 0})
                    </span>
                  </div>
                )
              }
            }
          ]}
          data={performanceData?.crews || []}
          emptyMessage="No crew teams found."
          onRowClick={(row) => setSelectedCrew(row)}
          rowActionLabel={(row) => `View tasks completed by ${row.name || 'squad'}`}
          caption="Crew team performance"
        />
      </div>

      {/* Individual Crew Members Performance Table with Search, Filter & Pagination */}
      <div className={styles.perfPanel}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h3 className={styles.panelTitle}>Personnel</h3>
            <p className={styles.panelNote}>Select a person to see their completed tasks and ratings.</p>
          </div>
          <span className={styles.panelNote}>
            {filteredMembers.length} {filteredMembers.length === 1 ? 'person' : 'people'}
          </span>
        </div>

        {/* Search & Filter Toolbar */}
        <div className={styles.tableToolbar}>
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={15} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search personnel by name or email…"
              aria-label="Search crew personnel"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.search}
            />
          </div>

          <div className={styles.tableFilters}>
            <span className={styles.filterLabel}>Rating</span>
            <select
              value={csatFilter}
              onChange={(e) => setCsatFilter(e.target.value)}
              className={styles.selectInput}
              aria-label="Filter by CSAT Rating"
            >
              <option value="all">All ratings</option>
              <option value="high">High (4.0 and above)</option>
              <option value="mid">Neutral (2.5 to 3.9)</option>
              <option value="low">Low (below 2.5)</option>
              <option value="unrated">Unrated</option>
            </select>

            <span className={styles.filterLabel}>Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={styles.selectInput}
              aria-label="Sort personnel"
            >
              <option value="tasks_desc">Most tasks completed</option>
              <option value="tasks_asc">Fewest tasks completed</option>
              <option value="csat_desc">Highest CSAT</option>
              <option value="speed_asc">Fastest turnaround</option>
              <option value="name_asc">Name (A to Z)</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={[
            {
              key: 'full_name',
              label: 'Crew member',
              width: '30%',
              render: (name, row) => (
                <div className="flex items-center gap-2.5">
                  <Avatar user={row} size="sm" />
                  <div className="flex flex-col">
                    <span className="font-medium text-text-primary">{name || 'Unnamed Crew'}</span>
                    <span className="text-xs text-text-muted">{row.tasks?.length || 0} tasks tracked</span>
                  </div>
                </div>
              )
            },
            {
              key: 'tasks',
              label: 'Completed tasks',
              width: '25%',
              render: (_, row) => (
                <span className="font-medium text-text-primary">
                  {row.performance?.total_completed || 0}
                </span>
              )
            },
            {
              key: 'turnaround',
              label: 'Average turnaround',
              width: '25%',
              render: (_, row) => (
                <span>
                  {row.performance?.avg_turnaround_hours ? `${row.performance.avg_turnaround_hours} hrs` : '—'}
                </span>
              )
            },
            {
              key: 'rating',
              label: 'Citizen CSAT',
              width: '20%',
              render: (_, row) => {
                const satInfo = getSatisfactionInfo(row.performance?.avg_satisfaction_rating)
                if (!row.performance?.avg_satisfaction_rating) {
                  return <span className="text-xs text-text-muted">Unrated</span>
                }
                return (
                  <div className="flex items-center gap-1.5 font-medium" title={`${satInfo.label} (${row.performance.avg_satisfaction_rating})`}>
                    <span className="text-base leading-none">{satInfo.emoji}</span>
                    <span>{row.performance.avg_satisfaction_rating}</span>
                    <span className="text-xs text-text-muted">
                      ({row.performance?.total_ratings_received || 0})
                    </span>
                  </div>
                )
              }
            }
          ]}
          data={paginatedMembers}
          emptyMessage={
            searchQuery || csatFilter !== 'all'
              ? 'No crew members match your search or filter.'
              : 'No performance data available yet.'
          }
          onRowClick={(row) => setSelectedMember(row)}
          rowActionLabel={(row) => `View tasks completed by ${row.full_name || 'member'}`}
          caption="Personnel performance"
        />

        {totalMemberPages > 1 && (
          <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
            <Pagination
              currentPage={safeMemberPage}
              totalPages={totalMemberPages}
              onPageChange={(page) => setMemberPage(page)}
              itemsPerPage={membersPerPage}
              totalItems={filteredMembers.length}
            />
          </div>
        )}
      </div>

      {selectedMember && (
        <MemberTasksModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}

      {selectedCrew && (
        <CrewTeamTasksModal crew={selectedCrew} onClose={() => setSelectedCrew(null)} />
      )}
    </div>
  )
}


function CrewManagementContent() {
  const [crews, setCrews] = useState([])
  const [unassigned, setUnassigned] = useState([])
  const [performanceData, setPerformanceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [unassignedSearch, setUnassignedSearch] = useState('')
  const [viewMode, setViewMode] = useState('members') // 'members' | 'performance'


  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [crewData, unassignedData, perfData] = await Promise.allSettled([
        getCrewsWithMembers(),
        getUnassignedFieldCrew(),
        fetchCrewPerformance()
      ])
      if (crewData.status === 'fulfilled') setCrews(crewData.value || [])
      if (unassignedData.status === 'fulfilled') setUnassigned(unassignedData.value || [])
      if (perfData.status === 'fulfilled') setPerformanceData(perfData.value)
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
        title="Crew Management & Performance"
        subtitle="View rosters, manage squad members, and evaluate field crew performance"
        breadcrumbs={[
          { label: 'Officer', href: '/dashboard/officer' },
          { label: 'Crew Management' }
        ]}
      >
        <div className={styles.viewToggle}>
          <button
            onClick={() => setViewMode('members')}
            className={`${styles.toggleButton} ${viewMode === 'members' ? styles.toggleButtonActive : ''}`}
          >
            Manage Members
          </button>
          <button
            onClick={() => setViewMode('performance')}
            className={`${styles.toggleButton} ${viewMode === 'performance' ? styles.toggleButtonActive : ''}`}
          >
            Performance & CSAT
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
          {viewMode === 'performance' && performanceData?.overall && (
            <>
              <span className="text-text-muted">·</span>
              <div className={styles.summaryStat}>
                <span>
                  Overall CSAT: <strong>{getSatisfactionInfo(performanceData.overall.avg_satisfaction_rating).emoji} {performanceData.overall.avg_satisfaction_rating || 'N/A'}</strong> ({performanceData.overall.total_ratings_received || 0} reviews)
                </span>
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
        <div className={viewMode === 'members' ? 'grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6' : 'mt-6'}>
          {/* Main Content Area */}
          <div className={viewMode === 'members' ? 'lg:col-span-2 min-w-0' : 'min-w-0'}>
            {viewMode === 'performance' ? (
              <PerformanceView performanceData={performanceData} loading={loading} />
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
                        <p className="text-sm font-medium text-text-primary truncate">{user.full_name || 'Unnamed'}</p>
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

