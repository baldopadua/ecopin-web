'use client'
import { useState, useEffect, useId } from 'react'
import { Play, Pause } from 'lucide-react'
import styles from './SpatialScan.module.css'

export default function TimePlayer({ dates, currentDate, onDateChange, isProjective }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const dateId = useId()
  const index = Math.max(0, dates.indexOf(currentDate))
  const disabled = isProjective || dates.length === 0
  const dateLabel = currentDate ? new Date(currentDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'No date selected'

  useEffect(() => {
    if (!isPlaying || isProjective || dates.length < 2) return
    const interval = setInterval(() => {
      const current = dates.indexOf(currentDate)
      onDateChange(dates[current < dates.length - 1 ? current + 1 : 0])
    }, 2000 / speed)
    return () => clearInterval(interval)
  }, [isPlaying, isProjective, currentDate, dates, speed, onDateChange])

  return <section className={styles.timeline} aria-labelledby="spatial-timeline-title">
    <div className={styles.timelineHeader}>
      <div className={styles.playbackLabel}><h2 id="spatial-timeline-title">Historical playback</h2>
        <p>{isProjective ? 'Select Historical snapshots to play.' : dates.length ? 'Play saved forecasts.' : 'No snapshots available.'}</p>
      </div>
      <div className={styles.dateField}><label htmlFor={dateId}>Forecast date</label>
        <select id={dateId} value={disabled ? '' : currentDate || ''} disabled={disabled}
          onChange={event => { setIsPlaying(false); onDateChange(event.target.value) }}>
          <option value="" disabled>{isProjective ? 'Latest forecast' : 'No date selected'}</option>
          {dates.map(date => <option key={date} value={date}>{new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</option>)}
        </select>
      </div>
    </div>
    <div className={styles.timelineControls}>
      <button type="button" className={styles.play} disabled={disabled || dates.length < 2}
        aria-label={isPlaying ? 'Pause historical playback' : 'Play historical snapshots'} onClick={() => setIsPlaying(value => !value)}>
        {isPlaying ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
      </button>
      <input type="range" min={0} max={Math.max(0, dates.length - 1)} value={index}
        aria-label="Historical forecast date" aria-valuetext={isProjective ? 'Latest forecast' : dateLabel}
        disabled={disabled || dates.length < 2} onChange={event => { setIsPlaying(false); onDateChange(dates[Number(event.target.value)]) }} />
      <div className={styles.switcher} role="group" aria-label="Playback speed">
        {[1, 2, 5].map(value => <button key={value} type="button" aria-label={`${value} times playback speed`}
          aria-pressed={speed === value} disabled={disabled || dates.length < 2} onClick={() => setSpeed(value)}>{value}×</button>)}
      </div>
    </div>
  </section>
}
