'use client'
export default function FleetCapabilities({crew,onChange}) {
  return <fieldset className="mt-4 border border-border p-3">
    <legend className="px-1 font-bold text-sm">Dispatch capabilities</legend>
    <div className="flex flex-wrap gap-4">
      {['standard','sweeper'].map(mode => <label key={mode} className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={crew[`supports_${mode}`] ?? mode==='standard'} onChange={event=>onChange(`supports_${mode}`,event.target.checked)} />
        {mode==='standard'?'Standard clusters':'Sweeper reports'}
      </label>)}
      {['speed_factor','service_time_factor'].map(key=><label key={key} className="flex items-center gap-2 text-sm">
        {key==='speed_factor'?'Travel speed factor':'Service time factor'}
        <input type="number" min="0.1" max="3" step="0.1" value={crew[key]??1} onChange={event=>onChange(key,event.target.value===''?'':Number(event.target.value))} className="w-20 border border-border p-2 bg-surface text-text-primary" />
      </label>)}
    </div>
    <p className="text-xs text-text-muted mt-2">1.0 is the baseline. A higher speed factor reduces travel time; a higher service factor increases work time.</p>
  </fieldset>
}

