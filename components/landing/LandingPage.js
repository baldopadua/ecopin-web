'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowDown, ArrowRight, Camera, CheckCircle2, Download, Leaf, Loader2, MapPin, ShieldCheck, Smartphone, Megaphone, Info, AlertTriangle } from 'lucide-react'
import styles from './LandingPage.module.css'
import usePublicTheme from './usePublicTheme'
import useLandingMotion from './useLandingMotion'
import LandingNavigation from './LandingNavigation'
import PublicFooter from './PublicFooter'
import PublicLoadingState from '@/components/ui/PublicLoadingState'
import { usePublicCms } from '@/components/public/PublicSiteProvider'
import { safeCmsUrl } from '@/lib/public-cms.mjs'

const LandingMap = dynamic(() => import('./LandingMap'), {
  ssr: false,
  loading: () => <PublicLoadingState label="Loading the Pasig map…" />,
})

const steps = [
  { icon: Camera, title: 'See it. Capture it.', text: 'Spotted waste, flooding, or another environmental concern? Take a clear photo using the app.' },
  { icon: MapPin, title: 'Put it on the map.', text: 'Confirm the location and add a short description so the issue is easier to find.' },
  { icon: CheckCircle2, title: 'Send it. Stay updated.', text: 'Submit your report for review, then follow its progress in the app.' },
]

function LandingPhoto({ src, alt, fill = true, sizes, className = '', style, priority }) {
  const [isLoaded, setIsLoaded] = useState(false)
  return (
    <>
      {!isLoaded && (
        <span
          className="absolute inset-0 z-10 flex items-center justify-center bg-surface-elevated/70 backdrop-blur-xs select-none pointer-events-none"
          role="status"
          aria-label="Loading photo..."
        >
          <span className="p-2.5 rounded-full bg-surface/80 dark:bg-surface-elevated/80 border border-border/40 shadow-xs flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" aria-hidden="true" />
          </span>
        </span>
      )}
      <Image
        src={src}
        alt={alt}
        fill={fill}
        sizes={sizes}
        priority={priority}
        className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={style}
        onLoad={() => setIsLoaded(true)}
      />
    </>
  )
}

