import { triggerSessionExpired } from '@/components/auth/SessionProvider'

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
      if (token) triggerSessionExpired()
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
      if (token) triggerSessionExpired()
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
      if (token) triggerSessionExpired()
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
      if (token) triggerSessionExpired()
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
      if (token) triggerSessionExpired()
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
      if (token) triggerSessionExpired()
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
