'use client'
import {useState} from 'react'
import Link from 'next/link'
import {useQuery} from '@tanstack/react-query'
import {useUser} from '@/components/auth/UserContext'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import {backendFetch} from '@/lib/backend-fetch.mjs'
import {DASHBOARD_QUERY_KEY} from '@/lib/dashboard-query-client.mjs'
import {validateUnprocessedAlerts,unprocessedReason} from '@/lib/unprocessed-alerts.mjs'
import styles from './UnprocessedAlerts.module.css'
export default function UnprocessedAlerts(){
 const user=useUser(),[cursor,setCursor]=useState(null),[open,setOpen]=useState(false)
 const query=useQuery({queryKey:[...DASHBOARD_QUERY_KEY,'unprocessed-alerts',cursor],enabled:['officer','admin'].includes(user?.role),
  queryFn:async({signal})=>{
   const params=new URLSearchParams({limit:'20'});if(cursor){params.set('cursorCreated',cursor.created_at);params.set('cursorId',cursor.report_id)}
   const response=await backendFetch(`/api/backend/api/reports/unprocessed-alerts?${params}`,{signal});
   if(!response.ok)throw new Error('Incident alerts could not load. Please try again.')
   return validateUnprocessedAlerts(await response.json())
  },staleTime:0,refetchInterval:60000,refetchIntervalInBackground:false})
 const data=query.data
 const counts=data&&<p className={styles.counts}><span className={styles.overdue}>{data.overdue_count.toLocaleString()} overdue · 5+ days</span><span className={styles.approaching}>{data.approaching_count.toLocaleString()} approaching · 4–5 days</span></p>
 const status=<>{query.isPending&&<p role="status">Loading incident alerts…</p>}{query.isError&&<p role="alert">{query.error.message} {data?'Previously loaded alerts remain below and may have changed.':''}</p>}</>
 const refresh=<Button variant="secondary" disabled={query.isFetching} onClick={()=>query.refetch()}>Refresh alerts</Button>
 return <section className={styles.panel} aria-label="Unprocessed incident alerts">
  <header className={styles.header}><div><h2>Unprocessed incident alerts</h2>{counts}</div>
   <div className={styles.actions}><Button variant="secondary" disabled={!data} onClick={()=>setOpen(true)}>Review stagnant cases</Button>{refresh}</div></header>
  {status}
  <Dialog open={open} onClose={()=>{setOpen(false);setCursor(null)}} label="Stagnant incident queue">
   <div className={styles.detail}>
    <header className={styles.header}><h2>Stagnant incident queue</h2><Button variant="secondary" onClick={()=>{setOpen(false);setCursor(null)}}>Close alerts</Button></header>
    <p>Follow up on reports still missing acknowledgement or crew assignment. The clock starts at submission.</p>
    <p className={styles.note}>Amber starts at four days and red at five days. Reading a notification does not resolve a missing action.</p>
    {status}{counts}{refresh}
    {data&&<>
     <p className={styles.note}>Snapshot {new Date(data.generated_at).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'})} · Manila time</p>
     {!data.total&&<p>No stagnant reports at least four days old in this snapshot.</p>}
     {data.total>0&&data.reports.length===0&&<p>This page has no remaining cases. Return to the first page to refresh the queue.</p>}
     <ul className={styles.list}>{data.reports.map(report=><li key={report.report_id} className={styles[report.state]}>
      <div><h3><Link href={`/dashboard/raw-data/${report.report_id}`}>Report #{report.report_id.slice(0,8)}</Link></h3><span>{report.state==='overdue'?'Overdue follow-up':'Approaching five days'} · {report.age_days} days since submission</span></div>
      <p>Needs {unprocessedReason(report)}.</p><p className={styles.note}>Submitted {new Date(report.created_at).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'})} · Manila time</p>
      <Link className={styles.review} href={`/dashboard/raw-data/${report.report_id}`}>Review incident</Link>
     </li>)}</ul>
     <footer className={styles.footer}><span>{data.reports.length} shown · {data.total.toLocaleString()} current cases · Oldest first</span>
      {cursor&&<Button variant="secondary" disabled={query.isFetching} onClick={()=>setCursor(null)}>First alert page</Button>}
      {data.next_cursor&&<Button variant="secondary" disabled={query.isFetching||query.isError} onClick={()=>setCursor(data.next_cursor)}>Next alerts</Button>}
     </footer>
    </>}
   </div>
  </Dialog>
 </section>
}
