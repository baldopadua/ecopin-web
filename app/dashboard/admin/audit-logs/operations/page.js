'use client'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import {AdminGuard} from '@/components/auth/RequireRole'
import OperationalTimeline from '@/components/reports/OperationalTimeline'
export default function OperationalAuditPage(){return <AdminGuard><div className="workspace-page workspace-page--flow">
 <PageHeader title="Operational events" subtitle="Discrete milestones and responsible accounts; earlier activity is not reconstructed." breadcrumbs={[{label:'Admin',href:'/dashboard/admin'},{label:'Audit logs',href:'/dashboard/admin/audit-logs'},{label:'Operational events'}]} />
 <Link href="/dashboard/operations-summary" className="btn-secondary w-fit">Print operations summary</Link>
 <OperationalTimeline />
</div></AdminGuard>}
