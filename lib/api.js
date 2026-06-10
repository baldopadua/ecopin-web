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