export default function LandingPage() {
  const { isDark, toggleTheme } = usePublicTheme()
  const heroRef = useRef(null)
  const pageRef = useRef(null)
  useLandingMotion(pageRef)

  const { cms } = usePublicCms()

  return (
    <div className={styles.page} ref={pageRef} data-motion="full">
      <a href="#main-content" className={styles.skipLink}>Skip to content</a>
      <LandingNavigation
        heroRef={heroRef}
        isDark={isDark}
        toggleTheme={toggleTheme}
        banner={
          cms.announcement_enabled && cms.announcement_message ? (
            <aside
              className={`${styles.announcementBanner} ${
                cms.announcement_severity === 'urgent'
                  ? styles.announcementBannerUrgent
                  : cms.announcement_severity === 'warning'
                  ? styles.announcementBannerWarning
                  : styles.announcementBannerInfo
              }`}
              role="alert"
            >
              <Megaphone size={16} className="shrink-0" />
              <span>
                {cms.announcement_title ? <strong>{cms.announcement_title}: </strong> : null}
                {cms.announcement_message}
              </span>
              {safeCmsUrl(cms.announcement_link_url) && (
                <a
                  href={safeCmsUrl(cms.announcement_link_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.announcementLink}
                >
                  {cms.announcement_link_text || 'Learn more'} <ArrowRight size={13} />
                </a>
              )}
            </aside>
          ) : null
        }
      />

      <main id="main-content">
        <section ref={heroRef} className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.heroCopy} data-reveal>
            <a href="#about" className={styles.eyebrow}><span className={styles.greenDot} /> Small actions. A better city. <ArrowRight size={14} /></a>
            <h1 id="hero-heading">A cleaner Pasig<br />starts with <span className={styles.inlinePin}><MapPin aria-hidden="true" /></span> <span className={styles.blueText}>us.</span></h1>
            <p>See what’s happening in your neighborhood.<br className={styles.desktopBreak} /> Report a concern. Help care for the city we call home.</p>
            <div className={styles.heroActions}>
              <Link href="/explore" className={styles.primaryButton}>Explore the map <ArrowRight size={18} /></Link>
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
          </div>
          <div className={styles.features}>
            <article data-reveal="100"><div className={styles.featureIcon}><MapPin /></div><h3>Know what’s nearby.</h3><p>Explore reported concerns across Pasig. Tap a pin to see the issue and its status.</p></article>
            <article data-reveal="200"><div className={`${styles.featureIcon} ${styles.greenIcon}`}><ShieldCheck /></div><h3>See the bigger picture.</h3><p>Prefer browsing reports one by one? Switch to the gallery for a closer look.</p></article>
            <div className={styles.communityNote} data-reveal="200"><Leaf size={30} /><p>Every report is a small step toward<br /><strong>a cleaner, more caring Pasig.</strong></p><span>It starts with noticing.</span></div>
          </div>
        </section>

        <section className={styles.community} aria-labelledby="community-heading">
          <div className={styles.communityHeading} data-reveal>
            <div><span className={styles.sectionLabel}><Leaf size={16} /> SWMO field crews in action</span><h2 id="community-heading">{cms.lead_story_title || 'From reports to response.'}</h2></div>
            <p>{cms.lead_story_subtitle || 'Meet the field crews of Pasig’s Solid Waste Management Office (SWMO), working on the ground to collect waste and clear neighborhood streets.'}</p>
          </div>
          <div className={styles.photoStory}>
            <figure className={styles.photoLead} data-reveal>
              <div className={styles.photoFrame}><LandingPhoto src={cms.lead_photo_url || '/images/community/street-cleanup.jpg'} alt="A Pasig cleanup vehicle collecting roadside waste beside a blue fence" fill sizes="(max-width: 767px) 100vw, 65vw" /></div>
              <figcaption>
                <span>{cms.lead_photo_caption || 'Pasig Solid Waste Management Office'}</span>
                <strong>{cms.lead_photo_tagline || 'On the ground. Getting it done.'}</strong>
                <span className={styles.leadCredit}>
                  Photography courtesy of{' '}
                  <a href="https://www.facebook.com/share/p/19hk6BA5W8/" target="_blank" rel="noopener noreferrer">Pasig Tayo</a>{' '}
                  (<a href="https://www.facebook.com/jonah.talagtag.77" target="_blank" rel="noopener noreferrer">Jonah Talagtag</a>)
                </span>
              </figcaption>
            </figure>
            <div className={styles.photoDetails}>
              <figure data-reveal="100"><div className={styles.photoFrame}><LandingPhoto src={cms.gallery_photo_1_url || '/images/community/neighborhood-team.jpg'} alt="SWMO field crew members lifting collected waste into a truck" fill sizes="(max-width: 767px) 100vw, 35vw" /></div><figcaption>{cms.gallery_photo_1_caption || 'SWMO crews collecting waste.'}</figcaption></figure>
              <figure data-reveal="200"><div className={styles.photoFrame}><LandingPhoto src={cms.gallery_photo_2_url || '/images/community/working-together.jpg'} alt="Two SWMO field crew members carrying a large piece of wood together beside a collection truck" fill sizes="(max-width: 767px) 100vw, 35vw" /></div><figcaption>{cms.gallery_photo_2_caption || 'Working together to clear bulky debris.'}</figcaption></figure>
            </div>
          </div>
          <div className={styles.communityFoot} data-reveal><p>Notice a concern in your area? Give it a place on the map.</p></div>
        </section>

        <section id="mobile-app" className={styles.mobileSection} aria-labelledby="mobile-heading">
          <div className={styles.phoneStage} data-reveal="100">
            <div className={styles.phoneOrbit} aria-hidden="true" />
            <div
              className={styles.phoneTilt}
              onPointerMove={event => {
                if (event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return
                const bounds = event.currentTarget.getBoundingClientRect()
                event.currentTarget.style.setProperty('--tilt-x', `${(0.5 - (event.clientY - bounds.top) / bounds.height) * 12}deg`)
                event.currentTarget.style.setProperty('--tilt-y', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 16}deg`)
              }}
              onPointerLeave={event => {
                event.currentTarget.style.removeProperty('--tilt-x')
                event.currentTarget.style.removeProperty('--tilt-y')
              }}
            >
              <div className={styles.phone}>
                <Image
                  src={`/images/app/welcome-${isDark ? 'dark' : 'light'}.webp`}
                  alt="EcoPin Android welcome screen: A cleaner Pasig starts with us, with sign in and create account options"
                  width={648}
                  height={1476}
                  sizes="(max-width: 480px) 210px, 248px"
                  draggable={false}
                />
              </div>
            </div>
            <span className={styles.phoneCaption}><CheckCircle2 size={16} /> A small action, wherever you are.</span>
          </div>
          <div className={styles.mobileCopy} data-reveal>
            <span className={styles.sectionLabel}><Smartphone size={16} /> EcoPin in your pocket</span>
            <h2 id="mobile-heading">Notice something?<br /><span className={styles.blueText}>Make it count.</span></h2>
            <p>Turn a photo into a report. With the EcoPin Android app, you can share environmental concerns and follow what happens next.</p>
            <ul><li><CheckCircle2 /> Add a photo and the location</li><li><CheckCircle2 /> Describe the issue in your own words</li><li><CheckCircle2 /> Keep track of your reports</li></ul>
            <a href={safeCmsUrl(cms.app_download_url, "/ecopin-app-release.apk")} download className={styles.primaryButton}><Download size={18} /> Download for Android <ArrowRight size={18} /></a>
            {cms.app_version_name && <p>Latest release: {cms.app_version_name}</p>}
            {cms.app_release_notes && <p className="whitespace-pre-line">{cms.app_release_notes}</p>}
            {safeCmsUrl(cms.app_playstore_url) && <a href={safeCmsUrl(cms.app_playstore_url)} className={styles.textButton} target="_blank" rel="noopener noreferrer">Get it on Google Play <ArrowRight size={18} /></a>}
            <span className={styles.downloadNote}>Free Android app · Direct APK download</span>
            <a href="/downloads" className={styles.installHelp}>Need help installing? <ArrowRight size={14} /></a>
          </div>
        </section>

        <section id="how-it-works" className={styles.guide} aria-labelledby="guide-heading">
          <div className={styles.guideHeading} data-reveal><div><span className={styles.sectionLabel}>From noticing to taking action</span><h2 id="guide-heading">Three simple steps.<br />One meaningful difference.</h2></div><p>No complicated forms. Just share what you see.<br />Here’s how to get started in the EcoPin app.</p></div>
          <ol className={styles.steps}>{steps.map(({ icon: Icon, title, text }, index) => <li key={title} data-reveal={index * 100}><div className={styles.stepTop}><span>0{index + 1}</span><Icon size={24} /></div><h3>{title}</h3><p>{text}</p></li>)}</ol>
          <div className={styles.guideNote}><ShieldCheck size={20} /><p>Reports are reviewed before they appear on the public map. Please share accurate details and avoid including other people’s personal information.</p></div>
        </section>

        <section className={styles.closing}><div data-reveal><Leaf size={28} /><h2>A better Pasig begins<br />with the people in it.</h2></div></section>
      </main>
      <PublicFooter isDark={isDark} settings={cms} />
      {/* Photo attribution and delete account compliance anchors */}
      <span className="sr-only">
        <Link href="/delete-account">Delete account</Link>
        <span className={styles.photoCredit}>
          Photography courtesy of <a href="https://www.facebook.com/share/p/19hk6BA5W8/" target="_blank" rel="noopener noreferrer">Pasig Tayo</a> (<a href="https://www.facebook.com/jonah.talagtag.77" target="_blank" rel="noopener noreferrer">Jonah Talagtag</a>)
        </span>
      </span>
    </div>
  )
}




