import { supabase } from './supabase.js'
import { triggerSessionExpired } from '@/components/auth/SessionProvider'

export async function fetchPublicReports() {
  try {
    console.log('Fetching reports from Supabase directly')
    const { data, error } = await supabase
      .from('reports_view')
      .select('*')

    if (error) {
      console.error('Failed to fetch reports from Supabase:', error)
      return []
    }

    console.log('Reports data:', data)
    return data
  } catch (error) {
    console.error('Error fetching reports:', error)
    return []
  }
}

export async function fetchValidatedReports(filters = {}) {
  try {
    let query = supabase
      .from('reports_view')
      .select('*')

    // Apply validation status filter
    if (filters.validationStatus && filters.validationStatus !== 'all') {
      if (filters.validationStatus === 'validated') {
        // Include both validated and automatically_valid
        query = query.in('validation_status', ['validated', 'automatically_valid'])
      } else {
        query = query.eq('validation_status', filters.validationStatus)
      }
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    // Apply issue type filter
    if (filters.issueType && filters.issueType !== 'all') {
      query = query.eq('issue_type', filters.issueType)
    }

    // Apply stage filter
    if (filters.stage && filters.stage !== 'all') {
      query = query.eq('stage', filters.stage)
    }

    // Apply date range filter
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch validated reports:', error)
      return []
    }

    return data
  } catch (error) {
    console.error('Error fetching validated reports:', error)
    return []
  }
}

export async function fetchReportById(reportId) {
  try {
    const { data, error } = await supabase
      .from('reports_view')
      .select('*, profiles(full_name, data_consent)')
      .eq('id', reportId)
      .single()

    if (error) {
      console.error('Failed to fetch report by ID:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching report by ID:', error)
    return null
  }
}

export async function fetchReportsByIds(reportIds) {
  try {
    const { data, error } = await supabase
      .from('reports_view')
      .select('*')
      .in('id', reportIds)

    if (error) {
      console.error('Failed to fetch reports by IDs:', error)
      throw error
    }

    // Filter out rejected and denied reports
    const filteredData = (data || []).filter(report => 
      report.validation_status !== 'rejected' && 
      !(report.on_private_property && report.property_owner_consent_status === 'denied')
    )

    return filteredData
  } catch (error) {
    console.error('Error fetching reports by IDs:', error)
    throw error
  }
}

export async function fetchReportEvidence(reportId, signal) {
  try {
    console.log('Fetching evidence for report:', reportId)
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/evidence`, {
      headers,
      signal
    })

    if (response.status === 401) {
      triggerSessionExpired()
      return []
    }

    if (!response.ok) {
      console.error('Failed to fetch evidence from backend:', response.status)
      return []
    }

    const data = await response.json()
    console.log('Evidence data from backend:', data)
    return data
  } catch (error) {
    console.error('Error fetching report evidence:', error)
    return []
  }
}

export async function fetchFilteredReports(filters = {}) {
  try {
    let query = supabase
      .from('reports_view')
      .select('*')

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    }

    // Apply type filter
    if (filters.type && filters.type !== 'all') {
      query = query.eq('issue_type', filters.type)
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    // Apply validation filter
    if (filters.validation && filters.validation !== 'all') {
      query = query.eq('validation_status', filters.validation)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch filtered reports:', error)
      return []
    }

    return data
  } catch (error) {
    console.error('Error fetching filtered reports:', error)
    return []
  }
}

export async function fetchIssueTypes() {
  try {
    const { data, error } = await supabase
      .from('reports_view')
      .select('issue_type')
      .not('issue_type', 'is', null)

    if (error) {
      console.error('Failed to fetch issue types:', error)
      return []
    }

    // Get unique issue types
    const uniqueTypes = [...new Set(data.map(item => item.issue_type))]
    return uniqueTypes
  } catch (error) {
    console.error('Error fetching issue types:', error)
    return []
  }
}

export async function updateReportStatus(reportId, status) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status })
    })

    if (response.status === 401) {
      triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to update report status:', errorData)
      throw new Error(errorData.message || 'Failed to update report status')
    }

    const data = await response.json()
    console.log('Report status updated successfully:', data)
    return data
  } catch (error) {
    console.error('Error updating report status:', error)
    throw error
  }
}

export async function updateReportValidation(reportId, validationStatus) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/validation`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ validation_status: validationStatus })
    })

    if (response.status === 401) {
      triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to update report validation:', errorData)
      throw new Error(errorData.message || 'Failed to update report validation')
    }

    const data = await response.json()
    console.log('Report validation updated successfully:', data)
    return data
  } catch (error) {
    console.error('Error updating report validation:', error)
    throw error
  }
}

