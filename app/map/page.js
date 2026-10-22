import { redirect } from 'next/navigation'
import { exploreUrl } from '@/lib/explore-url.mjs'

export default async function MapRedirect({ searchParams }) {
  redirect(exploreUrl('map', await searchParams))
}