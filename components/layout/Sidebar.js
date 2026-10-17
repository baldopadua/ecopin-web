'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import SecureImage from '@/components/ui/SecureImage'
import { usePathname } from 'next/navigation'
import { useUser } from '../auth/UserContext'
import styles from './DashboardShell.module.css'
import { useTask } from '../context/TaskContext'
import {
    Menu,
    X,
    LayoutDashboard,
    Map,
    Target,
    ClipboardCheck,
    Wrench,
    Database,
    Terminal,
    Scan,
    Users,
    Settings,
    ChevronLeft,
    ChevronRight,
    Route,
    FileText,
    BarChart3,
    SlidersHorizontal,
    Truck,
    ShieldCheck,
    HardDrive,
    Loader2,
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
    { name: 'Operations', href: '/dashboard/officer/operations', icon: ClipboardCheck },
    { name: 'Optimization', href: '/dashboard/officer/optimization', icon: Route },
    { name: 'Crew Management', href: '/dashboard/officer/crew-management', icon: Users },
    { name: 'Reports', href: '/dashboard/officer/reports', icon: FileText },
    { name: 'Metrics', href: '/dashboard/officer/metrics', icon: BarChart3 },
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
    { name: 'Infrastructure', href: '/dashboard/admin/infrastructure', icon: HardDrive },
    { name: 'Optimization', href: '/dashboard/admin/optimization-settings', icon: SlidersHorizontal },
    { name: 'Sweeper Settings', href: '/dashboard/admin/sweeper-settings', icon: Truck },
    { name: 'Audit Logs', href: '/dashboard/admin/audit-logs', icon: ShieldCheck },
    { name: 'System Logs', href: '/dashboard/admin/sys-logs', icon: Terminal },
]

export default function Sidebar() {
    const pathname = usePathname()
    const user = useUser()
    const { isOptimizing } = useTask()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const drawer = useRef(null)
    const menuButton = useRef(null)
    const navigation = user?.role === 'admin' ? adminNavigation
        : user?.role === 'officer' ? officerNavigation
        : user?.role === 'field_crew' ? fieldCrewNavigation : citizenNavigation

    const closeDrawer = () => drawer.current?.close()
    const openDrawer = () => { drawer.current?.showModal(); setDrawerOpen(true) }
    useEffect(() => {
        const desktop = matchMedia('(min-width: 1024px)')
        const closeOnDesktop = () => { if (desktop.matches) drawer.current?.close() }
        desktop.addEventListener('change', closeOnDesktop)
        return () => desktop.removeEventListener('change', closeOnDesktop)
    }, [])

    const content = (collapsed, mobile = false) => <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
        <div className={styles.brand}>
            {!collapsed && <Link href="/" aria-label="EcoPin home" onClick={mobile ? closeDrawer : undefined}>
                <Image src="/Full Logo Light.png" width={112} height={32} alt="EcoPin" style={{ width: 'auto', height: 32 }} className="dark:brightness-0 dark:invert" />
            </Link>}
            <button type="button" className={styles.iconButton}
                aria-label={mobile ? 'Close navigation' : collapsed ? 'Expand navigation' : 'Collapse navigation'}
                aria-expanded={mobile ? undefined : !collapsed}
                onClick={mobile ? closeDrawer : () => setIsCollapsed(value => !value)}>
                {mobile ? <X aria-hidden="true" size={20} strokeWidth={1.75} /> : collapsed ? <ChevronRight aria-hidden="true" size={20} strokeWidth={1.75} /> : <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.75} />}
            </button>
        </div>
        <nav aria-label="Workspace" className={styles.navigation}>
            {navigation.map(item => {
                const root = ['/dashboard/field-crew', '/dashboard/admin', '/dashboard/officer', '/dashboard'].includes(item.href)
                const active = root ? pathname === item.href : pathname.startsWith(`${item.href}/`) || pathname === item.href
                const isOpt = item.name === 'Optimization' && isOptimizing
                const Icon = isOpt ? Loader2 : item.icon
                return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
                    aria-label={collapsed ? item.name : undefined} title={collapsed ? item.name : undefined}
                    onClick={mobile ? closeDrawer : undefined} className={`${styles.navLink} ${active ? styles.active : ''}`}>
                    <Icon aria-hidden="true" size={20} strokeWidth={1.75} className={isOpt ? 'animate-spin' : ''} />
                    {!collapsed && <span>{item.name}</span>}
                    {isOpt && <span className="sr-only">Planning in progress</span>}
                </Link>
            })}
        </nav>
        <div className={styles.account}>
            <Link href="/dashboard/profile" className={styles.profile} onClick={mobile ? closeDrawer : undefined}
                aria-label={collapsed ? `Profile for ${user?.full_name || user?.email || 'your account'}` : undefined}>
                {user?.avatar_url ? <SecureImage src={user.avatar_url} alt="" className={styles.avatar} />
                    : <span aria-hidden="true" className={styles.avatar}>{user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}</span>}
                {!collapsed && <span className={styles.identity}>{user?.full_name || user?.email || 'Your account'}
                    <small>{user?.role?.replaceAll('_', ' ')}</small></span>}
            </Link>
        </div>
    </aside>

    return <>
        <div className={styles.desktopSidebar}>{content(isCollapsed)}</div>
        <div className={styles.mobileBar}>
            <Link href="/" aria-label="EcoPin home"><Image src="/Full Logo Light.png" width={112} height={32} alt="EcoPin" style={{ width: 'auto', height: 28 }} className="dark:brightness-0 dark:invert" /></Link>
            <button ref={menuButton} type="button" className={styles.iconButton} aria-label="Open navigation"
                aria-expanded={drawerOpen} aria-controls="workspace-drawer" onClick={openDrawer}><Menu size={24} strokeWidth={1.75} aria-hidden="true" /></button>
        </div>
        <dialog ref={drawer} id="workspace-drawer" className={styles.drawer} aria-label="Workspace navigation"
            onClick={event => { if (event.target === event.currentTarget) closeDrawer() }}
            onClose={() => { setDrawerOpen(false); if (menuButton.current?.getClientRects().length) menuButton.current.focus() }}>
            {content(false, true)}
        </dialog>
    </>
}
