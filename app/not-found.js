'use client'

import Link from 'next/link'
import { Home, LayoutDashboard, MapPin, Compass, HelpCircle, ArrowRight } from 'lucide-react'
import LandingNavigation from '@/components/landing/LandingNavigation'
import PublicFooter from '@/components/landing/PublicFooter'
import usePublicTheme from '@/components/landing/usePublicTheme'
import publicStyles from '@/components/landing/LandingPage.module.css'
import styles from './NotFound.module.css'

export default function NotFound() {
  const { isDark, toggleTheme } = usePublicTheme()

  return (
    <div className={styles.page}>
      <LandingNavigation isDark={isDark} toggleTheme={toggleTheme} activePage="" />

      <main className={styles.main}>
        <div className={styles.container}>
          {/* Friendly EcoPin Custom Illustration */}
          <div className={styles.illustrationWrapper} aria-hidden="true">
            <div className={styles.mapRingBackdrop} />
            <svg
              className={styles.svgIllustration}
              viewBox="0 0 240 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Perspective Ground Grid / Contour */}
              <ellipse cx="120" cy="150" rx="90" ry="32" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="2" strokeDasharray="6 6" />
              <ellipse cx="120" cy="150" rx="60" ry="20" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
              
              {/* Radar scanner sweep */}
              <path d="M120 150 L190 135" stroke="#0052cc" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
              
              {/* Floating Leaf / Eco Spark */}
              <path
                d="M175 60 C175 60 190 65 195 80 C190 85 175 80 175 80 C175 80 170 65 175 60 Z"
                fill="#27754d"
                fillOpacity="0.8"
              />
              <path d="M175 80 L185 70" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />

              {/* Little Pasig river ribbon */}
              <path
                d="M50 160 C80 145 110 165 150 148 C170 140 190 152 205 146"
                stroke="#60a5fa"
                strokeWidth="4"
                strokeLinecap="round"
                strokeOpacity="0.5"
              />

              {/* Pin Shadow */}
              <ellipse cx="120" cy="150" rx="14" ry="6" fill="#000000" fillOpacity="0.18" />

              {/* Main Friendly 404 Map Pin */}
              <g transform="translate(95, 35)">
                <path
                  d="M25 0 C11.193 0 0 11.193 0 25 C0 42 25 75 25 75 C25 75 50 42 50 25 C50 11.193 38.807 0 25 0 Z"
                  fill="url(#pinGradient)"
                />
                <circle cx="25" cy="24" r="14" fill="#ffffff" />
                {/* Friendly Question / Magnifier Inside Pin */}
                <path
                  d="M22 17 C22 15.343 23.343 14 25 14 C26.657 14 28 15.343 28 17 C28 19 25 20.5 25 22.5"
                  stroke="#0052cc"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="25" cy="27" r="1.5" fill="#0052cc" />
              </g>

              {/* Small playful search sparkle */}
              <g transform="translate(60, 50)">
                <circle cx="10" cy="10" r="3" fill="#27754d" fillOpacity="0.7" />
                <path d="M10 3 L10 17 M3 10 L17 10" stroke="#27754d" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
              </g>

              {/* Gradient definitions */}
              <defs>
                <linearGradient id="pinGradient" x1="0" y1="0" x2="50" y2="75" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0052cc" />
                  <stop offset="1" stopColor="#1e40af" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className={styles.badge}>
            <MapPin size={14} /> 404 • Location Uncharted
          </div>

          <h1 className={styles.title}>
            Lost on the <span className={styles.blueText}>Pasig map?</span>
          </h1>

          <p className={styles.description}>
            We couldn’t find the page, report, or route you were looking for. The landmark might have moved, the report ID may be incorrect, or the link has expired.
          </p>

          <div className={styles.actionRow}>
            <Link href="/" className={styles.primaryButton}>
              <Home size={18} /> Return to Home
            </Link>
            <Link href="/dashboard" className={styles.secondaryButton}>
              <LayoutDashboard size={18} /> Go to Dashboard
            </Link>
            <Link href="/explore" className={styles.secondaryButton}>
              <Compass size={18} /> Explore Public Map
            </Link>
          </div>

          <div className={styles.quickLinks}>
            <span>Looking for something else?</span>
            <Link href="/help" className={styles.linkItem}>
              <HelpCircle size={15} /> FAQ & Support <ArrowRight size={13} />
            </Link>
            <Link href="/downloads" className={styles.linkItem}>
              Download Mobile App <ArrowRight size={13} />
            </Link>
            <Link href="/contact" className={styles.linkItem}>
              Contact SWMO <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter isDark={isDark} />
    </div>
  )
}
