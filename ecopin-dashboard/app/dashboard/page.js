'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/auth')
      else setUser(data.user)
    })
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (!user) return <p>Loading...</p>
  return (
    <div style={{ padding: 32 }}>
      <h1>EcoPin LGU Dashboard</h1>
      <p>Logged in as: {user.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}