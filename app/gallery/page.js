import { redirect } from 'next/navigation'
import { exploreUrl } from '@/lib/explore-url.mjs'

export default async function GalleryRedirect({ searchParams }) {
  redirect(exploreUrl('gallery', await searchParams))
}