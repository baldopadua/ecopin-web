'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import PageHeader from '@/components/layout/PageHeader';
import { RequireRole } from '@/components/auth/RequireRole';
import { getHistoricalPatterns } from '@/lib/api/hotspot';
import { patternLabel, patternColor } from '@/lib/historical-patterns.mjs';
import { forecastDate } from '@/lib/forecast-data.mjs';
import styles from './patterns.module.css';
const PatternMap=dynamic(()=>import('@/components/map/HistoricalPatternMap'),{ssr:false,loading:()=> <p>Loading map…</p>});
function PatternsContent() {
  const [data,setData]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  const [windowKey,setWindow]=useState('90d'),[selectedId,setSelected]=useState(null);
  useEffect(()=>{
    const controller=new AbortController();let active=true;
    getHistoricalPatterns({signal:controller.signal,refresh:attempt>0}).then(value=>{if(active)setData(value);}).catch(e=>{if(active&&e.name!=='AbortError')setError(e.message);});
    return ()=>{active=false;controller.abort();};
  },[attempt]);
  const refresh=()=>{setData(null);setError('');setSelected(null);setAttempt(n=>n+1);};
  const selected=data?.patterns.find(p=>p.id===selectedId);
  const choose=id=>setSelected(id);
  const w=data?.windows[windowKey];
  return <div className={`workspace-page workspace-page--flow ${styles.page}`}>
    <PageHeader title="Historical hotspots" subtitle="Find recurring concentrations from the past 90 days. Compare them with the hotspot forecast before planning inspections."
      breadcrumbs={[{label:'Officer',href:'/dashboard/officer'},{label:'Spatial scan',href:'/dashboard/spatial-scan'},{label:'Historical hotspots'}]}>
      <div className={styles.actions}><Link href="/dashboard/spatial-scan">Forward hotspot map</Link><Link href="/dashboard/officer/metrics?tab=barangay">Barangay analytics</Link><button type="button" disabled={!data&&!error} onClick={refresh}>Refresh analysis</button></div>
    </PageHeader>
    {!data&&!error&&<p role="status">Analyzing historical clusters and barangay trends…</p>}
    {error&&<div role="alert" className={styles.panel}><h2>Analysis unavailable</h2><p>{error}</p><button type="button" onClick={refresh}>Try again</button></div>}
    {data&&<>
      <div className={styles.snapshot}><span>Snapshot · {forecastDate(data.generated_at)}</span><span>{data.params.eps_meters} m neighborhood · {data.params.min_samples} reports to form a cluster</span><span>Approved, reconciled reports · active and resolved</span></div>
      <section className={styles.panel} aria-labelledby="observed-title">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Observed history</p><h2 id="observed-title">Where activity repeats</h2></div><label>Lookback window<select aria-label="Lookback window" value={windowKey} onChange={e=>setWindow(e.target.value)}>{['7d','30d','90d'].map(k=><option key={k} value={k}>Past {data.windows[k].lookback_days} days</option>)}</select></label></div>
        <p className={styles.muted}>{forecastDate(w.start)}–{forecastDate(w.end)} · {w.report_count} reports · {w.cluster_count} clusters · {w.noise_count} unclustered reports</p>
        <div className={styles.observedGrid}><div><div className={styles.map}><PatternMap data={w.geojson} selected={selected} onSelect={choose} snapshot={data.generated_at} windowKey={windowKey}/></div>
          {w.cluster_count===0&&<p role="status">No density clusters in this window. Unclustered reports still contribute to barangay trends.</p>}
          <p className={styles.note}>Shapes show report concentrations, not street segments or legal boundaries. A corridor candidate needs an on-site inspection.</p>
          <div className={styles.legend}>{['chronic','transient_spike','recent_spike','recent_concentration','intermittent','historical_only'].map(k=><span key={k}><i style={{background:patternColor(k)}}/>{patternLabel(k)}</span>)}</div>
        </div><div className={styles.patternList} aria-label="90-day historical concentrations"><h3>90-day recurrence evidence</h3><p className={styles.note}>Each card follows the same 90-day group. Map clusters are recomputed for the selected lookback.</p>
          {!data.patterns.length&&<p>No 90-day density concentrations found. This does not establish that waste risk is absent.</p>}
          {data.patterns.map(p=><button key={p.id} type="button" aria-pressed={selectedId===p.id} onClick={()=>choose(p.id)} className={styles.pattern}>
            <strong>{patternLabel(p.pattern)}</strong><span>{p.barangays.map(b=>b.name).join(' / ')}</span><span>{p.report_count} reports · {p.active_weeks} active UTC weeks</span><span>Oldest / middle / latest 30 days: <b>{p.period_counts.join(' / ')}</b></span>
          </button>)}
        </div></div>
        {selected&&<div className={styles.evidence} aria-live="polite"><h3>{patternLabel(selected.pattern)} · evidence</h3><p>{selected.barangays.map(b=>`${b.name}: ${b.report_count} reports`).join(' · ')}. Barangay links use each report’s reconciled assignment.</p><p>Past 7 / 30 / 90 days: {['7d','30d','90d'].map(k=>selected.observed_counts[k]).join(' / ')}. {selected.active_weeks} distinct UTC weeks with activity.</p><p>Planning prompt: {selected.pattern==='chronic'?'Inspect the recurring concentration and check whether collection coverage needs a scheduled trial.':selected.pattern==='transient_spike'?'Check whether the event or temporary cause has ended before committing permanent resources.':'Verify current conditions and monitor the next reporting period before changing permanent coverage.'}</p></div>}
      </section>
      <section className={styles.panel} aria-labelledby="future-title"><h2 id="future-title">Looking ahead?</h2><p className={styles.muted}>This page shows observed history only. Forward activity forecasts by barangay live on the <Link href="/dashboard/spatial-scan">hotspot forecast map</Link>.</p></section>
      <section className={styles.panel} aria-labelledby="coverage-title"><h2 id="coverage-title">Coverage and interpretation</h2><p>{data.quality.included_reports_90} of {data.quality.eligible_reports_90} eligible reports included over 90 days. Excluded: {data.quality.excluded_unreconciled_90} unresolved or border assignments; {data.quality.excluded_invalid_location_90} invalid locations. Totals can differ from the all-submission barangay dashboard.</p>
        <details><summary>How recurrence labels are assigned</summary><ul><li>Chronic corridor candidate: at least 3 reports in each separate 30-day period, across at least 6 UTC weeks.</li><li>Observed transient spike: at least 6 reports in the middle period, with at most 2 in each adjacent period.</li><li>Recent activity spike: at least 3 reports in 7 days and twice the daily rate of the preceding 23 days, with at least 3 baseline reports.</li><li>Recent concentration: at least 3 reports in 7 days with too little prior activity to establish a trend.</li></ul><p>These are transparent observation rules, not causal or statistical significance tests. Density chains can connect several local concentrations. Group identities belong to this snapshot and may change after refresh.</p></details>
      </section>
    </>}
  </div>;
}
export default function PatternsPage(){return <RequireRole allowedRoles={['officer','admin']}><PatternsContent/></RequireRole>;}
