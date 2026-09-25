'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FieldCrewGuard } from '@/components/auth/RequireRole'

export default function OperationsIndexPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the tasks hub since there is no standalone operations dashboard
    router.replace('/dashboard/field-crew/tasks')
  }, [router])

  return (
    <FieldCrewGuard>
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-accent-green border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-text-muted">Redirecting to Tasks...</p>
        </div>
      </div>
    </FieldCrewGuard>
  )
}
