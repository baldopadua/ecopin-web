import { triggerSessionExpired } from '@/components/auth/SessionProvider'

export async function fetchSatisfactionAnalytics() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/reports/analytics/satisfaction`, {
      headers
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to fetch satisfaction analytics:', errorData)
      throw new Error(errorData.message || 'Failed to fetch satisfaction analytics')
    }

    const data = await response.json()
    console.log('Satisfaction analytics fetched successfully:', data)
    return data
  } catch (error) {
    console.error('Error fetching satisfaction analytics:', error)
    throw error
  }
}
