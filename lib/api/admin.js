import { rateLimitedFetch } from '../rateLimiter.js'
import { reportDiagnostic } from '../diagnostics.mjs';


export async function getSystemStats() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL


    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/admin/stats`, {
      headers
    })

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'admin', 'Failed to fetch system stats:', errorData)
      throw new Error(errorData.message || 'Failed to fetch system stats')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error fetching system stats:', error)
    throw error
  }
}

export async function getAllUsers(params = {}) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL


    const headers = {
      'Content-Type': 'application/json'
    }



    // Only include non-empty params
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== '' && value != null)
    )
    const queryString = new URLSearchParams(filteredParams).toString()
    const url = `${API_BASE_URL}/api/admin/users${queryString ? `?${queryString}` : ''}`


    const response = await rateLimitedFetch(url, {
      headers
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = {}
      }
      const errorMessage =
        errorData?.message ||
        errorData?.error ||
        errorText ||
        `Failed to fetch users (${response.status})`
      reportDiagnostic('error', 'admin', 'Failed to fetch users:', { errorData, errorText, status: response.status })
      throw new Error(errorMessage)
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error fetching users:', error)
    throw error
  }
}

export async function createUser(userData) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL


    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(userData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'admin', 'Failed to create user:', errorData)
      throw new Error(errorData.message || 'Failed to create user')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error creating user:', error)
    throw error
  }
}

export async function updateUserRole(userId, role) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL


    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ role })
    })

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'admin', 'Failed to update user role:', errorData)
      throw new Error(errorData.message || 'Failed to update user role')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error updating user role:', error)
    throw error
  }
}

export async function deleteUser(userId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL


    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData = {}
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        reportDiagnostic('error', 'admin', 'Failed to parse error response:', errorText)
      }
      reportDiagnostic('error', 'admin', `Failed to delete user (Status: ${response.status}):`, errorText, errorData)
      throw new Error(errorData.message || errorData.error || 'Failed to delete user')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error deleting user:', error)
    throw error
  }
}

export async function changeUserPassword(userId, password) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL


    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/admin/users/${userId}/password`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ password })
    })

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'admin', 'Failed to change user password:', errorData)
      throw new Error(errorData.message || 'Failed to change user password')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error changing user password:', error)
    throw error
  }
}

export async function getSystemSettings() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL


    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/admin/settings`, {
      headers
    })

    if (!response.ok) {
      // Return default settings instead of throwing error
      return {
        password_min_length: 8,
        password_require_uppercase: true,
        password_require_lowercase: true,
        password_require_numbers: true,
        password_require_special_chars: true,
        session_timeout_minutes: 60,
        daily_report_quota: 10,
        cms: {}
      }
    }

    const data = await response.json()
    return data
  } catch (error) {
    // Return default settings on any error
    return {
      password_min_length: 8,
      password_require_uppercase: true,
      password_require_lowercase: true,
      password_require_numbers: true,
      password_require_special_chars: true,
      session_timeout_minutes: 60,
      daily_report_quota: 10,
      cms: {}
    }
  }
}

export async function updateSystemSettings(settings) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

    const headers = {
      'Content-Type': 'application/json'
    }

    const response = await rateLimitedFetch(`${API_BASE_URL}/api/admin/settings`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(settings)
    })

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'admin', 'Failed to update system settings:', errorData)
      throw new Error(errorData.message || 'Failed to update system settings')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error updating system settings:', error)
    throw error
  }
}

export async function getPublicCmsSettings() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const response = await rateLimitedFetch(`${API_BASE_URL}/api/contact/settings`, {
      headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    reportDiagnostic('warn', 'cms', 'Failed to fetch public CMS settings:', error)
    return null
  }
}

export async function uploadCmsMediaFile(file, fieldKey = 'media') {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fieldKey', fieldKey)

    const response = await rateLimitedFetch(`${API_BASE_URL}/api/admin/settings/cms/upload`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to upload media file')
    }

    return await response.json()
  } catch (error) {
    reportDiagnostic('error', 'settings', error)
    throw error
  }
}

export async function getSystemLogs(params = {}) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL


    const headers = {
      'Content-Type': 'application/json'
    }



    const queryString = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/api/admin/system-logs${queryString ? `?${queryString}` : ''}`

    const response = await rateLimitedFetch(url, {
      headers
    })

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'admin', 'Failed to fetch system logs:', errorData)
      throw new Error(errorData.message || 'Failed to fetch system logs')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error fetching system logs:', error)
    throw error
  }
}

