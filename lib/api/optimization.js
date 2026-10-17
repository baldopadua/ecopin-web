import { rateLimitedFetch } from '../rateLimiter.js'
import { readSessionKey, triggerSessionExpired } from '../auth-token.mjs'
import { reportDiagnostic } from '../diagnostics.mjs';


const API_BASE = () => process.env.NEXT_PUBLIC_BACKEND_API_URL
const getHeaders = () => {
  const h = { 'Content-Type': 'application/json' }


  return h
}

export async function handleResponse(response, errorContext) {
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      const token = readSessionKey()
      if (token) triggerSessionExpired()
    }
    throw new Error('Session expired')
  }

  if (!response.ok) {
    let errorData = {}
    let rawText = ''
    try {
      if (typeof response.json === 'function') {
        errorData = await response.json()
      } else if (typeof response.text === 'function') {
        rawText = await response.text()
        errorData = JSON.parse(rawText)
      }
    } catch {
      try {
        if (typeof response.text === 'function') {
          rawText = await response.text()
          errorData = { message: rawText || response.statusText || 'Unknown error' }
        }
      } catch (_) {}
    }
    const message = errorData?.message || errorData?.error || errorData?.details || (typeof errorData === 'string' ? errorData : null) || (rawText?.trim() ? rawText.trim() : null) || errorContext
    reportDiagnostic('error', 'dispatch', `${errorContext}:`, message, errorData)

    if (response.status === 429) {
      const retryAfter = errorData.retryAfter || response.headers?.get?.('retry-after') || 'a few minutes'
      const rateLimitError = new Error(
        `Too many requests: The system is temporarily busy. Please wait ${retryAfter} before trying again.`
      )
      rateLimitError.status = 429
      rateLimitError.retryAfter = retryAfter
      rateLimitError.isRateLimited = true
      throw rateLimitError
    }

    const err = new Error(message)
    err.status = response.status
    err.data = errorData
    throw err
  }

  return response.json()
}

// ── Work Queue & Auto Planner (Phase 1-6) ────────────────────────────

export async function fetchWorkQueue(params = {}) {
  try {
    const query = new URLSearchParams(params).toString()
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/queue${query ? `?${query}` : ''}`, {
      headers: getHeaders(),
      cache: 'no-store'
    })
    return handleResponse(response, 'Failed to fetch work queue')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error fetching work queue:', error)
    throw error
  }
}

export async function prioritizeQueue() {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/queue/prioritize`, {
      method: 'POST',
      headers: getHeaders()
    })
    return handleResponse(response, 'Failed to prioritize queue')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error prioritizing queue:', error)
    throw error
  }
}

export async function generatePlan(settings = {}) {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/plan/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ settings })
    })
    return handleResponse(response, 'Failed to generate dispatch plan')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error generating dispatch plan:', error)
    throw error
  }
}

export async function getPlanJob(jobId) {
  const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/plan/jobs/${jobId}`, {
    headers: getHeaders(), cache: 'no-store'
  })
  return handleResponse(response, 'Failed to load planning job')
}

export async function getDispatchPlan(planId) {
  const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/plan/${planId}`, {
    headers: getHeaders(), cache: 'no-store'
  })
  return handleResponse(response, 'Failed to load dispatch plan')
}

export async function commitPlan(planId, params = {}) {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/plan/${planId}/commit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params)
    })
    return handleResponse(response, 'Failed to commit dispatch plan')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error committing dispatch plan:', error)
    throw error
  }
}

// ── Optimization Runs ─────────────────────────────────────────────────

export async function runOptimization(params = {}) {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/run`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params)
    })
    return handleResponse(response, 'Failed to run optimization')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error running optimization:', error)
    throw error
  }
}

export async function getOptimizationRuns() {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/runs`, {
      headers: getHeaders(),
      cache: 'no-store'
    })
    return handleResponse(response, 'Failed to fetch optimization runs')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error fetching optimization runs:', error)
    throw error
  }
}

export async function getOptimizationRunById(id) {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/runs/${id}`, {
      headers: getHeaders()
    })
    return handleResponse(response, 'Failed to fetch optimization run')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error fetching optimization run:', error)
    throw error
  }
}

export async function approveOptimization(id) {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/runs/${id}/approve`, {
      method: 'POST',
      headers: getHeaders()
    })
    return handleResponse(response, 'Failed to approve optimization')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error approving optimization:', error)
    throw error
  }
}

