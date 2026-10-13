import ExplorePage from './ExplorePage'
import { Suspense } from 'react'

export const metadata = {
  title: 'Explore Pasig | EcoPin',
  description: 'Explore reviewed environmental reports across Pasig in map or gallery mode.',
}

export default function ExploreRoute() {
  return <Suspense fallback={<p role="status">Loading Explore…</p>}><ExplorePage /></Suspense>
}
