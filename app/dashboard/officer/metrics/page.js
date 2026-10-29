import { Suspense } from 'react'
import MetricsWorkspace from './MetricsWorkspace'

export default function MetricsPage() {
  return <Suspense fallback={<p role="status">Loading metrics…</p>}><MetricsWorkspace /></Suspense>
}
