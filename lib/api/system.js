import { rateLimitedFetch } from '../rateLimiter.js'


export async function getTimeoutMinutes(){
    try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL


        const headers = {
            'Content-Type': 'application/json'
        }



        const response = await rateLimitedFetch(`${API_BASE_URL}/api/admin/timeout`, {
            headers
        })

        if (!response.ok) {
            // Return default settings instead of throwing error
            return {
                session_timeout_minutes: 60
            }
        }

        const data = await response.json()
        return data
    } catch (error) {
        // Return default settings on any error
        return {
            session_timeout_minutes: 60
        }
    }
}
