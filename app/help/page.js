'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { HelpCircle, MessageSquareText, ShieldAlert, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import LandingNavigation from '@/components/landing/LandingNavigation'
import PublicFooter from '@/components/landing/PublicFooter'
import usePublicTheme from '@/components/landing/usePublicTheme'
import SearchableFAQ from '@/components/support/SearchableFAQ'
import CitizenTicketForm from '@/components/support/CitizenTicketForm'
import styles from './Help.module.css'

function HelpContent() {
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref') || ''

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

      {/* Citizen Ticket Submission Form */}
      <section aria-labelledby="ticket-form-heading">
        <h2 id="ticket-form-heading" className={styles.sectionHeading}>
          <MessageSquareText size={22} className="text-primary" />
          Direct Report Ticket & Status Inquiry
        </h2>
        <CitizenTicketForm defaultReferenceCode={refCode} />
      </section>
    </>
  )
}

export default function HelpPage() {
  const { isDark, toggleTheme } = usePublicTheme()

  return (
    <div className={styles.page}>
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
