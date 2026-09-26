'use client'
import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const PublicMap = dynamic(() => import('./PublicMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-black flex items-center justify-center text-[#ccff00] font-black text-4xl uppercase glitch-text" data-text="LOADING MAP...">LOADING MAP...</div>
})

export default function PublicMapPage() {
  const [theme, setTheme] = useState('dark')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    setTheme(isDarkMode ? 'dark' : 'light')

    const token = localStorage.getItem('authToken');
    if (token) {
      setHasSession(true);
      fetch(process.env.NEXT_PUBLIC_BACKEND_API_URL + '/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(console.error);
    }
  }, [])

  const toggleTheme = () => {
    if (theme === 'dark') {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setTheme('light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setTheme('dark')
    }
  }

  const isDark = theme === 'dark'

  return (
    <main
      className="h-screen w-full flex flex-col bg-white text-black dark:bg-black dark:text-white relative overflow-hidden selection:bg-[#ccff00] selection:text-black transition-colors duration-300"
      style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
    >
      {/* Header */}
      <header className="relative z-[1100] flex flex-shrink-0 items-center justify-between p-4 md:px-8 border-b-8 border-[#1a1a1a] dark:border-[#333333] bg-white dark:bg-black transition-colors duration-300 shadow-[0px_8px_0px_0px_#1a1a1a] dark:shadow-[0px_8px_0px_0px_rgba(204,255,0,0.2)]">
        <a href="/" className="text-2xl md:text-3xl font-black tracking-tighter cursor-pointer text-black dark:text-white hover:underline">
          ECOPIN<span className="text-[#3300FF]">.AI</span>
        </a>
        <nav className="hidden md:flex gap-6 items-center">
          <a href="/#about" className="text-sm font-bold uppercase tracking-widest hover:text-[#ccff00] hover:bg-black dark:hover:bg-white dark:hover:text-black px-2 py-1 transition-all">About</a>
          <a href="/#features" className="text-sm font-bold uppercase tracking-widest hover:text-[#ccff00] hover:bg-black dark:hover:bg-white dark:hover:text-black px-2 py-1 transition-all">Features</a>

          {/* Theme Toggler */}
          <button
            onClick={toggleTheme}
            className="p-2 border-2 border-[#1a1a1a] dark:border-[#333333] hover:bg-black hover:text-[#ccff00] dark:hover:bg-[#ccff00] dark:hover:text-black transition-colors flex items-center justify-center"
            title="Toggle Theme"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {hasSession ? (
            <a href="/dashboard" className="flex items-center gap-3 px-4 py-1.5 bg-[#ccff00] border-2 border-[#1a1a1a] dark:border-[#333333] hover:bg-black hover:text-[#ccff00] dark:hover:bg-white dark:hover:text-black transition-colors">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-6 h-6 object-cover border border-[#1a1a1a] dark:border-white" />
              ) : (
                <div className="w-6 h-6 bg-[#1a1a1a] dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs border border-[#1a1a1a] dark:border-white">
                  {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="text-sm font-black uppercase tracking-widest text-black inherit-text">Dashboard</span>
            </a>
          ) : (
            <a href="/auth" className="px-6 py-2 bg-[#ccff00] text-black text-sm font-black uppercase tracking-widest border-2 border-[#1a1a1a] dark:border-[#333333] hover:bg-black hover:text-[#ccff00] dark:hover:bg-white dark:hover:text-black transition-colors shadow-[2px_2px_0px_0px_#1a1a1a] dark:shadow-none">Login</a>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 border-2 border-[#1a1a1a] dark:border-[#333333] text-black dark:text-[#ccff00] hover:bg-black hover:text-[#ccff00] dark:hover:bg-[#ccff00] dark:hover:text-black transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          title="Toggle Menu"
        >
          {isMenuOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[1200] bg-white dark:bg-black flex flex-col items-center justify-center p-6 transition-colors duration-300">
          <nav className="flex flex-col gap-8 items-center w-full">
            <a href="/#about" onClick={() => setIsMenuOpen(false)} className="text-3xl font-black uppercase tracking-widest hover:text-[#ccff00] transition-colors">About</a>
            <a href="/#features" onClick={() => setIsMenuOpen(false)} className="text-3xl font-black uppercase tracking-widest hover:text-[#ccff00] transition-colors">Features</a>
            
            <button
              onClick={toggleTheme}
              className="mt-4 p-4 border-8 border-[#1a1a1a] dark:border-[#333333] hover:bg-black hover:text-[#ccff00] dark:hover:bg-[#ccff00] dark:hover:text-black transition-colors flex items-center justify-center gap-4 text-xl font-black uppercase"
            >
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>

            {hasSession ? (
              <a href="/dashboard" onClick={() => setIsMenuOpen(false)} className="mt-8 flex items-center justify-center gap-4 px-12 py-4 bg-[#ccff00] text-black text-2xl font-black uppercase tracking-widest border-8 border-[#1a1a1a] dark:border-[#333333] w-full text-center hover:bg-black hover:text-[#ccff00] transition-colors">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-8 h-8 object-cover border-2 border-[#1a1a1a]" />
                ) : (
                  <div className="w-8 h-8 bg-[#1a1a1a] text-white flex items-center justify-center font-bold text-sm border-2 border-[#1a1a1a]">
                    {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                Dashboard
              </a>
            ) : (
              <a href="/auth" onClick={() => setIsMenuOpen(false)} className="mt-8 px-12 py-4 bg-[#ccff00] text-black text-2xl font-black uppercase tracking-widest border-8 border-[#1a1a1a] dark:border-[#333333] w-full text-center hover:bg-black hover:text-[#ccff00] transition-colors">Login</a>
            )}
          </nav>
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 relative z-[1]">
        <PublicMap isDark={isDark} />
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
        .glitch-text {
          position: relative;
          display: inline-block;
        }
        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #000;
          color: #ccff00;
          opacity: 0;
          pointer-events: none;
        }
        .glitch-text:hover::before,
        .glitch-text:hover::after {
          opacity: 1;
        }
        .glitch-text:hover::before {
          left: 4px;
          text-shadow: -2px 0 red;
          animation: glitch-anim-1 0.2s infinite linear alternate-reverse;
          clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
        }
        .glitch-text:hover::after {
          left: -4px;
          text-shadow: -2px 0 blue;
          animation: glitch-anim-2 0.3s infinite linear alternate-reverse;
          clip-path: polygon(0 80%, 100% 20%, 100% 100%, 0 100%);
        }
        @keyframes glitch-anim-1 {
          0% { clip-path: inset(20% 0 80% 0); transform: translate(2px, 2px); }
          20% { clip-path: inset(60% 0 10% 0); transform: translate(-2px, -2px); }
          40% { clip-path: inset(40% 0 50% 0); transform: translate(2px, -2px); }
          60% { clip-path: inset(80% 0 5% 0); transform: translate(-2px, 2px); }
          80% { clip-path: inset(10% 0 70% 0); transform: translate(2px, 2px); }
          100% { clip-path: inset(30% 0 20% 0); transform: translate(-2px, -2px); }
        }
        @keyframes glitch-anim-2 {
          0% { clip-path: inset(10% 0 60% 0); transform: translate(-2px, -2px); }
          20% { clip-path: inset(30% 0 20% 0); transform: translate(2px, 2px); }
          40% { clip-path: inset(70% 0 10% 0); transform: translate(-2px, 2px); }
          60% { clip-path: inset(20% 0 50% 0); transform: translate(2px, -2px); }
          80% { clip-path: inset(90% 0 5% 0); transform: translate(-2px, -2px); }
          100% { clip-path: inset(40% 0 30% 0); transform: translate(2px, 2px); }
        }
      `}} />
    </main>
  )
}