export async function fetchClusters() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/clusters`, {
      headers
    })

    if (response.status === 401) {
      triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to fetch clusters:', errorData)
      throw new Error(errorData.message || 'Failed to fetch clusters')
    }

    const data = await response.json()
    console.log('Clusters fetched successfully:', data)
    return data
  } catch (error) {
    console.error('Error fetching clusters:', error)
    throw error
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

    const response = await fetch(`${API_BASE_URL}/api/clusters/${clusterId}`, {
      headers
    })

    if (response.status === 401) {
      triggerSessionExpired()
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

export async function fetchCleanupTasks() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/cleanup-tasks`, {
      headers
    })

    if (response.status === 401) {
      triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to fetch cleanup tasks:', errorData)
      throw new Error(errorData.message || 'Failed to fetch cleanup tasks')
    }

    const data = await response.json()
    console.log('Cleanup tasks fetched successfully:', data)
    return data
  } catch (error) {
    console.error('Error fetching cleanup tasks:', error)
    throw error
  }
}

export async function fetchCleanupTaskById(taskId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/cleanup-tasks/${taskId}`, {
      headers
    })

    if (response.status === 401) {
      triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to fetch cleanup task:', errorData)
      throw new Error(errorData.message || 'Failed to fetch cleanup task')
    }

    const data = await response.json()
    console.log('Cleanup task fetched successfully:', data)
    return data
  } catch (error) {
    console.error('Error fetching cleanup task:', error)
    throw error
  }
}

export async function createCleanupTask(taskData) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/cleanup-tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(taskData)
    })

    if (response.status === 401) {
      triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to create cleanup task:', errorData)
      throw new Error(errorData.message || 'Failed to create cleanup task')
    }

    const data = await response.json()
    console.log('Cleanup task created successfully:', data)
    return data
  } catch (error) {
    console.error('Error creating cleanup task:', error)
    throw error
  }
}

export async function createCustomCleanupTask(taskData) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/cleanup-tasks/custom`, {
      method: 'POST',
      headers,
      body: JSON.stringify(taskData)
    })

    if (response.status === 401) {
      triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to create custom cleanup task:', errorData)
      throw new Error(errorData.message || 'Failed to create custom cleanup task')
    }

    const data = await response.json()
    console.log('Custom cleanup task created successfully:', data)
    return data
  } catch (error) {
    console.error('Error creating custom cleanup task:', error)
    throw error
  }
}

export async function uploadCleanupPhoto(taskId, photoType, file) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const formData = new FormData()
    formData.append('image', file)
    formData.append('photo_type', photoType)

    const headers = {}

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/cleanup-tasks/${taskId}/photo`, {
      method: 'POST',
      headers,
      body: formData
    })

    if (response.status === 401) {
      triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to upload cleanup photo:', errorData)
      throw new Error(errorData.message || 'Failed to upload cleanup photo')
    }

    const data = await response.json()
    console.log('Cleanup photo uploaded successfully:', data)
    return data
  } catch (error) {
    console.error('Error uploading cleanup photo:', error)
    throw error
  }
}

export async function markCleanupTaskComplete(taskId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/cleanup-tasks/${taskId}/complete`, {
      method: 'PATCH',
      headers
    })

    if (response.status === 401) {
      triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to mark task complete:', errorData)
      throw new Error(errorData.message || 'Failed to mark task complete')
    }

    const data = await response.json()
    console.log('Task marked complete successfully:', data)
    return data
  } catch (error) {
    console.error('Error marking task complete:', error)
    throw error
  }
}