export async function discardOptimization(id) {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/runs/${id}/discard`, {
      method: 'POST',
      headers: getHeaders()
    })
    return handleResponse(response, 'Failed to discard optimization')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error discarding optimization:', error)
    throw error
  }
}

// ── Routes ────────────────────────────────────────────────────────────

export async function getActiveRoutes() {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/routes/active`, {
      headers: getHeaders(),
      cache: 'no-store'
    })
    return handleResponse(response, 'Failed to fetch active routes')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error fetching active routes:', error)
    throw error
  }
}

export async function getRouteById(routeId) {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/routes/${routeId}`, {
      headers: getHeaders()
    })
    return handleResponse(response, 'Failed to fetch route')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error fetching route:', error)
    throw error
  }
}

// ── Field Crews ───────────────────────────────────────────────────────

export async function getFieldCrews() {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/crews`, {
      headers: getHeaders(),
      cache: 'no-store'
    })
    return handleResponse(response, 'Failed to fetch field crews')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error fetching field crews:', error)
    throw error
  }
}

export async function createFieldCrew(data) {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/crews`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    })
    return handleResponse(response, 'Failed to create field crew')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error creating field crew:', error)
    throw error
  }
}

export async function getCrewsWithMembers() {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/crews`, {
      headers: getHeaders(),
      cache: 'no-store'
    })
    return handleResponse(response, 'Failed to fetch crews with members')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error fetching crews with members:', error)
    throw error
  }
}

export async function updateCrewMembers(crewId, userId, action) {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/crews/${crewId}/members`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ user_id: userId, action })
    })
    return handleResponse(response, 'Failed to update crew members')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error updating crew members:', error)
    throw error
  }
}

export async function getUnassignedFieldCrew() {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/crews/unassigned-members`, {
      headers: getHeaders(),
      cache: 'no-store'
    })
    return handleResponse(response, 'Failed to fetch unassigned field crew')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error fetching unassigned field crew:', error)
    throw error
  }
}

export async function updateFieldCrew(crewId, data) {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/crews/${crewId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    })
    return handleResponse(response, 'Failed to update field crew')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error updating field crew:', error)
    throw error
  }
}

// ── Settings (Admin) ──────────────────────────────────────────────────

export async function getOptimizationSettings() {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/settings`, {
      headers: getHeaders(),
      cache: 'no-store'
    })
    return handleResponse(response, 'Failed to fetch optimization settings')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error fetching optimization settings:', error)
    throw error
  }
}

export async function updateOptimizationSettings(key, value) {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ key, value })
    })
    return handleResponse(response, 'Failed to update optimization settings')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error updating optimization settings:', error)
    throw error
  }
}

// ── Optimization Templates ────────────────────────────────────────────

export async function getOptimizationTemplates() {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/templates`, {
      headers: getHeaders(),
      cache: 'no-store'
    })
    return handleResponse(response, 'Failed to fetch optimization templates')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error fetching optimization templates:', error)
    throw error
  }
}

export async function createOptimizationTemplate(name, description, settings) {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/templates`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, description, settings })
    })
    return handleResponse(response, 'Failed to save optimization template')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error saving optimization template:', error)
    throw error
  }
}

export async function deleteOptimizationTemplate(id) {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/templates/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    return handleResponse(response, 'Failed to delete optimization template')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error deleting optimization template:', error)
    throw error
  }
}

export async function getOptimizationOptions() {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/options`, {
      headers: getHeaders(),
      cache: 'no-store'
    })
    return handleResponse(response, 'Failed to fetch optimization options')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error fetching optimization options:', error)
    throw error
  }
}

export async function previewPlanDisassembly(id) {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/plan/${id}/disassemble-preview`, {
      headers: getHeaders(),
      cache: 'no-store'
    })
    return handleResponse(response, 'Failed to preview plan disassembly')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error previewing plan disassembly:', error)
    throw error
  }
}

export async function disassemblePlan(id) {
  try {
    const response = await rateLimitedFetch(`${API_BASE()}/api/optimization/plan/${id}/disassemble`, {
      method: 'POST',
      headers: getHeaders()
    })
    return handleResponse(response, 'Failed to disassemble plan')
  } catch (error) {
    reportDiagnostic('error', 'dispatch', 'Error disassembling plan:', error)
    throw error
  }
}
