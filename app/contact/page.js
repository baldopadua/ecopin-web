'use client'
import { AlertTriangle, Mail, Phone } from 'lucide-react'
import LandingNavigation from '@/components/landing/LandingNavigation'
import PublicFooter from '@/components/landing/PublicFooter'
import FooterContactForm from '@/components/landing/FooterContactForm'
import usePublicTheme from '@/components/landing/usePublicTheme'
import publicStyles from '@/components/landing/LandingPage.module.css'
import { getOfficialContacts } from '@/lib/official-contacts.mjs'
import { usePublicCms } from '@/components/public/PublicSiteProvider'
import CopyValueButton from './CopyValueButton'
import styles from './contact.module.css'

// Group an 11-digit PH mobile number (0917 772 6888) so it can be read aloud; other formats are shown as published.
function readableNumber(value) {
  return /^09\d{9}$/.test(value) ? `${value.slice(0, 4)} ${value.slice(4, 7)} ${value.slice(7)}` : value
}

export default function OfficialContactPage() {
  const { isDark, toggleTheme } = usePublicTheme()
  const { cms } = usePublicCms()
  const contacts = getOfficialContacts(cms)
  const gmailUrl = contacts.email && `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(contacts.email)}&su=${encodeURIComponent('Barangay cleanup coordination')}`

  return <div className={publicStyles.page}>
    <a href="#official-contact" className={publicStyles.skipLink}>Skip to official contacts</a>
    <LandingNavigation isDark={isDark} toggleTheme={toggleTheme} activePage="Contact" />
    <main id="official-contact" className={styles.main}>
      <header className={styles.intro}>
        <p className={publicStyles.sectionLabel}>Official coordination</p>
        <h1>Contact SWMO directly</h1>
        <p>For barangay leaders and official event organizers coordinating cleanups, community events or liga activities. You don’t need an EcoPin report to call.</p>
      </header>

      <section id="message" className={styles.messageSection} aria-labelledby="message-heading"><FooterContactForm cms={cms} /></section>

      <div className={styles.layout}>
        <section className={`${styles.card} ${styles.office}`} aria-labelledby="swmo-heading">
          <h2 id="swmo-heading">Cleanup &amp; event coordination</h2>
          <p className={styles.officeName}>{contacts.office}</p>
          <p className={styles.number}>
            <span>{readableNumber(contacts.swmoPhone)}</span>
            {contacts.extension && <span className={styles.extension}>local {contacts.extension}</span>}
          </p>
          <p className={styles.hint}>Call the office trunkline{contacts.extension ? `, then ask the operator for SWMO, local ${contacts.extension}` : ''}. The call button dials the trunkline only.</p>
          <div className={styles.actions}>
            <a className={publicStyles.primaryButton} href={contacts.swmoTel}><Phone size={18} aria-hidden="true" /> Call SWMO trunkline</a>
            <CopyValueButton value={contacts.swmoPhone} label="Copy phone number" />
          </div>

          {contacts.email && <div className={styles.emailRow}>
            <h3>Prefer email?</h3>
            <div className={styles.actions}>
              <a className={styles.secondary} href={`mailto:${contacts.email}?subject=Barangay%20cleanup%20coordination`}><Mail size={18} aria-hidden="true" /> Email SWMO</a>
              <CopyValueButton value={contacts.email} label="Copy email address" />
            </div>
            <p className={styles.hint}>Call and email buttons open your phone or mail app. If nothing opens on this device, copy the details instead or <a href={gmailUrl} target="_blank" rel="noopener noreferrer">write in Gmail</a>.</p>
          </div>}

          <p className={styles.scope}>SWMO confirms crew availability, response and schedule. Calling or emailing does not submit a report or dispatch a crew.</p>
        </section>

        <div className={styles.aside}>
          <section className={`${styles.card} ${styles.emergency}`} aria-labelledby="emergency-heading">
            <h2 id="emergency-heading"><AlertTriangle size={20} aria-hidden="true" /> Immediate danger?</h2>
            <p>For threats to people or public safety, call the Pasig City Emergency Hotline instead of waiting for an EcoPin review.</p>
            <p className={styles.emergencyNumber}>{readableNumber(contacts.emergencyPhone)}</p>
            <div className={styles.actions}>
              <a className={styles.secondary} href={contacts.emergencyTel}>Call Pasig emergency hotline</a>
              <CopyValueButton value={contacts.emergencyPhone} label="Copy hotline number" />
            </div>
          </section>

          <section className={styles.card} aria-labelledby="prepare-heading">
            <h2 id="prepare-heading">Have these details ready</h2>
            <ul className={styles.checklist}>
              <li>Your name, official role and barangay or organizing office</li>
              <li>Exact location and nearest landmark</li>
              <li>Event date and time, the cleanup needed and any hazards</li>
              <li>A callback number, and your EcoPin report ID if you have one</li>
            </ul>
          </section>
        </div>
      </div>

      <footer className={styles.sources}>
        <p>Public office contacts. {contacts.checked ? `Last verified ${contacts.checked}.` : 'Verification date not provided.'} Dialer and email availability depend on your device.</p>
        <p><a href={contacts.directory} target="_blank" rel="noopener noreferrer">Official city directory</a>
          <a href={contacts.emergencySource} target="_blank" rel="noopener noreferrer">Official emergency hotline listing</a></p>
      </footer>
    </main>
    <PublicFooter isDark={isDark} />
  </div>
}
