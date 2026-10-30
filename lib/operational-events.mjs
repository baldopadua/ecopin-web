export const OPERATIONAL_EVENT_LABELS={task_transition:'Task status changed',assignment:'Assignment',acknowledgement:'Acknowledgement',arrival:'Arrival',evidence_submission:'Evidence submitted',completion:'Completion',verification:'Cleanup proof verified'}
export function operationalDuration(seconds){
 if(typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<0)return 'Not enough recorded milestones'
 if(seconds>0&&seconds<1)return '<1 s'
 const s=Math.floor(seconds),hours=Math.floor(s/3600),minutes=Math.floor(s%3600/60)
 return [hours?`${hours} h`:null,minutes?`${minutes} min`:null,`${s%60} s`].filter(Boolean).join(' ')
}
export function validateOperationalPage(data){
 if(!data||!Array.isArray(data.events)||typeof data.has_more!=='boolean'||
  (data.has_more&&(typeof data.next_cursor!=='string'||!/^\d+$/.test(data.next_cursor)))||
  data.events.some(e=>!e||typeof e.id!=='string'||!/^\d+$/.test(e.id)||!Object.hasOwn(OPERATIONAL_EVENT_LABELS,e.event_type)||
    !['server','device_reported'].includes(e.time_basis)||!Number.isFinite(Date.parse(e.occurred_at))||!Number.isFinite(Date.parse(e.recorded_at)))){
  throw new Error('The operational timeline returned an incomplete page.')
 }
 return data
}