export async function getAuditLogs(params = {}) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL


    const headers = {
      'Content-Type': 'application/json'
    }



    const queryString = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/api/admin/audit-logs${queryString ? `?${queryString}` : ''}`

    const response = await rateLimitedFetch(url, {
      headers
    })

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'admin', 'Failed to fetch audit logs:', errorData)
      throw new Error(errorData.message || 'Failed to fetch audit logs')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error fetching audit logs:', error)
    throw error
  }
}

export async function getAuditArchiveStatus(params = {}) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const headers = { 'Content-Type': 'application/json' }
    const queryString = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/api/admin/audit-logs/archive-status${queryString ? `?${queryString}` : ''}`

    const response = await rateLimitedFetch(url, { headers })
    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'admin', 'Failed to fetch audit archive status:', errorData)
      throw new Error(errorData.message || 'Failed to fetch audit archive status')
    }
    return await response.json()
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error fetching audit archive status:', error)
    throw error
  }
}

export async function executeAuditArchive(payload = {}) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const headers = { 'Content-Type': 'application/json' }
    const url = `${API_BASE_URL}/api/admin/audit-logs/archive`

    const response = await rateLimitedFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'admin', 'Failed to execute audit archive:', errorData)
      throw new Error(errorData.message || 'Failed to execute audit archive')
    }
    return await response.json()
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error executing audit archive:', error)
    throw error
  }
}

export async function getResponseLogs(params = {}) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL


    const headers = {
      'Content-Type': 'application/json'
    }



    const queryString = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/api/response-logs${queryString ? `?${queryString}` : ''}`

    const response = await rateLimitedFetch(url, {
      headers
    })

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'admin', 'Failed to fetch response logs:', errorData)
      throw new Error(errorData.message || 'Failed to fetch response logs')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error fetching response logs:', error)
    throw error
  }
}

export async function getDisasterRecoveryStatus() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const headers = { 'Content-Type': 'application/json' }
    const url = `${API_BASE_URL}/api/admin/disaster-recovery/status`

    const response = await rateLimitedFetch(url, { headers })
    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'admin', 'Failed to fetch DR status:', errorData)
      throw new Error(errorData.message || 'Failed to fetch disaster recovery status')
    }
    return await response.json()
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error fetching DR status:', error)
    throw error
  }
}

export async function verifyStorageReplication(bucketName = null) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const headers = { 'Content-Type': 'application/json' }
    const url = `${API_BASE_URL}/api/admin/disaster-recovery/verify-replication`

    const response = await rateLimitedFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(bucketName ? { bucket_name: bucketName } : {})
    })
    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'admin', 'Failed to verify storage replication:', errorData)
      throw new Error(errorData.message || 'Failed to verify storage replication')
    }
    return await response.json()
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error verifying storage replication:', error)
    throw error
  }
}

export async function executeDisasterRecoveryDrill(payload = {}) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const headers = { 'Content-Type': 'application/json' }
    const url = `${API_BASE_URL}/api/admin/disaster-recovery/drill`

    const response = await rateLimitedFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'admin', 'Failed to execute recovery drill:', errorData)
      throw new Error(errorData.message || 'Failed to execute recovery drill')
    }
    return await response.json()
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error executing recovery drill:', error)
    throw error
  }
}

export async function getApmMonitoringStatus() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const headers = { 'Content-Type': 'application/json' }
    const url = `${API_BASE_URL}/api/admin/infrastructure/apm-status`

    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      reportDiagnostic('error', 'admin', 'Failed to fetch APM status:', errorData)
      throw new Error(errorData.message || 'Failed to fetch APM status')
    }
    return await response.json()
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error fetching APM status:', error)
    throw error
  }
}

export async function triggerApmTestAlert(payload = {}) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const headers = { 'Content-Type': 'application/json' }
    const url = `${API_BASE_URL}/api/admin/infrastructure/test-apm-alert`

    const response = await rateLimitedFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      reportDiagnostic('error', 'admin', 'Failed to trigger APM test alert:', errorData)
      throw new Error(errorData.message || 'Failed to trigger APM test alert')
    }
    return await response.json()
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error triggering APM test alert:', error)
    throw error
  }
}

export async function getEnvironmentAuditReport() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const headers = { 'Content-Type': 'application/json' }
    const url = `${API_BASE_URL}/api/admin/infrastructure/environment-audit`

    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      reportDiagnostic('error', 'admin', 'Failed to fetch environment audit report:', errorData)
      throw new Error(errorData.message || 'Failed to fetch environment audit report')
    }
    return await response.json()
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error fetching environment audit report:', error)
    throw error
  }
}

export async function verifyPreviewIsolation(payload = {}) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const headers = { 'Content-Type': 'application/json' }
    const url = `${API_BASE_URL}/api/admin/infrastructure/verify-preview-isolation`

    const response = await rateLimitedFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      reportDiagnostic('error', 'admin', 'Failed to verify preview isolation:', errorData)
      throw new Error(errorData.message || 'Failed to verify preview isolation')
    }
    return await response.json()
  } catch (error) {
    reportDiagnostic('error', 'admin', 'Error verifying preview isolation:', error)
    throw error
  }
}



