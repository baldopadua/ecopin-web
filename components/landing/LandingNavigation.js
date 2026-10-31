'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Compass, Home, Info, Menu, Moon, Smartphone, Sun, UserRound, X } from 'lucide-react'
import SecureImage from '@/components/ui/SecureImage'
import usePublicAccount from './usePublicAccount'
import styles from './LandingPage.module.css'

const links = [
  { label: 'Home', href: '#main-content', icon: Home },
  { label: 'Explore', href: '/explore', icon: Compass },
  { label: 'About', href: '#about', icon: Info },
  { label: 'Download', railLabel: 'Download App', href: '#mobile-app', icon: Smartphone },
]

function NavLink({ href, children, ...props }) {
  return href.startsWith('#') ? <a href={href} {...props}>{children}</a> : <Link href={href} {...props}>{children}</Link>
}

export default function LandingNavigation({ heroRef, isDark, toggleTheme, activePage, banner }) {
  const [rail, setRail] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const { user, hasSession } = usePublicAccount()
  const accountLabel = hasSession ? `Open account${user?.full_name ? ` for ${user.full_name}` : ''}` : 'Sign in'
  const themeLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode'
  const ThemeIcon = isDark ? Sun : Moon
  const avatar = <span className={styles.accountAvatar}><SecureImage src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.email || 'User')}&background=random&color=fff&size=64`} alt="" /></span>

  // The floating quick-nav rail is desktop/tablet only; phones keep the sticky header and menu.
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const update = () => setCompact(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!heroRef?.current) return
    const observer = new IntersectionObserver(([entry]) => setRail(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0))
    if (heroRef.current) observer.observe(heroRef.current)
    return () => observer.disconnect()
  }, [heroRef])

  const railActive = rail && !compact
  const destinations = links.map(item => ({ ...item, href: !heroRef && item.href.startsWith('#') ? `/${item.href === '#main-content' ? '' : item.href}` : item.href }))

  return <>
    <div className={`${styles.navSpacer} ${banner ? styles.navSpacerWithBanner : ''}`} />
    <header className={`${styles.header} ${banner ? styles.headerWithBanner : ''} ${railActive ? styles.headerHidden : ''}`} inert={railActive} aria-hidden={railActive}>
      {banner}
      <div className={styles.headerBar}>
        <Link href="/" className={styles.brand} aria-label="EcoPin home"><Image src={isDark ? '/Full Logo Dark.png' : '/Full Logo Light.png'} alt="EcoPin" width={112} height={32} /></Link>
        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`} aria-label="Main navigation" onClick={() => setMenuOpen(false)}>
          {destinations.map(item => <NavLink key={item.label} href={item.href} aria-current={activePage === item.label ? 'page' : undefined}>{item.label}</NavLink>)}
        </nav>
        <div className={styles.headerActions}>
          <button onClick={toggleTheme} className={styles.iconButton} aria-label={themeLabel}><ThemeIcon size={19} /></button>
          <Link href={hasSession ? '/dashboard' : '/auth'} className={hasSession ? styles.profileButton : styles.signIn} aria-label={accountLabel}>
            {hasSession ? avatar : <>Sign in <ArrowRight size={16} /></>}
          </Link>
          <button className={`${styles.iconButton} ${styles.menuButton}`} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
    </header>
    {heroRef && !compact && <nav className={`${styles.sideNav} ${railActive ? styles.sideNavVisible : ''}`} aria-label="Quick navigation" inert={!railActive} aria-hidden={!railActive}>
      {destinations.filter(item => item.href !== '/explore').map(({ label, railLabel, href, icon: Icon }) => <NavLink key={label} href={href} aria-label={railLabel || label} data-tooltip={railLabel || label}><Icon size={20} /></NavLink>)}
      <button onClick={toggleTheme} aria-label={themeLabel} data-tooltip={themeLabel}><ThemeIcon size={20} /></button>
      <Link href={hasSession ? '/dashboard' : '/auth'} aria-label={accountLabel} data-tooltip={hasSession ? 'My account' : 'Sign in'}>{hasSession ? avatar : <UserRound size={20} />}</Link>
    </nav>}
  </>
}
