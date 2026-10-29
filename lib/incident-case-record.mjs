import {OPERATIONAL_EVENT_LABELS} from './operational-events.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateCaseRecord(data,id){
 if(data?.version!=='case-record-v1'||!Number.isFinite(Date.parse(data.snapshot_at))||data.report?.id?.toLowerCase()!==id?.toLowerCase()||
  !Array.isArray(data.events)||!Array.isArray(data.activity)||data.events.length>10000||data.activity.length>10000||
  data.events.some(e=>!e||!Object.hasOwn(OPERATIONAL_EVENT_LABELS,e.event_type)||!['incident','task_context'].includes(e.scope)||!['server','device_reported'].includes(e.time_basis))||
  data.activity.some(e=>!e||typeof e.action_type!=='string')||
  (data.proof!==null&&(!UUID.test(data.proof?.id||'')||!Number.isFinite(Date.parse(data.proof?.verified_at))||!Number.isFinite(Date.parse(data.proof?.completed_at)))))throw new Error('The case record returned an incomplete snapshot. Reload before printing.');
 return data;
}
export function caseCoordinates(report){
 const {latitude:lat,longitude:lng}=report;
 return typeof lat==='number'&&typeof lng==='number'&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?`${lat.toFixed(6)}, ${lng.toFixed(6)}`:'Pin coordinates not recorded';
}
export function caseTime(value){
 return typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila',year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}):'Not recorded / invalid source time';
}
export function caseProofUrl(id,proof,slot){
 return UUID.test(id||'')&&UUID.test(proof?.id||'')&&['before','after'].includes(slot)?`/api/backend/api/reports/${id}/cleanup-proof/public/${proof.id}/${slot}`:null;
}
