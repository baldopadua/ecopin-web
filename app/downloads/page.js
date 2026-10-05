'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/layout/Navbar'
import { CheckCircle2, ShieldAlert, MapPin, Smartphone } from 'lucide-react'

export default function DownloadsPage() {
  const [downloadStarted, setDownloadStarted] = useState(false)
  const [isEntering, setIsEntering] = useState(true)
  const [theme, setTheme] = useState('light')
  const [hasSession, setHasSession] = useState(false)
  const [user, setUser] = useState(null)
  const [isExiting, setIsExiting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Theme setup
    const isDarkMode = document.documentElement.classList.contains('dark')
    setTheme(isDarkMode ? 'dark' : 'light')

    // Session setup
    const token = localStorage.getItem('authToken')
    if (token) {
      setHasSession(true)
      fetch(process.env.NEXT_PUBLIC_BACKEND_API_URL + '/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user)
      })
      .catch(console.error)
    }

    // End the cinematic enter wipe after 1s
    setTimeout(() => setIsEntering(false), 1000)

    // Automatically trigger download after a short delay
    const timer = setTimeout(() => {
      const a = document.createElement('a')
      a.href = '/ecopin-app-release.apk'
      a.download = 'ecopin-app-release.apk'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setDownloadStarted(true)
    }, 1500)

    return () => clearTimeout(timer)
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

  function handleBack(e) {
    e.preventDefault()
    setIsExiting(true)
    setTimeout(() => {
      router.push('/')
    }, 900)
  }

  if (isEntering) {
    return (
      <main className="min-h-screen bg-surface  relative flex items-center justify-center overflow-hidden transition-colors duration-300">
        {/* Logo underneath */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-0">
          <img src="/Full Logo Light.png" alt="EcoPin" className="h-10 sm:h-12 w-auto object-contain dark:hidden" />
          <img src="/Full Logo Dark.png" alt="EcoPin" className="h-10 sm:h-12 w-auto object-contain hidden dark:block" />
          <div className="mt-6 font-bold uppercase tracking-[0.3em] text-[10px] text-text-primary/50 /50 animate-pulse">
            Loading
          </div>
        </div>

        {/* Wipe overlay */}
        <div 
          className="fixed inset-0 bg-primary z-10" 
          style={{ 
            transformOrigin: 'right',
            animation: 'wipeRight 0.9s cubic-bezier(0.8, 0, 0.2, 1) forwards'
          }} 
        >
          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes wipeRight {
              0% { transform: scaleX(1); }
              100% { transform: scaleX(0); }
            }
            `
          }} />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background  text-text-primary  flex flex-col transition-colors duration-300 relative">
      {isExiting && (
        <div 
          className="fixed inset-0 bg-primary z-[9999] flex flex-col items-center justify-center" 
          style={{ 
            animation: 'wipeInRightClip 0.9s cubic-bezier(0.8, 0, 0.2, 1) forwards'
          }} 
        >
          <img src="/Auth Logo.png" alt="EcoPin" className="h-16 md:h-20 w-auto object-contain relative z-10" />
          <div className="mt-6 font-bold uppercase tracking-[0.3em] text-[10px] text-white/50 animate-pulse">
            Loading
          </div>
          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes wipeInRightClip {
              0% { clip-path: inset(0 100% 0 0); }
              100% { clip-path: inset(0 0 0 0); }
            }
            `
          }} />
        </div>
      )}
      {/* Shared Navbar exactly like root */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4 transition-all duration-300">
        <Navbar 
          theme={theme} 
          toggleTheme={toggleTheme} 
          hasSession={hasSession}
          user={user}
          isFloating={true} 
          className="shadow-sm"
        />
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 mt-32 pb-24">
        
        {/* Pulsing Graphic */}
        <div className="relative mb-12">
          <img src="/Full Logo Dark.png" alt="EcoPin" className="h-20 md:h-28 object-contain relative z-10 hidden dark:block animate-bounce" />
          <img src="/Full Logo Light.png" alt="EcoPin" className="h-20 md:h-28 object-contain relative z-10 dark:hidden animate-bounce" />
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight mb-4 text-center">
          {downloadStarted ? "Downloading..." : "Starting Download"}
        </h1>
        
        <p className="text-lg md:text-xl font-medium opacity-70 mb-16 text-center max-w-2xl px-4">
          If your download doesn't start automatically within a few seconds, 
          <a href="/ecopin-app-release.apk" download className="text-[#0052CC] dark:text-[#60A5FA] ml-2 hover:underline font-bold">
            click here to retry.
          </a>
        </p>

        {/* Installation Guide & Tooltips */}
        <div className="w-full max-w-4xl bg-surface dark:bg-surface border border-border  rounded-3xl p-8 md:p-12 shadow-sm dark:shadow-none mx-auto relative overflow-hidden">
          <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-widest mb-10 border-b-4 border-border  pb-4 flex items-center gap-3">
            <Smartphone className="w-8 h-8" strokeWidth={3} /> Installation Guide
          </h2>
          
          <div className="space-y-10 relative z-10">
            {/* Step 1 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 shrink-0 bg-black text-white dark:bg-surface dark:text-text-primary rounded-full flex items-center justify-center font-bold text-2xl shadow-md border border-border ">1</div>
              <div>
                <h3 className="font-bold text-xl md:text-2xl uppercase mb-2">Unknown Sources</h3>
                <p className="opacity-80 leading-relaxed">
                  Since EcoPin is an internal city deployment tool, your Android device may block the direct installation. 
                  Go to <strong>Settings &gt; Security &gt; Install Unknown Apps</strong> and grant permission to your web browser or file manager to install the APK.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 shrink-0 bg-black text-white dark:bg-surface dark:text-text-primary rounded-full flex items-center justify-center font-bold text-2xl shadow-md border border-border ">2</div>
              <div>
                <h3 className="font-bold text-xl md:text-2xl uppercase mb-2 flex items-center gap-2">
                  Google Play Protect <ShieldAlert className="w-6 h-6 text-yellow-500" />
                </h3>
                <p className="opacity-80 leading-relaxed">
                  If Google Play Protect flags the app as unrecognized during installation, simply tap <strong>More details</strong> and select <strong>Install anyway</strong>. Our app is completely safe, actively developed, and securely communicates with local government servers.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 shrink-0 bg-primary text-white rounded-full flex items-center justify-center font-bold text-2xl shadow-sm border border-border">3</div>
              <div>
                <h3 className="font-bold text-xl md:text-2xl uppercase mb-2 flex items-center gap-2">
                  Required Permissions <MapPin className="w-6 h-6" />
                </h3>
                <p className="opacity-80 leading-relaxed">
                  Upon first launch, you <strong>MUST</strong> grant <strong>Location Permissions (Precise)</strong> to utilize the automated geospatial clustering features. Without it, you cannot submit accurate environmental pin drops. You must also grant <strong>Camera Permissions</strong> to capture field evidence.
                </p>
              </div>
            </div>
          </div>
          
          {/* Decorative background element */}
          <div className="absolute -bottom-20 -right-20 text-[#F4F0EA] dark:text-[#2A2A2A] z-0 pointer-events-none">
             <CheckCircle2 className="w-96 h-96 opacity-50" strokeWidth={1} />
          </div>
        </div>
        
        <button onClick={handleBack} className="mt-12 font-bold uppercase tracking-widest text-sm border-b border-border  pb-1 hover:text-[#0052CC] hover:border-[#0052CC] transition-colors">
          Return to Home
        </button>
      </div>
    </main>
  )
}

