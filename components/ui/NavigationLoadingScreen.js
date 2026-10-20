'use client'
import React from 'react'
import Image from 'next/image'
import { useNavigationLoading } from '@/components/context/NavigationLoadingContext'
import styles from './NavigationLoadingScreen.module.css'

export default function NavigationLoadingScreen() {
  const { isLoading, targetName } = useNavigationLoading()

  if (!isLoading) return null

  return (
    <aside
      className={styles.overlay}
      role="status"
      aria-live="polite"
      aria-label="Loading workspace view"
    >
      <div className={styles.topAccentBar} />
      <div className={styles.container}>
        {/* Animated Brand Emblem */}
        <div className={styles.emblemContainer}>
          <div className={styles.brandIconWrapper}>
            <Image
              src="/Solo Logo Light.png"
              width={42}
              height={65}
              alt="EcoPin"
              className={`${styles.brandIcon} dark:hidden`}
              priority
            />
            <Image
              src="/Solo Logo Dark.png"
              width={42}
              height={65}
              alt="EcoPin"
              className={`${styles.brandIcon} hidden dark:block`}
              priority
            />
          </div>
        </div>

        {/* Text Information */}
        <div className={styles.textContainer}>
          <div className={styles.routeBadge}>
            <span className={styles.statusDot} />
            <span>Switching View</span>
          </div>
          <h2 className={styles.title}>
            {targetName ? `Loading ${targetName}` : 'Loading page...'}
          </h2>
          <p className={styles.subtitle}>Synchronizing spatial data & workspace layout</p>
        </div>

        {/* Dynamic Progress Bar */}
        <div className={styles.progressTrack}>
          <div className={styles.progressBar} />
        </div>
      </div>
    </aside>
  )
}
