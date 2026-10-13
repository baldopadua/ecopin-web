import { MapPin, LayoutGrid } from 'lucide-react'
import styles from './Explore.module.css'

export default function ViewModeSwitch({ mode, onChange }) {
  return <div className={styles.modes} role="group" aria-label="Report view mode">
    <button type="button" aria-pressed={mode === 'map'} onClick={() => onChange('map')}><MapPin size={18} /> Map view</button>
    <button type="button" aria-pressed={mode === 'gallery'} onClick={() => onChange('gallery')}><LayoutGrid size={18} /> Gallery view</button>
  </div>
}
