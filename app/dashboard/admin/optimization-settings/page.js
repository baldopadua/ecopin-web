import { redirect } from 'next/navigation'

export default function OptimizationSettingsRedirect() {
  redirect('/dashboard/admin/settings?tab=fleet')
}
