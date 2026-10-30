import { redirect } from 'next/navigation'

export default function SystemLogsRedirect() {
  redirect('/dashboard/admin/audit-logs?tab=system')
}
