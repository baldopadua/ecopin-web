import { rateLimitedFetch } from '../rateLimiter.js'
import { triggerSessionExpired } from '@/components/auth/SessionProvider'
import { supabase } from '../supabase.js'

export async function fetchClusters() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null

    if (token && API_BASE_URL) {
      try {
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }

        const response = await rateLimitedFetch(`${API_BASE_URL}/api/clusters`, {
          headers
        })

        if (response.status === 401) {
          triggerSessionExpired()
        } else if (response.ok) {
          const data = await response.json()
          console.log('Clusters fetched successfully from backend:', data)
          return data
        }
      } catch (err) {
        console.warn('Backend cluster endpoint failed, falling back to Supabase:', err)
      }
    }

    // Direct database query for public map or when unauthenticated
    const { data, error } = await supabase
      .from('clusters')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch clusters from Supabase:', error)
      return []
    }

    console.log('Clusters fetched successfully from Supabase:', data)
    return data || []
  } catch (error) {
    console.error('Error fetching clusters:', error)
    return []
  }
}

export async function fetchClusterById(clusterId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await rateLimitedFetch(`${API_BASE_URL}/api/clusters/${clusterId}`, {
      headers
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to fetch cluster:', errorData)
      throw new Error(errorData.message || 'Failed to fetch cluster')
    }

    const data = await response.json()
    console.log('Cluster fetched successfully:', data)
    return data
  } catch (error) {
    console.error('Error fetching cluster:', error)
    throw error
  }
}

export async function updateClusterLabel(clusterId, label) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')
    console.log("Sending payload:", { label })
    const response = await fetch(`${API_BASE_URL}/api/clusters/${clusterId}/label`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ label }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to update cluster label')
    }

    return await response.json()
  } catch (error) {
    console.error('Error updating cluster label:', error)
    throw error
  }
}

export async function generateClusters() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await rateLimitedFetch(`${API_BASE_URL}/api/clusters/trigger`, {
      method: 'POST',
      headers
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to generate clusters:', errorData)
      throw new Error(errorData.message || 'Failed to generate clusters')
    }

    const data = await response.json()
    console.log('Clusters generated successfully:', data)
    return data
  } catch (error) {
    console.error('Error generating clusters:', error)
    throw error
  }
}
