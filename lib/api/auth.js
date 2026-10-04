import { rateLimitedFetch } from '../rateLimiter.js'
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

// Lightweight session validation - called only for critical operations
export async function validateSession() {
  try {
    const token = localStorage.getItem('authToken')
    
    if (!token) {
      return { valid: false, message: 'No token found' }
    }

    const response = await rateLimitedFetch(`${API_BASE_URL}/api/auth/validate-session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { valid: false, ...errorData }
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Session validation error:', error)
    // On network errors, assume session is still valid to avoid false logouts
    return { valid: true, message: 'Network error, assuming valid session' }
  }
}

// Login function (if not already implemented elsewhere)
export async function login(email, password) {
  try {
    const response = await rateLimitedFetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Login failed')
    }

    const data = await response.json()
    
    // Store token and initialize activity tracking
    if (data.token) {
      localStorage.setItem('authToken', data.token)
      if (data.session && data.session.refresh_token) {
        localStorage.setItem('refreshToken', data.session.refresh_token)
      }
      localStorage.setItem('lastActivity', Date.now())
    }
    
    return data
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

// Logout function
export async function logout() {
  try {
    const token = localStorage.getItem('authToken')
    
    if (token) {
      await rateLimitedFetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
    }
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    // Always clear local storage regardless of API call success
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('lastActivity')
  }
}

export async function refreshAuthToken() {
  try {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) return null;

    const response = await rateLimitedFetch(`${API_BASE_URL}/api/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    })

    if (!response.ok) {
      return null;
    }

    const data = await response.json()
    if (data.token) {
      localStorage.setItem('authToken', data.token)
      if (data.session && data.session.refresh_token) {
        localStorage.setItem('refreshToken', data.session.refresh_token)
      }
      return data.token
    }
    return null;
  } catch (error) {
    console.error('Refresh token error:', error)
    return null;
  }
}
