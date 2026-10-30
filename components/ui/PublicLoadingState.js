import PageLoadingIndicator from './PageLoadingIndicator'
import styles from './NavigationLoadingScreen.module.css'

export default function PublicLoadingState({ label = 'Preparing your view…', fullScreen = false, exiting = false, onExited }) {
  const layout = exiting ? `${styles.pageLoading} ${styles.exiting}` : fullScreen ? styles.pageLoading : styles.inlineLoading
  return (
    <div className={layout} onAnimationEnd={exiting ? event => { if (event.target === event.currentTarget) onExited?.() } : undefined}>
      <PageLoadingIndicator label={label} />
    </div>
  )
}
