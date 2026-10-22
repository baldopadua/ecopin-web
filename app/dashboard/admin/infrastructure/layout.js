import { redirect } from 'next/navigation'

export default function InfrastructureLayout() {
  // Hidden until infrastructure metrics are backed by verified provider data.
  redirect('/dashboard/admin')
}
