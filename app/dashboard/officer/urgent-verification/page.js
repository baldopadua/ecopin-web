'use client'
import PageHeader from '@/components/layout/PageHeader'
import { RequireRole } from '@/components/auth/RequireRole'
import UrgencyQueue from '@/components/reports/UrgencyQueue'

export default function UrgentVerificationPage() {
  return <RequireRole allowedRoles={['officer','admin']}>
    <div className="workspace-page workspace-page--flow">
      <PageHeader title="Urgent verification" subtitle="Verify citizen urgency requests and prepare an immediate dispatch plan for approved incidents." />
      <UrgencyQueue />
    </div>
  </RequireRole>
}

