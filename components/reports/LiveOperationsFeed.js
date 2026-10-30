'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {useQuery} from '@tanstack/react-query'
import {useUser} from '@/components/auth/UserContext'
import Button from '@/components/ui/Button'
import {backendFetch} from '@/lib/backend-fetch.mjs'
import {DASHBOARD_QUERY_KEY} from '@/lib/dashboard-query-client.mjs'
import {LIVE_POLL_MS,validateLiveOperations,liveFeedStatus,transitionLabel} from '@/lib/live-operations.mjs'
import styles from './LiveOperationsFeed.module.css'
const formatter=new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'medium'})
const time=value=>value?formatter.format(new Date(value)):'No contact recorded'
export default function LiveOperationsFeed(){
 const user=useUser(),[cursor,setCursor]=useState(null),[clock,setClock]=useState(()=>Date.now()),[online,setOnline]=useState(true)
 useEffect(()=>{
  const update=()=>{setOnline(navigator.onLine);setClock(Date.now())};update()
  const timer=setInterval(()=>setClock(Date.now()),1000)
  window.addEventListener('online',update);window.addEventListener('offline',update);document.addEventListener('visibilitychange',update)
  return()=>{clearInterval(timer);window.removeEventListener('online',update);window.removeEventListener('offline',update);document.removeEventListener('visibilitychange',update)}
 },[])
 const query=useQuery({queryKey:[...DASHBOARD_QUERY_KEY,'live-operations',cursor],enabled:['officer','admin'].includes(user?.role),
  queryFn:async({signal})=>{
   const params=new URLSearchParams({limit:'20'});if(cursor)params.set('before_id',cursor)
   const response=await backendFetch(`/api/backend/api/operational-events/live?${params}`,{signal:AbortSignal.any([signal,AbortSignal.timeout(8000)])})
   if(!response.ok)throw new Error('The operations feed could not refresh.')
   return validateLiveOperations(await response.json())
  },staleTime:0,retry:false,refetchInterval:LIVE_POLL_MS,refetchIntervalInBackground:false})
 const data=query.data,status=liveFeedStatus({data,now:clock,receivedAt:query.dataUpdatedAt,online,error:query.isError})
 return <section className={styles.feed} aria-label="Live operations feed">
  <header className={styles.header}><div><h2>Live operations</h2><p className={`${styles.badge} ${status.state==='live'?styles.live:styles.warning}`} role="status">{status.label}</p></div>
   <Button variant="secondary" disabled={!online||query.isFetching} onClick={()=>query.refetch()}>Refresh operations</Button>
  </header>
  <p className={styles.note}>{data?`Last updated ${time(data.generated_at)} · Manila time`:'Waiting for the first server snapshot.'}{query.isFetching?' · Refreshing…':''}</p>
  {status.state!=='live'&&data&&<p className={styles.notice}>Showing the last successful snapshot. Task events and crew connection counts may have changed.</p>}
  {query.isError&&<p role="alert">{query.error.message} Refresh to retry.</p>}
  {!data&&query.isPending&&online&&<p>Loading task activity and crew connections…</p>}
  {data&&<>
   <p className={styles.counts}>{data.recent_members} recently connected · {data.quiet_members} no recent contact · {data.unknown_members} unknown · {data.crew_count} field crew accounts</p>
   <div className={styles.columns}>
    <section className={styles.card} aria-label="Task activity"><header><h3>{cursor?'Recorded task activity':'Latest task activity'}</h3><p>Newest received first. Device times can arrive later.</p></header>
     <div className={styles.scroll} tabIndex={0} aria-label="Scrollable task activity">
      {!data.events.length?<p>No recorded task activity in this page. Earlier transitions are not inferred.</p>:<ol className={styles.events}>{data.events.map(e=><li key={e.event_id}>
       <h4>{transitionLabel(e)}</h4><Link href={`/dashboard/officer/operations/${e.task_id}`}>Task #{e.task_id.slice(0,8)}</Link>
       {e.event_type==='assignment'&&e.details.assigned===false&&<p>Assignment removed</p>}
       {e.details.slot&&<p>{e.details.slot==='before'?'Before':'After'} cleanup evidence</p>}
       <p><time dateTime={e.occurred_at}>{time(e.occurred_at)}</time> · {e.time_basis==='device_reported'?'Device-reported time':'Server time'}</p>
       <p className={styles.note}>Received <time dateTime={e.recorded_at}>{time(e.recorded_at)}</time> · Event {e.event_id}</p>
      </li>)}</ol>}
     </div>
     <footer>{cursor&&<p className={styles.note}>Viewing an older page. Return to latest for live transitions.</p>}<div className={styles.actions}>
      <Button variant="secondary" disabled={!cursor||query.isFetching} onClick={()=>setCursor(null)}>Latest events</Button>
      <Button variant="secondary" disabled={!data.has_more||query.isFetching||query.isError||!online} onClick={()=>setCursor(data.next_cursor)}>Older activity</Button>
     </div></footer>
    </section>
    <section className={styles.card} aria-label="Crew connections"><header><h3>Crew connections</h3><p>Recent means server contact within 90 seconds.</p></header>
     <div className={styles.scroll} tabIndex={0} aria-label="Scrollable crew connections">
      <p className={styles.note}>No recent contact can mean offline, sync paused, app closed, backgrounded or off shift. Unknown means no heartbeat yet. These signals do not prove physical presence or completed work.</p>
      {!data.crews.length&&<p>No field crew roster is available.</p>}
      <ul className={styles.crews}>{data.crews.map(g=><li key={g.crew_id||'unrostered'}><h4>{g.name}</h4>
       {g.member_count?<p>{g.recent_members} recent · {g.quiet_members} offline / no recent contact · {g.unknown_members} unknown</p>:<p>No active members recorded</p>}
       <p className={styles.note}>Latest member contact: {time(g.last_seen_at)}</p>
      </li>)}</ul>
      <p className={styles.note}>Members can belong to more than one team. Overall counts use distinct active accounts.</p>
     </div>
    </section>
   </div>
  </>}
 </section>
}
