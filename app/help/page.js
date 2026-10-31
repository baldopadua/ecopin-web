'use client'

import { Suspense } from 'react'
import { HelpCircle, MessageSquareText, Smartphone } from 'lucide-react'
import Link from 'next/link'
import LandingNavigation from '@/components/landing/LandingNavigation'
import PublicFooter from '@/components/landing/PublicFooter'
import usePublicTheme from '@/components/landing/usePublicTheme'
import SearchableFAQ from '@/components/support/SearchableFAQ'
import publicStyles from '@/components/landing/LandingPage.module.css'
import styles from './Help.module.css'

function HelpContent() {
  return (
    <>
      <div className={styles.hero}>
        <div className={styles.badge}>
          <HelpCircle size={16} aria-hidden="true" /> Help and FAQ
        </div>
        <h1 className={styles.title}>Answers to common questions</h1>
        <p className={styles.subtitle}>
          How EcoPin reports are reviewed, dispatched and cleaned up in Pasig City, and where to get help with your own report.
        </p>
      </div>

      <div className={styles.layout}>
        <SearchableFAQ />

        <aside className={styles.aside} aria-label="Other ways to get help">
          {/* Tickets are private to the signed-in citizen, so they live in the Android app. */}
          <section id="tickets" aria-labelledby="ticket-form-heading" className={styles.card}>
            <span className={styles.cardIcon} aria-hidden="true"><MessageSquareText size={20} /></span>
            <h2 id="ticket-form-heading" className={styles.sectionHeading}>
              Need help with your own report?
            </h2>
            <p>
              Support tickets are tied to your EcoPin account, so only you can see your questions, the ticket reference and the SWMO reply.
              Open a ticket and check its status from the Help screen in the EcoPin Android app.
            </p>
            <p>
              The <Link href="/contact#message">Send us a message</Link> form on the Contact page is for general questions to SWMO. It does not create a ticket, so you will not be able to track it in the app.
            </p>
            <Link href="/#mobile-app" className={styles.appLink}>
              <Smartphone size={18} aria-hidden="true" /> Get the Android app
            </Link>
          </section>
        </aside>
      </div>
    </>
  )
}

export default function HelpPage() {
  const { isDark, toggleTheme } = usePublicTheme()

  return (
    <div className={`${publicStyles.page} ${styles.page}`}>
      <LandingNavigation isDark={isDark} toggleTheme={toggleTheme} activePage="" />

      <main className={styles.main}>
        <Suspense fallback={null}>
          <HelpContent />
        </Suspense>
      </main>

      <PublicFooter isDark={isDark} />
    </div>
  )
}
