'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import PageHeader from '@/components/layout/PageHeader';
import { RequireRole } from '@/components/auth/RequireRole';
import { ZoneForecastChart } from '@/components/ui/ZoneTrendDrawer';
import { getHistoricalPatterns } from '@/lib/api/hotspot';
import { patternLabel, patternColor } from '@/lib/historical-patterns.mjs';
import { forecastDate } from '@/lib/forecast-data.mjs';
import styles from './patterns.module.css';
const PatternMap=dynamic(()=>import('@/components/map/HistoricalPatternMap'),{ssr:false,loading:()=> <p>Loading map…</p>});
function PatternsContent() {
  const [data,setData]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  const [windowKey,setWindow]=useState('90d'),[horizon,setHorizon]=useState('30d'),[selectedId,setSelected]=useState(null),[barangay,setBarangay]=useState('1381200015');
  useEffect(()=>{
    const controller=new AbortController();let active=true;
    getHistoricalPatterns({signal:controller.signal,refresh:attempt>0}).then(value=>{if(active)setData(value);}).catch(e=>{if(active&&e.name!=='AbortError')setError(e.message);});
    return ()=>{active=false;controller.abort();};
  },[attempt]);
  const refresh=()=>{setData(null);setError('');setSelected(null);setAttempt(n=>n+1);};
  const selected=data?.patterns.find(p=>p.id===selectedId);
  const choose=id=>{setSelected(id);const p=data.patterns.find(p=>p.id===id);if(p?.barangays[0])setBarangay(p.barangays[0].psgc_code);};
  const w=data?.windows[windowKey],f=data?.forecasts[horizon],zone=f?.barangays[barangay],b=data?.barangays.find(r=>r.psgc_code===barangay);
  return <div className={`workspace-page workspace-page--flow ${styles.page}`}>
    <PageHeader title="Historical hotspots" subtitle="Find recurring concentrations. Compare them with barangay forecasts before planning inspections."
      breadcrumbs={[{label:'Officer',href:'/dashboard/officer'},{label:'Spatial scan',href:'/dashboard/spatial-scan'},{label:'Historical hotspots'}]}>
      <div className={styles.actions}><Link href="/dashboard/spatial-scan">Forward hotspot map</Link><Link href="/analytics/barangay">Barangay analytics</Link><button type="button" disabled={!data&&!error} onClick={refresh}>Refresh analysis</button></div>
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
      <section className={styles.panel} aria-labelledby="future-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Separate forward projection</p><h2 id="future-title">Barangay activity outlook</h2></div><div className={styles.controls}><label>Barangay<select aria-label="Barangay" value={barangay} onChange={e=>setBarangay(e.target.value)}>{data.barangays.map(b=><option key={b.psgc_code} value={b.psgc_code}>{b.name}</option>)}</select></label><label>Forecast horizon<select aria-label="Forecast horizon" value={horizon} onChange={e=>setHorizon(e.target.value)}>{['7d','30d','90d'].map(k=><option key={k} value={k}>Next +{data.forecasts[k].horizon_days} days</option>)}</select></label></div></div>
        <p className={styles.muted}>{b.name} · {b.observed_counts[windowKey]} observed reports in the selected lookback · {b.pattern_ids.length} related 90-day concentrations</p>
        <div className={styles.outlook}><strong>{zone.predicted_count.toFixed(1)} projected reports</strong><span>{forecastDate(f.start)}–{forecastDate(f.end)} · approximate 95% interval {zone.lower_bound.toFixed(1)}–{zone.upper_bound.toFixed(1)}</span></div>
        <ZoneForecastChart zone={zone}/><p className={styles.note}>Forecasts use 52 complete UTC weeks of eligible barangay reports and the existing Holt / sparse-count model. They predict report volume, not future DBSCAN polygons, truck demand or measured accuracy. Zero observed reports may reflect limited reporting.</p>
      </section>
      <section className={styles.panel} aria-labelledby="coverage-title"><h2 id="coverage-title">Coverage and interpretation</h2><p>{data.quality.included_reports_90} of {data.quality.eligible_reports_90} eligible reports included over 90 days. Excluded: {data.quality.excluded_unreconciled_90} unresolved or border assignments; {data.quality.excluded_invalid_location_90} invalid locations. Totals can differ from the all-submission barangay dashboard.</p>
        <details><summary>How recurrence labels are assigned</summary><ul><li>Chronic corridor candidate: at least 3 reports in each separate 30-day period, across at least 6 UTC weeks.</li><li>Observed transient spike: at least 6 reports in the middle period, with at most 2 in each adjacent period.</li><li>Recent activity spike: at least 3 reports in 7 days and twice the daily rate of the preceding 23 days, with at least 3 baseline reports.</li><li>Recent concentration: at least 3 reports in 7 days with too little prior activity to establish a trend.</li></ul><p>These are transparent observation rules, not causal or statistical significance tests. Density chains can connect several local concentrations. Group identities belong to this snapshot and may change after refresh.</p></details>
      </section>
    </>}
  </div>;
}
export default function PatternsPage(){return <RequireRole allowedRoles={['officer','admin']}><PatternsContent/></RequireRole>;}
