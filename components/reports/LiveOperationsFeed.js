'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useQuery} from '@tanstack/react-query'
import {RefreshCw} from 'lucide-react'
import {useUser} from '@/components/auth/UserContext'
import Button from '@/components/ui/Button'
import DataTable from '@/components/ui/DataTable'
import StatePill from '@/components/ui/StatePill'
import {backendFetch} from '@/lib/backend-fetch.mjs'
import {DASHBOARD_QUERY_KEY} from '@/lib/dashboard-query-client.mjs'
import {LIVE_POLL_MS,validateLiveOperations,liveFeedStatus,transitionLabel} from '@/lib/live-operations.mjs'
import styles from './LiveOperationsFeed.module.css'

const formatter=new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'medium'})
const time=value=>value?formatter.format(new Date(value)):'No contact recorded'
const sentence=text=>text.charAt(0).toUpperCase()+text.slice(1)
const TONES={live:'success',stale:'warning',loading:'neutral',unavailable:'error',offline:'error'}

export default function LiveOperationsFeed(){
 const user=useUser(),router=useRouter(),[cursor,setCursor]=useState(null),[clock,setClock]=useState(()=>Date.now()),[online,setOnline]=useState(true)
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
 const openTask=e=>router.push(`/dashboard/officer/operations/${e.task_id}`)
 const activityColumns=[
  {key:'event_type',label:'Activity',width:'34%',render:(_,e)=><>
   <strong className={styles.event}>{sentence(transitionLabel(e))}</strong>
   {e.event_type==='assignment'&&e.details.assigned===false&&<span className={styles.sub}>Assignment removed</span>}
   {e.details.slot&&<span className={styles.sub}>{e.details.slot==='before'?'Before':'After'} cleanup evidence</span>}</>},
  {key:'task_id',label:'Task',width:'16%',render:(id)=><Link href={`/dashboard/officer/operations/${id}`}>#{id.slice(0,8)}</Link>},
  {key:'occurred_at',label:'Happened',width:'26%',render:(_,e)=><><time dateTime={e.occurred_at}>{time(e.occurred_at)}</time>
   <span className={styles.sub}>{e.time_basis==='device_reported'?'Device-reported time':'Server time'}</span></>},
  {key:'recorded_at',label:'Received',width:'24%',render:(_,e)=><time dateTime={e.recorded_at}>{time(e.recorded_at)}</time>},
 ]
 const crewColumns=[
  {key:'name',label:'Team',width:'34%',render:(name,g)=><><strong className={styles.event}>{name}</strong><span className={styles.sub}>{g.member_count?`Latest contact: ${time(g.last_seen_at)}`:'No active members'}</span></>},
  {key:'recent_members',label:'Recent',width:'18%'},
  {key:'quiet_members',label:'No recent contact',width:'28%'},
  {key:'unknown_members',label:'Unknown',width:'20%'},
 ]
 const stats=data&&[['Recently connected',data.recent_members],['No recent contact',data.quiet_members],['Unknown',data.unknown_members],['Field crew accounts',data.crew_count]]
 return <section className={styles.feed} aria-label="Live operations feed">
  <header className={styles.header}>
   <div className={styles.title}>
    <h2>Live operations</h2>
    <StatePill tone={TONES[status.state]} role="status">{status.label}</StatePill>
    <span className={styles.note}>{data?`Last updated ${time(data.generated_at)} · Manila time`:'Waiting for the first server snapshot.'}{query.isFetching?' · Refreshing…':''}</span>
   </div>
   <Button variant="secondary" disabled={!online||query.isFetching} onClick={()=>query.refetch()}><RefreshCw size={16} aria-hidden="true"/>Refresh operations</Button>
  </header>
  {status.state!=='live'&&data&&<p className={styles.notice}>Showing the last successful snapshot. Task events and crew connection counts may have changed.</p>}
  {query.isError&&<p role="alert" className={styles.notice}>{query.error.message} Refresh to retry.</p>}
  {!data&&query.isPending&&online&&<p className={styles.note}>Loading task activity and crew connections…</p>}
  {data&&<>
   <dl className={styles.stats}>{stats.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value.toLocaleString()}</dd></div>)}</dl>
   <div className={styles.columns}>
    <section className={styles.pane} aria-label="Task activity">
     <header><h3>{cursor?'Recorded task activity':'Latest task activity'}</h3><p>Newest received first. Device times can arrive later.</p></header>
     <div className={styles.scroll}>
      {data.events.length
       ?<DataTable caption="Task activity" columns={activityColumns} data={data.events} getRowKey={e=>e.event_id} onRowClick={openTask} rowActionLabel={e=>`Open task #${e.task_id.slice(0,8)}`} className="ecopin-table-container--compact"/>
       :<p className={styles.empty}>No recorded task activity in this page. Earlier transitions are not inferred.</p>}
     </div>
     <footer>
      <span className={styles.note}>{cursor?'Viewing an older page. Return to latest for live transitions.':'Showing the latest events.'}</span>
      <div className={styles.actions}>
       <Button variant="secondary" disabled={!cursor||query.isFetching} onClick={()=>setCursor(null)}>Latest events</Button>
       <Button variant="secondary" disabled={!data.has_more||query.isFetching||query.isError||!online} onClick={()=>setCursor(data.next_cursor)}>Older activity</Button>
      </div>
     </footer>
    </section>
    <section className={styles.pane} aria-label="Crew connections">
     <header><h3>Crew connections</h3><p>Recent means server contact within 90 seconds.</p></header>
     <div className={`${styles.scroll} ${styles.crews}`}>
      {data.crews.length
       ?<DataTable caption="Crew connections" columns={crewColumns} data={data.crews} getRowKey={g=>g.crew_id||'unrostered'} className="ecopin-table-container--compact"/>
       :<p className={styles.empty}>No field crew roster is available.</p>}
     </div>
     <footer><p className={styles.note}>No recent contact can mean offline, sync paused, app closed, backgrounded or off shift. Unknown means no heartbeat yet. These signals do not prove physical presence or completed work. Members can belong to more than one team; overall counts use distinct active accounts.</p></footer>
    </section>
   </div>
  </>}
 </section>
}
