'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import { getAllUsers, updateUserRole, deleteUser, createUser, getSystemSettings, changeUserPassword } from '@/lib/api'

export default function UserManagement() {
  const router = useRouter()
  const [allUsers, setAllUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [paginatedUsers, setPaginatedUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState(null)
  const [filters, setFilters] = useState({ search: '', role: '' })

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const [updatingRole, setUpdatingRole] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'citizen' })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [passwordSettings, setPasswordSettings] = useState({
    password_min_length: 8,
    password_require_uppercase: true,
    password_require_lowercase: true,
    password_require_numbers: true,
    password_require_special_chars: true
  })

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [userToChangePassword, setUserToChangePassword] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const [showCreatePassword, setShowCreatePassword] = useState(false)

  // Load system settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSystemSettings()
        if (settings) setPasswordSettings(settings)
      } catch (err) {
        console.error('Failed to load system settings:', err)
      }
    }
    loadSettings()
  }, [])

  // Load users ONCE
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await getAllUsers({
        page: 1,
        limit: 1000, // Fetch up to 1000 for local filtering
        search: '',
        role: ''
      })
      const fetchedUsers = data.users || []
      setAllUsers(fetchedUsers)
      setFilteredUsers(fetchedUsers)
    } catch (err) {
      console.error('Failed to load users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  // Apply filters locally
  useEffect(() => {
    let result = allUsers

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(u =>
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      )
    }

    if (filters.role) {
      result = result.filter(u => u.role === filters.role)
    }

    setFilteredUsers(result)
    setCurrentPage(1)
  }, [filters.search, filters.role, allUsers])

  // Apply pagination locally
  useEffect(() => {
    const start = (currentPage - 1) * itemsPerPage
    setPaginatedUsers(filteredUsers.slice(start, start + itemsPerPage))
  }, [currentPage, filteredUsers])

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)

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

  const confirmDelete = (userId) => {
    setUserToDelete(userId)
    setShowDeleteModal(true)
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      setDeletingUser(userToDelete)
      await deleteUser(userToDelete)
      setNotification({ message: 'User deleted successfully', type: 'success' })
      loadUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
      setNotification({ message: err.message || 'Failed to delete user', type: 'error' })
    } finally {
      setDeletingUser(null)
      setShowDeleteModal(false)
      setUserToDelete(null)
    }
  }

  const handleCreateUser = async () => {
    const { email, password, full_name, role } = newUser

    if (!email || !full_name) {
      setNotification({ message: 'Please fill in all required fields (Email and Full Name)', type: 'error' })
      return
    }

    if (password) {
      const passwordValidation = validatePassword(password)
      if (!passwordValidation.allMet) {
        setNotification({ message: 'Password does not meet all requirements', type: 'error' })
        return
      }
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

  const handleChangePassword = async () => {
    if (!newPassword) {
      setNotification({ message: 'Please enter a new password', type: 'error' })
      return
    }

    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.allMet) {
      setNotification({ message: 'Password does not meet all requirements', type: 'error' })
      return
    }

    try {
      setChangingPassword(true)
      await changeUserPassword(userToChangePassword, newPassword)
      setNotification({ message: 'Password changed successfully', type: 'success' })
      setShowChangePasswordModal(false)
      setUserToChangePassword(null)
      setNewPassword('')
    } catch (err) {
      console.error('Failed to change password:', err)
      setNotification({ message: err.message || 'Failed to change password', type: 'error' })
    } finally {
      setChangingPassword(false)
    }
  }

  const validatePassword = (password) => {
    const {
      password_min_length,
      password_require_uppercase,
      password_require_lowercase,
      password_require_numbers,
      password_require_special_chars
    } = passwordSettings;

    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    const requirements = [
      { met: password.length >= password_min_length, text: `At least ${password_min_length} characters long` }
    ]

    if (password_require_uppercase) requirements.push({ met: hasUpperCase, text: 'At least one uppercase letter' })
    if (password_require_lowercase) requirements.push({ met: hasLowerCase, text: 'At least one lowercase letter' })
    if (password_require_numbers) requirements.push({ met: hasNumbers, text: 'At least one number' })
    if (password_require_special_chars) requirements.push({ met: hasSpecialChar, text: 'At least one special character' })

    const allMet = requirements.every(r => r.met)
    return { requirements, allMet }
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleResetFilters = () => {
    setFilters({ search: '', role: '' })
    setCurrentPage(1)
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
      width: '20%',
      render: (value, row) => (
        <div className="flex gap-4">
          <button
            onClick={() => {
              setUserToChangePassword(row.id)
              setShowChangePasswordModal(true)
            }}
            className="text-primary hover:text-primary/80 text-sm font-medium"
          >
            Change Password
          </button>
          <button
            onClick={() => confirmDelete(row.id)}
            disabled={deletingUser === row.id}
            className="text-error hover:text-error/80 text-sm font-medium disabled:opacity-50"
          >
            {deletingUser === row.id ? 'Deleting...' : 'Delete'}
          </button>
        </div>
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

      {/* Delete User Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h3 className="text-xl font-bold text-text-primary mb-2">Delete User</h3>
            <p className="text-text-secondary mb-6">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setUserToDelete(null)
                }}
                disabled={deletingUser}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deletingUser}
                className="btn-primary bg-error hover:bg-error/90 text-white border-0"
              >
                {deletingUser ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h3 className="text-xl font-bold text-text-primary mb-2">Change Password</h3>
            <p className="text-text-secondary mb-4">
              Enter a new password for the user.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-2">New Password *</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="New Password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showNewPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a9.953 9.953 0 015.71-2.29c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {newPassword && (
              <div className="mt-4 mb-6">
                <p className="text-sm font-medium text-text-secondary mb-2">Password Requirements:</p>
                <ul className="text-sm space-y-1">
                  {validatePassword(newPassword).requirements.map((req, i) => (
                    <li key={i} className={`flex items-center gap-2 ${req.met ? 'text-success' : 'text-error'}`}>
                      <span>{req.met ? '✓' : '✗'}</span>
                      {req.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowChangePasswordModal(false)
                  setUserToChangePassword(null)
                  setNewPassword('')
                }}
                disabled={changingPassword}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="btn-primary"
              >
                {changingPassword ? 'Saving...' : 'Save Password'}
              </button>
            </div>
          </div>
        </div>
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
              <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
              <div className="relative">
                <input
                  type={showCreatePassword ? 'text' : 'password'}
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  className="input pr-10"
                  placeholder="Leave blank for default: 12345678Aa@"
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showCreatePassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a9.953 9.953 0 015.71-2.29c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-error mt-1">
                This will be a temporary password. The user will be required to change it on their next login.
              </p>
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
              <label className="block text-sm font-medium text-text-white mb-2">Role *</label>
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
        resultsCount={filteredUsers.length}
        loading={loading}
        sticky={false}
      />

      {/* Users Table */}
      <DataTable
        columns={tableColumns}
        data={paginatedUsers}
        loading={loading}
        emptyMessage="No users found"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          itemsPerPage={itemsPerPage}
          totalItems={filteredUsers.length}
          className="mt-6"
        />
      )}
    </div>
  )
}