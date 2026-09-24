import { triggerSessionExpired } from '@/components/auth/SessionProvider'

const API_BASE = () => process.env.NEXT_PUBLIC_BACKEND_API_URL
const getHeaders = () => {
  const h = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('authToken')
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

async function handleResponse(response, errorContext) {
  if (response.status === 401) {
    const token = localStorage.getItem('authToken')
    if (token) triggerSessionExpired()
    throw new Error('Session expired')
  }

  if (!response.ok) {
    const errorData = await response.json()
    console.error(`${errorContext}:`, errorData)
    throw new Error(errorData.message || errorContext)
  }

  return response.json()
}

// ── Work Queue & Auto Planner (Phase 1-6) ────────────────────────────

export async function fetchWorkQueue(params = {}) {
  try {
    const query = new URLSearchParams(params).toString()
    const response = await fetch(`${API_BASE()}/api/optimization/queue${query ? `?${query}` : ''}`, {
      headers: getHeaders(),
      cache: 'no-store'
    })
    return handleResponse(response, 'Failed to fetch work queue')
  } catch (error) {
    console.error('Error fetching work queue:', error)
    throw error
  }
}

export async function prioritizeQueue() {
  try {
    const response = await fetch(`${API_BASE()}/api/optimization/queue/prioritize`, {
      method: 'POST',
      headers: getHeaders()
    })
    return handleResponse(response, 'Failed to prioritize queue')
  } catch (error) {
    console.error('Error prioritizing queue:', error)
    throw error
  }
}

export async function generatePlan(params = {}) {
  try {
    const response = await fetch(`${API_BASE()}/api/optimization/plan/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params)
    })
    return handleResponse(response, 'Failed to generate dispatch plan')
  } catch (error) {
    console.error('Error generating dispatch plan:', error)
    throw error
  }
}

export async function commitPlan(planId, params = {}) {
  try {
    const response = await fetch(`${API_BASE()}/api/optimization/plan/${planId}/commit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params)
    })
    return handleResponse(response, 'Failed to commit dispatch plan')
  } catch (error) {
    console.error('Error committing dispatch plan:', error)
    throw error
  }
}

// ── Optimization Runs ─────────────────────────────────────────────────

export async function runOptimization(params = {}) {
  try {
    const response = await fetch(`${API_BASE()}/api/optimization/run`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params)
    })
    return handleResponse(response, 'Failed to run optimization')
  } catch (error) {
    console.error('Error running optimization:', error)
    throw error
  }
}

export async function getOptimizationRuns() {
  try {
    const response = await fetch(`${API_BASE()}/api/optimization/runs`, {
      headers: getHeaders(),
      cache: 'no-store'
    })
    return handleResponse(response, 'Failed to fetch optimization runs')
  } catch (error) {
    console.error('Error fetching optimization runs:', error)
    throw error
  }
}

export async function getOptimizationRunById(id) {
  try {
    const response = await fetch(`${API_BASE()}/api/optimization/runs/${id}`, {
      headers: getHeaders()
    })
    return handleResponse(response, 'Failed to fetch optimization run')
  } catch (error) {
    console.error('Error fetching optimization run:', error)
    throw error
  }
}

export async function approveOptimization(id) {
  try {
    const response = await fetch(`${API_BASE()}/api/optimization/runs/${id}/approve`, {
      method: 'POST',
      headers: getHeaders()
    })
    return handleResponse(response, 'Failed to approve optimization')
  } catch (error) {
    console.error('Error approving optimization:', error)
    throw error
  }
}

export async function discardOptimization(id) {
  try {
    const response = await fetch(`${API_BASE()}/api/optimization/runs/${id}/discard`, {
      method: 'POST',
      headers: getHeaders()
    })
    return handleResponse(response, 'Failed to discard optimization')
  } catch (error) {
    console.error('Error discarding optimization:', error)
    throw error
  }
}

// ── Routes ────────────────────────────────────────────────────────────

export async function getActiveRoutes() {
  try {
    const response = await fetch(`${API_BASE()}/api/optimization/routes/active`, {
      headers: getHeaders(),
      cache: 'no-store'
    })
    return handleResponse(response, 'Failed to fetch active routes')
  } catch (error) {
    console.error('Error fetching active routes:', error)
    throw error
  }
}

export async function getRouteById(routeId) {
  try {
    const response = await fetch(`${API_BASE()}/api/optimization/routes/${routeId}`, {
      headers: getHeaders()
    })
    return handleResponse(response, 'Failed to fetch route')
  } catch (error) {
    console.error('Error fetching route:', error)
    throw error
  }
}

// ── Field Crews ───────────────────────────────────────────────────────

export async function getFieldCrews() {
  try {
    const response = await fetch(`${API_BASE()}/api/optimization/crews`, {
      headers: getHeaders(),
      cache: 'no-store'
    })
    return handleResponse(response, 'Failed to fetch field crews')
  } catch (error) {
    console.error('Error fetching field crews:', error)
    throw error
  }
}

export async function updateFieldCrew(crewId, data) {
  try {
    const response = await fetch(`${API_BASE()}/api/optimization/crews/${crewId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    })
    return handleResponse(response, 'Failed to update field crew')
  } catch (error) {
    console.error('Error updating field crew:', error)
    throw error
  }
}

// ── Settings (Admin) ──────────────────────────────────────────────────

export async function getOptimizationSettings() {
  try {
    const response = await fetch(`${API_BASE()}/api/optimization/settings`, {
      headers: getHeaders(),
      cache: 'no-store'
    })
    return handleResponse(response, 'Failed to fetch optimization settings')
  } catch (error) {
    console.error('Error fetching optimization settings:', error)
    throw error
  }
}

export async function updateOptimizationSettings(key, value) {
  try {
    const response = await fetch(`${API_BASE()}/api/optimization/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ key, value })
    })
    return handleResponse(response, 'Failed to update optimization settings')
  } catch (error) {
    console.error('Error updating optimization settings:', error)
    throw error
  }
}
