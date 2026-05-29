'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const EcoPinMap = dynamic(
  () => import('@/components/map/EcoPinMap'),
  { ssr: false, loading: () => <div className="h-screen w-full bg-background" /> }
)

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

  if (!user) return <p className="text-center text-text-primary mt-8">Loading...</p>
  
  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Map as background */}
      <div className="absolute inset-0 z-0">
        <EcoPinMap />
      </div>
      
      {/* Dashboard overlay */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="card-glass max-w-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-text-primary">EcoPin Dashboard</h1>
              <p className="text-sm text-text-secondary">{user.email}</p>
            </div>
            <button 
              onClick={logout}
              className="btn-secondary text-xs py-1.5 px-3 ml-4"
            >
              Logout
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-surface rounded-lg border border-border">
              <p className="text-sm font-medium text-text-primary">Reports Overview</p>
              <p className="text-xs text-text-muted mt-1">View and manage environmental reports</p>
            </div>
            <div className="p-4 bg-surface rounded-lg border border-border">
              <p className="text-sm font-medium text-text-primary">Map Controls</p>
              <p className="text-xs text-text-muted mt-1">Filter and analyze map data</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}