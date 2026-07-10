import { supabase } from './supabase.js'

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
      .eq('validation_status', 'validated')
    
    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    
    // Apply issue type filter
    if (filters.issueType && filters.issueType !== 'all') {
      query = query.eq('issue_type', filters.issueType)
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
      .select('*, profiles(full_name)')
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

export async function fetchReportEvidence(reportId) {
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
      headers
    })
    
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

export async function createDisclosureRequest(reportId, requestedBy, requestType, requesterNotes) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/disclosure-requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ report_id: reportId, requested_by: requestedBy, request_type: requestType, requester_notes: requesterNotes })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to create disclosure request:', errorData)
      throw new Error(errorData.message || 'Failed to create disclosure request')
    }

    const data = await response.json()
    console.log('Disclosure request created successfully:', data)
    return data
  } catch (error) {
    console.error('Error creating disclosure request:', error)
    throw error
  }
}

export async function respondToDisclosureRequest(reportId, disclosureRequestId, status, reporterResponse) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/disclosure-requests/${disclosureRequestId}/respond`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status, reporter_response: reporterResponse })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to respond to disclosure request:', errorData)
      throw new Error(errorData.message || 'Failed to respond to disclosure request')
    }

    const data = await response.json()
    console.log('Disclosure request response submitted successfully:', data)
    return data
  } catch (error) {
    console.error('Error responding to disclosure request:', error)
    throw error
  }
}

export async function fetchDisclosureRequests(reportId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = localStorage.getItem('authToken')

    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/disclosure-requests`, {
      headers
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to fetch disclosure requests:', errorData)
      throw new Error(errorData.message || 'Failed to fetch disclosure requests')
    }

    const data = await response.json()
    console.log('Disclosure requests fetched successfully:', data)
    return data
  } catch (error) {
    console.error('Error fetching disclosure requests:', error)
    throw error
  }
}
