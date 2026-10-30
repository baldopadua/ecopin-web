import {backendFetch} from '../backend-fetch.mjs';
import {validateExecutiveSnapshot} from '../barangay-executive.mjs';
export async function fetchExecutiveAnalytics(month,signal){
 const response=await backendFetch(`/api/backend/api/analytics/barangay/executive?${new URLSearchParams({month})}`,{signal,cache:'no-store'});
 if(!response.ok)throw new Error('Executive statistics could not load. Verify the analytics setup and retry.');
 return validateExecutiveSnapshot(await response.json(),month);
}
