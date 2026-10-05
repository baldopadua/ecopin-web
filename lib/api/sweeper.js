import { rateLimitedFetch } from '../rateLimiter.js'
import { triggerSessionExpired } from '@/components/auth/SessionProvider'

export async function fetchSweeperMetrics(dateRange = {}, region) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const queryParams = new URLSearchParams()
    if (dateRange.start) queryParams.append('startDate', dateRange.start.toISOString())
    if (dateRange.end) queryParams.append('endDate', dateRange.end.toISOString())
    if (region) queryParams.append('region', region)

    const response = await rateLimitedFetch(`${API_BASE_URL}/api/sweeper/analytics/metrics?${queryParams.toString()}`, {
      headers
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to fetch sweeper metrics:', errorData)
      throw new Error(errorData.message || 'Failed to fetch sweeper metrics')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching sweeper metrics:', error)
    throw error
  }
}

export async function exportSweeperMetrics(dateRange = {}, region) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {}

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const queryParams = new URLSearchParams()
    if (dateRange.start) queryParams.append('startDate', dateRange.start.toISOString())
    if (dateRange.end) queryParams.append('endDate', dateRange.end.toISOString())
    if (region) queryParams.append('region', region)

    const response = await fetch(`${API_BASE_URL}/api/sweeper/analytics/export?${queryParams.toString()}`, {
      headers
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      throw new Error('Failed to export sweeper metrics')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = `sweeper_analytics_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting sweeper metrics:', error)
    throw error
  }
}

export async function fetchSweeperConfig() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await rateLimitedFetch(`${API_BASE_URL}/api/sweeper/config`, { headers })
    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }
    if (!response.ok) throw new Error('Failed to fetch sweeper configuration')
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching sweeper config:', error)
    throw error
  }
}

export async function updateSlaThreshold(hours) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await rateLimitedFetch(`${API_BASE_URL}/api/sweeper/config/sla-threshold`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ hours })
    })
    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }
    if (!response.ok) throw new Error('Failed to update SLA threshold')
    
    return await response.json()
  } catch (error) {
    console.error('Error updating SLA threshold:', error)
    throw error
  }
}

export async function updateShiftDuration(hours) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await rateLimitedFetch(`${API_BASE_URL}/api/sweeper/config/shift-duration`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ hours })
    })
    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }
    if (!response.ok) throw new Error('Failed to update shift duration')
    
    return await response.json()
  } catch (error) {
    console.error('Error updating shift duration:', error)
    throw error
  }
}

export async function updateWorkTime(reportType, minutes) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await rateLimitedFetch(`${API_BASE_URL}/api/sweeper/config/work-time`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ reportType, minutes })
    })
    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }
    if (!response.ok) throw new Error('Failed to update work time')
    
    return await response.json()
  } catch (error) {
    console.error('Error updating work time:', error)
    throw error
  }
}
