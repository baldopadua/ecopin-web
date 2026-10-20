import { rateLimitedFetch } from '../rateLimiter.js'
import { readSessionKey, triggerSessionExpired } from '../auth-token.mjs'
import { reportDiagnostic } from '../diagnostics.mjs';

import { backendFetch as fetch } from '../backend-fetch.mjs';



export async function fetchCleanupTasks(assignedToMe = false, limit = 500) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }



    const url = new URL(`${API_BASE_URL}/api/cleanup-tasks`)
    if (assignedToMe) {
      url.searchParams.append('assigned_to_me', 'true')
    }
    if (limit) {
      url.searchParams.append('limit', String(limit))
    }

    const response = await rateLimitedFetch(url.toString(), {
      headers,
      cache: 'no-store'
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'dispatch', 'Failed to fetch cleanup tasks:', errorData)
      throw new Error(errorData.message || 'Failed to fetch cleanup tasks')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error fetching cleanup tasks:', error)
    throw error
  }
}

export async function fetchCleanupTaskById(taskId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/cleanup-tasks/${taskId}`, {
      headers
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'dispatch', 'Failed to fetch cleanup task:', errorData)
      throw new Error(errorData.message || 'Failed to fetch cleanup task')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error fetching cleanup task:', error)
    throw error
  }
}

export async function createCleanupTask(taskData) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/cleanup-tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(taskData)
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'dispatch', 'Failed to create cleanup task:', errorData)
      throw new Error(errorData.message || 'Failed to create cleanup task')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error creating cleanup task:', error)
    throw error
  }
}

export async function createCustomCleanupTask(taskData) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/cleanup-tasks/custom`, {
      method: 'POST',
      headers,
      body: JSON.stringify(taskData)
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      let errorMessage = 'Failed to create custom cleanup task'
      let errorData = null
      try {
        const text = await response.text()
        try {
          errorData = JSON.parse(text)
          errorMessage = errorData.message || errorData.error || text || errorMessage
        } catch {
          errorMessage = text || `HTTP ${response.status} ${response.statusText}`
          errorData = { raw: text }
        }
      } catch (readErr) {
        errorMessage = `HTTP ${response.status} ${response.statusText}`
      }
      reportDiagnostic('error', 'dispatch', `Failed to create custom cleanup task (${response.status})`)
      const err = new Error(errorMessage)
      err.status = response.status
      err.data = errorData
      throw err
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error creating custom cleanup task:', error)
    throw error
  }
}

export async function uploadCleanupPhoto(taskId, photoType, file) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const formData = new FormData()
    formData.append('image', file)
    formData.append('photo_type', photoType)

    const headers = {}



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/cleanup-tasks/${taskId}/photo`, {
      method: 'POST',
      headers,
      body: formData
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'dispatch', 'Failed to upload cleanup photo:', errorData)
      throw new Error(errorData.message || 'Failed to upload cleanup photo')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error uploading cleanup photo:', error)
    throw error
  }
}

export async function markCleanupTaskComplete(taskId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/cleanup-tasks/${taskId}/complete`, {
      method: 'PATCH',
      headers
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'dispatch', 'Failed to mark task complete:', errorData)
      throw new Error(errorData.message || 'Failed to mark task complete')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error marking task complete:', error)
    throw error
  }
}

export async function fetchAvailableCrew() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }



    const response = await rateLimitedFetch(`${API_BASE_URL}/api/cleanup-tasks/available-crew`, {
      headers
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'dispatch', 'Failed to fetch available crew:', errorData)
      throw new Error(errorData.message || 'Failed to fetch available crew')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error fetching available crew:', error)
    throw error
  }
}

export async function assignCleanupTask(taskId, crewId) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }



    const targetCrewId = Array.isArray(crewId) ? (crewId.length > 0 ? crewId[0] : null) : crewId

    const response = await rateLimitedFetch(`${API_BASE_URL}/api/cleanup-tasks/${taskId}/assign`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ crew_id: targetCrewId, assigned_field_crew_id: targetCrewId })
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json()
      reportDiagnostic('error', 'dispatch', 'Failed to assign cleanup task:', errorData)
      throw new Error(errorData.message || 'Failed to assign cleanup task')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error assigning cleanup task:', error)
    throw error
  }
}

export async function updateCleanupTaskTitle(taskId, title) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

    const response = await fetch(`${API_BASE_URL}/api/cleanup-tasks/${taskId}/title`, {
      method: 'PATCH',
      headers: {

        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to update task title')
    }

    return await response.json()
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error updating task title:', error)
    throw error
  }
}

export async function fetchDispatchBlocks() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const response = await rateLimitedFetch(`${API_BASE_URL}/api/optimization/blocks`, {
      headers: {
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      return []
    }

    return await response.json()
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error fetching dispatch blocks:', error)
    return []
  }
}

export async function updateCleanupTaskStatus(taskId, status) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const token = readSessionKey()

    const headers = {
      'Content-Type': 'application/json'
    }

    const response = await rateLimitedFetch(`${API_BASE_URL}/api/cleanup-tasks/${taskId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status })
    })

    if (response.status === 401) {
      if (token) triggerSessionExpired()
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      reportDiagnostic('error', 'dispatch', 'Failed to update cleanup task status:', errorData)
      throw new Error(errorData.message || errorData.error || 'Failed to update cleanup task status')
    }

    const data = await response.json()
    return data
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error updating cleanup task status:', error)
    throw error
  }
}
