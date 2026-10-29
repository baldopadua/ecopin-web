'use client'
import { useQuery } from '@tanstack/react-query'
import { useUser } from '@/components/auth/UserContext'
import { fetchUrgencyQueue } from '@/lib/api/urgency'
import { DASHBOARD_QUERY_KEY } from '@/lib/dashboard-query-client.mjs'

export const URGENCY_QUERY_KEY=[...DASHBOARD_QUERY_KEY,'urgency']
export default function useUrgencyQueue(status='pending') {
  const user=useUser()
  return useQuery({queryKey:[...URGENCY_QUERY_KEY,status],
    queryFn:({signal})=>fetchUrgencyQueue(status,{signal}),
    enabled:['officer','admin'].includes(user?.role),
    staleTime:0,refetchInterval:5000,refetchIntervalInBackground:false,
  })
}
