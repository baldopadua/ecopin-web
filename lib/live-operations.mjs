import {OPERATIONAL_EVENT_LABELS} from './operational-events.mjs';
export const LIVE_POLL_MS=20000;
const count=n=>Number.isSafeInteger(n)&&n>=0;
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const cursor=v=>typeof v==='string'&&/^\d{1,19}$/.test(v)&&BigInt(v)>0n&&BigInt(v)<=9223372036854775807n;
export function validateLiveOperations(data){
 const fail=()=>{throw new Error('Live operations returned incomplete data. Refresh to retry.');};
 const counts=g=>g&&[g.recent_members,g.quiet_members,g.unknown_members].every(count);
 if(data?.version!=='live-operations-v1'||!Number.isFinite(Date.parse(data.generated_at))||data.presence_window_seconds!==90||
  !Array.isArray(data.events)||data.events.length>100||!Array.isArray(data.crews)||data.crews.length>501||!counts(data)||!count(data.crew_count)||
  data.crew_count!==data.recent_members+data.quiet_members+data.unknown_members||typeof data.has_more!=='boolean'||
  (data.latest_event_id!==null&&!cursor(data.latest_event_id)))fail();
 for(const g of data.crews)if(!g||!(g.crew_id===null||uuid(g.crew_id))||typeof g.name!=='string'||!counts(g)||!count(g.member_count)||
  g.member_count!==g.recent_members+g.quiet_members+g.unknown_members||(g.last_seen_at!==null&&!Number.isFinite(Date.parse(g.last_seen_at))))fail();
 for(const [i,e] of data.events.entries())if(!e||!cursor(e.event_id)||!uuid(e.task_id)||!Object.hasOwn(OPERATIONAL_EVENT_LABELS,e.event_type)||
  !['server','device_reported'].includes(e.time_basis)||!Number.isFinite(Date.parse(e.occurred_at))||!Number.isFinite(Date.parse(e.recorded_at))||
  !e.details||typeof e.details!=='object'||(i>0&&BigInt(data.events[i-1].event_id)<=BigInt(e.event_id))||
  !cursor(data.latest_event_id)||BigInt(data.latest_event_id)<BigInt(e.event_id))fail();
 if(data.has_more?(!data.events.length||data.next_cursor!==data.events.at(-1).event_id):data.next_cursor!==null)fail();
 return data;
}
export function liveFeedStatus({data,now=Date.now(),receivedAt,online=true,error=false}){
 if(!online)return {state:'offline',label:'Officer browser offline'};
 if(error)return {state:'unavailable',label:'Feed connection unavailable'};
 if(!data)return {state:'loading',label:'Connecting to operations feed'};
 const age=now-Date.parse(data.generated_at),receivedAge=now-receivedAt;
 if(age < -300000||receivedAge<0)return {state:'stale',label:'Clock changed · refresh required'};
 if(!Number.isFinite(age)||age>30000||!Number.isFinite(receivedAge)||receivedAge>30000)return {state:'stale',label:'Stale operations snapshot'};
 return {state:'live',label:'Live · refreshes every 20 seconds'};
}
export function transitionLabel(event){
 const readable=value=>typeof value==='string'?value.replaceAll('_',' '):'Not recorded';
 return event.event_type==='task_transition'?`${event.details.from_status==null?'Created':readable(event.details.from_status)} → ${readable(event.details.to_status)}`:OPERATIONAL_EVENT_LABELS[event.event_type];
}
