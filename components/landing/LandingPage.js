'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowDown, ArrowRight, Camera, CheckCircle2, Download, Leaf, MapPin, ShieldCheck, Smartphone, Send } from 'lucide-react'
import styles from './LandingPage.module.css'
import usePublicTheme from './usePublicTheme'
import useLandingMotion from './useLandingMotion'
import LandingNavigation from './LandingNavigation'

const LandingMap = dynamic(() => import('./LandingMap'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading} role="status">Loading the Pasig map…</div>,
})

const steps = [
  { icon: Camera, title: 'See it. Capture it.', text: 'Spotted waste, flooding, or another environmental concern? Take a clear photo using the app.' },
  { icon: MapPin, title: 'Put it on the map.', text: 'Confirm the location and add a short description so the issue is easier to find.' },
  { icon: CheckCircle2, title: 'Send it. Stay updated.', text: 'Submit your report for review, then follow its progress in the app.' },
]

export default function LandingPage() {
  const { isDark, toggleTheme } = usePublicTheme()
  const heroRef = useRef(null)
  const pageRef = useRef(null)
  useLandingMotion(pageRef)

  const [emailForm, setEmailForm] = useState({
    name: '',
    subject: '',
    message: '',
    recipient: 'ecopinmail@gmail.com'
  })
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailError, setEmailError] = useState(null)
  const [emailSuccess, setEmailSuccess] = useState(null)
  const formRef = useRef(null)

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setEmailSending(true)
    setEmailError(null)

    try {
      const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3000'
      console.log('Contact form submitting to:', `${API_BASE}/api/contact/send`)

      const response = await fetch(`${API_BASE}/api/contact/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: emailForm.name,
          email: 'no-reply@ecopin.com',
          subject: emailForm.subject,
          message: emailForm.message,
          recipient: emailForm.recipient
        })
      })

      let data
      try {
        data = await response.json()
      } catch {
        data = { message: 'Server error. Please try again.' }
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message')
      }

      setEmailSuccess('Message sent successfully! We\'ll get back to you soon.')
      setEmailForm({
        name: '',
        subject: '',
        message: '',
        recipient: 'ecopinmail@gmail.com'
      })

      setTimeout(() => {
        setEmailSuccess(null)
        setShowEmailForm(false)
      }, 3000)
    } catch (error) {
      console.error('Error sending contact form:', error)

      // Better error messages based on error type
      let errorMessage = 'Failed to send message. Please try again or email us directly.'
      if (error.message === 'Failed to fetch') {
        errorMessage = 'Unable to connect to server. Please email us directly at ' + emailForm.recipient
      }

      setEmailError(errorMessage)
    } finally {
      setEmailSending(false)
    }
  }

  const handleEmailChange = (e) => {
    setEmailForm({ ...emailForm, [e.target.name]: e.target.value })
  }

  const handleContactCardClick = (recipient) => {
    setShowEmailForm(true)
    setEmailForm({ ...emailForm, recipient })
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  return (
    <div className={styles.page} ref={pageRef} data-motion="full">
      <a href="#main-content" className={styles.skipLink}>Skip to content</a>
      <LandingNavigation heroRef={heroRef} isDark={isDark} toggleTheme={toggleTheme} />

      <main id="main-content">
        <section ref={heroRef} className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.heroCopy} data-reveal>
            <a href="#about" className={styles.eyebrow}><span className={styles.greenDot} /> Small actions. A better city. <ArrowRight size={14} /></a>
            <h1 id="hero-heading">A cleaner Pasig<br />starts with <span className={styles.inlinePin}><MapPin aria-hidden="true" /></span> <span className={styles.blueText}>us.</span></h1>
            <p>See what’s happening in your neighborhood.<br className={styles.desktopBreak} /> Report a concern. Help care for the city we call home.</p>
            <div className={styles.heroActions}>
              <Link href="/explore" className={styles.primaryButton}>Explore the map <ArrowRight size={18} /></Link>
              <a href="#mobile-app" className={styles.textButton}><Smartphone size={18} /> Get the EcoPin app</a>
            </div>
          </div>
          <div className={styles.mapSection}><LandingMap isDark={isDark} /></div>
        </section>

        <div className={styles.promiseStrip} aria-label="About the public reports">
          <div><MapPin /><p><strong>Rooted in Pasig</strong><span>Your city, on one map</span></p></div>
          <div><ShieldCheck /><p><strong>Reviewed reports</strong><span>A clearer view of local concerns</span></p></div>
          <div><Smartphone /><p><strong>Made for citizens</strong><span>Report from your Android phone</span></p></div>
          <a href="#about" aria-label="Learn more about EcoPin"><ArrowDown size={20} /></a>
        </div>

        <section id="about" className={styles.about} aria-labelledby="about-heading">
          <div className={styles.sectionIntro} data-reveal>
            <span className={styles.sectionLabel}><Leaf size={16} /> A little care goes a long way</span>
            <h2 id="about-heading">Your neighborhood.<br />Our shared responsibility.</h2>
            <p>EcoPin connects the things you notice every day with the people who can help. Together, we can make environmental concerns easier to see, report, and follow.</p>
            <Link href="/explore" className={styles.textButton}>See public reports <ArrowRight size={18} /></Link>
          </div>
          <div className={styles.features}>
            <article data-reveal="100"><div className={styles.featureIcon}><MapPin /></div><h3>Know what’s nearby.</h3><p>Explore reported concerns across Pasig. Tap a pin to see the issue and its status.</p><Link href="/explore">Open map <ArrowRight size={16} /></Link></article>
            <article data-reveal="200"><div className={`${styles.featureIcon} ${styles.greenIcon}`}><ShieldCheck /></div><h3>See the bigger picture.</h3><p>Prefer browsing reports one by one? Switch to the gallery for a closer look.</p><Link href="/explore?view=gallery">Browse gallery <ArrowRight size={16} /></Link></article>
            <div className={styles.communityNote} data-reveal="200"><Leaf size={30} /><p>Every report is a small step toward<br /><strong>a cleaner, more caring Pasig.</strong></p><span>It starts with noticing.</span></div>
          </div>
        </section>

        <section className={styles.community} aria-labelledby="community-heading">
          <div className={styles.communityHeading} data-reveal>
            <div><span className={styles.sectionLabel}><Leaf size={16} /> SWMO field crews in action</span><h2 id="community-heading">From reports to response.</h2></div>
            <p>Meet the field crews of Pasig’s Solid Waste Management Office (SWMO), working on the ground to collect waste and clear neighborhood streets.</p>
          </div>
          <div className={styles.photoStory}>
            <figure className={styles.photoLead} data-reveal>
              <div className={styles.photoFrame}><Image src="/images/community/street-cleanup.jpg" alt="A Pasig cleanup vehicle collecting roadside waste beside a blue fence" fill sizes="(max-width: 767px) 100vw, 65vw" /></div>
              <figcaption>
                <span>Pasig Solid Waste Management Office</span>
                <strong>On the ground. Getting it done.</strong>
                <span className={styles.leadCredit}>
                  Photo:{' '}
                  <a href="https://www.facebook.com/share/p/19hk6BA5W8/" target="_blank" rel="noopener noreferrer">Pasig Tayo</a>{' '}
                  (<a href="https://www.facebook.com/jonah.talagtag.77" target="_blank" rel="noopener noreferrer">Jonah Talagtag</a>)
                </span>
              </figcaption>
            </figure>
            <div className={styles.photoDetails}>
              <figure data-reveal="100"><div className={styles.photoFrame}><Image src="/images/community/neighborhood-team.jpg" alt="SWMO field crew members lifting collected waste into a truck" fill sizes="(max-width: 767px) 100vw, 35vw" /></div><figcaption>SWMO crews collecting waste.</figcaption></figure>
              <figure data-reveal="200"><div className={styles.photoFrame}><Image src="/images/community/working-together.jpg" alt="Two SWMO field crew members carrying a large piece of wood together beside a collection truck" fill sizes="(max-width: 767px) 100vw, 35vw" /></div><figcaption>Working together to clear bulky debris.</figcaption></figure>
            </div>
          </div>
          <div className={styles.communityFoot} data-reveal><p>Notice a concern in your area? Give it a place on the map.</p><a href="#mobile-app" className={styles.textButton}>Start with the EcoPin app <ArrowRight size={18} /></a></div>
        </section>

        <section id="mobile-app" className={styles.mobileSection} aria-labelledby="mobile-heading">
          <div className={styles.phoneStage} data-reveal="100">
            <div className={styles.phoneOrbit} aria-hidden="true" />
            <div className={styles.phone} aria-label="Illustration of the EcoPin mobile reporting app">
              <div className={styles.phoneCamera} />
              <div className={styles.phoneHeader}><Image src="/Solo Logo Light.png" alt="" width={24} height={24} style={{ width: 'auto', height: 'auto' }} /><strong>EcoPin</strong><span>Pasig City</span></div>
              <div className={styles.phoneMap}><Image src="/pasig.svg" alt="" width={400} height={400} unoptimized /><span className={styles.phonePin}><MapPin size={30} /></span><span className={styles.phonePinSmall}><MapPin size={22} /></span><div className={styles.phoneLocation}><MapPin size={14} /> Your neighborhood</div></div>
              <div className={styles.phoneSheet}><span>Make a difference nearby</span><strong>What did you notice?</strong><div><Camera size={18} /> Capture an issue <ArrowRight size={16} /></div><small>Photo · Location · Description</small></div>
              <div className={styles.phoneHome} />
            </div>
            <span className={styles.phoneCaption}><CheckCircle2 size={16} /> A small action, wherever you are.</span>
          </div>
          <div className={styles.mobileCopy} data-reveal>
            <span className={styles.sectionLabel}><Smartphone size={16} /> EcoPin in your pocket</span>
            <h2 id="mobile-heading">Notice something?<br /><span className={styles.blueText}>Make it count.</span></h2>
            <p>Turn a photo into a report. With the EcoPin Android app, you can share environmental concerns and follow what happens next.</p>
            <ul><li><CheckCircle2 /> Add a photo and the location</li><li><CheckCircle2 /> Describe the issue in your own words</li><li><CheckCircle2 /> Keep track of your reports</li></ul>
            <a href="/ecopin-app-release.apk" download className={styles.primaryButton}><Download size={18} /> Download for Android <ArrowRight size={18} /></a>
            <span className={styles.downloadNote}>Free Android app · Direct APK download</span>
            <a href="/downloads" className={styles.installHelp}>Need help installing? <ArrowRight size={14} /></a>
          </div>
        </section>

        <section id="how-it-works" className={styles.guide} aria-labelledby="guide-heading">
          <div className={styles.guideHeading} data-reveal><div><span className={styles.sectionLabel}>From noticing to taking action</span><h2 id="guide-heading">Three simple steps.<br />One meaningful difference.</h2></div><p>No complicated forms. Just share what you see.<br />Here’s how to get started in the EcoPin app.</p></div>
          <ol className={styles.steps}>{steps.map(({ icon: Icon, title, text }, index) => <li key={title} data-reveal={index * 100}><div className={styles.stepTop}><span>0{index + 1}</span><Icon size={24} /></div><h3>{title}</h3><p>{text}</p></li>)}</ol>
          <div className={styles.guideNote}><ShieldCheck size={20} /><p>Reports are reviewed before they appear on the public map. Please share accurate details and avoid including other people’s personal information.</p></div>
        </section>

        <section className={styles.closing}><div data-reveal><Leaf size={28} /><h2>A better Pasig begins<br />with the people in it.</h2><a href="#mobile-app" className={styles.primaryButton}>Take the first step <ArrowRight size={18} /></a></div></section>
      </main>
      <section className={styles.contactSection}>
        <div className={styles.contactContent}>
          <h2 className={styles.contactHeading}>Contact Us</h2>
          <div className={styles.contactGrid}>
            <div className={styles.contactCard} onClick={() => handleContactCardClick('ecopinmail@gmail.com')}>
              <div className={styles.contactCardContent}>
                <span className={styles.contactCardLabel}>EcoPin Support</span>
                <span className={styles.contactCardLink}>ecopinmail@gmail.com</span>
              </div>
              <ArrowRight size={16} className={styles.clickIndicator} />
            </div>
            <div className={styles.contactCard} onClick={() => handleContactCardClick('swmo@pasigcity.gov.ph')}>
              <div className={styles.contactCardContent}>
                <span className={styles.contactCardLabel}>Solid Waste Management Office</span>
                <div className={styles.contactCardDetails}>
                  <span className={styles.contactCardLink}>swmo@pasigcity.gov.ph</span>
                  <span className={styles.contactSeparator}>·</span>
                  <a href="tel:09173726888" className={styles.contactCardLink} onClick={(e) => e.stopPropagation()}>09173726888</a>
                </div>
              </div>
              <ArrowRight size={16} className={styles.clickIndicator} />
            </div>
          </div>

          {showEmailForm && (
            <div className={styles.emailFormContainer} ref={formRef}>
              <div className={styles.emailFormHeader}>
                <h3 className={styles.emailFormHeading}>Send us a message</h3>
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className={styles.closeFormButton}
                  aria-label="Close form"
                >
                  ×
                </button>
              </div>
              <div className={styles.recipientBadge}>
                To: {emailForm.recipient}
              </div>
              {emailError && (
                <div className={styles.errorMessage}>
                  {emailError}
                </div>
              )}
              {emailSuccess && (
                <div className={styles.successMessage}>
                  {emailSuccess}
                </div>
              )}
              <form onSubmit={handleEmailSubmit} className={styles.emailForm}>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="contact-name" className={styles.formLabel}>Name</label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    value={emailForm.name}
                    onChange={handleEmailChange}
                    className={styles.formInput}
                    placeholder="Your name"
                    required
                  />
                </div>
              </div>
              <div className={styles.formField}>
                <label htmlFor="contact-subject" className={styles.formLabel}>Subject</label>
                <input
                  id="contact-subject"
                  name="subject"
                  type="text"
                  value={emailForm.subject}
                  onChange={handleEmailChange}
                  className={styles.formInput}
                  placeholder="What is this about?"
                  required
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="contact-message" className={styles.formLabel}>Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={emailForm.message}
                  onChange={handleEmailChange}
                  className={styles.formTextarea}
                  placeholder="Tell us more..."
                  rows={5}
                  required
                />
              </div>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={emailSending}
              >
                {emailSending ? 'Sending...' : emailSent ? 'Sent!' : <><Send size={18} /> Send Message</>}
              </button>
            </form>
            </div>
          )}
        </div>
      </section>
      <footer className={styles.footer}>
        <Link href="/" aria-label="EcoPin home"><Image src={isDark ? '/Full Logo Dark.png' : '/Full Logo Light.png'} alt="EcoPin" width="100" height="28" /></Link>
        <div className={styles.footerCopy}>
          <p>Small actions. A cleaner Pasig.</p>
          <p className={styles.photoCredit}>
            Photography courtesy of{' '}
            <a href="https://www.facebook.com/share/p/19hk6BA5W8/" target="_blank" rel="noopener noreferrer">Pasig Tayo</a>{' '}
            (<a href="https://www.facebook.com/jonah.talagtag.77" target="_blank" rel="noopener noreferrer">Jonah Talagtag</a>)
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/explore">Map</Link>
          <Link href="/explore?view=gallery">Gallery</Link>
          <a href="#how-it-works">Citizen guide</a>
          <Link href="/delete-account">Delete account</Link>
        </nav>
        <span>EcoPin · Pasig City</span>
      </footer>
    </div>
  )
}




