'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, Download, FolderDown, Settings, Smartphone, CheckCircle2 } from 'lucide-react'
import LandingNavigation from '@/components/landing/LandingNavigation'
import usePublicTheme from '@/components/landing/usePublicTheme'
import publicStyles from '@/components/landing/LandingPage.module.css'
import motion from '@/components/ui/PublicMotion.module.css'
import styles from './Downloads.module.css'

const steps = [
  { icon: Download, title: 'Download the app.', text: 'Open this page on your Android phone and tap Download for Android. Keep the downloaded APK file.' },
  { icon: FolderDown, title: 'Open the downloaded file.', text: 'Find ecopin-app-release.apk in your browser downloads or your phone’s Downloads folder, then tap it.' },
  { icon: Settings, title: 'Follow Android’s prompts.', text: 'If Android asks for permission to install from your browser, allow it for this installation. Finish installing, then open EcoPin.' },
]

export default function DownloadsPage() {
  const { isDark, toggleTheme } = usePublicTheme()
  const [requested, setRequested] = useState(false)
  return <div className={publicStyles.page}>
    <a href="#installation" className={publicStyles.skipLink}>Skip to installation help</a>
    <LandingNavigation isDark={isDark} toggleTheme={toggleTheme} />
    <main id="installation" className={`${styles.main} ${motion.enter}`}>
      <section className={styles.hero} aria-labelledby="download-heading">
        <div><span className={publicStyles.sectionLabel}><Smartphone size={16} /> EcoPin for Android</span><h1 id="download-heading">A little care,<br />right in your pocket.</h1><p>Download EcoPin to report environmental concerns and follow their progress. Here’s how to get the app onto your phone.</p><Link href="/#mobile-app" className={publicStyles.textButton}>See what the app can do <ArrowRight size={18} /></Link></div>
        <div className={styles.downloadCard}><span className={styles.appIcon}><Smartphone size={36} /></span><h2>Get the EcoPin app.</h2><p>Free Android app · Direct APK download</p><a href="/ecopin-app-release.apk" download className={publicStyles.primaryButton} onClick={() => setRequested(true)}><Download size={18} /> Download for Android</a><span className={styles.downloadStatus} role="status">{requested ? 'Download requested. Check your phone’s Downloads when it’s ready.' : 'Download starts when you tap the button.'}</span></div>
      </section>
      <section className={styles.guide} aria-labelledby="install-heading"><span className={publicStyles.sectionLabel}>Let’s get you started</span><h2 id="install-heading">Three steps. Ready to report.</h2><ol>{steps.map(({ icon: Icon, title, text }, index) => <li key={title}><div className={styles.stepTop}><span>0{index + 1}</span><Icon size={24} /></div><h3>{title}</h3><p>{text}</p></li>)}</ol><div className={styles.note}><CheckCircle2 size={20} /><p>After installing, you can turn off the browser’s installation permission again. Keep your EcoPin app updated using the latest download here.</p></div></section>
      <section className={styles.help} aria-labelledby="help-heading"><div><span className={publicStyles.sectionLabel}>A little help along the way</span><h2 id="help-heading">Need a hand?</h2><p>Try these steps if you get stuck.</p></div><div className={styles.questions}>
        <details><summary>I can’t find the APK file.<ChevronDown size={18} /></summary><p>Check your browser’s downloads list or your phone’s Downloads folder for ecopin-app-release.apk. If the download didn’t start, use the download button above again.</p></details>
        <details><summary>Android won’t let me install.<ChevronDown size={18} /></summary><p>Follow the permission prompt Android shows for your browser or file app, then return to the downloaded APK. If your device is managed by an organization, contact the person who manages it.</p></details>
        <details><summary>I’m using a computer or another phone.<ChevronDown size={18} /></summary><p>This download is an Android APK. Open this page on the Android phone where you want to use EcoPin. You can still explore public reports on this website.</p><Link href="/explore">Explore public reports <ArrowRight size={16} /></Link></details>
        <details><summary>How do I send my first report?<ChevronDown size={18} /></summary><p>Take a clear photo in the EcoPin app, confirm the location, add a short description, and submit it for review.</p><Link href="/#how-it-works">Read the citizen guide <ArrowRight size={16} /></Link></details>
      </div></section>
      <footer className={styles.footer}><Link href="/">Back to EcoPin</Link><span>Small actions. A cleaner Pasig.</span><Link href="/explore">Explore reports <ArrowRight size={16} /></Link></footer>
    </main>
  </div>
}
