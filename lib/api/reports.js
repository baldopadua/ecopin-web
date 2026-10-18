import { rateLimitedFetch } from '../rateLimiter.js'
import { supabase } from '../supabase.js'
import { readSessionKey, triggerSessionExpired } from '../auth-token.mjs'
import { reportDiagnostic } from '../diagnostics.mjs';



export async function fetchPublicReports({ throwOnError = false } = {}) {
  // If an active session is available in the browser, query the staff reports endpoint
  // so officers and crew can see all reports, including manual_review and pending items.
  const token = typeof window !== 'undefined' ? readSessionKey() : null;
  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  if (token && API_BASE_URL) {
    try {
      let allStaffReports = [];
      let page = 1;
      const limit = 500;
      while (page <= 5) {
        const response = await rateLimitedFetch(`${API_BASE_URL}/api/reports?page=${page}&limit=${limit}`, {
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        });
        if (response.status === 401) {
          triggerSessionExpired();
          break;
        }
        if (!response.ok) {
          break;
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          allStaffReports = [...allStaffReports, ...data];
          const hasMore = response.headers.get('x-has-more') === 'true';
          if (!hasMore || data.length < limit) break;
        } else {
          break;
        }
        page++;
      }
      if (allStaffReports.length > 0) {
        return allStaffReports.filter(report =>
          !(report.on_private_property && report.property_owner_consent_status === 'denied')
        );
      }
    } catch (staffError) {
      reportDiagnostic('warn', 'reports', 'Staff reports fetch failed, falling back to public reports:', staffError);
    }
  }

  try {
    let allData = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('public_reports')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) {
        reportDiagnostic('error', 'reports', 'Failed to fetch reports from Supabase:', error)
        if (throwOnError) throw error;
        break;
      }

      allData = [...allData, ...data];

      if (data.length < pageSize) {
        break;
      }
      page++;
    }

    const filteredData = allData.filter(report =>
      report.validation_status !== 'rejected' &&
      !(report.on_private_property && report.property_owner_consent_status === 'denied')
    );

    return filteredData;
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error fetching reports:', error)
    if (throwOnError) throw error;
    return []
  }
}

export async function fetchValidatedReports(filters = {}) {
  try {
    const allReports = await fetchPublicReports()
    let filtered = allReports

    // Apply validation status filter
    if (filters.validationStatus && filters.validationStatus !== 'all') {
      const target = filters.validationStatus.toLowerCase()
      filtered = filtered.filter(r => (r.validation_status || '').toLowerCase() === target)
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === filters.status)
    }

    // Apply issue type filter
    if (filters.issueType && filters.issueType !== 'all') {
      filtered = filtered.filter(r => r.issue_type === filters.issueType)
    }

    // Apply stage filter
    if (filters.stage && filters.stage !== 'all') {
      filtered = filtered.filter(r => r.stage === filters.stage)
    }

    // Apply date range filter
    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime()
      filtered = filtered.filter(r => new Date(r.created_at).getTime() >= start)
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime()
      filtered = filtered.filter(r => new Date(r.created_at).getTime() <= end)
    }

    return filtered
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error fetching validated reports:', error)
    return []
  }
}

