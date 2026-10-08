'use client'

function localDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

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
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm">Vehicle type
        <select value={crew.vehicle_type ?? 'compactor'} onChange={event=>onChange('vehicle_type',event.target.value)} className="mt-1 block w-full border border-border bg-surface p-2 text-text-primary">
          {['compactor','pickup','tricycle','motorcycle','hazmat_unit'].map(type=><option key={type} value={type}>{type.replace('_',' ')}</option>)}
        </select>
      </label>
      {[
        ['max_volume_m3','Maximum volume (m³)'],['max_weight_kg','Maximum weight (kg)'],
        ['starting_volume_m3','Measured starting volume (m³)'],['starting_weight_kg','Measured starting weight (kg)']
      ].map(([key,label])=><label key={key} className="text-sm">{label}
        <input type="number" min={key.startsWith('max_')?'0.001':'0'} step="any" value={crew[key]??''}
          onChange={event=>onChange(key,event.target.value===''?null:Number(event.target.value))}
          className="mt-1 block w-full border border-border bg-surface p-2 text-text-primary" />
      </label>)}
      <label className="text-sm">Load measured at
        <input type="datetime-local" value={localDateTime(crew.load_measured_at)}
          onChange={event=>onChange('load_measured_at',event.target.value?new Date(event.target.value).toISOString():null)}
          className="mt-1 block w-full border border-border bg-surface p-2 text-text-primary" />
      </label>
    </div>
    <label className="mt-3 flex items-center gap-2 text-sm">
      <input type="checkbox" checked={crew.hazmat_certified??false} onChange={event=>onChange('hazmat_certified',event.target.checked)} />
      Hazmat certified (administrator verified)
    </label>
    <p className="mt-2 text-xs text-text-muted">Mixed planning needs both physical limits and a measured starting load for each available crew.</p>
  </fieldset>
}

