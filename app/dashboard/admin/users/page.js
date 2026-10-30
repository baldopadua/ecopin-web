'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { AdminGuard } from '@/components/auth/RequireRole'
import Notification from '@/components/ui/Notification'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import PageTabs from '@/components/ui/PageTabs'
import useTablePageSize from '@/components/ui/useTablePageSize'
import StatusBadge from '@/components/ui/StatusBadge'
import { getAllUsers, updateUserRole, deleteUser, createUser, getSystemSettings, changeUserPassword } from '@/lib/api'
import { Eye, EyeOff, KeyRound, Trash2, Loader2, Users, UserPlus, Shield, UserCheck, AlertCircle, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react'
import styles from './UserActions.module.css'
import { reportDiagnostic } from '../../../../lib/diagnostics.mjs';

function UserManagementContent() {
  const router = useRouter()
  const [allUsers, setAllUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState(null)
  const [filters, setFilters] = useState({ search: '', role: '' })

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [customPageSize, setCustomPageSize] = useState(10)
  const { containerRef } = useTablePageSize({ resetKey: JSON.stringify(filters) })
  const itemsPerPage = customPageSize
  const [activeTab, setActiveTab] = useState('users')
  const [updatingRole, setUpdatingRole] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [creatingUser, setCreatingUser] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'citizen' })
  const [showCreateConfirmModal, setShowCreateConfirmModal] = useState(false)
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
        reportDiagnostic('error', 'admin', 'Failed to load system settings:', err)
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
      reportDiagnostic('error', 'admin', 'Failed to load users:', err)
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

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages))

  const paginatedUsers = filteredUsers.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage)

  const handleRoleChange = async (userId, newRole) => {
    try {
      setUpdatingRole(userId)
      await updateUserRole(userId, newRole)
      setNotification({ message: 'User role updated successfully', type: 'success' })
      loadUsers()
    } catch (err) {
      reportDiagnostic('error', 'admin', 'Failed to update role:', err)
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
      reportDiagnostic('error', 'admin', 'Failed to delete user:', err)
      setNotification({ message: err.message || 'Failed to delete user', type: 'error' })
    } finally {
      setDeletingUser(null)
      setShowDeleteModal(false)
      setUserToDelete(null)
    }
  }

  const handleInitiateCreateUser = (e) => {
    if (e) e.preventDefault()
    const { email, full_name, password } = newUser

    if (!email || !full_name) {
      setNotification({ message: 'Please fill in all required fields (Email and Full Name)', type: 'error' })
      return
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setNotification({ message: 'Please enter a valid email address', type: 'error' })
      return
    }

    {
      const passwordValidation = validatePassword(password || '12345678Aa@')
      if (!passwordValidation.allMet) {
        setNotification({ message: password ? 'Password does not meet all requirements' : 'The default password does not meet the saved policy. Enter a custom temporary password.', type: 'error' })
        return
      }
    }

    setShowCreateConfirmModal(true)
  }

  const handleConfirmCreateUser = async () => {
    const { email, password, full_name, role } = newUser

    try {
      setCreatingUser(true)
      await createUser({ email, password, full_name, role })
      setNotification({ message: `User "${full_name}" registered successfully as ${role}`, type: 'success' })
      setNewUser({ email: '', password: '', full_name: '', role: 'citizen' })
      setShowCreateConfirmModal(false)
      setActiveTab('users')
      loadUsers()
    } catch (err) {
      reportDiagnostic('error', 'admin', 'Failed to create user:', err)
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
      reportDiagnostic('error', 'admin', 'Failed to change password:', err)
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
        <div className={styles.actions}>
          <span className={styles.action}>
          <button type="button"
            aria-label={`Change password for ${row.full_name || row.email}`}
            aria-describedby={`password-action-${row.id}`}
            onClick={() => {
              setUserToChangePassword(row.id)
              setShowChangePasswordModal(true)
            }}
            className={styles.iconButton}
          >
            <KeyRound size={18} aria-hidden="true" />
          </button>
          <span id={`password-action-${row.id}`} role="tooltip" className={styles.tooltip}>Change password</span>
          </span>
          <span className={styles.action}>
          <button type="button"
            aria-label={`${deletingUser === row.id ? 'Deleting' : 'Delete'} ${row.full_name || row.email}`}
            aria-describedby={`delete-action-${row.id}`}
            aria-busy={deletingUser === row.id}
            onClick={() => confirmDelete(row.id)}
            disabled={deletingUser === row.id}
            className={`${styles.iconButton} ${styles.deleteButton}`}
          >
            {deletingUser === row.id ? <Loader2 size={18} className={styles.busy} aria-hidden="true" /> : <Trash2 size={18} aria-hidden="true" />}
          </button>
          <span id={`delete-action-${row.id}`} role="tooltip" className={styles.tooltip}>{deletingUser === row.id ? 'Deleting…' : 'Delete'}</span>
          </span>
        </div>
      )
    }
  ]

  return (
    <div className="workspace-page">
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
                  placeholder="Leave blank for default: 12345678Aa@"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors flex items-center justify-center p-1"
                >
                  {showNewPassword ? (
                    <EyeOff size={20} aria-hidden="true" />
                  ) : (
                    <Eye size={20} aria-hidden="true" />
                  )}
                </button>
              </div>
              <p className="text-xs text-error mt-1">
                This will be a temporary password. The user will be required to change it on their next login.
              </p>
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

      {/* Create User Confirmation Modal */}
      {showCreateConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="card max-w-lg w-full shadow-2xl border border-border p-6 bg-surface">
            <div className="flex items-center gap-3 mb-4 text-primary">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserCheck size={22} className="text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">Confirm Account Registration</h3>
                <p className="text-xs text-text-secondary">Please review and verify user credentials before provisioning access.</p>
              </div>
            </div>

            <div className="space-y-3 bg-surface-elevated/70 p-4 rounded-xl border border-border/80 my-4 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-text-secondary font-medium">Full Name</span>
                <span className="text-text-primary font-semibold">{newUser.full_name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-text-secondary font-medium">Email Address</span>
                <span className="text-text-primary font-mono">{newUser.email}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-text-secondary font-medium">Assigned Role</span>
                <StatusBadge type="role" status={newUser.role} label={newUser.role.replace('_', ' ').toUpperCase()} />
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-text-secondary font-medium">Initial Password</span>
                <span className="text-text-primary text-xs">
                  {newUser.password ? (
                    <span className="font-mono bg-surface px-2 py-0.5 rounded border border-border">Custom Specified</span>
                  ) : (
                    <span className="text-text-muted italic">System Default (12345678Aa@)</span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-info/10 text-info text-xs mb-5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>The account will be activated immediately. The user will be required to change their temporary password upon their initial login.</span>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCreateConfirmModal(false)}
                disabled={creatingUser}
                className="btn-secondary"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateUser}
                disabled={creatingUser}
                className="btn-primary flex items-center gap-2"
              >
                {creatingUser ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Provisioning Account...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Confirm & Create User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageTabs label="User management" tabs={[{ id: 'users', label: 'Users', icon: Users }, { id: 'create', label: 'Create user', icon: UserPlus }]} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'create' ? (
      <section role="tabpanel" id="create-panel" aria-labelledby="create-tab" className="workspace-fill overflow-hidden">
        <div className="card p-6 w-full flex-1 flex flex-col justify-between overflow-hidden">
          <form onSubmit={handleInitiateCreateUser} className="flex-1 flex flex-col justify-between gap-5">
            {/* Header info */}
            <div className="border-b border-border pb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <UserPlus size={20} className="text-primary" />
                  Register New User Account
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Provision new credentials for Pasig City personnel, field responders, or local residents.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewUser({ email: '', password: '', full_name: '', role: 'citizen' })}
                className="btn-secondary flex items-center gap-2"
              >
                <RotateCcw size={16} />
                Clear Form
              </button>
            </div>

            {/* Basic Info (Full Name + Email) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="create-user-name" className="block text-sm font-semibold text-text-primary mb-1.5">
                  Full Name <span className="text-error">*</span>
                </label>
                <input
                  id="create-user-name"
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                  className="input w-full"
                  placeholder="e.g. Maria Santos"
                />
                <p className="text-xs text-text-muted mt-1">Official display name for records and dispatch rosters.</p>
              </div>

              <div>
                <label htmlFor="create-user-email" className="block text-sm font-semibold text-text-primary mb-1.5">
                  Email Address <span className="text-error">*</span>
                </label>
                <input
                  id="create-user-email"
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="input w-full"
                  placeholder="e.g. maria.santos@pasigcity.gov.ph"
                />
                <p className="text-xs text-text-muted mt-1">Direct login identifier for authentication and notifications.</p>
              </div>
            </div>

            {/* Role Selection with Cards */}
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                Account Role & Access Level <span className="text-error">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    id: 'citizen',
                    label: 'Citizen',
                    badge: 'bg-emerald-500/10 text-emerald-600',
                    desc: 'Submit incident reports, track statuses, and view community map pins.'
                  },
                  {
                    id: 'field_crew',
                    label: 'Field Crew',
                    badge: 'bg-amber-500/10 text-amber-600',
                    desc: 'Accept field workorders, perform cleanups, and submit photo evidence.'
                  },
                  {
                    id: 'officer',
                    label: 'Officer',
                    badge: 'bg-blue-500/10 text-blue-600',
                    desc: 'Validate citizen reports, dispatch field crews, and generate hotzone runs.'
                  },
                  {
                    id: 'admin',
                    label: 'Administrator',
                    badge: 'bg-purple-500/10 text-purple-600',
                    desc: 'Full platform privileges, user management, audit logs, and system settings.'
                  }
                ].map((roleOption) => {
                  const isSelected = newUser.role === roleOption.id
                  return (
                    <button
                      type="button"
                      key={roleOption.id}
                      onClick={() => setNewUser(prev => ({ ...prev, role: roleOption.id }))}
                      className={`text-left p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-xs'
                          : 'border-border bg-surface hover:border-border-hover hover:bg-surface-elevated/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-text-primary text-sm">{roleOption.label}</span>
                        {isSelected ? (
                          <CheckCircle2 size={16} className="text-primary" />
                        ) : (
                          <span className={`w-2 h-2 rounded-full ${roleOption.badge}`} />
                        )}
                      </div>
                      <p className="text-xs text-text-secondary leading-snug">{roleOption.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Password Configuration */}
            <div className="rounded-xl border border-border bg-surface-elevated/30 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                    <KeyRound size={15} className="text-primary" />
                    Temporary Password Provisioning
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Leave blank to assign system default: <code className="bg-surface px-1.5 py-0.5 rounded border border-border font-mono text-text-primary">12345678Aa@</code>
                  </p>
                </div>

                <div className="relative w-full sm:w-80">
                  <input
                    id="create-user-password"
                    type={showCreatePassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="input pr-10 w-full"
                    placeholder="Optional custom temporary password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors flex items-center justify-center p-1"
                  >
                    {showCreatePassword ? (
                      <EyeOff size={20} aria-hidden="true" />
                    ) : (
                      <Eye size={20} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {newUser.password ? (
                <div className="bg-surface p-2.5 rounded-lg border border-border">
                  <ul className="text-xs grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {validatePassword(newUser.password).requirements.map((req, i) => (
                      <li key={i} className={`flex items-center gap-1.5 ${req.met ? 'text-success font-medium' : 'text-text-muted'}`}>
                        <span>{req.met ? '✓' : '•'}</span>
                        <span className="truncate">{req.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg">
                <Shield size={14} className="shrink-0" />
                <span>Temporary passwords require an immediate mandatory reset by the user upon their first authentication.</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-3 flex items-center justify-between border-t border-border">
              <span className="text-xs text-text-muted">Account provisioning events are permanently logged in audit trails.</span>
              <button
                type="submit"
                disabled={creatingUser}
                className="btn-primary flex items-center gap-2"
              >
                <UserPlus size={16} />
                Continue to Review
              </button>
            </div>
          </form>
        </div>
      </section>
      ) : (
      <section role="tabpanel" id="users-panel" aria-labelledby="users-tab" className="workspace-fill">

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
      <div ref={containerRef} className="workspace-scroll">
        <DataTable columns={tableColumns} data={paginatedUsers} loading={loading} emptyMessage="No users found" />
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        totalItems={filteredUsers.length}
        pageSizeOptions={[10, 25, 50]}
        onPageSizeChange={(newSize) => {
          setCustomPageSize(newSize)
          setCurrentPage(1)
        }}
        className=""
      />
      </section>
      )}
    </div>
  )
}
export default function UserManagement() {
  return (
    <AdminGuard>
      <UserManagementContent />
    </AdminGuard>
  )
}
