'use client'
import React from 'react'
import styles from './LoadingScreen.module.css'

export default function LoadingScreen({ 
  mode = 'static', // 'in' | 'out' | 'static'
  variant = 'iris', // 'iris' | 'veil' | 'slide'
  label = 'Loading workspace',
  badgeLabel = 'EcoPin System Sync',
  showText = true,
  showProgress = true,
  showBadge = true,
  className = '',
  onAnimationEnd
}) {
  const getTransitionClass = () => {
    if (mode === 'in') {
      if (variant === 'veil') return styles.enterVeil
      if (variant === 'slide') return styles.enterSlide
      return styles.enterIris
    }
    if (mode === 'out') {
      if (variant === 'veil') return styles.exitVeil
      if (variant === 'slide') return styles.exitSlide
      return styles.exitIris
    }
    return styles.static
  }

  return (
    <div 
      className={`${styles.overlay} ${getTransitionClass()} ${
        mode === 'out' ? 'pointer-events-none' : 'pointer-events-auto'
      } ${className}`}
      onAnimationEnd={onAnimationEnd}
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading EcoPin'}
    >
      {/* High-Tech Tactical Geo-Grid Texture */}
      <div className={styles.gridBackdrop} aria-hidden="true" />

      {/* Atmospheric Luminous Aura */}
      <div className={styles.ambientAura} aria-hidden="true" />

      {/* Concentric Telemetry Radar Rings */}
      <div className={styles.radarContainer} aria-hidden="true">
        <div className={styles.radarRing} />
        <div className={styles.radarRingInner} />
        <div className={styles.pulseWave} />
        <div className={`${styles.pulseWave} ${styles.pulseWaveDelay}`} />
      </div>

      {/* Center Stage Card & Telemetry */}
      <div className={styles.content}>
        {/* Live Telemetry Status Pill */}
        {showBadge && (
          <div className={styles.telemetryBadge} aria-hidden="true">
            <span className={styles.telemetryPing} />
            <span>{badgeLabel}</span>
          </div>
        )}

        {/* Sculpted Double-Bezel Glass Card */}
        <div className={styles.glassCard}>
          <div className={styles.glassSheen} aria-hidden="true" />
          <img 
            src="/Auth Logo.png" 
            alt="EcoPin" 
            className={styles.logo}
          />
        </div>

        {/* High-Precision Laser Filament Progress */}
        <div className={styles.progressContainer}>
          {showProgress && (
            <div className={styles.progressRail} aria-hidden="true">
              <div className={styles.progressBeam} />
            </div>
          )}

          {/* Staggered Status Text */}
          {showText && (
            <div className={styles.statusLabel}>
              <span>{label}</span>
              <span className={styles.ellipsis} aria-hidden="true">
                <span className={styles.dot}>.</span>
                <span className={styles.dot}>.</span>
                <span className={styles.dot}>.</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
