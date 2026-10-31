'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import { usePublicCms } from '@/components/public/PublicSiteProvider'
import { safeCmsUrl } from '@/lib/public-cms.mjs'
import FooterContactForm from './FooterContactForm'
import { getOfficialContacts } from '@/lib/official-contacts.mjs'
import styles from './LandingPage.module.css'


function safeFacebookUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && (url.hostname === 'facebook.com' || url.hostname.endsWith('.facebook.com')) && !url.username && !url.password) return url.href
  } catch {}
  return null
}

export default function PublicFooter({ isDark = false, settings }) {
  const { cms: publicCms } = usePublicCms()
  const cms = settings || publicCms
  const officialContacts = getOfficialContacts(cms)
  const facebookUrl = safeFacebookUrl(cms.contact_swmo_facebook_url)
  return (
      <footer id="contact" className={`${styles.page} ${styles.footer}`}>
        <div className={styles.footerContainer}>
          {/* Column 1: Brand & Civic Mission */}
          <div className={styles.footerColBrand}>
            <Link href="/" aria-label="EcoPin home" className={styles.footerLogo}>
              <Image src={isDark ? '/Full Logo Dark.png' : '/Full Logo Light.png'} alt="EcoPin" width="120" height="34" />
            </Link>
            <div className={styles.footerCopy}>
              <p className={styles.footerTagline}>Small actions. A cleaner Pasig.</p>
              <p className={styles.footerDisclaimer}>
                EcoPin connects residents with city operations to quickly report and resolve environmental concerns across Pasig City.
              </p>
              <div className={styles.footerCredits}>
                <p className={styles.photoCredit}>
                  Photography courtesy of{' '}
                  <a href="https://www.facebook.com/share/p/19hk6BA5W8/" target="_blank" rel="noopener noreferrer">Pasig Tayo</a>{' '}
                  (<a href="https://www.facebook.com/jonah.talagtag.77" target="_blank" rel="noopener noreferrer">Jonah Talagtag</a>)
                </p>
              </div>
            </div>
          </div>

          {/* Column 2: Navigation & Official Office Info */}
          <div className={styles.footerColNav}>
            <div className={styles.footerNavGroup}>
              <h3 className={styles.footerColTitle}>Navigation</h3>
              <nav aria-label="Footer navigation" className={styles.footerLinks}>
                <Link href="/explore?view=gallery">Reports Gallery</Link>
                <Link href="/#how-it-works">Citizen Guide</Link>
                <Link href="/help">Help & FAQ</Link>
                <Link href="/contact">Official cleanup contacts</Link>
                <Link href="/delete-account">Delete account</Link>
              </nav>
            </div>

            <div className={styles.footerOfficeGroup}>
              <h3 className={styles.footerColTitle}>Office & Inquiries</h3>
              <p className={styles.officeName}>{cms.contact_office_name || 'Solid Waste Management Office'}</p>
              {facebookUrl && (
                <p className={styles.officeDetail}>
                  <a href={facebookUrl} className={styles.footerFacebook} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true" /> SWMO on Facebook</a>
                </p>
              )}
              {cms.contact_office_address && <p className={styles.officeDetail}>{cms.contact_office_address}</p>}
              {cms.contact_office_email && <p className={styles.officeDetail}><span>SWMO: </span><a href={`mailto:${cms.contact_office_email}`}>{cms.contact_office_email}</a></p>}
              {safeCmsUrl(cms.contact_facebook_url) && <p className={styles.officeDetail}><a href={safeCmsUrl(cms.contact_facebook_url)} target="_blank" rel="noopener noreferrer">{cms.contact_facebook_label || 'City Facebook page'}</a></p>}
              {cms.contact_support_email && (
                <p className={styles.officeDetail}>
                  <span>Support: </span>
                  <a href={`mailto:${cms.contact_support_email}`}>{cms.contact_support_email}</a>
                </p>
              )}
              <p className={styles.officeDetail}>
                <span>SWMO trunkline: </span>
                <a href={officialContacts.swmoTel}>{officialContacts.swmoPhone}</a>{officialContacts.extension&&` local ${officialContacts.extension}`}
              </p>
              {cms.contact_operating_hours && (
                <p className={styles.officeDetail}>
                  <span>Hours: </span>
                  {cms.contact_operating_hours}
                </p>
              )}
            </div>
          </div>

          <FooterContactForm cms={cms} />
        </div>

        <div className={styles.footerBottomBar}>
          <span>EcoPin · City Government of Pasig</span>
          <span>Small actions. A cleaner Pasig.</span>
        </div>
      </footer>
  )
}
