'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '../auth/UserContext'
import { OfficerGuard, FieldCrewGuard } from '../auth/RequireRole'

const citizenNavigation = [
    { name: 'Dashboard', href: '/dashboard/citizen', icon: '/icons/dashboard.png' },
    { name: 'Map View', href: '/dashboard/map-view', icon: '/icons/map.png' },
    { name: 'Reports', href: '/dashboard/reports', icon: '/icons/reports.png' },
]

const officerNavigation = [
    { name: 'Dashboard', href: '/dashboard/officer', icon: '/icons/dashboard.png' },
    { name: 'Map View', href: '/dashboard/map-view', icon: '/icons/map.png' },
    { name: 'Clusters', href: '/dashboard/officer/clusters', icon: '/icons/cluster.png' },
    { name: 'Cleanup Tasks', href: '/dashboard/officer/cleanup-tasks', icon: '/icons/cleanup task.png' },
    { name: 'Reports', href: '/dashboard/reports', icon: '/icons/reports.png' },
    { name: 'Response Logs', href: '/dashboard/officer/response-logs', icon: '/icons/logs.png' },
    { name: 'Analytics', href: '/dashboard/officer/analytics', icon: '/icons/analytics.png' },
]

const fieldCrewNavigation = [
    { name: 'Dashboard', href: '/dashboard/field-crew', icon: '/icons/dashboard.png' },
    { name: 'Map View', href: '/dashboard/map-view', icon: '/icons/map.png' },
    { name: 'Tasks', href: '/dashboard/field-crew/tasks', icon: '/icons/cleanup task.png' },
    { name: 'Reports', href: '/dashboard/field-crew/reports', icon: '/icons/reports.png' },
]

const adminNavigation = [
    { name: 'Dashboard', href: '/dashboard/admin', icon: '/icons/dashboard.png' },
    { name: 'Users', href: '/dashboard/admin/users', icon: '/icons/users.png' },
    { name: 'System', href: '/dashboard/admin/settings', icon: '/icons/settings.png' },
    { name: 'Audit Logs', href: '/dashboard/admin/audit-logs', icon: '/icons/logs.png' },
]

export default function Sidebar() {
    const pathname = usePathname()
    const user = useUser()

    return (
        <aside className="w-64 bg-surface dark:bg-[#0a0f08] border-r border-border h-screen flex flex-col transition-colors duration-400">

            {/* Logo */}
            <div className="p-6 border-b border-border">
                <div className="text-xl font-bold text-text-primary">
                    EcoPin<span className="text-accent-green">.AI</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">

                {/* Admin Navigation */}
                {user?.role === 'admin' && adminNavigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                ? 'bg-primary text-white dark:text-black'
                                : 'text-text-secondary hover:bg-surface dark:hover:bg-white/5 hover:text-text-primary'
                                }`}
                        >
                            {item.icon && (
                                <img
                                    src={item.icon}
                                    alt={item.name}
                                    className={`w-5 h-5 sidebar-icon ${isActive ? 'brightness-0 invert dark:invert-0' : ''}`}
                                />
                            )}
                            {item.name}
                        </Link>
                    );
                })}

                {/* Officer Navigation */}
                {user?.role === 'officer' && officerNavigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                ? 'bg-primary text-white dark:text-black'
                                : 'text-text-secondary hover:bg-surface dark:hover:bg-white/5 hover:text-text-primary'
                                }`}
                        >
                            {item.icon && (
                                <img
                                    src={item.icon}
                                    alt={item.name}
                                    className={`w-5 h-5 sidebar-icon ${isActive ? 'brightness-0 invert dark:invert-0' : ''}`}
                                />
                            )}
                            {item.name}
                        </Link>
                    );
                })}

                {/* Field Crew Navigation */}
                {user?.role === 'field_crew' && fieldCrewNavigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                ? 'bg-primary text-white dark:text-black'
                                : 'text-text-secondary hover:bg-surface dark:hover:bg-white/5 hover:text-text-primary'
                                }`}
                        >
                            {item.icon && (
                                <img
                                    src={item.icon}
                                    alt={item.name}
                                    className={`w-5 h-5 sidebar-icon ${isActive ? 'brightness-0 invert dark:invert-0' : ''}`}
                                />
                            )}
                            {item.name}
                        </Link>
                    );
                })}

                {/* Citizen Navigation */}
                {user?.role === 'citizen' && citizenNavigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                ? 'bg-primary text-white dark:text-black'
                                : 'text-text-secondary hover:bg-surface dark:hover:bg-white/5 hover:text-text-primary'
                                }`}
                        >
                            {item.icon && (
                                <img
                                    src={item.icon}
                                    alt={item.name}
                                    className={`w-5 h-5 sidebar-icon ${isActive ? 'brightness-0 invert dark:invert-0' : ''}`}
                                />
                            )}
                            {item.name}
                        </Link>
                    );
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
                            <div className="w-8 h-8 rounded-full bg-primary text-white dark:text-black flex items-center justify-center font-bold text-sm">
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
            </div>
        </aside>
    )
}
