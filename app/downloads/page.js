'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import PublicHeader from '@/components/layout/PublicHeader'
import { 
  Download, 
  MapPin, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  Smartphone, 
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Camera,
  Compass,
  AlertTriangle,
  Bell,
  Settings
} from 'lucide-react'

export default function DownloadsPage() {
  const [downloadStarted, setDownloadStarted] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)
  const [theme, setTheme] = useState('light')
  const [hasSession, setHasSession] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Theme setup
    const isDarkMode = document.documentElement.classList.contains('dark')
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark' || (!savedTheme && isDarkMode)) {
      document.documentElement.classList.add('dark')
      setTheme('dark')
    } else {
      document.documentElement.classList.remove('dark')
      setTheme('light')
    }

    // Session setup
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

    // Automatically trigger APK download after short delay
    const timer = setTimeout(() => {
      const a = document.createElement('a')
      a.href = '/ecopin-app-release.apk'
      a.download = 'ecopin-app-release.apk'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setDownloadStarted(true)
    }, 1200)

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

  const handleManualDownload = () => {
    const a = document.createElement('a')
    a.href = '/ecopin-app-release.apk'
    a.download = 'ecopin-app-release.apk'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setDownloadStarted(true)
  }

  return (
    <div className="min-h-screen bg-gray-50/70 dark:bg-[#121212] text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-300">
      {/* Top Navigation Bar identical to Map Page */}
      <PublicHeader 
        activeNav="downloads"
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        hasSession={hasSession}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-10">
        
        {/* 1. HERO DOWNLOAD CARD: Clean Map Aesthetics with Active Pulsing Animation */}
        <section className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gray-200/90 dark:border-[#2A2A2A] p-6 sm:p-10 shadow-xs text-center space-y-4 relative overflow-hidden">
          {/* Animated Download Icon with Pulsing Ripple Rings */}
          <div className="relative inline-flex items-center justify-center mx-auto mb-1">
            {downloadStarted && (
              <>
                <span className="absolute -inset-3 rounded-3xl bg-blue-500/20 dark:bg-blue-400/20 pointer-events-none download-pulse-ring" />
                <span className="absolute -inset-1 rounded-2xl bg-blue-500/30 dark:bg-blue-400/30 pointer-events-none download-pulse-ring-inner" />
              </>
            )}
            <div className="relative w-16 h-16 rounded-2xl bg-blue-50 dark:bg-[#0052CC]/15 text-[#0052CC] dark:text-[#60A5FA] flex items-center justify-center shadow-xs border border-blue-200/60 dark:border-[#0052CC]/30 z-10 transition-transform">
              <Download className={`w-8 h-8 ${downloadStarted ? 'download-bounce-subtle' : ''}`} />
            </div>
          </div>

          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border mb-3 transition-all duration-300 ${
              downloadStarted 
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40 shadow-xs' 
                : 'bg-blue-50 text-[#0052CC] dark:bg-[#0052CC]/15 dark:text-[#60A5FA] border-blue-200 dark:border-[#0052CC]/30'
            }`}>
              {downloadStarted ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              ) : (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0052CC] dark:text-[#60A5FA]" />
              )}
              <span>
                {downloadStarted ? "Downloading now • Check your browser downloads" : "Preparing download package..."}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              Downloading EcoPin for Android
            </h1>
            
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-lg mx-auto leading-relaxed">
              The official citizen environmental reporting app for Pasig City. If your browser didn&apos;t prompt the download automatically, click below to retry.
            </p>

            {/* Pulsing Active Download Progress Bar */}
            <div className="max-w-xs sm:max-w-sm mx-auto pt-3 pb-1">
              <div className="h-1.5 w-full bg-blue-50 dark:bg-[#252525] rounded-full overflow-hidden relative border border-blue-100 dark:border-[#333]">
                <div 
                  className={`h-full rounded-full bg-gradient-to-r from-blue-500 via-[#0052CC] to-blue-400 ${
                    downloadStarted ? 'download-shimmer-active' : 'w-1/4 animate-pulse'
                  }`} 
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 px-0.5">
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${downloadStarted ? 'bg-emerald-500 animate-pulse' : 'bg-blue-400'}`} />
                  {downloadStarted ? 'ecopin-app-release.apk' : 'Connecting to mirror...'}
                </span>
                <span className="font-mono">~28 MB</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleManualDownload}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0052CC] hover:bg-[#0042A3] active:scale-[0.98] text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className={`w-4 h-4 ${downloadStarted ? 'download-bounce-subtle' : ''}`} />
              <span>{downloadStarted ? "Download Again (~28 MB)" : "Download .APK Directly (~28 MB)"}</span>
            </button>

            <Link
              href="/mobile"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-50 dark:bg-[#252525] hover:bg-gray-100 dark:hover:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Smartphone className="w-4 h-4 text-[#0052CC] dark:text-[#60A5FA]" />
              <span>View App Features</span>
            </Link>
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-[#2A2A2A] flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-400 dark:text-gray-500">
            <span>Version: 1.0</span>
            <span>&bull;</span>
            <span>Requires: Android 8.0 or newer</span>
            <span>&bull;</span>
            <span>Official Pasig City LGU App</span>
          </div>
        </section>

        {/* 2. 3-STEP QUICK SETUP: Clean & Minimalist */}
        <section className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200/90 dark:border-[#2A2A2A] p-5 sm:p-6 shadow-xs">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            How to Install
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-[#0052CC]/20 text-[#0052CC] dark:text-[#60A5FA] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-[#0052CC]/30">
                1
              </span>
              <div>
                <h3 className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">
                  Open APK
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  Tap <span className="font-medium text-gray-700 dark:text-gray-300">ecopin-app-release.apk</span> in your notification tray or Downloads.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-[#0052CC]/20 text-[#0052CC] dark:text-[#60A5FA] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-[#0052CC]/30">
                2
              </span>
              <div>
                <h3 className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">
                  Install Anyway
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  If prompted by Android, tap <strong className="font-medium text-gray-700 dark:text-gray-300">More details &rarr; Install anyway</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-[#0052CC]/20 text-[#0052CC] dark:text-[#60A5FA] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-[#0052CC]/30">
                3
              </span>
              <div>
                <h3 className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">
                  Allow Permissions
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  Open the app and tap <strong className="font-medium text-gray-700 dark:text-gray-300">Allow</strong> for Location &amp; Camera when asked.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. COMMON QUESTIONS: Minimal Collapsible Accordion (Zero Text Overload) */}
        <section className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200/90 dark:border-[#2A2A2A] p-5 sm:p-6 shadow-xs">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            Need Help?
          </h2>

          <div className="divide-y divide-gray-100 dark:divide-[#2A2A2A]">
            {[
              {
                q: "Phone blocked the installation?",
                a: "Tap More details, then select Install anyway. If asked, toggle on 'Allow from this source' for your browser or file manager."
              },
              {
                q: "Map pin not snapping to your street?",
                a: "Turn on your phone's GPS and select 'Precise Location' under EcoPin permissions so the pin marks your exact spot."
              },
              {
                q: "Camera won't open in the app?",
                a: "Make sure Camera permission is allowed for EcoPin in your phone settings. It is only accessed while taking report photos."
              },
              {
                q: "Not receiving cleanup updates?",
                a: "Enable Notifications for EcoPin in settings to receive alerts when city sweepers arrive and complete cleanups."
              }
            ].map((faq, i) => {
              const isOpen = openFaq === i
              return (
                <div key={i} className="py-2.5">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between text-left py-1 text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-[#0052CC] dark:hover:text-[#60A5FA] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#0052CC] dark:text-[#60A5FA]' : ''}`} />
                  </button>
                  {isOpen && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 pt-1 pb-0.5 leading-relaxed">
                      {faq.a}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* 4. SAFETY & MUNICIPAL AUTHENTICITY CARD */}
        <section className="p-6 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-transparent dark:from-[#0052CC]/15 dark:via-indigo-950/20 dark:to-transparent border border-blue-100 dark:border-[#0052CC]/30 rounded-3xl shadow-xs flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0052CC] dark:text-[#60A5FA]" />
              <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                Official Pasig City Civic Infrastructure
              </h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              EcoPin connects directly to Pasig City municipal servers for the Solid Waste Management Office. It contains zero advertisements, third-party trackers, or hidden analytics.
            </p>
          </div>

          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-[#333] text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#252525] font-semibold text-xs flex items-center gap-2 transition-colors flex-shrink-0 shadow-xs"
          >
            <MapPin className="w-3.5 h-3.5 text-[#0052CC] dark:text-[#60A5FA]" />
            <span>Open Public Live Map</span>
          </Link>
        </section>
      </main>

      {/* Clean Footer matching Map page */}
      <footer className="border-t border-gray-200/80 dark:border-[#2A2A2A] bg-white dark:bg-[#1C1C1C] py-5 px-4 sm:px-6 transition-colors duration-300 mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700 dark:text-gray-300">EcoPin &bull; Pasig City</span>
            <span>&bull;</span>
            <span>Solid Waste Management Office</span>
          </div>
          <div>
            <span>swmo@pasigcity.gov.ph &bull; 09173726888</span>
          </div>
        </div>
      </footer>

      {/* Download Pulse & Shimmer Animations */}
      <style jsx>{`
        @keyframes pulseRing {
          0% {
            transform: scale(0.92);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.22);
            opacity: 0.2;
          }
          100% {
            transform: scale(1.35);
            opacity: 0;
          }
        }
        @keyframes pulseRingInner {
          0% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.12);
            opacity: 0.25;
          }
          100% {
            transform: scale(1.18);
            opacity: 0;
          }
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(250%);
          }
        }
        @keyframes bounceSubtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(3px);
          }
        }
        .download-pulse-ring {
          animation: pulseRing 2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
        }
        .download-pulse-ring-inner {
          animation: pulseRingInner 2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite 0.35s;
        }
        .download-shimmer-active {
          width: 45%;
          animation: shimmer 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .download-bounce-subtle {
          animation: bounceSubtle 1.2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .download-pulse-ring,
          .download-pulse-ring-inner,
          .download-shimmer-active,
          .download-bounce-subtle {
            animation: none;
          }
          .download-shimmer-active {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
