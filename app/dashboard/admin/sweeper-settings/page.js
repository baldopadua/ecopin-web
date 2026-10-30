import { redirect } from 'next/navigation'

export default function SweeperSettingsRedirect() {
  redirect('/dashboard/admin/settings?tab=sweeper')
}