export async function fetchReportById(reportId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/reports/${reportId}`, {
      headers
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      return null
    }

    if (response.ok) {
      return await response.json()
    }
  } catch (backendError) {
    reportDiagnostic('warn', 'reports', 'Backend fetch failed, falling back to public reports:', backendError)
  }

  try {
    const { data, error } = await supabase
      .from('public_reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle()

    if (error) {
      reportDiagnostic('error', 'reports', 'Failed to fetch report by ID:', error)
      return null
    }

    return data
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error fetching report by ID:', error)
    return null
  }
}

export async function fetchReportsByIds(reportIds) {
  try {
    const { data, error } = await supabase
      .from('public_reports')
      .select('*')
      .in('id', reportIds)

    if (error) {
      reportDiagnostic('error', 'reports', 'Failed to fetch reports by IDs:', error)
      throw error
    }

    // Filter out rejected and denied reports
    const filteredData = (data || []).filter(report =>
      report.validation_status !== 'rejected' &&
      !(report.on_private_property && report.property_owner_consent_status === 'denied')
    )

    return filteredData
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error fetching reports by IDs:', error)
    throw error
  }
}

export const evidenceCache = new Map()

export function clearEvidenceCache() {
  evidenceCache.clear()
}

if (typeof window !== 'undefined') {
  window.addEventListener('ecopin-session-changed', () => {
    evidenceCache.clear()
  })
  window.addEventListener('session-expired', () => {
    evidenceCache.clear()
  })
}

export function getCachedEvidence(reportId) {
  if (reportId == null) return undefined
  return evidenceCache.get(String(reportId))
}

export function setCachedEvidence(reportId, items) {
  if (reportId == null) return
  evidenceCache.set(String(reportId), items || [])
}

export function hasCachedEvidence(reportId) {
  if (reportId == null) return false
  return evidenceCache.has(String(reportId))
}

export async function fetchReportEvidence(reportId, signal) {
  if (!reportId) return []
  const strId = String(reportId)
  if (evidenceCache.has(strId)) {
    return evidenceCache.get(strId) || []
  }

  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = typeof window !== 'undefined' ? readSessionKey() : null

    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/reports/${strId}/evidence`, {
      headers,
      signal
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      return []
    }

    if (!response.ok) {
      reportDiagnostic('error', 'reports', 'Failed to fetch evidence from backend:', response.status)
      return []
    }

    const data = await response.json()
    evidenceCache.set(strId, data || [])
    return data || []
  } catch (error) {
    if (error?.name === 'AbortError') return evidenceCache.get(strId) || []
    reportDiagnostic('error', 'reports', 'Error fetching report evidence:', error)
    return []
  }
}

export async function fetchBatchReportEvidence(reportIds, signal, { throwOnError = false } = {}) {
  if (!Array.isArray(reportIds) || reportIds.length === 0) return {}

  const missingIds = reportIds.filter(id => id != null && !evidenceCache.has(String(id)))
  if (missingIds.length === 0) {
    const cached = {}
    for (const id of reportIds) {
      cached[id] = evidenceCache.get(String(id)) || []
    }
    return cached
  }

  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = typeof window !== 'undefined' ? readSessionKey() : null

    const headers = {
      'Content-Type': 'application/json'
    }


    const response = await rateLimitedFetch(`${API_BASE_URL}/api/reports/batch-evidence`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reportIds: missingIds }),
      signal
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      if (throwOnError) throw new Error('Your session expired. Sign in again to view evidence.')
      return {}
    }

    if (!response.ok) {
      reportDiagnostic('error', 'reports', 'Failed to fetch batch evidence from backend:', response.status)
      if (throwOnError) throw new Error('Evidence could not load. Please try again.')
      const fallback = {}
      for (const id of reportIds) {
        fallback[id] = evidenceCache.get(String(id)) || []
      }
      return fallback
    }

    const data = await response.json()
    for (const [id, items] of Object.entries(data || {})) {
      evidenceCache.set(String(id), items)
    }

    const results = {}
    for (const id of reportIds) {
      results[id] = evidenceCache.get(String(id)) || []
    }
    return results
  } catch (error) {
    if (error?.name === 'AbortError') {
      const fallback = {}
      for (const id of reportIds) {
        fallback[id] = evidenceCache.get(String(id)) || []
      }
      return fallback
    }
    if (throwOnError) throw error
    reportDiagnostic('error', 'reports', 'Error fetching batch report evidence:', error)
    const fallback = {}
    for (const id of reportIds) {
      fallback[id] = evidenceCache.get(String(id)) || []
    }
    return fallback
  }
}




export function formatPostgrestSearch(term) {
  if (typeof term !== 'string' || !term.trim()) return '';
  const escaped = term
    .trim()
    .toLowerCase()
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
  return `"%${escaped}%"`;
}

export async function fetchFilteredReports(filters = {}) {
  try {
    const allReports = await fetchPublicReports()
    let filtered = allReports

    // Apply search filter
    if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase()
      filtered = filtered.filter(r =>
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q))
      )
    }

    // Apply type filter
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(r => r.issue_type === filters.type)
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === filters.status)
    }

    // Apply validation filter
    if (filters.validation && filters.validation !== 'all') {
      const target = filters.validation.toLowerCase()
      filtered = filtered.filter(r => (r.validation_status || '').toLowerCase() === target)
    }

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return filtered
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error fetching filtered reports:', error)
    return []
  }
}

export async function fetchIssueTypes() {
  try {
    const { data, error } = await supabase
      .from('public_reports')
      .select('issue_type')
      .not('issue_type', 'is', null)

    if (error) {
      reportDiagnostic('error', 'reports', 'Failed to fetch issue types:', error)
      return []
    }

    // Get unique issue types
    const uniqueTypes = [...new Set(data.map(item => item.issue_type))]
    return uniqueTypes
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error fetching issue types:', error)
    return []
  }
}

