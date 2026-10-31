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
          <HelpCircle size={15} /> Citizen Knowledge Base & Support
        </div>
        <h1 className={styles.title}>Frequently Asked Questions</h1>
        <p className={styles.subtitle}>
          Find quick answers about how report dispatch, SLA countdowns, and cleanup verification work across Pasig City.
        </p>
      </div>

      {/* Searchable Accordion FAQ */}
      <SearchableFAQ />

      <div className={styles.ticketDivider} />

      {/* Tickets are private to the signed-in citizen, so they live in the Android app. */}
      <section id="tickets" aria-labelledby="ticket-form-heading" className={styles.ticketNotice}>
        <h2 id="ticket-form-heading" className={styles.sectionHeading}>
          <MessageSquareText size={22} className="text-primary" />
          Need help with your own report?
        </h2>
        <p>
          Support tickets are tied to your EcoPin account, so only you can see your questions, the ticket reference and the SWMO reply.
          Open a ticket and check its status from the Help screen in the EcoPin Android app.
        </p>
        <p>
          The <a href="#contact">Send us a message</a> form in the page footer is for general questions to SWMO. It does not create a ticket, so you will not be able to track it in the app.
        </p>
        <Link href="/#mobile-app" className={styles.appLink}>
          <Smartphone size={18} /> Get the Android app
        </Link>
      </section>
    </>
  )
}

export default function HelpPage() {
  const { isDark, toggleTheme } = usePublicTheme()

  return (
    <div className={`${publicStyles.page} ${styles.page}`}>
      <LandingNavigation isDark={isDark} toggleTheme={toggleTheme} activePage="" />

      <main className={styles.main}>
        <Suspense fallback={<div className="text-center py-12 text-text-muted">Loading Help Center...</div>}>
          <HelpContent />
        </Suspense>
      </main>

      <PublicFooter isDark={isDark} />
    </div>
  )
}
