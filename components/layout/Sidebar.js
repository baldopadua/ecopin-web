'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '../auth/UserContext'
import { OfficerGuard, FieldCrewGuard } from '../auth/RequireRole'
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
    Route
} from 'lucide-react'

const citizenNavigation = [
    { name: 'Command Center', href: '/dashboard/citizen', icon: LayoutDashboard },
    { name: 'Map Grid', href: '/dashboard/map-grid', icon: Map },
    { name: 'Raw Data', href: '/dashboard/raw-data', icon: Database },
]

const officerNavigation = [
    { name: 'Command Center', href: '/dashboard/officer', icon: LayoutDashboard },
    { name: 'Map Grid', href: '/dashboard/map-grid', icon: Map },
    { name: 'Hotzone Intel', href: '/dashboard/officer/hotzone-intel', icon: Target },
    { name: 'Operations', href: '/dashboard/officer/operations', icon: Wrench },
    { name: 'Optimization', href: '/dashboard/officer/optimization', icon: Route },
    { name: 'Raw Data', href: '/dashboard/raw-data', icon: Database },
    { name: 'Sys Logs', href: '/dashboard/officer/sys-logs', icon: Terminal },
    { name: 'Metrics', href: '/dashboard/officer/metrics', icon: Activity },
    { name: 'Spatial Scan', href: '/dashboard/spatial-scan', icon: Scan },
]

const fieldCrewNavigation = [
    { name: 'Command Center', href: '/dashboard/field-crew', icon: LayoutDashboard },
    { name: 'Map Grid', href: '/dashboard/map-grid', icon: Map },
    { name: 'Operations', href: '/dashboard/field-crew/tasks', icon: Wrench },
    { name: 'Raw Data', href: '/dashboard/raw-data', icon: Database },
]

const adminNavigation = [
    { name: 'Command Center', href: '/dashboard/admin', icon: LayoutDashboard },
    { name: 'Users', href: '/dashboard/admin/users', icon: Users },
    { name: 'System', href: '/dashboard/admin/settings', icon: Settings },
    { name: 'Optimization', href: '/dashboard/admin/optimization-settings', icon: Route },
    { name: 'Audit Logs', href: '/dashboard/admin/audit-logs', icon: ScrollText },
    { name: 'Spatial Scan', href: '/dashboard/spatial-scan', icon: Scan },
]

export default function Sidebar() {
    const pathname = usePathname()
    const user = useUser()
    const [isCollapsed, setIsCollapsed] = useState(false)

    const renderNavItems = (navigation) => {
        return navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
                <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-2 border-transparent ${isActive
                        ? 'bg-[#ccff00] text-black border-[#1a1a1a] dark:border-[#1a1a1a] font-bold'
                        : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary hover:border-border'
                        } ${isCollapsed ? 'justify-center px-2' : ''}`}
                    title={isCollapsed ? item.name : undefined}
                >
                    {Icon && (
                        <Icon className={`w-5 h-5 min-w-[20px] min-h-[20px] ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                    )}
                    {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                </Link>
            );
        });
    }

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-[#141414] border-r-2 border-[#1a1a1a] dark:border-[#333333] h-screen flex flex-col transition-all duration-300 z-50`}>

            {/* Logo */}
            <div className={`p-6 border-b-2 border-[#1a1a1a] dark:border-[#333333] flex items-center h-[77px] ${isCollapsed ? 'justify-center px-2' : 'justify-between'}`}>
                {!isCollapsed && (
                    <Link href="/" className="text-2xl font-black tracking-tighter text-black dark:text-white hover:opacity-80 transition-opacity">
                        ECOPIN<span className="text-[#3300FF]">.AI</span>
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
            <div className="p-4 border-t-2 border-[#1a1a1a] dark:border-[#333333]">
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
