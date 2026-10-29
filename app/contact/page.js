'use client'
import LandingNavigation from '@/components/landing/LandingNavigation'
import usePublicTheme from '@/components/landing/usePublicTheme'
import publicStyles from '@/components/landing/LandingPage.module.css'
import { getOfficialContacts } from '@/lib/official-contacts.mjs'
import { usePublicCms } from '@/components/public/PublicSiteProvider'
import styles from './contact.module.css'

export default function OfficialContactPage() {
  const {isDark,toggleTheme}=usePublicTheme()
  const {cms}=usePublicCms()
  const contacts=getOfficialContacts(cms)
  return <div className={publicStyles.page}>
    <a href="#official-contact" className={publicStyles.skipLink}>Skip to official contacts</a>
    <LandingNavigation isDark={isDark} toggleTheme={toggleTheme} />
    <main id="official-contact" className={styles.main}>
      <header><p className={publicStyles.sectionLabel}>Official coordination</p><h1>Contact SWMO directly</h1>
        <p>For barangay leaders and official event organizers coordinating critical cleanup, community events or liga activities.</p></header>
      <section className={styles.card} aria-labelledby="swmo-heading">
        <h2 id="swmo-heading">Cleanup & event coordination</h2>
        <p>{contacts.office}</p>
        <p className={styles.number}>{contacts.swmoPhone} {contacts.extension&&<span>local {contacts.extension}</span>}</p>
        <p>Call the office trunkline{contacts.extension?`, then ask the operator for SWMO, local ${contacts.extension}`:''}. The call button dials the trunkline only.</p>
        <div className={styles.actions}><a className={publicStyles.primaryButton} href={contacts.swmoTel}>Call SWMO trunkline</a>
          {contacts.email&&<a className={styles.secondary} href={`mailto:${contacts.email}?subject=Barangay%20cleanup%20coordination`}>Email SWMO</a>}</div>
        {contacts.email&&<p><a href={`mailto:${contacts.email}`}>{contacts.email}</a></p>}
        <p>You can call without an EcoPin report or trust score. SWMO confirms crew availability, response and schedule; opening a call or email does not submit a report or dispatch a crew.</p>
      </section>
      <section className={styles.card} aria-labelledby="prepare-heading"><h2 id="prepare-heading">Have these details ready</h2>
        <ul><li>Your name, official role and barangay or organizing office</li><li>Exact location and nearest landmark</li><li>Event date/time, cleanup needed and any immediate hazards</li><li>A callback number and EcoPin report ID, if you already have one</li></ul></section>
      <section className={styles.card} aria-labelledby="emergency-heading"><h2 id="emergency-heading">Immediate danger or emergency?</h2>
        <p>For immediate threats to people or public safety, contact the Pasig City Emergency Hotline rather than waiting for an EcoPin review.</p>
        <p className={styles.number}>{contacts.emergencyPhone}</p><a className={styles.secondary} href={contacts.emergencyTel}>Call Pasig emergency hotline</a>
      </section>
      <footer><p>Public office contacts · {contacts.checked?`Last verified ${contacts.checked}.`:'Verification date not provided.'} Dialer and email availability depend on your device.</p>
        <a href={contacts.directory} target="_blank" rel="noopener noreferrer">Official city directory</a>{' · '}
        <a href={contacts.emergencySource} target="_blank" rel="noopener noreferrer">Official emergency hotline listing</a></footer>
    </main>
  </div>
}
