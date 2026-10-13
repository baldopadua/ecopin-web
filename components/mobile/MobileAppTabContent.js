'use client'
import React, { useState, useRef } from 'react'
import Link from 'next/link'
import { 
  Download, 
  MapPin, 
  Camera, 
  Cpu, 
  WifiOff, 
  Bell, 
  ShieldCheck, 
  CheckCircle2, 
  Smartphone,
  ChevronRight
} from 'lucide-react'

export default function MobileAppTabContent({ onNavigateToMap }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  const handleMouseMove = (e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -15
    const rotateY = ((x - centerX) / centerX) * 15
    setTilt({ x: rotateX, y: rotateY })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
  }

  return (
    <div className="min-h-full flex flex-col font-sans transition-colors duration-300">
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        
        {/* 1. HERO SECTION WITH 3D PHONE MOCKUP */}
        <section className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200/90 dark:border-[#2A2A2A] p-5 sm:p-7 shadow-xs relative overflow-hidden">
          {/* Subtle background ambient glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-3.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#0052CC] dark:bg-[#0052CC]/15 dark:text-[#60A5FA] border border-blue-200/80 dark:border-[#0052CC]/30">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Official Citizen Android App &bull; Pasig City</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
                Report Environmental Incidents Directly to Pasig LGU
              </h1>

              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-lg">
                EcoPin makes it quick and easy to keep Pasig City clean. Pinpoint an issue on the map, take a photo or video, and send it straight to city cleanup teams for fast response.
              </p>

              {/* Action Buttons */}
              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <Link
                  href="/downloads"
                  className="px-5 py-2.5 rounded-xl bg-[#0052CC] hover:bg-[#0042A3] active:scale-[0.98] text-white font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Android APK</span>
                </Link>

                <button
                  type="button"
                  onClick={onNavigateToMap}
                  className="px-5 py-2.5 rounded-xl bg-gray-50 dark:bg-[#252525] hover:bg-gray-100 dark:hover:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-[#0052CC] dark:text-[#60A5FA]" />
                  <span>Explore Live Map</span>
                </button>
              </div>

              {/* Spec Indicators */}
              <div className="pt-3 border-t border-gray-100 dark:border-[#2A2A2A] flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Works on Android Phones</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Lightweight (~28 MB)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Works Offline Without Signal</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>100% Free &amp; Private</span>
                </div>
              </div>
            </div>

            {/* Right 3D Interactive Phone Column */}
            <div className="lg:col-span-5 flex justify-center items-center">
              <div 
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="perspective-container w-full flex justify-center items-center select-none py-1"
              >
                <div 
                  className="relative w-full max-w-[300px] sm:max-w-[330px] aspect-[9/16] flex items-center justify-center transform-style-3d cursor-grab active:cursor-grabbing"
                  style={{
                    transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                    transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'transform 0.08s linear'
                  }}
                >
                  {/* 3D Ambient Blur Glow behind phone */}
                  <div 
                    className="absolute inset-0 bg-[#0052CC]/15 dark:bg-black/50 blur-2xl rounded-[36px] z-0 pointer-events-none" 
                    style={{ transform: 'translateZ(-40px) scale(0.85)' }}
                  />

                  {/* Phone Chassis */}
                  <div 
                    className="relative w-[230px] sm:w-[250px] aspect-[9/19] bg-white dark:bg-[#1C1C1C] rounded-[34px] sm:rounded-[38px] border-[8px] sm:border-[9px] border-gray-900 dark:border-[#2A2A2A] overflow-hidden shadow-2xl group flex flex-col z-20"
                    style={{ transform: 'translateZ(30px)' }}
                  >
                    {/* Dynamic Island */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[82px] h-[20px] bg-black rounded-full z-[60] flex items-center justify-between px-2.5 shadow-inner">
                      <div className="w-2 h-2 rounded-full bg-white/10" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981] animate-pulse" />
                    </div>

                    {/* App Bar */}
                    <div className="pt-7 pb-2 bg-white dark:bg-[#1C1C1C] border-b border-gray-200/90 dark:border-[#2A2A2A] z-40 flex items-center px-3 justify-between shrink-0">
                      <img src="/Solo Logo Light.png" alt="EcoPin" className="h-4 w-4 object-contain dark:invert" />
                      <div className="font-bold uppercase tracking-wider text-[9.5px] text-gray-900 dark:text-white">EcoPin Pasig</div>
                      <span className="text-[8.5px] font-bold text-[#0052CC] dark:text-[#60A5FA] bg-blue-50 dark:bg-[#0052CC]/20 px-1.5 py-0.5 rounded">GPS ON</span>
                    </div>

                    {/* Map Screen Preview with SVG map & interactive animated pins */}
                    <div className="flex-1 bg-[#F4F0EA] dark:bg-[#141414] relative overflow-hidden flex items-center justify-center">
                      <img 
                        src="/pasig.svg" 
                        alt="Pasig Grid" 
                        className="w-[170%] max-w-none opacity-25 dark:opacity-20 relative top-3 pointer-events-none" 
                      />

                      {/* Connecting animated dashed lines */}
                      <div className="absolute inset-0 z-20 pointer-events-none">
                        <svg className="absolute inset-0 w-full h-full opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                          {/* Cluster Top Right */}
                          <line x1="60%" y1="26%" x2="66%" y2="36%" stroke="#0052CC" strokeWidth="2.5" strokeDasharray="6" className="animate-dash" />
                          <line x1="66%" y1="36%" x2="62%" y2="46%" stroke="#0052CC" strokeWidth="2.5" strokeDasharray="6" className="animate-dash" />
                          <line x1="62%" y1="46%" x2="72%" y2="40%" stroke="#0052CC" strokeWidth="2.5" strokeDasharray="6" className="animate-dash" />

                          {/* Cluster Bottom Left */}
                          <line x1="28%" y1="62%" x2="40%" y2="62%" stroke="#0052CC" strokeWidth="2.5" strokeDasharray="6" className="animate-dash" />
                          <line x1="40%" y1="62%" x2="48%" y2="70%" stroke="#0052CC" strokeWidth="2.5" strokeDasharray="6" className="animate-dash" />
                          <line x1="48%" y1="70%" x2="34%" y2="76%" stroke="#0052CC" strokeWidth="2.5" strokeDasharray="6" className="animate-dash" />

                          {/* Cluster Bottom Right */}
                          <line x1="72%" y1="62%" x2="78%" y2="70%" stroke="#0052CC" strokeWidth="2.5" strokeDasharray="6" className="animate-dash" />
                          <line x1="78%" y1="70%" x2="62%" y2="68%" stroke="#0052CC" strokeWidth="2.5" strokeDasharray="6" className="animate-dash" />
                        </svg>

                        {/* Staggered Pins */}
                        {[
                          { top: '26%', left: '60%', color: 'bg-rose-500' },
                          { top: '36%', left: '66%', color: 'bg-amber-500' },
                          { top: '46%', left: '62%', color: 'bg-emerald-500' },
                          { top: '40%', left: '72%', color: 'bg-amber-500' },
                          { top: '62%', left: '28%', color: 'bg-rose-500' },
                          { top: '62%', left: '40%', color: 'bg-amber-500' },
                          { top: '70%', left: '48%', color: 'bg-emerald-500' },
                          { top: '76%', left: '34%', color: 'bg-blue-500' },
                          { top: '70%', left: '78%', color: 'bg-rose-500' },
                          { top: '68%', left: '62%', color: 'bg-emerald-500' },
                        ].map((pin, i) => (
                          <div 
                            key={i}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-black ${pin.color} shadow-sm transition-transform group-hover:scale-125`}
                            style={{ top: pin.top, left: pin.left }}
                          />
                        ))}
                      </div>

                      {/* Central Animated Pin */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
                        <div className="bg-gray-900 dark:bg-black text-white px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider mb-0.5 shadow-md whitespace-nowrap">
                          Current Location
                        </div>
                        <svg viewBox="0 0 24 24" className="w-7 h-7 animate-bounce text-[#0052CC] filter drop-shadow-md" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                      </div>
                    </div>

                    {/* Bottom Action Sheet */}
                    <div className="bg-white dark:bg-[#1C1C1C] border-t border-gray-200/90 dark:border-[#2A2A2A] z-40 rounded-t-xl flex flex-col p-2.5 shadow-lg shrink-0 relative -mt-2.5">
                      <div className="w-7 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-1.5" />
                      <div className="font-bold text-[8.5px] mb-0.5 text-gray-400 dark:text-gray-400 uppercase tracking-wider">Location Lock</div>
                      <div className="font-bold text-[11px] leading-tight mb-1.5 text-gray-900 dark:text-white truncate">Pasig City, Metro Manila</div>
                      <div className="w-full bg-[#0052CC] hover:bg-[#0042A3] text-white rounded-lg py-1.5 text-center font-bold uppercase tracking-wider transition-colors text-[10px] shadow-xs">
                        Confirm Pin Drop
                      </div>
                    </div>
                  </div>

                  {/* Floating 3D Badge 1: Verification */}
                  <div 
                    className="absolute top-[8%] sm:top-[12%] right-[-10px] sm:-right-4 bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white border border-gray-200/90 dark:border-[#2A2A2A] px-3 py-2 rounded-xl shadow-xl z-30 transition-transform pointer-events-none"
                    style={{ transform: 'translateZ(65px) rotate(3deg)' }}
                  >
                    <div className="text-[9px] font-bold uppercase text-gray-400 dark:text-gray-400 mb-0.5 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Smart Check
                    </div>
                    <div className="text-xs sm:text-sm font-extrabold text-[#0052CC] dark:text-[#60A5FA]">VERIFIED REPORT</div>
                  </div>

                  {/* Floating 3D Badge 2: Offline Sync */}
                  <div 
                    className="absolute bottom-[10%] sm:bottom-[14%] left-[-10px] sm:-left-4 bg-[#0052CC] text-white border border-blue-400/30 px-3 py-2 rounded-xl shadow-xl z-30 transition-transform pointer-events-none"
                    style={{ transform: 'translateZ(85px) rotate(-3deg)' }}
                  >
                    <div className="text-[9px] font-bold uppercase text-blue-100 mb-0.5 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                      No Signal Needed
                    </div>
                    <div className="text-xs sm:text-sm font-extrabold">WORKS OFFLINE</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. CORE CAPABILITIES BENTO GRID */}
        <section className="space-y-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0052CC] dark:text-[#60A5FA]">
              BUILT FOR PASIG CITIZENS
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-0.5 tracking-tight">
              Everything You Need to Report Issues Quickly
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-xl">
              Designed to be simple, fast, and reliable so any Pasig resident can report waste problems in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1 */}
            <div className="bg-white dark:bg-[#1C1C1C] rounded-xl border border-gray-200/90 dark:border-[#2A2A2A] p-4 sm:p-5 shadow-xs hover:border-blue-200 dark:hover:border-[#0052CC]/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-[#0052CC]/15 text-[#0052CC] dark:text-[#60A5FA] flex items-center justify-center mb-3">
                  <Camera className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                  Exact Map Location
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Your phone locks onto the exact spot where the problem is, making sure city cleanup teams know right where to go.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-gray-100 dark:border-[#2A2A2A] text-[10.5px] font-semibold text-[#0052CC] dark:text-[#60A5FA]">
                Automatic GPS pin
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white dark:bg-[#1C1C1C] rounded-xl border border-gray-200/90 dark:border-[#2A2A2A] p-4 sm:p-5 shadow-xs hover:border-blue-200 dark:hover:border-[#0052CC]/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-[#0052CC]/15 text-[#0052CC] dark:text-[#60A5FA] flex items-center justify-center mb-3">
                  <Cpu className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                  Smart Photo Check
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Intelligent checks confirm your photo shows a real environmental issue, preventing false reports and speeding up cleanup.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-gray-100 dark:border-[#2A2A2A] text-[10.5px] font-semibold text-[#0052CC] dark:text-[#60A5FA]">
                Fast issue confirmation
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white dark:bg-[#1C1C1C] rounded-xl border border-gray-200/90 dark:border-[#2A2A2A] p-4 sm:p-5 shadow-xs hover:border-blue-200 dark:hover:border-[#0052CC]/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-[#0052CC]/15 text-[#0052CC] dark:text-[#60A5FA] flex items-center justify-center mb-3">
                  <WifiOff className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                  Works Without Signal
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  No cellular data or Wi-Fi? Your report saves safely on your phone and automatically sends as soon as you have internet again.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-gray-100 dark:border-[#2A2A2A] text-[10.5px] font-semibold text-[#0052CC] dark:text-[#60A5FA]">
                Auto-sends when connected
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white dark:bg-[#1C1C1C] rounded-xl border border-gray-200/90 dark:border-[#2A2A2A] p-4 sm:p-5 shadow-xs hover:border-blue-200 dark:hover:border-[#0052CC]/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-[#0052CC]/15 text-[#0052CC] dark:text-[#60A5FA] flex items-center justify-center mb-3">
                  <Bell className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                  Track Cleanup Progress
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Follow your report from start to finish. See when city trucks are dispatched and view photos once the area is cleaned.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-gray-100 dark:border-[#2A2A2A] text-[10.5px] font-semibold text-[#0052CC] dark:text-[#60A5FA]">
                Live updates from city hall
              </div>
            </div>
          </div>
        </section>

        {/* 3. 4-STEP CITIZEN WORKFLOW */}
        <section className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200/90 dark:border-[#2A2A2A] p-5 sm:p-6 shadow-xs space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0052CC] dark:text-[#60A5FA]">
              HOW IT WORKS
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-0.5 tracking-tight">
              4 Simple Steps to Report an Issue
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                step: '01',
                title: 'Set the Pin on the Map',
                desc: 'Open the app and confirm the location pin where you spotted the waste or problem in Pasig.'
              },
              {
                step: '02',
                title: 'Describe What You See',
                desc: 'Type a quick description or use voice dictation to speak what is happening and how large it is.'
              },
              {
                step: '03',
                title: 'Take Photos or Video',
                desc: 'Snap up to 5 clear photos or record a quick video clip showing the issue directly on site.'
              },
              {
                step: '04',
                title: 'Send to City Teams',
                desc: 'Check your summary and submit. The Pasig Solid Waste Management Office gets your report immediately.'
              }
            ].map((s, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-gray-50/70 dark:bg-[#242424] border border-gray-100 dark:border-[#2A2A2A] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-[#1C1C1C] border border-gray-200/80 dark:border-[#333] text-gray-600 dark:text-gray-300 inline-block mb-2">
                    STEP {s.step}
                  </span>
                  <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white mb-1">
                    {s.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. PERMISSIONS & PRIVACY CARD */}
        <section className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-transparent dark:from-[#0052CC]/15 dark:via-indigo-950/20 dark:to-transparent border border-blue-100 dark:border-[#0052CC]/30 rounded-2xl shadow-xs">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4.5 h-4.5 text-[#0052CC] dark:text-[#60A5FA]" />
                <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                  Your Privacy &amp; Data Are Protected
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                EcoPin only asks for location, camera, and microphone access when you create a report. We never track you in the background, never read your contacts, and never share or sell personal information.
              </p>
            </div>

            <Link
              href="/downloads"
              className="px-4 py-2 rounded-xl bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-[#333] text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#252525] font-semibold text-xs flex items-center gap-1.5 transition-colors flex-shrink-0 shadow-xs"
            >
              <span>Download &amp; Setup Guide</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* 5. BOTTOM CTA BANNER */}
        <section className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200/90 dark:border-[#2A2A2A] p-6 sm:p-8 text-center shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-[#0052CC]/15 text-[#0052CC] dark:text-[#60A5FA] flex items-center justify-center mx-auto mb-1">
            <Smartphone className="w-6 h-6" />
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Ready to Help Keep Pasig City Clean?
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            Download the free Android app to report waste in your neighborhood, or explore active cleanups on our public map.
          </p>

          <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <Link
              href="/downloads"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0052CC] hover:bg-[#0042A3] text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Android App</span>
            </Link>

            <button
              type="button"
              onClick={onNavigateToMap}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-50 dark:bg-[#252525] hover:bg-gray-100 dark:hover:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-[#0052CC] dark:text-[#60A5FA]" />
              <span>Open Public Live Map</span>
            </button>
          </div>
        </section>
      </div>

      {/* Clean Footer matching Map page */}
      <footer className="border-t border-gray-200/80 dark:border-[#2A2A2A] bg-white dark:bg-[#1C1C1C] py-3.5 px-4 sm:px-6 transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-gray-500 dark:text-gray-400">
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

      {/* 3D and Animation CSS */}
      <style jsx>{`
        .perspective-container {
          perspective: 1200px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -12;
          }
        }
        .animate-dash {
          animation: dash 1s linear infinite;
        }
      `}</style>
    </div>
  )
}
