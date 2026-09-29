'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '../auth/UserContext'
import { OfficerGuard, FieldCrewGuard } from '../auth/RequireRole'
import { useTask } from '../context/TaskContext'
import {
    LayoutDashboard,
    Map,
    Target,
    Wrench,
    Database,
    Terminal,
    Activity,
    Scan,
    Users,
    Settings,
    ScrollText,
    ChevronLeft,
    ChevronRight,
    Route,
    CloudLightning
} from 'lucide-react'

const citizenNavigation = [
    { name: 'Command Center', href: '/dashboard/citizen', icon: LayoutDashboard },
    { name: 'Map Grid', href: '/dashboard/map-grid', icon: Map },
    { name: 'Raw Data', href: '/dashboard/raw-data', icon: Database },
]

const officerNavigation = [
    { name: 'Command Center', href: '/dashboard/officer', icon: LayoutDashboard },
    { name: 'Map Grid', href: '/dashboard/officer/map-grid', icon: Map },
    { name: 'Hotzone Intel', href: '/dashboard/officer/hotzone-intel', icon: Target },
    { name: 'Operations', href: '/dashboard/officer/operations', icon: Wrench },
    { name: 'Optimization', href: '/dashboard/officer/optimization', icon: CloudLightning },
    { name: 'Reports', href: '/dashboard/officer/reports', icon: Database },
    { name: 'Metrics', href: '/dashboard/officer/metrics', icon: Activity },
    { name: 'Spatial Scan', href: '/dashboard/spatial-scan', icon: Scan },
]

const fieldCrewNavigation = [
    { name: 'My Route', href: '/dashboard/field-crew/my-route', icon: Route },
    { name: 'Command Center', href: '/dashboard/field-crew', icon: LayoutDashboard },
    { name: 'Map Grid', href: '/dashboard/map-grid', icon: Map },
    { name: 'Operations', href: '/dashboard/field-crew/tasks', icon: Wrench },
    { name: 'Raw Data', href: '/dashboard/field-crew/raw-data', icon: Database },
]

const adminNavigation = [
    { name: 'Command Center', href: '/dashboard/admin', icon: LayoutDashboard },
    { name: 'Users', href: '/dashboard/admin/users', icon: Users },
    { name: 'System', href: '/dashboard/admin/settings', icon: Settings },
    { name: 'Optimization', href: '/dashboard/admin/optimization-settings', icon: Route },
    { name: 'Sys Logs', href: '/dashboard/admin/sys-logs', icon: Terminal },
    { name: 'Audit Logs', href: '/dashboard/admin/audit-logs', icon: ScrollText },
    { name: 'Spatial Scan', href: '/dashboard/spatial-scan', icon: Scan },
]

export default function Sidebar() {
    const pathname = usePathname()
    const user = useUser()
    const { isOptimizing } = useTask()
    const [isCollapsed, setIsCollapsed] = useState(false)

    const renderNavItems = (navigation) => {
        return navigation.map((item) => {
            const isRootPath = ['/dashboard/field-crew', '/dashboard/admin', '/dashboard/officer', '/dashboard/citizen'].includes(item.href);
            const isActive = isRootPath ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
                <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-2 border-transparent ${isActive
                        ? 'bg-primary text-white border-[#1a1a1a] dark:border-white font-bold'
                        : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary hover:border-border'
                        } ${isCollapsed ? 'justify-center px-2' : ''}`}
                    title={isCollapsed ? item.name : undefined}
                >
                    {Icon && item.name === 'Optimization' && isOptimizing ? (
                        <svg className="animate-spin w-5 h-5 min-w-[20px] min-h-[20px] text-primary" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : Icon ? (
                        <Icon className={`w-5 h-5 min-w-[20px] min-h-[20px] ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                    ) : null}
                    {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                </Link>
            );
        });
    }

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-surface-elevated border-r-2 border-border h-screen flex flex-col transition-all duration-300 z-50`}>

            {/* Logo */}
            <div className={`p-6 border-b-2 border-border flex items-center h-[77px] ${isCollapsed ? 'justify-center px-2' : 'justify-between'}`}>
                {!isCollapsed && (
                    <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
                        <img src="/Full Logo Light.png" alt="EcoPin" className="h-8 md:h-10 w-auto dark:hidden" />
                        <img src="/Full Logo Dark.png" alt="EcoPin" className="h-8 md:h-10 w-auto hidden dark:block" />
                    </Link>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1.5 border-2 border-transparent hover:border-border hover:bg-surface-elevated text-text-secondary transition-colors rounded"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                {/* Admin Navigation */}
                {user?.role === 'admin' && renderNavItems(adminNavigation)}

                {/* Officer Navigation */}
                {user?.role === 'officer' && renderNavItems(officerNavigation)}

                {/* Field Crew Navigation */}
                {user?.role === 'field_crew' && renderNavItems(fieldCrewNavigation)}

                {/* Citizen Navigation */}
                {user?.role === 'citizen' && renderNavItems(citizenNavigation)}
            </nav>

            {/* User Info */}
            <div className="p-4 border-t-2 border-border">
                <Link
                    href="/dashboard/profile"
                    className={`flex items-center mb-1 hover:bg-surface-elevated hover:text-text-primary p-2 border-2 border-transparent hover:border-border transition-colors rounded ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                    title={isCollapsed ? (user?.full_name || user?.email || 'User') : undefined}
                >
                    <div className="flex items-center gap-3 w-full">
                        {user?.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt="Avatar"
                                className="w-8 h-8 object-cover min-w-[32px] min-h-[32px] border-2 border-[#1a1a1a] dark:border-white"
                            />
                        ) : (
                            <div className="w-8 h-8 bg-[#1a1a1a] dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-sm min-w-[32px] min-h-[32px] border-2 border-[#1a1a1a] dark:border-white">
                                {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                            </div>
                        )}
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-text-primary">
                                    {user?.full_name || user?.email || 'User'}
                                </p>
                            </div>
                        )}
                    </div>
                </Link>
            </div>
        </aside>
    )
}