export async function fetchReportsByClusterId(clusterId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/reports/cluster/${clusterId}`, {
      headers
    })

    if (response.status === 401) {
      triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to fetch reports by cluster:', errorData)
      throw new Error(errorData.message || 'Failed to fetch reports by cluster')
    }

    const data = await response.json()
    console.log('Reports by cluster fetched successfully:', data)
    return data
  } catch (error) {
    console.error('Error fetching reports by cluster:', error)
    throw error
  }
}

export async function batchCompleteReportsByCluster(clusterId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/reports/cluster/${clusterId}/complete`, {
      method: 'PATCH',
      headers
    })

    if (response.status === 401) {
      triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to batch complete reports:', errorData)
      throw new Error(errorData.message || 'Failed to batch complete reports')
    }

    const data = await response.json()
    console.log('Reports batch completed successfully:', data)
    return data
  } catch (error) {
    console.error('Error batch completing reports:', error)
    throw error
  }
}

export async function updatePropertyOwnerConsent(reportId, consentStatus) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/property-owner-consent`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ consent_status: consentStatus })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to update property owner consent:', errorData)
      throw new Error(errorData.message || 'Failed to update property owner consent')
    }

    const data = await response.json()
    console.log('Property owner consent updated successfully:', data)
    return data
  } catch (error) {
    console.error('Error updating property owner consent:', error)
    throw error
  }
}

export async function updateLifecycleStage(reportId, lifecycleStage) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/lifecycle-stage`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ stage: lifecycleStage })
    })

    if (response.status === 401) {
      triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      // If endpoint doesn't exist (404), throw a more specific error
      if (response.status === 404) {
        console.log('Lifecycle stage endpoint not yet implemented')
        throw new Error('Lifecycle stage update endpoint not yet implemented in backend')
      }
      const errorData = await response.json()
      console.error('Failed to update lifecycle stage:', errorData)
      throw new Error(errorData.message || 'Failed to update lifecycle stage')
    }

    const data = await response.json()
    console.log('Lifecycle stage updated successfully:', data)
    return data
  } catch (error) {
    console.error('Error updating lifecycle stage:', error)
    throw error
  }
}

export async function acknowledgeComplaint(reportId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/acknowledge`, {
      method: 'POST',
      headers
    })

    if (response.status === 401) {
      triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      // If endpoint doesn't exist (404), throw a more specific error
      if (response.status === 404) {
        console.log('Acknowledge complaint endpoint not yet implemented')
        throw new Error('Acknowledge complaint endpoint not yet implemented in backend')
      }
      const errorData = await response.json()
      console.error('Failed to acknowledge complaint:', errorData)
      throw new Error(errorData.message || 'Failed to acknowledge complaint')
    }

    const data = await response.json()
    console.log('Complaint acknowledged successfully:', data)
    return data
  } catch (error) {
    console.error('Error acknowledging complaint:', error)
    throw error
  }
}

export async function logAgencyResponse(reportId, actionData) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/agency-response`, {
      method: 'POST',
      headers,
      body: JSON.stringify(actionData)
    })

    if (response.status === 401) {
      triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      // If endpoint doesn't exist (404), throw a more specific error
      if (response.status === 404) {
        console.log('Log agency response endpoint not yet implemented')
        throw new Error('Log agency response endpoint not yet implemented in backend')
      }
      const errorData = await response.json()
      console.error('Failed to log agency response:', errorData)
      throw new Error(errorData.message || 'Failed to log agency response')
    }

    const data = await response.json()
    console.log('Agency response logged successfully:', data)
    return data
  } catch (error) {
    console.error('Error logging agency response:', error)
    throw error
  }
}

