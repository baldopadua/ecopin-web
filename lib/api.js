const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export async function fetchPublicReports() {
  try {
    console.log('Fetching reports from:', `${API_URL}/api/reports/public`)
    const response = await fetch(`${API_URL}/api/reports/public`)
    console.log('Response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to fetch reports:', response.status, errorText)
      throw new Error(`Failed to fetch reports: ${response.status} - ${errorText}`)
    }
    const data = await response.json()
    console.log('Reports data:', data)
    return data
  } catch (error) {
    console.error('Error fetching reports:', error)
    return []
  }
}
