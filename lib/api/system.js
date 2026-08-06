export async function getTimeoutMinutes(){
    try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL
        const token = localStorage.getItem('authToken')

        const headers = {
            'Content-Type': 'application/json'
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(`${API_BASE_URL}/api/admin/timeout`, {
            headers
        })

        if (!response.ok) {
            // Return default settings instead of throwing error
            console.log('System settings endpoint returned', response.status, '- using defaults')
            return {
                session_timeout_minutes: 60
            }
        }

        const data = await response.json()
        return data
    } catch (error) {
        // Return default settings on any error
        console.log('Error fetching timeout minutes - using defaults:', error.message)
        return {
            session_timeout_minutes: 60
        }
    }
}