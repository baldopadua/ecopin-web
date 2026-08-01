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

    // Only include non-empty params
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== '' && value != null)
    )
    const queryString = new URLSearchParams(filteredParams).toString()
    const url = `${API_BASE_URL}/api/admin/users${queryString ? `?${queryString}` : ''}`

    console.log('getAllUsers requesting URL:', url)

    const response = await fetch(url, {
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
      console.error('Failed to fetch users:', { errorData, errorText, status: response.status })
      throw new Error(errorMessage)
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
