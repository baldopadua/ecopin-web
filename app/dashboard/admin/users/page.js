'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'
import { getAllUsers, updateUserRole, deleteUser } from '@/lib/api'

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

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800'
      case 'lgu':
        return 'bg-blue-100 text-blue-800'
      case 'citizen':
      default:
        return 'bg-gray-100 text-gray-800'
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
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full p-3 border border-border rounded-lg bg-surface text-text-primary"
            />
          </div>
          <div className="min-w-[150px]">
            <select
              value={filters.role}
              onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
              className="w-full p-3 border border-border rounded-lg bg-surface text-text-primary"
            >
              <option value="">All Roles</option>
              <option value="citizen">Citizen</option>
              <option value="lgu">LGU</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        {loading ? (
          <p className="text-text-muted">Loading users...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : users.length === 0 ? (
          <p className="text-text-muted">No users found</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
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
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={updatingRole === user.id}
                          className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(user.role)} ${updatingRole === user.id ? 'opacity-50' : ''}`}
                        >
                          <option value="citizen">Citizen</option>
                          <option value="lgu">LGU</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-sm text-text-muted">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={deletingUser === user.id}
                          className="text-red-500 hover:text-red-700 text-sm disabled:opacity-50"
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
