import { redirect } from 'next/navigation'

export default function BarangayAnalyticsPage() {
  redirect('/dashboard/officer/metrics?tab=barangay')
}
