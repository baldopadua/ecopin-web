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
    { name: 'Command Center', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Map Grid', href: '/dashboard/map-grid', icon: Map },
    { name: 'Raw Data', href: '/dashboard/raw-data', icon: Database },
]

const officerNavigation = [
    { name: 'Command Center', href: '/dashboard/officer', icon: LayoutDashboard },
    { name: 'Map Grid', href: '/dashboard/officer/map-grid', icon: Map },
    { name: 'Hotzone Intel', href: '/dashboard/officer/hotzone-intel', icon: Target },
    { name: 'Operations', href: '/dashboard/officer/operations', icon: Wrench },
    { name: 'Optimization', href: '/dashboard/officer/optimization', icon: CloudLightning },
    { name: 'Crew Management', href: '/dashboard/officer/crew-management', icon: Users },
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
    { name: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
    { name: 'Users', href: '/dashboard/admin/users', icon: Users },
    { name: 'System', href: '/dashboard/admin/settings', icon: Settings },
    { name: 'Optimization', href: '/dashboard/admin/optimization-settings', icon: Route },
    { name: 'Audit Logs', href: '/dashboard/admin/audit-logs', icon: ScrollText },
    { name: 'System Logs', href: '/dashboard/admin/sys-logs', icon: Terminal },
]

export default function Sidebar() {
    const pathname = usePathname()
    const user = useUser()
    const { isOptimizing } = useTask()
    const [isCollapsed, setIsCollapsed] = useState(false)

    const renderNavItems = (navigation) => {
        return navigation.map((item) => {
            const isRootPath = ['/dashboard/field-crew', '/dashboard/admin', '/dashboard/officer', '/dashboard'].includes(item.href);
            const isActive = isRootPath ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
                <div key={item.name} className="relative w-full flex">
                    <Link
                        href={item.href}
                        className={`sidebar-item flex-1 flex items-center gap-4 text-sm transition-all duration-300 w-full mb-1 ${
                            isActive
                                ? 'sidebar-item-active font-semibold'
                                : 'text-white/70 hover:text-white font-medium hover:bg-surface/10'
                        } ${isCollapsed ? 'justify-center pl-0 pr-4 py-4' : 'px-4 py-3'}`}
                        title={isCollapsed ? item.name : undefined}
                    >
                        {Icon && item.name === 'Optimization' && isOptimizing ? (
                            <svg className={`animate-spin w-5 h-5 shrink-0 ${isActive ? 'text-primary' : 'text-white/70 group-hover:text-white'}`} viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : Icon ? (
                            <Icon className={`w-[22px] h-[22px] shrink-0 transition-transform duration-300 ${isActive ? 'stroke-[2.5px] text-primary scale-110' : 'stroke-[2px] group-hover:scale-110 text-white/70 group-hover:text-white'}`} />
                        ) : null}
                        {!isCollapsed && <span className="whitespace-nowrap tracking-wide">{item.name}</span>}
                    </Link>
                </div>
            );
        });
    }

    return (
        <aside className={`${isCollapsed ? 'w-24' : 'w-72'} bg-primary h-screen flex flex-col transition-all duration-300 z-50 relative`}>

            {/* Logo */}
            <div className={`p-6 flex items-center h-[88px] ${isCollapsed ? 'justify-center px-2' : 'justify-between pl-8'}`}>
                {!isCollapsed && (
                    <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
                        <img src="/Full Logo Dark.png" alt="EcoPin" className="h-8 md:h-10 w-auto" />
                    </Link>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-surface/10"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 space-y-2 overflow-y-auto scrollbar-hide flex flex-col relative w-full pr-0 pl-4">
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
            <div className={`mt-auto ${isCollapsed ? 'p-4' : 'p-6'}`}>
                <Link
                    href="/dashboard/profile"
                    className={`flex items-center hover:bg-surface/10 transition-colors rounded-2xl border border-white/10 ${isCollapsed ? 'p-2 justify-center' : 'p-3 justify-between'}`}
                    title={isCollapsed ? (user?.full_name || user?.email || 'User') : undefined}
                >
                    <div className={`flex items-center w-full ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                        {user?.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt="Avatar"
                                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full object-cover shadow-sm border border-white/20 shrink-0"
                            />
                        ) : (
                            <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-surface text-primary flex items-center justify-center font-bold text-sm shadow-sm border border-white/20 shrink-0">
                                {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                            </div>
                        )}
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate text-white">
                                    {user?.full_name || user?.email || 'User'}
                                </p>
                                <p className="text-xs text-white/70 capitalize">
                                    {user?.role?.replace('_', ' ')}
                                </p>
                            </div>
                        )}
                    </div>
                </Link>
            </div>
        </aside>
    )
}
