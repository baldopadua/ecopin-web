import { rateLimitedFetch } from '../rateLimiter.js'
import { handleResponse } from './optimization.js'

const base=()=>process.env.NEXT_PUBLIC_BACKEND_API_URL
export async function fetchUrgencyQueue(status='pending',{signal}={}) {
  const response=await rateLimitedFetch(`${base()}/api/reports/urgent-queue?status=${encodeURIComponent(status)}&limit=50`,{
    signal,cache:'no-store',headers:{'Content-Type':'application/json'},
  })
  return handleResponse(response,'Failed to load urgent verification queue')
}
export async function decideUrgency(id,payload,{signal}={}) {
  const response=await rateLimitedFetch(`${base()}/api/reports/${encodeURIComponent(id)}/urgency`,{
    method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),
  })
  return handleResponse(response,'Failed to save urgency decision')
}
