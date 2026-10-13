'use client'
import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

import LoadingScreen from '@/components/ui/LoadingScreen'

const PublicMap = dynamic(() => import('./map/PublicMap'), {
  ssr: false,
  loading: () => <LoadingScreen mode="static" />
})

export default function HomePage() {
  const [theme, setTheme] = useState('light')
  const [user, setUser] = useState(null)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark' || (!savedTheme && isDarkMode)) {
      document.documentElement.classList.add('dark')
      setTheme('dark')
    } else {
      document.documentElement.classList.remove('dark')
      setTheme('light')
    }

    const token = localStorage.getItem('authToken')
    if (token) {
      setHasSession(true)
      fetch((process.env.NEXT_PUBLIC_BACKEND_API_URL || '') + '/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user)
      })
      .catch(console.error)
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

  return (
    <main className="h-screen w-full flex flex-col bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 overflow-hidden font-sans transition-colors duration-300">
      <PublicMap 
        user={user} 
        hasSession={hasSession} 
        theme={theme} 
        toggleTheme={toggleTheme} 
      />
    </main>
  )
}
