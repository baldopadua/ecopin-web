'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import { getAllUsers, updateUserRole, deleteUser, createUser } from '@/lib/api'

export default function UserManagement() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState(null)
  const [filters, setFilters] = useState({ search: '', role: '' })
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [updatingRole, setUpdatingRole] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'citizen' })

  // Debounce search input and reset page when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search)
      setPagination(prev => ({ ...prev, page: 1 }))
    }, 300)
    return () => clearTimeout(timer)
  }, [filters.search, filters.role])

  useEffect(() => {
    loadUsers()
  }, [debouncedSearch, filters.role, pagination.page])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await getAllUsers({
        page: pagination.page,
        limit: 20,
        search: debouncedSearch,
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
      setNewUser({ email: '', password: '', full_name: '', role: 'citizen' })
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

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handleResetFilters = () => {
    setFilters({ search: '', role: '' })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const tableColumns = [
    { 
      key: 'full_name', 
      label: 'Name', 
      width: '25%',
      render: (value) => (
        <span className="font-medium text-text-primary">{value || 'N/A'}</span>
      )
    },
    { 
      key: 'email', 
      label: 'Email', 
      width: '30%',
      render: (value) => (
        <span className="text-sm text-text-secondary">{value}</span>
      )
    },
    { 
      key: 'role', 
      label: 'Role', 
      width: '20%',
      render: (value, row) => (
        <select
          value={value}
          onChange={(e) => handleRoleChange(row.id, e.target.value)}
          disabled={updatingRole === row.id}
          className="input text-sm py-1"
        >
          <option value="citizen">Citizen</option>
          <option value="officer">Officer</option>
          <option value="field_crew">Field Crew</option>
          <option value="admin">Admin</option>
        </select>
      )
    },
    { 
      key: 'created_at', 
      label: 'Created', 
      width: '15%',
      render: (value) => (
        <span className="text-sm text-text-muted">{new Date(value).toLocaleDateString()}</span>
      )
    },
    { 
      key: 'actions', 
      label: 'Actions', 
      width: '10%',
      render: (value, row) => (
        <button
          onClick={() => handleDeleteUser(row.id)}
          disabled={deletingUser === row.id}
          className="text-error hover:text-error/80 text-sm font-medium disabled:opacity-50"
        >
          {deletingUser === row.id ? 'Deleting...' : 'Delete'}
        </button>
      )
    }
  ]

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
      >
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary whitespace-nowrap"
        >
          {showCreateForm ? 'Cancel' : 'Create User'}
        </button>
      </PageHeader>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Create User Form */}
      {showCreateForm && (
        <div className="card mb-6">
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
              <label className="block text-sm font-medium text-text-secondary mb-2">Password *</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                className="input"
                placeholder="Password"
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
              <label className="block text-sm font-medium text-text-secondary mb-2">Role *</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                className="input"
              >
                <option value="citizen">Citizen</option>
                <option value="officer">Officer</option>
                <option value="field_crew">Field Crew</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          
          {newUser.password && (
            <div className="mt-4">
              <p className="text-sm font-medium text-text-secondary mb-2">Password Requirements:</p>
              <ul className="text-sm space-y-1">
                {validatePassword(newUser.password).requirements.map((req, i) => (
                  <li key={i} className={`flex items-center gap-2 ${req.met ? 'text-success' : 'text-error'}`}>
                    <span>{req.met ? '✓' : '✗'}</span>
                    {req.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleCreateUser}
              disabled={creatingUser}
              className="btn-primary"
            >
              {creatingUser ? 'Creating...' : 'Create User'}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <FilterBar
        searchPlaceholder="Search by name or email..."
        searchValue={filters.search}
        onSearchChange={(val) => setFilters(prev => ({ ...prev, search: val }))}
        filters={[
          {
            label: 'All Roles',
            value: filters.role,
            onChange: (val) => setFilters(prev => ({ ...prev, role: val })),
            options: [
              { value: '', label: 'All Roles' },
              { value: 'citizen', label: 'Citizen' },
              { value: 'officer', label: 'Officer' },
              { value: 'field_crew', label: 'Field Crew' },
              { value: 'admin', label: 'Admin' }
            ]
          }
        ]}
        onReset={handleResetFilters}
        resultsCount={pagination.total}
        loading={loading}
        sticky={false}
      />

      {/* Users Table */}
      <DataTable
        columns={tableColumns}
        data={users}
        loading={loading}
        emptyMessage="No users found"
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
          itemsPerPage={20}
          totalItems={pagination.total}
          className="mt-6"
        />
      )}
    </div>
  )
}