'use client'
import { useState, useEffect, useId, useMemo } from 'react'
import { Play, Pause } from 'lucide-react'
import styles from './SpatialScan.module.css'

import { filterAvailableSnapshotDates, getNextSnapshotDate } from '@/lib/helpers/forecastTimeline'

export { filterAvailableSnapshotDates, getNextSnapshotDate }

export default function TimePlayer({ dates, currentDate, onDateChange, isProjective }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const dateId = useId()

  const availableSnapshotDates = useMemo(() => filterAvailableSnapshotDates(dates), [dates])

  useEffect(() => {
    if (isProjective || availableSnapshotDates.length < 2) {
      setIsPlaying(false)
    }
  }, [isProjective, availableSnapshotDates.length])

  const currentIndex = availableSnapshotDates.indexOf(currentDate)
  const sliderIndex = currentIndex === -1 ? 0 : currentIndex
  const disabled = isProjective || availableSnapshotDates.length === 0
  const dateLabel = currentDate && !isNaN(new Date(currentDate).getTime())
    ? new Date(currentDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'No date selected'

  useEffect(() => {
    if (!isPlaying || isProjective || availableSnapshotDates.length < 2) return
    const interval = setInterval(() => {
      const nextDate = getNextSnapshotDate(availableSnapshotDates, currentDate)
      if (nextDate) {
        onDateChange(nextDate)
      }
    }, 2000 / speed)
    return () => clearInterval(interval)
  }, [isPlaying, isProjective, currentDate, availableSnapshotDates, speed, onDateChange])

  return <section className={styles.timeline} aria-labelledby="spatial-timeline-title">
    <div className={styles.timelineHeader}>
      <div className={styles.playbackLabel}><h2 id="spatial-timeline-title">Historical playback</h2>
        <p>{isProjective ? 'Select Historical snapshots to play.' : availableSnapshotDates.length ? 'Play through the available forecast dates, or choose a date below.' : 'No historical snapshots are available.'}</p>
      </div>
      <div className={styles.dateField}><label htmlFor={dateId}>Forecast date</label>
        <select id={dateId} value={disabled ? '' : (availableSnapshotDates.includes(currentDate) ? currentDate : '')} disabled={disabled}
          onChange={event => { setIsPlaying(false); if (event.target.value) onDateChange(event.target.value) }}>
          <option value="" disabled>{isProjective ? 'Latest forecast' : 'No date selected'}</option>
          {availableSnapshotDates.map(date => <option key={date} value={date}>{new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</option>)}
        </select>
      </div>
    </div>
    <div className={styles.timelineControls}>
      <button type="button" className={styles.play} disabled={disabled || availableSnapshotDates.length < 2}
        aria-label={isPlaying ? 'Pause historical playback' : 'Play historical snapshots'} onClick={() => setIsPlaying(value => !value)}>
        {isPlaying ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
      </button>
      <input type="range" min={0} max={Math.max(0, availableSnapshotDates.length - 1)} value={sliderIndex}
        aria-label="Historical forecast date" aria-valuetext={isProjective ? 'Latest forecast' : dateLabel}
        disabled={disabled || availableSnapshotDates.length < 2} onChange={event => {
          setIsPlaying(false)
          const target = availableSnapshotDates[Number(event.target.value)]
          if (target) onDateChange(target)
        }} />
      <div className={styles.switcher} role="group" aria-label="Playback speed">
        {[1, 2, 5].map(value => <button key={value} type="button" aria-label={`${value} times playback speed`}
          aria-pressed={speed === value} disabled={disabled || availableSnapshotDates.length < 2} onClick={() => setSpeed(value)}>{value}×</button>)}
      </div>
    </div>
  </section>
}
