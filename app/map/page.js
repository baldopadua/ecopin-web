'use client'
import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const PublicMap = dynamic(() => import('./PublicMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-white dark:bg-black flex items-center justify-center transition-colors duration-300">
      
      <img src="/Auth Logo.png" alt="Loading..." className="h-20 md:h-24 w-auto object-contain animate-pulse" />
    </div>
  )
})

import Navbar from '../../components/layout/Navbar';

export default function PublicMapPage() {
  const [theme, setTheme] = useState('dark')
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
      className="h-screen w-full flex flex-col bg-[#F4F0EA] dark:bg-[#121212] text-black dark:text-white relative overflow-hidden transition-colors duration-300"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>

      {/* Shared Navbar Component */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4 pointer-events-none transition-all duration-300">
        <Navbar 
          theme={theme}
          toggleTheme={toggleTheme}
          hasSession={hasSession}
          user={user}
          isFloating={true}
        />
      </div>

      {/* Map Container */}
      <div className="absolute inset-0 z-[1] w-full h-full overflow-hidden">
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
        @keyframes slideUp {
          0% { transform: translateY(100%); }
          100% { transform: translateY(0); }
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






