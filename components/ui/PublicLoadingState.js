import PageLoadingIndicator from './PageLoadingIndicator'
import styles from './NavigationLoadingScreen.module.css'

export default function PublicLoadingState({ label = 'Preparing your view…', fullScreen = false }) {
  return <div className={fullScreen ? styles.pageLoading : styles.inlineLoading}><PageLoadingIndicator label={label} /></div>
}
