import { redirect } from 'next/navigation'

export default async function PublicMapRedirect({ searchParams }) {
  const params = await searchParams
  const queryString = params ? new URLSearchParams(params).toString() : ''
  redirect(queryString ? `/?${queryString}` : '/')
}