export async function fetchAgencyResponses(reportId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/agency-responses`, {
      headers
    })

    if (response.status === 401) {
      triggerSessionExpired()
      return []
    }

    if (!response.ok) {
      // If endpoint doesn't exist (404), return empty array instead of throwing error
      if (response.status === 404) {
        console.log('Agency responses endpoint not yet implemented, returning empty array')
        return []
      }
      const errorData = await response.json()
      console.error('Failed to fetch agency responses:', errorData)
      throw new Error(errorData.message || 'Failed to fetch agency responses')
    }

    const data = await response.json()
    console.log('Agency responses fetched successfully:', data)
    return data
  } catch (error) {
    console.error('Error fetching agency responses:', error)
    // Return empty array on network errors to prevent UI breakage
    return []
  }
}

// Admin API functions
export async function getSystemStats() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
      headers
    })

    if (!response.ok) {
      console.log("Response: ", response);
      const errorData = await response.json()
      console.error('Failed to fetch system stats:', errorData)
      throw new Error(errorData.message || 'Failed to fetch system stats')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching system stats:', error)
    throw error
  }
}

export async function getAllUsers(params = {}) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const queryString = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/api/admin/users${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      headers
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to fetch users:', errorData)
      throw new Error(errorData.message || 'Failed to fetch users')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching users:', error)
    throw error
  }
}

export async function createUser(userData) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(userData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to create user:', errorData)
      throw new Error(errorData.message || 'Failed to create user')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

export async function updateUserRole(userId, role) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ role })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to update user role:', errorData)
      throw new Error(errorData.message || 'Failed to update user role')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error updating user role:', error)
    throw error
  }
}

export async function deleteUser(userId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to delete user:', errorData)
      throw new Error(errorData.message || 'Failed to delete user')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

export async function lguResolveReport(reportId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/resolve`, {
      method: 'PATCH',
      headers
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to resolve report:', errorData)
      throw new Error(errorData.message || 'Failed to resolve report')
    }

    const data = await response.json()
    console.log('Report resolved successfully:', data)
    return data
  } catch (error) {
    console.error('Error resolving report:', error)
    throw error
  }
}


export async function getSystemSettings() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/settings`, {
      headers
    })

    if (!response.ok) {
      // Return default settings instead of throwing error
      console.log('System settings endpoint returned', response.status, '- using defaults')
      return {
        password_min_length: 8,
        password_require_uppercase: true,
        password_require_lowercase: true,
        password_require_numbers: true,
        password_require_special_chars: true,
        session_timeout_minutes: 60
      }
    }

    const data = await response.json()
    return data
  } catch (error) {
    // Return default settings on any error
    console.log('Error fetching system settings - using defaults:', error.message)
    return {
      password_min_length: 8,
      password_require_uppercase: true,
      password_require_lowercase: true,
      password_require_numbers: true,
      password_require_special_chars: true,
      session_timeout_minutes: 60
    }
  }
}

export async function updateSystemSettings(settings) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/settings`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(settings)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to update system settings:', errorData)
      throw new Error(errorData.message || 'Failed to update system settings')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error updating system settings:', error)
    throw error
  }
}

export async function getAuditLogs(params = {}) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const queryString = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/api/admin/audit-logs${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      headers
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to fetch audit logs:', errorData)
      throw new Error(errorData.message || 'Failed to fetch audit logs')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    throw error
  }
}

export async function getResponseLogs(params = {}) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const queryString = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/api/response-logs${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      headers
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to fetch response logs:', errorData)
      throw new Error(errorData.message || 'Failed to fetch response logs')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching response logs:', error)
    throw error
  }
}

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
      triggerSessionExpired()
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
