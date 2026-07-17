'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'
import FilterDropdown from '@/components/ui/FilterDropdown'
import { getAllUsers, updateUserRole, deleteUser, createUser } from '@/lib/api'

export default function UserManagement() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState(null)
  const [filters, setFilters] = useState({ search: '', role: '' })
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [updatingRole, setUpdatingRole] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'lgu' })

  useEffect(() => {
    loadUsers()
  }, [filters, pagination.page])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await getAllUsers({
        page: pagination.page,
        limit: 20,
        search: filters.search,
        role: filters.role
      })
      setUsers(data.users || [])
      setPagination(prev => ({
        ...prev,
        totalPages: data.pagination?.totalPages || 1,
        total: data.pagination?.total || 0
      }))
    } catch (err) {
      console.error('Failed to load users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      setUpdatingRole(userId)
      await updateUserRole(userId, newRole)
      setNotification({ message: 'User role updated successfully', type: 'success' })
      loadUsers()
    } catch (err) {
      console.error('Failed to update role:', err)
      setNotification({ message: 'Failed to update user role', type: 'error' })
    } finally {
      setUpdatingRole(null)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingUser(userId)
      await deleteUser(userId)
      setNotification({ message: 'User deleted successfully', type: 'success' })
      loadUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
      setNotification({ message: 'Failed to delete user', type: 'error' })
    } finally {
      setDeletingUser(null)
    }
  }

  const handleCreateUser = async () => {
    const { email, password, full_name, role } = newUser

    if (!email || !password || !full_name) {
      setNotification({ message: 'Please fill in all required fields', type: 'error' })
      return
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.allMet) {
      setNotification({ message: 'Password does not meet all requirements', type: 'error' })
      return
    }

    try {
      setCreatingUser(true)
      await createUser({ email, password, full_name, role })
      setNotification({ message: 'User created successfully', type: 'success' })
      setNewUser({ email: '', password: '', full_name: '', role: 'lgu' })
      setShowCreateForm(false)
      loadUsers()
    } catch (err) {
      console.error('Failed to create user:', err)
      setNotification({ message: err.message || 'Failed to create user', type: 'error' })
    } finally {
      setCreatingUser(false)
    }
  }

  const validatePassword = (password) => {
    const minLength = 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    const requirements = [
      { met: password.length >= minLength, text: `At least ${minLength} characters long` },
      { met: hasUpperCase, text: 'At least one uppercase letter' },
      { met: hasLowerCase, text: 'At least one lowercase letter' },
      { met: hasNumbers, text: 'At least one number' },
      { met: hasSpecialChar, text: 'At least one special character' }
    ]

    const allMet = requirements.every(r => r.met)
    return { requirements, allMet }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple/10 text-purple'
      case 'lgu':
        return 'bg-info/10 text-info'
      case 'citizen':
      default:
        return 'bg-surface text-text-muted'
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="User Management"
        subtitle="Manage user accounts and roles"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin', href: '/dashboard/admin' },
          { label: 'Users' }
        ]}
      />

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4 flex-wrap flex-1">
            <div className="w-full max-w-xl">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full p-3 border border-border rounded-lg bg-surface text-text-primary"
              />
            </div>
            <div className="min-w-[150px]">
              <FilterDropdown
                label="All Roles"
                value={filters.role}
                onChange={(val) => setFilters(prev => ({ ...prev, role: val }))}
                options={[
                  { value: '', label: 'All Roles' },
                  { value: 'citizen', label: 'Citizen' },
                  { value: 'lgu', label: 'LGU' },
                  { value: 'admin', label: 'Admin' }
                ]}
              />
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary"
          >
            {showCreateForm ? 'Cancel' : 'Create User'}
          </button>
        </div>

        {showCreateForm && (
          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Create New User</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="input"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Full Name *</label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                  className="input"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Password *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  className="input"
                  placeholder="••••••••"
                />
                {newUser.password && (
                  <div className="mt-2">
                    <ul className="space-y-1">
                      {validatePassword(newUser.password).requirements.map((req, idx) => (
                        <li key={idx} className="text-xs flex items-center gap-2">
                          <svg
                            className={`w-4 h-4 ${req.met ? 'text-success' : 'text-text-muted'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            {req.met ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            )}
                          </svg>
                          <span className={req.met ? 'text-success' : 'text-text-muted'}>{req.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Role *</label>
                <FilterDropdown
                  label="Select Role"
                  value={newUser.role}
                  onChange={(val) => setNewUser(prev => ({ ...prev, role: val }))}
                  options={[
                    { value: 'lgu', label: 'LGU' },
                    { value: 'admin', label: 'Admin' }
                  ]}
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleCreateUser}
                disabled={creatingUser || !validatePassword(newUser.password).allMet}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingUser ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="card">
        {loading ? (
          <p className="text-text-muted">Loading users...</p>
        ) : error ? (
          <p className="text-error">{error}</p>
        ) : users.length === 0 ? (
          <p className="text-text-muted">No users found</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <colgroup>
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Created</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-accent-green/10 flex items-center justify-center">
                              <span className="text-accent-green font-medium">
                                {user.full_name?.charAt(0) || 'U'}
                              </span>
                            </div>
                          )}
                          <span className="font-medium text-text-primary">{user.full_name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-text-secondary">{user.email || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <FilterDropdown
                          label={user.role}
                          value={user.role}
                          onChange={(val) => handleRoleChange(user.id, val)}
                          options={[
                            { value: 'citizen', label: 'Citizen' },
                            { value: 'lgu', label: 'LGU' },
                            { value: 'admin', label: 'Admin' }
                          ]}
                        />
                      </td>
                      <td className="py-3 px-4 text-sm text-text-muted">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={deletingUser === user.id}
                          className="text-error hover:text-error/80 text-sm disabled:opacity-50"
                        >
                          {deletingUser === user.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <p className="text-sm text-text-muted">
                  Showing {((pagination.page - 1) * 20) + 1} to {Math.min(pagination.page * 20, pagination.total)} of {pagination.total} users
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i
                      } else {
                        pageNum = pagination.page - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                          className={`px-3 py-2 rounded ${pagination.page === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
