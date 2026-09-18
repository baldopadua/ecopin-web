'use client'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <nav className="sticky top-0 z-50 flex items-center px-10 sm:px-16 py-6">
      <a href={isHome ? '#home' : '/'} className="text-text-primary font-bold text-xl tracking-tight">
        EcoPin<span className="text-accent-green">.AI</span>
      </a>
      <div className="hidden sm:flex items-center gap-8 ml-auto">
        <a
          href={isHome ? '#home' : '/'}
          className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
        >
          Home
        </a>
        <a
          href={isHome ? '#about' : '/#about'}
          className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
        >
          About
        </a>
        <a
          href={isHome ? '#downloads' : '/#downloads'}
          className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
        >
          Downloads
        </a>
        {pathname !== '/auth' && (
          <a
            href="/auth"
            className="px-5 py-2 text-sm font-semibold text-white dark:text-black bg-primary hover:bg-primary-dark rounded-full transition-all"
          >
            Log In
          </a>
        )}
      </div>
    </nav>
  )
}
