import PublicLoadingState from '@/components/ui/PublicLoadingState'
import ExplorePage from './ExplorePage'
import { Suspense } from 'react'

export const metadata = {
  title: 'Explore Pasig | EcoPin',
  description: 'Explore reviewed environmental reports across Pasig in map or gallery mode.',
}

export default function ExploreRoute() {
  return <Suspense fallback={<PublicLoadingState label="Loading Explore…" fullScreen />}><ExplorePage /></Suspense>
}
