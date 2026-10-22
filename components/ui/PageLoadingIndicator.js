import Image from 'next/image'
import styles from './NavigationLoadingScreen.module.css'

export default function PageLoadingIndicator({ label = 'Getting your page ready…' }) {
  return (
    <div className={styles.content} role="status" aria-live="polite" aria-label={label}>
      <div className={styles.emblem} aria-hidden="true">
        <svg className={styles.ring} viewBox="0 0 96 96" fill="none">
          <circle className={styles.track} cx="48" cy="48" r="44" />
          <circle className={styles.arc} cx="48" cy="48" r="44" pathLength="100" />
        </svg>
        <Image src="/Solo Logo Light.png" width={26} height={40} alt="" className={`${styles.logo} dark:hidden`} priority />
        <Image src="/Solo Logo Dark.png" width={26} height={40} alt="" className={`${styles.logo} hidden dark:block`} priority />
      </div>
      <h2 className={styles.title}>{label}</h2>
      <p className={styles.subtitle}>Getting your page ready. One moment.</p>
    </div>
  )
}
