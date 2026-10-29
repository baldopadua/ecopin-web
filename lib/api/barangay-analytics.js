import {validateBarangayAnalytics} from '../barangay-analytics.mjs';
import {backendFetch} from '../backend-fetch.mjs';
export async function fetchBarangayAnalytics(range,signal) {
 const query=new URLSearchParams({startMonth:range.start,endMonth:range.end});
 const response=await backendFetch(`/api/backend/api/analytics/barangay?${query}`,{signal});
 const body=await response.json().catch(()=>({}));
 if(!response.ok){const error=new Error(body.error||'Analytics could not load.');error.status=response.status;throw error;}
 return validateBarangayAnalytics(body);
}
