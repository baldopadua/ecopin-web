'use client'
import { useEffect, useState, useCallback } from 'react'
import { UserPlus, UserMinus, Users, Search, ChevronDown, ChevronUp } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { getCrewsWithMembers, updateCrewMembers, getUnassignedFieldCrew } from '@/lib/api/optimization'

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
        className={`${sizeClass} rounded-full object-cover border border-border`}
      />
    )
  }
  return (
    <div className={`${sizeClass} rounded-full bg-[#2563eb] text-white flex items-center justify-center font-bold border border-border`}>
      {getInitials(user.full_name)}
    </div>
  )
}

function MemberChip({ user, onRemove, removing }) {
  return (
    <div className="flex items-center gap-2 bg-surface-elevated border border-border px-3 py-1.5 group">
      <Avatar user={user} size="sm" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{user.full_name || 'Unnamed'}</p>
        <p className="text-xs text-text-muted truncate capitalize">{user.role?.replace('_', ' ') || 'Field Crew'}</p>
      </div>
      <button
        onClick={() => onRemove(user.id)}
        disabled={removing === user.id}
        title="Remove from crew"
        className="ml-1 text-text-muted hover:text-red-500 disabled:opacity-40 transition-colors flex-shrink-0"
      >
        {removing === user.id
          ? <span className="text-xs font-mono">...</span>
          : <UserMinus size={14} />
        }
      </button>
    </div>
  )
}

function CrewCard({ crew, onAdd, onRemove, unassigned, notification, setNotification }) {
  const [removing, setRemoving] = useState(null)
  const [search, setSearch] = useState('')
  const [showAddPanel, setShowAddPanel] = useState(false)

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
    crew.availability_status === 'available' ? 'text-green-600 dark:text-green-400 border-green-600/30 bg-green-50 dark:bg-green-900/20'
    : crew.availability_status === 'on_route' ? 'text-orange-600 dark:text-orange-400 border-orange-600/30 bg-orange-50 dark:bg-orange-900/20'
    : 'text-text-muted border-gray-400/30 bg-gray-50 dark:bg-gray-800/20'

  return (
    <div className="border border-border bg-surface">
      {/* Crew Header */}
      <div className="flex items-start justify-between p-5 border-b border-border">
        <div>
          <h3 className="font-bold text-text-primary text-lg">{crew.name}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-text-muted font-mono">
              {crew.shift_start?.slice(0, 5)} – {crew.shift_end?.slice(0, 5)}
            </span>
            <span className="text-xs text-text-muted">·</span>
            <span className="text-xs text-text-muted">max {crew.max_tasks_per_shift} tasks</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 border font-mono uppercase tracking-wider ${statusColor}`}>
            {crew.availability_status?.replace('_', ' ')}
          </span>
          <span className="flex items-center gap-1 text-xs text-text-muted border border-border px-2 py-1">
            <Users size={12} />
            {crew.members?.length || 0}
          </span>
        </div>
      </div>

      {/* Members */}
      <div className="p-5">
        {(crew.members || []).length === 0 ? (
          <p className="text-sm text-text-muted italic">No members assigned yet.</p>
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
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2563eb] border border-border border-[#2563eb] px-3 py-1.5 hover:bg-[#2563eb]/10 transition-colors"
          >
            <UserPlus size={12} />
            Add Member
            {showAddPanel ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showAddPanel && (
            <div className="mt-3 border border-border border-[#2563eb]/40 bg-[#2563eb]/5 p-3">
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-surface border border-border text-sm text-text-primary focus:border-[#2563eb] focus:outline-none"
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
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#2563eb]/10 text-left transition-colors"
                    >
                      <Avatar user={user} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{user.full_name || 'Unnamed'}</p>
                        <p className="text-xs text-text-muted truncate capitalize">{user.role?.replace('_', ' ') || 'Field Crew'}</p>
                      </div>
                      <UserPlus size={14} className="ml-auto text-[#2563eb] flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CrewManagementPage() {
  const [crews, setCrews] = useState([])
  const [unassigned, setUnassigned] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [unassignedSearch, setUnassignedSearch] = useState('')

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

  return (
    <div className="p-8">
      <PageHeader
        title="Crew Management"
        subtitle="Assign field crew members to their teams"
        breadcrumbs={[
          { label: 'Officer', href: '/dashboard/officer' },
          { label: 'Crew Management' }
        ]}
      />

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div>
            <SkeletonCard />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Crew Cards */}
          <div className="lg:col-span-2 space-y-4">
            {crews.length === 0 ? (
              <div className="border border-border p-10 text-center">
                <Users size={32} className="mx-auto text-text-muted mb-3" />
                <p className="text-text-muted">No crews found. Create one in Optimization Settings.</p>
              </div>
            ) : (
              crews.map(crew => (
                <CrewCard
                  key={crew.id}
                  crew={crew}
                  unassigned={unassigned}
                  onAdd={handleAdd}
                  onRemove={handleRemove}
                  notification={notification}
                  setNotification={setNotification}
                />
              ))
            )}
          </div>

          {/* Unassigned Panel */}
          <div className="lg:col-span-1">
            <div className="border border-border bg-surface sticky top-6">
              <div className="p-4 border-b border-border">
                <h2 className="font-bold text-text-primary flex items-center gap-2">
                  <Users size={16} />
                  Unassigned
                  <span className="ml-auto text-xs border border-border px-2 py-0.5 font-mono">
                    {unassigned.length}
                  </span>
                </h2>
                <p className="text-xs text-text-muted mt-1">
                  Field crew users not yet in any team.
                </p>
              </div>

              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={unassignedSearch}
                    onChange={e => setUnassignedSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-surface-elevated border border-border text-sm text-text-primary focus:border-[#2563eb] focus:outline-none"
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
        </div>
      )}
    </div>
  )
}
