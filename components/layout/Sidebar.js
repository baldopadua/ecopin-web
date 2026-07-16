'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const citizenNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '/icons/dashboard.png' },
  { name: 'Map View', href: '/dashboard/map-view', icon: '/icons/map.png' },
  { name: 'Reports', href: '/dashboard/reports', icon: '/icons/reports.png' },
  { name: 'Profile', href: '/dashboard/profile' },
]

const lguNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '/icons/dashboard.png' },
  { name: 'Map View', href: '/dashboard/map-view', icon: '/icons/map.png' },
  { name: 'Clusters', href: '/dashboard/clusters', icon: '/icons/cluster.png' },
  { name: 'Cleanup Tasks', href: '/dashboard/cleanup-tasks', icon: '/icons/cleanup task.png' },
  { name: 'Reports', href: '/dashboard/reports', icon: '/icons/reports.png' },
  { name: 'Response Logs', href: '/dashboard/response-logs', icon: '/icons/logs.png' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: '/icons/analytics.png' },
]

const adminNavigation = [
  { name: 'Admin Dashboard', href: '/dashboard/admin', icon: '/icons/dashboard.png' },
  { name: 'User Management', href: '/dashboard/admin/users' },
  { name: 'System Settings', href: '/dashboard/admin/settings' },
  { name: 'Audit Logs', href: '/dashboard/admin/audit-logs', icon: '/icons/logs.png' },
]

export default function Sidebar({ user, onLogout }) {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-surface-elevated border-r border-border h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-text-primary">
          EcoPin
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {(user?.role === 'citizen' ? citizenNavigation : user?.role === 'admin' ? adminNavigation : lguNavigation).map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-accent-green text-white'
                  : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                }`}
            >
              {item.icon && (
                <img
                  src={item.icon}
                  alt={item.name}
                  className="w-5 h-5 sidebar-icon"
                />
              )}
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-border">
        <Link
          href="/dashboard/profile"
          className="flex items-center justify-between mb-3 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent-green flex items-center justify-center text-white font-bold">
                {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.full_name || user?.email || 'User'}
              </p>
            </div>
          </div>
        </Link>
        <button
          onClick={onLogout}
          className="w-full btn-secondary text-xs py-2"
        >
          Logout
        </button>
      </div>
    </aside>
  )
}
