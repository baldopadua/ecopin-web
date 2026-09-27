'use client';
import React, { useEffect, useState } from 'react';
import Lenis from 'lenis';
import dynamic from 'next/dynamic';
import FloatingParticles from '@/components/ui/FloatingParticles';

const BackgroundMap = dynamic(() => import('./BackgroundMap'), {
  ssr: false,
});

export default function Home() {
  const [theme, setTheme] = useState('light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [hasSession, setHasSession] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    const isDarkMode = document.documentElement.classList.contains('dark');
    setTheme(isDarkMode ? 'dark' : 'light');

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

    return () => lenis.destroy();
  }, []);

  const toggleTheme = () => {
    if (theme === 'dark') {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setTheme('light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    }
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Calculate rotation (-15 to 15 degrees)
    const rotateX = ((y - centerY) / centerY) * -15; 
    const rotateY = ((x - centerX) / centerX) * 15;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const isDark = theme === 'dark';

  return (
    <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-white relative overflow-hidden selection:bg-[#E6F0FF] selection:text-[#0052CC] transition-colors duration-300">
      
      {/* Background System */}
      <div className="absolute top-0 left-0 right-0 h-screen z-0 bg-[#F8FAFC] dark:bg-[#0B1120] overflow-hidden pointer-events-none transition-colors duration-300">
        <BackgroundMap isDark={isDark} />
        <FloatingParticles isDark={isDark} />
        
        {/* Subtle Civic Pattern Overlay */}
        <div className="absolute inset-0 opacity-40 dark:opacity-20"
          style={{
            backgroundImage: isDark
              ? 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)'
              : 'linear-gradient(rgba(0,82,204,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,82,204,0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            backgroundPosition: 'center center',
          }}
        ></div>
        {/* Soft radial gradient to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F8FAFC]/80 via-[#F8FAFC]/30 to-[#F8FAFC]/90 dark:from-[#0B1120]/80 dark:via-[#0B1120]/30 dark:to-[#0B1120]/90 transition-colors duration-300"></div>
      </div>

      {/* Header */}
      <header className="fixed w-full top-0 left-0 z-50 flex items-center justify-between p-4 md:px-8 bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-sm border-b border-[#E2E8F0] dark:border-[#334155] shadow-sm transition-colors duration-300">
        <a href="#home" className="cursor-pointer">
          <img src="/Full Logo Light.png" alt="EcoPin" className="h-10 md:h-12 w-auto dark:hidden" />
          <img src="/Full Logo Dark.png" alt="EcoPin" className="h-10 md:h-12 w-auto hidden dark:block" />
        </a>
        <nav className="hidden md:flex gap-8 items-center">
          <a href="#about" className="text-sm font-semibold text-[#475569] dark:text-[#94A3B8] hover:text-[#0052CC] dark:hover:text-white transition-colors">About</a>
          <a href="#features" className="text-sm font-semibold text-[#475569] dark:text-[#94A3B8] hover:text-[#0052CC] dark:hover:text-white transition-colors">Features</a>

          {/* Theme Toggler */}
          <button
            onClick={toggleTheme}
            className="p-2 text-[#475569] dark:text-[#94A3B8] hover:text-[#0052CC] dark:hover:text-white transition-colors flex items-center justify-center rounded-full hover:bg-[#F8FAFC] dark:hover:bg-[#334155]"
            title="Toggle Theme"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {hasSession ? (
            <a href="/dashboard" className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg shadow-sm hover:border-[#0052CC] dark:hover:border-white transition-all">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-6 h-6 object-cover rounded-full" />
              ) : (
                <div className="w-6 h-6 bg-[#0052CC] text-white rounded-full flex items-center justify-center font-bold text-xs">
                  {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="text-sm font-bold text-[#0F172A] dark:text-white">Dashboard</span>
            </a>
          ) : (
            <a href="/auth" className="px-5 py-2 bg-[#0052CC] text-white text-sm font-semibold rounded-md hover:bg-[#0747A6] shadow-sm transition-colors">Login</a>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-[#475569] dark:text-[#94A3B8] hover:text-[#0052CC] dark:hover:text-white transition-colors z-[60]"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[55] bg-white dark:bg-[#0B1120] flex flex-col items-center justify-center p-6 transition-colors duration-300">
          <nav className="flex flex-col gap-8 items-center w-full">
            <a href="#about" onClick={() => setIsMenuOpen(false)} className="text-2xl font-bold text-[#0F172A] dark:text-white hover:text-[#0052CC] dark:hover:text-[#0052CC]">About</a>
            <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-2xl font-bold text-[#0F172A] dark:text-white hover:text-[#0052CC] dark:hover:text-[#0052CC]">Features</a>
            
            {/* Theme Toggler in Mobile Menu */}
            <button
              onClick={toggleTheme}
              className="mt-4 p-4 border border-[#E2E8F0] dark:border-[#334155] hover:border-[#0052CC] dark:hover:border-white rounded-xl w-full flex items-center justify-center gap-4 text-lg font-bold text-[#0F172A] dark:text-white transition-colors"
            >
              {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </button>

            {hasSession ? (
              <a href="/dashboard" onClick={() => setIsMenuOpen(false)} className="mt-8 flex items-center justify-center gap-4 px-8 py-3 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl w-full text-center hover:border-[#0052CC] dark:hover:border-white shadow-sm transition-all">
                <span className="text-lg font-bold text-[#0F172A] dark:text-white">Go to Dashboard</span>
              </a>
            ) : (
              <a href="/auth" onClick={() => setIsMenuOpen(false)} className="mt-8 px-8 py-3 bg-[#0052CC] text-white text-lg font-bold rounded-lg w-full text-center shadow-md">Login</a>
            )}
          </nav>
        </div>
      )}

      {/* Landing Wrapper to Frame Marquee */}
      <div className="flex flex-col min-h-screen pt-[72px] md:pt-[80px]">
        {/* Hero Section */}
        <section id="home" className="relative z-10 flex-grow flex flex-col items-center justify-center px-6 text-center pb-8 md:pb-0">
        <div className="relative z-20 max-w-4xl mx-auto flex flex-col items-center">
          
          <div className="inline-flex items-center gap-2 bg-[#E6F0FF] dark:bg-[#0052CC]/20 text-[#0052CC] dark:text-[#E6F0FF] px-4 py-1.5 rounded-full mb-8 text-sm font-semibold border border-[#0052CC]/20 dark:border-[#0052CC]/50">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
            Official Civic Tech Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 text-[#0F172A] dark:text-white leading-tight drop-shadow-sm">
            Clean the Streets, <br />
            Reclaim the <span className="text-[#0052CC] dark:text-[#3B82F6]">City.</span>
          </h1>

          <p className="text-lg md:text-xl font-medium max-w-3xl mx-auto mb-12 text-[#475569] dark:text-[#94A3B8] leading-relaxed">
            A crowdsourced geospatial platform for transparent environmental reporting and rapid institutional detection for the Pasig City Solid Waste Management Office.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-lg">
            <a href="#download" className="w-full sm:w-auto px-8 py-3.5 bg-[#0052CC] dark:bg-[#3B82F6] text-white font-semibold rounded-lg hover:bg-[#0747A6] dark:hover:bg-[#2563EB] shadow-md transition-all text-lg">
              Download App
            </a>
            <a href="/map" className="w-full sm:w-auto px-8 py-3.5 bg-white dark:bg-[#1E293B] text-[#0052CC] dark:text-white border border-[#0052CC] dark:border-[#334155] font-semibold rounded-lg hover:bg-[#E6F0FF] dark:hover:bg-[#334155] shadow-sm transition-all text-lg">
              Live Reports
            </a>
          </div>
        </div>
      </section>

          {/* Marquee Divider */}
          <div className="w-full bg-[#0052CC] dark:bg-[#0747A6] text-white font-semibold text-lg py-3 overflow-hidden shadow-inner relative z-20 shrink-0 mt-auto flex">
            <div className="flex animate-marquee whitespace-nowrap shrink-0">
              <span className="pr-2">REPORT IT. TRACK IT. WATCH IT DISAPPEAR. •</span>
              <span className="pr-2">REPORT IT. TRACK IT. WATCH IT DISAPPEAR. •</span>
              <span className="pr-2">REPORT IT. TRACK IT. WATCH IT DISAPPEAR. •</span>
              <span className="pr-2">REPORT IT. TRACK IT. WATCH IT DISAPPEAR. •</span>
              <span className="pr-2">REPORT IT. TRACK IT. WATCH IT DISAPPEAR. •</span>
            </div>
            <div className="flex animate-marquee whitespace-nowrap shrink-0" aria-hidden="true">
              <span className="pr-2">REPORT IT. TRACK IT. WATCH IT DISAPPEAR. •</span>
              <span className="pr-2">REPORT IT. TRACK IT. WATCH IT DISAPPEAR. •</span>
              <span className="pr-2">REPORT IT. TRACK IT. WATCH IT DISAPPEAR. •</span>
              <span className="pr-2">REPORT IT. TRACK IT. WATCH IT DISAPPEAR. •</span>
              <span className="pr-2">REPORT IT. TRACK IT. WATCH IT DISAPPEAR. •</span>
            </div>
          </div>
        </div>

        {/* How it Works Section */}
      <section id="about" className="relative z-10 py-24 px-6 bg-[#F8FAFC] dark:bg-[#0B1120] transition-colors duration-300">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-10 text-[#0F172A] dark:text-white">
              How it Works
            </h2>
            <div className="space-y-6">
              {[
                { step: '01', title: 'REPORT', desc: 'Citizens pin environmental issues on the map with photos and descriptions.', color: '#0052CC', bg: '#EFF6FF', darkBg: '#1E3A8A' },
                { step: '02', title: 'VALIDATE', desc: 'AI automatically verifies each report for accuracy and relevance.', color: '#059669', bg: '#ECFDF5', darkBg: '#064E3B' },
                { step: '03', title: 'PRIORITIZE', desc: 'The system clusters and ranks issues based on severity and location.', color: '#D97706', bg: '#FFFBEB', darkBg: '#78350F' },
                { step: '04', title: 'ACT', desc: 'SWMO assigns cleanup tasks and tracks resolution in real time.', color: '#0F172A', bg: '#F1F5F9', darkBg: '#334155', darkColor: '#FFFFFF' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4 p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg transition-colors" style={{ backgroundColor: isDark ? item.darkBg : item.bg, color: isDark && item.darkColor ? item.darkColor : item.color }}>
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#0F172A] dark:text-white mb-1">{item.title}</h3>
                    <p className="text-[#475569] dark:text-[#94A3B8]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative h-[600px] flex items-center justify-center lg:justify-end" style={{ perspective: '1200px' }}>
            <div 
              className="relative group cursor-pointer"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transformStyle: 'preserve-3d',
                transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s ease-out' : 'transform 0.1s ease-out'
              }}
            >
              {/* Simple Clean Phone Mockup */}
              <div 
                className="w-[320px] h-[650px] bg-[#0F172A] rounded-[2.5rem] p-[8px] relative flex flex-col items-center transition-shadow duration-500"
                style={{ 
                  boxShadow: (tilt.x !== 0 || tilt.y !== 0) ? '0 40px 80px -20px rgba(0,0,0,0.5)' : '0 25px 50px -12px rgba(0,0,0,0.25)'
                }}
              >
                {/* Notch */}
                <div className="absolute top-[8px] inset-x-0 h-6 bg-[#0F172A] rounded-b-xl w-32 mx-auto z-20" style={{ transform: 'translateZ(1px)' }}></div>
                
                {/* Screen Content */}
                <div className="w-full h-full bg-[#F8FAFC] dark:bg-[#0B1120] rounded-[2rem] flex flex-col p-6 pt-16 relative overflow-hidden transition-colors" style={{ transform: 'translateZ(1px)' }}>
                  <div className="flex justify-center mb-8">
                    <img src="/Solo Logo Light.png" alt="EcoPin Logo" className="w-16 h-16 object-contain dark:hidden" />
                    <img src="/Solo Logo Dark.png" alt="EcoPin Logo" className="w-16 h-16 object-contain hidden dark:block" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#0F172A] dark:text-white text-center mb-6">Welcome Back</h3>
                  
                  <div className="space-y-4 w-full">
                    <div className="w-full bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg p-4 text-[#475569] dark:text-[#94A3B8] text-sm">
                      Email Address
                    </div>
                    <div className="w-full bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg p-4 text-[#475569] dark:text-[#94A3B8] text-sm flex justify-between">
                      <span>Password</span>
                      <svg className="w-5 h-5 text-gray-400 dark:text-[#94A3B8]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                    </div>
                    <button className="w-full bg-[#0052CC] dark:bg-[#3B82F6] text-white font-bold py-3.5 rounded-lg mt-4 text-sm shadow-sm hover:bg-[#0747A6] dark:hover:bg-[#2563EB] transition-colors">
                      Sign In
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating Badges */}
              <div 
                className="absolute top-20 -left-8 lg:-left-12 bg-white dark:bg-[#1E293B] text-[#059669] dark:text-[#34D399] font-bold text-sm py-2 px-4 rounded-full shadow-xl border border-[#E2E8F0] dark:border-[#334155] flex items-center gap-2 z-30"
                style={{ transform: 'translateZ(60px)' }}
              >
                <div className="w-2 h-2 rounded-full bg-[#059669] dark:bg-[#34D399]"></div>
                Issue Resolved
              </div>
              <div 
                className="absolute bottom-32 -right-4 lg:-right-8 bg-white dark:bg-[#1E293B] text-[#DC2626] dark:text-[#F87171] font-bold text-sm py-2 px-4 rounded-full shadow-xl border border-[#E2E8F0] dark:border-[#334155] flex items-center gap-2 z-30"
                style={{ transform: 'translateZ(80px)' }}
              >
                <div className="w-2 h-2 rounded-full bg-[#DC2626] dark:bg-[#F87171]"></div>
                High Priority
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-6 bg-white dark:bg-[#1E293B] border-t border-[#E2E8F0] dark:border-[#334155] transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#0F172A] dark:text-white mb-4">
              System Features
            </h2>
            <p className="text-[#475569] dark:text-[#94A3B8] max-w-2xl mx-auto text-lg">
              Empowering local government and citizens with intelligent tools for a cleaner city.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'AI Validation', desc: 'Automatically verifies each report to filter out inaccuracies and false claims.', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
              { title: 'Geospatial Map', desc: 'Real-time geographic overview of all environmental hotspots across Pasig City.', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064' },
              { title: 'Smart Clustering', desc: 'Groups related reports to identify patterns and prioritize critical action areas.', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
              { title: 'Role-Based Access', desc: 'Dedicated interfaces for citizens, field crew, and SWMO command center admins.', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
              { title: 'Task Management', desc: 'Assign, dispatch, and track cleanup tasks from initial report to resolution.', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
              { title: 'Analytics Dashboard', desc: 'Comprehensive data insights to support informed, data-driven LGU decisions.', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
            ].map((feature, i) => (
              <div key={i} className="bg-[#F8FAFC] dark:bg-[#0B1120] p-8 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-white dark:bg-[#1E293B] rounded-lg shadow-sm border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-center mb-6 text-[#0052CC] dark:text-[#3B82F6]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} /></svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-[#0F172A] dark:text-white">{feature.title}</h3>
                <p className="text-[#475569] dark:text-[#94A3B8] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Downloads */}
      <section id="download" className="py-24 px-6 bg-[#0052CC] dark:bg-[#0F172A] text-white text-center relative overflow-hidden transition-colors duration-300">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Make Pasig Green Again.
          </h2>
          <p className="text-lg md:text-xl font-medium mb-10 text-[#E6F0FF] dark:text-[#94A3B8] max-w-2xl mx-auto">
            Report, track, and manage environmental concerns. Available now for Android devices.
          </p>
          <a href="/ecopin-app-release.apk" download className="inline-block px-10 py-4 bg-white dark:bg-[#3B82F6] text-[#0052CC] dark:text-white font-bold rounded-xl text-lg hover:bg-[#F8FAFC] dark:hover:bg-[#2563EB] shadow-lg transition-all hover:-translate-y-1">
            Download App (.apk)
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-white dark:bg-[#1E293B] border-t border-[#E2E8F0] dark:border-[#334155] transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start">
            <img src="/Full Logo Light.png" alt="EcoPin" className="h-10 w-auto mb-4 dark:hidden" />
            <img src="/Full Logo Dark.png" alt="EcoPin" className="h-10 w-auto mb-4 hidden dark:block" />
            <p className="text-[#475569] dark:text-[#94A3B8] text-sm font-medium">Solid Waste Management Office - Pasig City</p>
          </div>
          <div className="text-[#475569] dark:text-[#94A3B8] text-sm font-medium text-center md:text-right">
            © 2026 EcoPin LGU Platform.<br className="md:hidden" /> All Rights Reserved.
          </div>
        </div>
      </footer>
      
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </main>
  );
}
