import { rateLimitedFetch } from '../rateLimiter.js'
import { readSessionKey, triggerSessionExpired } from '../auth-token.mjs'
import { supabase } from '../supabase.js'
import { reportDiagnostic } from '../diagnostics.mjs';

import { backendFetch as fetch } from '../backend-fetch.mjs';



export async function fetchClusters({ throwOnError = false } = {}) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = typeof window !== 'undefined' ? readSessionKey() : null

    if (token && API_BASE_URL) {
      try {
        const headers = {
          'Content-Type': 'application/json',

        }

        const response = await rateLimitedFetch(`${API_BASE_URL}/api/clusters`, {
          headers
        })

        if (response.status === 401) {
          triggerSessionExpired()
        } else if (response.ok) {
          const data = await response.json()
          return data
        }
      } catch (err) {
        reportDiagnostic('warn', 'other', 'Backend cluster endpoint failed, falling back to Supabase:', err)
      }
    }

    // Direct database query for public map or when unauthenticated
    const { data, error } = await supabase
      .from('clusters')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      reportDiagnostic('error', 'other', 'Failed to fetch clusters from Supabase:', error)
      if (throwOnError) throw error
      return []
    }

    return data || []
  } catch (error) {
    reportDiagnostic('error', 'other', 'Error fetching clusters:', error)
    if (throwOnError) throw error
    return []
  }
}

export async function fetchClusterById(clusterId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
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
      reportDiagnostic('error', 'other', 'Failed to fetch cluster:', errorData)
      throw new Error(errorData.message || 'Failed to fetch cluster')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'other', 'Error fetching cluster:', error)
    throw error
  }
}

export async function updateClusterLabel(clusterId, label) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

    const response = await fetch(`${API_BASE_URL}/api/clusters/${clusterId}/label`, {
      method: 'PATCH',
      headers: {

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
    reportDiagnostic('error', 'other', 'Error updating cluster label:', error)
    throw error
  }
}

export async function generateClusters() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
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
      reportDiagnostic('error', 'other', 'Failed to generate clusters:', errorData)
      throw new Error(errorData.message || 'Failed to generate clusters')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'other', 'Error generating clusters:', error)
    throw error
  }
}
