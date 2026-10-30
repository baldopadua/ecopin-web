'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { getPublicCmsSettings } from '@/lib/api/admin'
import { DEFAULT_PUBLIC_CMS, isPublicSitePath } from '@/lib/public-cms.mjs'
import PublicLoadingState from '@/components/ui/PublicLoadingState'
import styles from '@/components/landing/LandingPage.module.css'
import loadingStyles from '@/components/ui/NavigationLoadingScreen.module.css'

// Keep the first-load screen up long enough for the spinner to complete a few turns.
const MIN_LOADING_MS = 1800

const PublicCmsContext = createContext({ cms: DEFAULT_PUBLIC_CMS })
export const usePublicCms = () => useContext(PublicCmsContext)

export default function PublicSiteProvider({ children }) {
  const pathname = usePathname()
  const publicPage = isPublicSitePath(pathname)
  const contactsPage = pathname === '/contact'
  const [cms, setCms] = useState(DEFAULT_PUBLIC_CMS)
  const [loading, setLoading] = useState(true)
  const [minElapsed, setMinElapsed] = useState(false)
  const [overlayGone, setOverlayGone] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_LOADING_MS)
    return () => clearTimeout(timer)
  }, [])
  useEffect(() => {
    if (!publicPage) return
    let active = true
    const refresh = async () => {
      const settings = await getPublicCmsSettings()
      if (!active) return
      if (settings) setCms({ ...DEFAULT_PUBLIC_CMS, ...settings })
      setLoading(false)
    }
    void refresh()
    const timer = setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [publicPage])

  const ready = !loading && minElapsed
  const showOverlay = publicPage && !contactsPage && !overlayGone
  let content = children
  if (publicPage && !contactsPage && !ready) content = null
  else if (publicPage && !contactsPage && cms.maintenance_mode === true) content = (
    <main className={`${styles.page} ${styles.maintenancePage}`}>
      <section className="max-w-xl text-center space-y-6" aria-labelledby="maintenance-title">
        <h1 id="maintenance-title" className="text-3xl font-medium">EcoPin is under maintenance</h1>
        <p className="text-base leading-relaxed" role="status">{cms.maintenance_notice || DEFAULT_PUBLIC_CMS.maintenance_notice}</p>
        <p className="text-sm">Please check back later. Staff can still access their workspace.</p>
        <Link href="/auth" className={styles.primaryButton}>Staff sign in</Link>
      </section>
    </main>
  )
  return (
    <PublicCmsContext.Provider value={{ cms }}>
      {showOverlay && <PublicLoadingState label="Loading public site…" fullScreen exiting={ready} onExited={() => setOverlayGone(true)} />}
      {publicPage && !contactsPage && ready ? <div className={loadingStyles.pageReveal}>{content}</div> : content}
    </PublicCmsContext.Provider>
  )
}
