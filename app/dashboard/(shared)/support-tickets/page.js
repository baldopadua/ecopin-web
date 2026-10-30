'use client'
import PageHeader from '@/components/layout/PageHeader'
import { RequireRole } from '@/components/auth/RequireRole'
import SupportTicketQueue from '@/components/support/SupportTicketQueue'

export default function SupportTicketsPage() {
  return <RequireRole allowedRoles={['officer','admin']}>
    <div className="workspace-page workspace-page--flow">
      <PageHeader title="Support tickets" subtitle="Answer citizen questions about their reports. Replies appear in the citizen's EcoPin app." />
      <SupportTicketQueue />
    </div>
  </RequireRole>
}
