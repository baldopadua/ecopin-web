'use client'
import {useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useQuery} from '@tanstack/react-query'
import {Clock} from 'lucide-react'
import {useUser} from '@/components/auth/UserContext'
import Button from '@/components/ui/Button'
import DataTable from '@/components/ui/DataTable'
import Dialog from '@/components/ui/Dialog'
import StatePill from '@/components/ui/StatePill'
import {backendFetch} from '@/lib/backend-fetch.mjs'
import {DASHBOARD_QUERY_KEY} from '@/lib/dashboard-query-client.mjs'
import {validateUnprocessedAlerts,unprocessedReason} from '@/lib/unprocessed-alerts.mjs'
import styles from './UnprocessedAlerts.module.css'

const manila=value=>new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'})
const sentence=text=>text.charAt(0).toUpperCase()+text.slice(1)
const caseLabel=report=>`Report #${report.report_id.slice(0,8)}`

export default function UnprocessedAlerts(){
 const user=useUser(),router=useRouter(),[cursor,setCursor]=useState(null),[open,setOpen]=useState(false)
 const query=useQuery({queryKey:[...DASHBOARD_QUERY_KEY,'unprocessed-alerts',cursor],enabled:['officer','admin'].includes(user?.role),
  queryFn:async({signal})=>{
   const params=new URLSearchParams({limit:'20'});if(cursor){params.set('cursorCreated',cursor.created_at);params.set('cursorId',cursor.report_id)}
   const response=await backendFetch(`/api/backend/api/reports/unprocessed-alerts?${params}`,{signal});
   if(!response.ok)throw new Error('Incident alerts could not load. Please try again.')
   return validateUnprocessedAlerts(await response.json())
  },staleTime:0,refetchInterval:60000,refetchIntervalInBackground:false})
 const data=query.data
 const close=()=>{setOpen(false);setCursor(null)}
 const counts=data&&<div className={styles.counts}>
  <StatePill tone="error">{data.overdue_count.toLocaleString()} overdue · 5+ days</StatePill>
  <StatePill tone="warning">{data.approaching_count.toLocaleString()} approaching · 4–5 days</StatePill>
 </div>
 const status=<>
  {query.isPending&&<p role="status" className={styles.note}>Loading incident alerts…</p>}
  {query.isError&&<p role="alert" className={styles.error}>{query.error.message} {data?'Previously loaded alerts remain below and may have changed.':''}</p>}
 </>
 const refresh=<Button variant="secondary" disabled={query.isFetching} onClick={()=>query.refetch()}>Refresh alerts</Button>
 const columns=[
  {key:'report_id',label:'Report',width:'20%',render:(_,r)=><Link href={`/dashboard/raw-data/${r.report_id}`}>{caseLabel(r)}</Link>},
  {key:'state',label:'Status',width:'18%',render:state=><StatePill tone={state==='overdue'?'error':'warning'}>{state==='overdue'?'Overdue':'Approaching'}</StatePill>},
  {key:'age_days',label:'Waiting',width:'14%',render:days=>`${days} days`},
  {key:'needs',label:'Still needs',width:'26%',render:(_,r)=>sentence(unprocessedReason(r))},
  {key:'created_at',label:'Submitted',width:'22%',render:v=><span className={styles.nowrap}>{manila(v)}</span>},
 ]
 return <section className={styles.panel} aria-label="Unprocessed incident alerts">
  <div className={styles.summary}>
   <span className={styles.icon} aria-hidden="true"><Clock size={20}/></span>
   <div className={styles.text}>
    <h2>Unprocessed incident alerts</h2>
    {counts}{status}
   </div>
   <div className={styles.actions}>
    <Button disabled={!data} onClick={()=>setOpen(true)}>Review stagnant cases</Button>{refresh}
   </div>
  </div>
  <Dialog open={open} onClose={close} label="Stagnant incident queue">
   <div className={styles.dialog}>
    <header className={styles.dialogHeader}>
     <div><h2>Stagnant incident queue</h2>
      <p>Reports still missing acknowledgement or crew assignment, oldest first. The clock starts at submission, and reading a notification does not resolve a missing action.</p></div>
     <Button variant="secondary" onClick={close}>Close alerts</Button>
    </header>
    <div className={styles.meta}>
     {counts}{refresh}
     {data&&<span className={styles.note}>Snapshot {manila(data.generated_at)} · Manila time</span>}
    </div>
    {status}
    {data&&!data.total&&<p className={styles.empty}>No stagnant reports at least four days old in this snapshot.</p>}
    {data&&data.total>0&&data.reports.length===0&&<p className={styles.empty}>This page has no remaining cases. Return to the first page to refresh the queue.</p>}
    {data&&data.reports.length>0&&<div className={styles.table}>
     <DataTable caption="Stagnant incident reports" columns={columns} data={data.reports} getRowKey={r=>r.report_id}
      onRowClick={r=>router.push(`/dashboard/raw-data/${r.report_id}`)} rowActionLabel={r=>`Review ${caseLabel(r)}`} className="ecopin-table-container--compact"/>
    </div>}
    {data&&<footer className={styles.footer}>
     <span>{data.reports.length} shown · {data.total.toLocaleString()} current cases · Oldest first</span>
     <div className={styles.actions}>
      {cursor&&<Button variant="secondary" disabled={query.isFetching} onClick={()=>setCursor(null)}>First alert page</Button>}
      {data.next_cursor&&<Button variant="secondary" disabled={query.isFetching||query.isError} onClick={()=>setCursor(data.next_cursor)}>Next alerts</Button>}
     </div>
    </footer>}
   </div>
  </Dialog>
 </section>
}
