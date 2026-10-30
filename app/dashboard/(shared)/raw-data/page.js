import { redirect } from 'next/navigation'

export default async function RawDataRedirect({ searchParams }) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of [value].flat()) if (item != null) params.append(key, item)
  }
  const query = params.toString()
  redirect(`/dashboard/officer/reports${query ? `?${query}` : ''}`)
}
