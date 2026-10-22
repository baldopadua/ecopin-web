import { rateLimitedFetch } from '../rateLimiter.js'
import { readSessionKey, triggerSessionExpired } from '../auth-token.mjs'
import { reportDiagnostic } from '../diagnostics.mjs';



export async function fetchSatisfactionAnalytics() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/reports/analytics/satisfaction`, {
      headers
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'analytics', 'Failed to fetch satisfaction analytics:', errorData)
      throw new Error(errorData.message || 'Failed to fetch satisfaction analytics')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'analytics', 'Error fetching satisfaction analytics:', error)
    throw error
  }
}