export async function updateReportStatus(reportId, status) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/reports/${reportId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status })
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'reports', 'Failed to update report status:', errorData)
      throw new Error(errorData.message || 'Failed to update report status')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error updating report status:', error)
    throw error
  }
}

export async function updateReportValidation(reportId, validationStatus) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/reports/${reportId}/validation`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ validation_status: validationStatus })
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'reports', 'Failed to update report validation:', errorData)
      throw new Error(errorData.message || 'Failed to update report validation')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error updating report validation:', error)
    throw error
  }
}

export async function fetchReportsByClusterId(clusterId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/reports/cluster/${clusterId}`, {
      headers
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'reports', 'Failed to fetch reports by cluster:', errorData)
      throw new Error(errorData.message || 'Failed to fetch reports by cluster')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error fetching reports by cluster:', error)
    throw error
  }
}

export async function batchCompleteReportsByCluster(clusterId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/reports/cluster/${clusterId}/complete`, {
      method: 'PATCH',
      headers
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'reports', 'Failed to batch complete reports:', errorData)
      throw new Error(errorData.message || 'Failed to batch complete reports')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error batch completing reports:', error)
    throw error
  }
}

export async function updatePropertyOwnerConsent(reportId, consentStatus) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL


    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/reports/${reportId}/property-owner-consent`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ consent_status: consentStatus })
    })

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'reports', 'Failed to update property owner consent:', errorData)
      throw new Error(errorData.message || 'Failed to update property owner consent')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error updating property owner consent:', error)
    throw error
  }
}

export async function updateLifecycleStage(reportId, lifecycleStage) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/reports/${reportId}/lifecycle`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ stage: lifecycleStage })
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      // If endpoint doesn't exist (404), throw a more specific error
      if (response.status === 404) {
        throw new Error('Lifecycle stage update endpoint not yet implemented in backend')
      }
      const errorData = await response.json()
      reportDiagnostic('error', 'reports', 'Failed to update lifecycle stage:', errorData)
      throw new Error(errorData.message || 'Failed to update lifecycle stage')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error updating lifecycle stage:', error)
    throw error
  }
}

export async function acknowledgeComplaint(reportId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/reports/${reportId}/acknowledge`, {
      method: 'POST',
      headers
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      // If endpoint doesn't exist (404), throw a more specific error
      if (response.status === 404) {
        throw new Error('Acknowledge complaint endpoint not yet implemented in backend')
      }
      const errorData = await response.json()
      reportDiagnostic('error', 'reports', 'Failed to acknowledge complaint:', errorData)
      throw new Error(errorData.message || 'Failed to acknowledge complaint')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error acknowledging complaint:', error)
    throw error
  }
}

export async function logAgencyResponse(reportId, actionData) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/reports/${reportId}/agency-response`, {
      method: 'POST',
      headers,
      body: JSON.stringify(actionData)
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      // If endpoint doesn't exist (404), throw a more specific error
      if (response.status === 404) {
        throw new Error('Log agency response endpoint not yet implemented in backend')
      }
      const errorData = await response.json()
      reportDiagnostic('error', 'reports', 'Failed to log agency response:', errorData)
      throw new Error(errorData.message || 'Failed to log agency response')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error logging agency response:', error)
    throw error
  }
}

export async function fetchAgencyResponses(reportId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/reports/${reportId}/agency-responses`, {
      headers
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      return []
    }

    if (!response.ok) {
      // If endpoint doesn't exist (404), return empty array instead of throwing error
      if (response.status === 404) {
        return []
      }
      const errorData = await response.json()
      reportDiagnostic('error', 'reports', 'Failed to fetch agency responses:', errorData)
      throw new Error(errorData.message || 'Failed to fetch agency responses')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error fetching agency responses:', error)
    // Return empty array on network errors to prevent UI breakage
    return []
  }
}

export async function lguResolveReport(reportId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL


    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/reports/${reportId}/resolve`, {
      method: 'PATCH',
      headers
    })

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'reports', 'Failed to resolve report:', errorData)
      throw new Error(errorData.message || 'Failed to resolve report')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error resolving report:', error)
    throw error
  }
}

export async function updateReportDetails(reportId, details) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }


    const response = await rateLimitedFetch(`${API_BASE_URL}/api/reports/${reportId}/details`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(details)
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to update report details')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error updating report details:', error)
    throw error
  }
}

