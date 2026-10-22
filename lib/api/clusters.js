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
  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
  const token = typeof window !== 'undefined' ? readSessionKey() : null

  if (API_BASE_URL) {
    try {
      const headers = {
        'Content-Type': 'application/json'
      }

      const response = await rateLimitedFetch(`${API_BASE_URL}/api/clusters/${clusterId}`, {
        headers
      })

      if (response.status === 401) {
        if (token) triggerSessionExpired()
      } else if (response.ok) {
        const data = await response.json()
        if (data) return data
      } else {
        const errorData = await response.json().catch(() => ({}))
        reportDiagnostic('warn', 'other', 'Backend fetchClusterById returned error, falling back to Supabase:', errorData)
      }
    } catch (err) {
      reportDiagnostic('warn', 'other', 'Backend fetchClusterById endpoint failed, falling back to Supabase:', err)
    }
  }

  // Resilient fallback: direct database query from Supabase
  try {
    const { data: clusterData, error: clusterError } = await supabase
      .from('clusters')
      .select('*')
      .eq('id', clusterId)
      .single()

    if (clusterError) {
      reportDiagnostic('error', 'other', 'Failed to fetch cluster from Supabase:', clusterError)
      throw clusterError
    }

    // Query constituent reports for this cluster (public_reports view is accessible to all client roles)
    const { data: reportsData } = await supabase
      .from('public_reports')
      .select('*')
      .eq('cluster_id', clusterId)

    return {
      ...clusterData,
      reports: reportsData || []
    }
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
