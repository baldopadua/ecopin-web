'use client'

import { useId } from 'react'
import styles from './FleetCapabilities.module.css'

const VEHICLES = [
  ['compactor', 'Compactor truck', 'Garbage truck that compresses collected waste. Use Driving for its route transport mode.'],
  ['pickup', 'Pickup truck', 'Open-bed utility truck for collection and cleanup equipment. Use Driving for routes.'],
  ['tricycle', 'Cargo tricycle', 'Three-wheeled vehicle for smaller loads and local collection.'],
  ['motorcycle', 'Motorcycle', 'Two-wheeled vehicle for light loads or rapid response. Use Motorcycle for routes.'],
  ['hazmat_unit', 'Hazardous-materials unit', 'Specialized vehicle. Select hazmat certification only after verifying the team is certified.'],
  ['walking', 'On foot', 'Crew works on foot. Use Walking for routes; record only what the crew can safely carry.'],
  ['bicycle', 'Bicycle', 'Bicycle or cargo bike. Use Bicycle for routes.']
]

function localDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function FleetCapabilities({ crew, onChange }) {
  const id = useId()
  const vehicle = crew.vehicle_type ?? 'compactor'
  return (
    <div className={styles.sections}>
      <fieldset className={styles.section}>
        <legend>Dispatch capabilities</legend>
        <p className={styles.hint}>Select at least one type of work this crew can do. Both are allowed; both are not required.</p>
        <div className={styles.choices}>
          {['standard', 'sweeper'].map(mode => (
            <label key={mode} className={styles.choice}>
              <input type="checkbox" checked={crew[`supports_${mode}`] ?? mode === 'standard'}
                onChange={event => onChange(`supports_${mode}`, event.target.checked)} />
              {mode === 'standard' ? 'Standard clusters' : 'Sweeper reports'}
            </label>
          ))}
        </div>
        <p className={styles.hint}>Standard handles grouped cleanup tasks. Sweeper handles individual reports. An unconfigured hazmat unit may be registered without either, but will not receive these dispatches.</p>
      </fieldset>

      <fieldset className={styles.section}>
        <legend>Vehicle & performance</legend>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor={`${id}-vehicle`}>Crew vehicle type <span className={styles.required}>Required</span></label>
            <select id={`${id}-vehicle`} required value={vehicle} aria-describedby={`${id}-vehicle-help`}
              onChange={event => onChange('vehicle_type', event.target.value)}>
              {VEHICLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <p id={`${id}-vehicle-help`} className={styles.hint}>{VEHICLES.find(([value]) => value === vehicle)?.[2]}</p>
          </div>
          {[
            ['speed_factor', 'Travel speed factor', 'Default 1.0. Higher means faster travel; 0.8 is slower and 1.2 is faster. Keep 1.0 unless measured travel supports an adjustment.'],
            ['service_time_factor', 'Service time factor', 'Default 1.0. Higher means more time at each stop; 1.2 adds 20% work time. Keep 1.0 unless actual cleanup times support an adjustment.']
          ].map(([key, label, hint]) => (
            <div key={key} className={styles.field}>
              <label htmlFor={`${id}-${key}`}>{label} <span className={styles.required}>Required</span></label>
              <input id={`${id}-${key}`} type="number" required min="0.1" max="3" step="0.1" value={crew[key] ?? 1}
                aria-describedby={`${id}-${key}-help`}
                onChange={event => onChange(key, event.target.value === '' ? '' : Number(event.target.value))} />
              <p id={`${id}-${key}-help`} className={styles.hint}>{hint} Accepted range: 0.1–3.0.</p>
            </div>
          ))}
        </div>
        <p className={styles.note}>Crew vehicle type records the actual equipment and provides load-capacity estimates. Route transport mode is selected separately for each plan and controls travel-time calculations. Choose a mode that matches the crews being dispatched.</p>
        <label className={styles.choice}>
          <input type="checkbox" checked={crew.hazmat_certified ?? false} onChange={event => onChange('hazmat_certified', event.target.checked)} />
          Hazmat certified (administrator verified)
        </label>
        <p className={styles.hint}>Optional. Leave unchecked for ordinary cleanup crews. This is a qualification, not a required acceptance checkbox.</p>
      </fieldset>

      <fieldset className={styles.section}>
        <legend>Load capacity & current load <span className={styles.optional}>Optional</span></legend>
        <p className={styles.hint}>For accurate load planning, enter the vehicle’s rated limits and its measured current load. Do not guess capacity from vehicle type alone. Blank limits use planner estimates; blank starting loads are treated as zero by mixed planning.</p>
        <div className={styles.grid}>
          {[
            ['max_volume_m3', 'Maximum volume (m³)', 'Usable load space, at least 0.001 m³. Use the vehicle specification; 1 m³ = 1,000 litres.'],
            ['max_weight_kg', 'Maximum weight (kg)', 'Rated payload, at least 0.001 kg. Use the vehicle’s safe payload rating, not its total vehicle weight.'],
            ['starting_volume_m3', 'Measured starting volume (m³)', 'Current occupied space. Enter 0 only if confirmed empty; must not exceed maximum volume.'],
            ['starting_weight_kg', 'Measured starting weight (kg)', 'Current payload. Enter 0 only if confirmed empty; must not exceed maximum weight.']
          ].map(([key, label, hint]) => (
            <div key={key} className={styles.field}>
              <label htmlFor={`${id}-${key}`}>{label}</label>
              <input id={`${id}-${key}`} type="number" min={key.startsWith('max_') ? '0.001' : '0'} step="any"
                value={crew[key] ?? ''} aria-describedby={`${id}-${key}-help`}
                onChange={event => onChange(key, event.target.value === '' ? null : Number(event.target.value))} />
              <p id={`${id}-${key}-help`} className={styles.hint}>{hint}</p>
            </div>
          ))}
          <div className={styles.field}>
            <label htmlFor={`${id}-measured`}>Load measured at</label>
            <input id={`${id}-measured`} type="datetime-local" value={localDateTime(crew.load_measured_at)} aria-describedby={`${id}-measured-help`}
              onChange={event => onChange('load_measured_at', event.target.value ? new Date(event.target.value).toISOString() : null)} />
            <p id={`${id}-measured-help`} className={styles.hint}>Required when either starting load is entered, including zero. Use the actual measurement time.</p>
          </div>
        </div>
      </fieldset>
    </div>
  )
}
