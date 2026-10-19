'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import { Pause, Play, ShieldCheck } from 'lucide-react'
import styles from './Auth.module.css'

const photos = [
  { src: '/images/community/neighborhood-team.jpg', alt: 'Pasig SWMO field crews collecting waste into a truck' },
  { src: '/images/community/street-cleanup.jpg', alt: 'A Pasig cleanup vehicle collecting roadside waste' },
  { src: '/images/community/working-together.jpg', alt: 'SWMO crew members carrying bulky debris together' },
]
function subscribeDesktop(change) { const query = matchMedia('(min-width: 768px)'); query.addEventListener('change', change); return () => query.removeEventListener('change', change) }
function subscribeMotion(change) { const query = matchMedia('(prefers-reduced-motion: reduce)'); query.addEventListener('change', change); return () => query.removeEventListener('change', change) }

export default function AuthPhotos() {
  const desktop = useSyncExternalStore(subscribeDesktop, () => matchMedia('(min-width: 768px)').matches, () => false)
  const reduced = useSyncExternalStore(subscribeMotion, () => matchMedia('(prefers-reduced-motion: reduce)').matches, () => false)
  const [paused, setPaused] = useState(null)
  const [active, setActive] = useState(0)
  const playing = desktop && (paused === null ? !reduced : !paused)
  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => setActive(index => (index + 1) % photos.length), 8000)
    return () => clearInterval(timer)
  }, [playing])
  if (!desktop) return null
  return <figure className={styles.photoCycle} aria-label="SWMO field crews at work">
    {photos.map((photo, index) => <Image key={photo.src} src={photo.src} alt={index === active ? photo.alt : ''} aria-hidden={index !== active} fill sizes="50vw" className={index === active ? styles.photoActive : styles.photoInactive} />)}
    <figcaption>
      <div className={styles.captionHeader}>
        <ShieldCheck size={18} />
        <span>Pasig SWMO field crews in action</span>
      </div>
      <span className={styles.photoCredit}>
        Photo:{' '}
        <a href="https://www.facebook.com/share/p/19hk6BA5W8/" target="_blank" rel="noopener noreferrer">Pasig Tayo</a>{' '}
        (<a href="https://www.facebook.com/jonah.talagtag.77" target="_blank" rel="noopener noreferrer">Jonah Talagtag</a>)
      </span>
    </figcaption>
    <div className={styles.photoControls}><span aria-label={`Photo ${active + 1} of ${photos.length}`}>{active + 1} / {photos.length}</span><button type="button" onClick={() => setPaused(playing)} aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}>{playing ? <Pause size={18} /> : <Play size={18} />}</button></div>
  </figure>
}
