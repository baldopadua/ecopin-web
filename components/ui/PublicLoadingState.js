import { MapPin } from 'lucide-react'
import styles from './PublicMotion.module.css'

export default function PublicLoadingState({ label = 'Preparing your view…' }) {
  return <div className={styles.loading} role="status"><span className={styles.loadingIcon}><MapPin size={28} aria-hidden="true" /></span><strong>EcoPin</strong><p>{label}</p></div>
}
