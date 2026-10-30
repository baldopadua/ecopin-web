'use client'

import dynamic from 'next/dynamic'
import LandingNavigation from '@/components/landing/LandingNavigation'
import usePublicTheme from '@/components/landing/usePublicTheme'
import publicStyles from '@/components/landing/LandingPage.module.css'
import styles from './Explore.module.css'
import PublicLoadingState from '@/components/ui/PublicLoadingState'

const PublicMap = dynamic(() => import('./PublicMap'), {
  ssr: false,
  loading: () => <PublicLoadingState label="Loading public reports…" />,
})

export default function ExplorePage() {
  const { isDark, toggleTheme } = usePublicTheme()
  return <><div className={`${publicStyles.page} ${styles.page}`}>
    <a href="#explore-content" className={publicStyles.skipLink}>Skip to reports</a>
    <LandingNavigation isDark={isDark} toggleTheme={toggleTheme} activePage="Explore" />
    <main id="explore-content" className={styles.content}>
      <PublicMap theme={isDark ? 'dark' : 'light'} />
    </main>
  </div></>
}
