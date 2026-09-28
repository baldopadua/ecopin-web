'use client';
import React, { useEffect, useState } from 'react';
import Lenis from 'lenis';

export default function Home() {
  const [theme, setTheme] = useState('light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [hasSession, setHasSession] = useState(false);

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

  return (
    <main className="min-h-screen bg-[#F4F0EA] dark:bg-[#121212] text-black dark:text-white relative overflow-x-hidden selection:bg-[#0052CC] selection:text-white transition-colors duration-300">
      
      {/* Background System */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center opacity-30 dark:opacity-20">
        <div className="w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-multiply dark:mix-blend-overlay"></div>
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      </div>

      {/* Header */}
      <header className="fixed w-full top-0 left-0 z-50 bg-[#F4F0EA] dark:bg-[#121212] border-b-4 border-black dark:border-[#333] transition-colors duration-300">
        <div className="w-full max-w-[1800px] mx-auto flex items-center justify-between px-4 md:px-8 py-4">
        <a href="#home" className="cursor-pointer transition-all">
          <img src="/Full Logo Light.png" alt="EcoPin" className="h-10 md:h-12 w-auto dark:hidden" />
          <img src="/Full Logo Dark.png" alt="EcoPin" className="h-10 md:h-12 w-auto hidden dark:block" />
        </a>
        <nav className="hidden md:flex gap-4 items-center">
          <a href="#about" className="text-sm font-black uppercase tracking-widest text-black dark:text-white px-4 py-2 hover:text-[#0052CC] transition-all">About</a>
          <a href="#features" className="text-sm font-black uppercase tracking-widest text-black dark:text-white px-4 py-2 hover:text-[#0052CC] transition-all">Features</a>

          {/* Theme Toggler */}
          <button
            onClick={toggleTheme}
            className="p-2 text-black dark:text-white hover:text-[#0052CC] transition-all flex items-center justify-center"
            title="Toggle Theme"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>

          {hasSession ? (
            <a href="/dashboard" className="text-sm font-black uppercase tracking-widest text-black bg-[#FFA6C9] px-6 py-2 transition-all">
              DASHBOARD
            </a>
          ) : (
            <a href="/auth" className="text-sm font-black uppercase tracking-widest text-white bg-[#0052CC] px-6 py-2 transition-all">LOGIN</a>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-black dark:text-white hover:text-[#0052CC] transition-all z-[60]"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[55] bg-[#F4F0EA] dark:bg-[#121212] flex flex-col items-center justify-center p-6 border-b-4 border-black dark:border-[#333]">
          <nav className="flex flex-col gap-6 items-center w-full max-w-sm">
            <a href="#about" onClick={() => setIsMenuOpen(false)} className="w-full text-center text-2xl font-black uppercase tracking-widest text-black dark:text-white py-2 hover:text-[#0052CC]">About</a>
            <a href="#features" onClick={() => setIsMenuOpen(false)} className="w-full text-center text-2xl font-black uppercase tracking-widest text-black dark:text-white py-2 hover:text-[#0052CC]">Features</a>
            
            <button
              onClick={toggleTheme}
              className="w-full text-center mt-4 p-2 text-xl font-black uppercase tracking-widest text-black dark:text-white hover:text-[#0052CC]"
            >
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>

            {hasSession ? (
              <a href="/dashboard" onClick={() => setIsMenuOpen(false)} className="w-full text-center mt-4 p-4 text-xl font-black uppercase tracking-widest bg-[#FFA6C9] text-black">
                DASHBOARD
              </a>
            ) : (
              <a href="/auth" onClick={() => setIsMenuOpen(false)} className="w-full text-center mt-4 p-4 text-xl font-black uppercase tracking-widest bg-[#0052CC] text-white">LOGIN</a>
            )}
          </nav>
        </div>
      )}

      <div className="flex flex-col pt-[80px] md:pt-[100px] min-h-screen">
        {/* Hero Section */}
        <section id="home" className="relative z-10 w-full max-w-[1800px] mx-auto px-4 md:px-8 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            
            {/* Main Hero Panel */}
            <div className="lg:col-span-8 bg-white dark:bg-[#1C1C1C] border-4 border-black dark:border-[#444] shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#0052CC] p-6 md:p-12 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 text-[250px] opacity-20 transform rotate-12 pointer-events-none text-[#0052CC]">✦</div>
              <div className="absolute top-1/3 -left-10 text-[120px] opacity-20 transform -rotate-12 pointer-events-none text-[#0052CC]">✦</div>
              <div className="absolute -bottom-10 right-1/4 text-[150px] opacity-20 transform rotate-45 pointer-events-none text-[#0052CC]">✦</div>

              <h1 className="text-[14vw] sm:text-[5.5rem] md:text-[6.5rem] lg:text-[7.5rem] font-black uppercase tracking-tighter leading-[0.85] text-black dark:text-white mb-3 md:mb-6 relative z-10">
                Clean<br/>the <span className="text-[#0052CC]">Streets</span>.
              </h1>
              
              <div className="inline-block bg-[#0052CC] text-white px-4 md:px-6 py-1 md:py-2 border-4 border-black dark:border-[#444] transform -rotate-2 shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#0052CC] mb-4 md:mb-8 relative z-10">
                <span className="text-xl md:text-5xl font-black uppercase tracking-tight">RECLAIM THE CITY.</span>
              </div>

              <div className="flex flex-col md:flex-row gap-4 md:gap-6 border-t-4 border-black dark:border-[#333] pt-4 md:pt-6 relative z-10">
                <p className="text-sm md:text-2xl font-bold max-w-xl text-black dark:text-white">
                  A crowdsourced geospatial platform for transparent environmental reporting.
                </p>
              </div>
            </div>

            {/* Right Side Bento Grid */}
            <div className="lg:col-span-4 flex flex-col gap-4 md:gap-8">
              
              {/* Live Map CTA */}
              <a href="/map" className="border-4 border-black dark:border-[#444] bg-[#0052CC] dark:bg-[#1C1C1C] p-4 md:p-6 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#0052CC] hover:translate-y-1 hover:shadow-none transition-all flex flex-col justify-between group flex-grow min-h-[180px] md:min-h-[220px]">
                <div className="flex justify-between items-start mb-2 md:mb-4">
                  <div className="font-black text-black dark:text-white text-[10px] md:text-lg uppercase tracking-widest bg-white dark:bg-[#222] px-2 md:px-3 py-1 border-4 border-black dark:border-[#444]">
                    PASIG
                  </div>
                  <div className="font-mono text-[8px] md:text-xs font-bold text-white bg-red-600 dark:bg-red-700 border-2 md:border-4 border-black dark:border-[#444] px-1 md:px-2 py-0.5 md:py-1 shadow-[2px_2px_0_#000] dark:shadow-[2px_2px_0_#111] flex items-center gap-1 md:gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    LIVE
                  </div>
                </div>

                <div className="relative w-full aspect-video md:aspect-[4/3] flex items-center justify-center overflow-hidden border-2 md:border-4 border-black dark:border-[#444] bg-[#F4F0EA] dark:bg-[#1C1C1C] mb-2 md:mb-4 p-2 md:p-4">
                  <img src="/pasig.svg" alt="Map" className="w-full h-full object-contain opacity-90 drop-shadow-[4px_4px_0_rgba(0,82,204,0.3)] lg:drop-shadow-[6px_6px_0_rgba(0,82,204,0.3)] group-hover:drop-shadow-[10px_10px_0_rgba(0,82,204,0.8)] group-hover:scale-105 transition-all duration-500" />
                </div>
                
                <h3 className="text-xl md:text-4xl font-black text-white uppercase">Live Feed</h3>
              </a>

              {/* Download CTA */}
              <a href="#download" className="border-4 border-black dark:border-[#444] bg-white dark:bg-[#1C1C1C] p-4 md:p-6 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#0052CC] hover:translate-y-1 hover:shadow-none transition-all flex flex-col justify-end group shrink-0 relative overflow-hidden">
                <div className="flex justify-between items-center mb-2 md:mb-4">
                  <h3 className="text-3xl md:text-5xl font-black text-[#0052CC] uppercase leading-none">APP</h3>
                  <div className="bg-[#0052CC] border-2 md:border-4 border-black dark:border-[#333] rounded-full p-2 md:p-3 group-hover:rotate-45 transition-transform shadow-[4px_4px_0_#000]">
                    <svg className="w-4 h-4 md:w-8 md:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </div>
                </div>
                <div>
                  <p className="text-black dark:text-white font-black uppercase text-sm md:text-lg border-t-2 md:border-t-4 border-black dark:border-[#333] pt-2">ANDROID ONLY</p>
                </div>
              </a>

            </div>
          </div>
        </section>

        {/* Marquee */}
        <div className="w-full bg-[#0052CC] text-white border-y-4 border-black dark:border-[#333] font-black text-4xl md:text-5xl py-4 overflow-hidden flex uppercase tracking-tighter whitespace-nowrap mt-auto mb-6">
          <div className="flex animate-marquee shrink-0">
            <span className="px-4">SNAP ✦</span>
            <span className="px-4">PIN ✦</span>
            <span className="px-4">VERIFY ✦</span>
            <span className="px-4">DISPATCH ✦</span>
            <span className="px-4">SNAP ✦</span>
            <span className="px-4">PIN ✦</span>
            <span className="px-4">VERIFY ✦</span>
            <span className="px-4">DISPATCH ✦</span>
          </div>
          <div className="flex animate-marquee shrink-0" aria-hidden="true">
            <span className="px-4">SNAP ✦</span>
            <span className="px-4">PIN ✦</span>
            <span className="px-4">VERIFY ✦</span>
            <span className="px-4">DISPATCH ✦</span>
            <span className="px-4">SNAP ✦</span>
            <span className="px-4">PIN ✦</span>
            <span className="px-4">VERIFY ✦</span>
            <span className="px-4">DISPATCH ✦</span>
          </div>
        </div>

        {/* How it Works Section */}
        <section id="about" className="relative z-10 w-full max-w-[1800px] mx-auto px-4 md:px-8 mt-24 md:mt-32 mb-48 md:mb-64 scroll-mt-32">
          <div className="flex items-center gap-6 mb-12">
            <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-white bg-[#0052CC] inline-block px-6 py-2 border-4 border-black dark:border-[#333] shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#333] -rotate-2">
              HOW IT WORKS
            </h2>
            <div className="hidden md:block flex-grow border-t-8 border-black dark:border-[#333] border-dashed mt-4"></div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'SNAP', desc: 'Take a photo of the environmental issue.', color: 'bg-white text-black' },
              { step: '02', title: 'PIN', desc: 'Geolocate the exact coordinates on the map.', color: 'bg-[#0052CC] text-white' },
              { step: '03', title: 'AI VERIFY', desc: 'System automatically validates the report.', color: 'bg-white text-black' },
              { step: '04', title: 'DISPATCH', desc: 'SWMO deploys a team to resolve the issue.', color: 'bg-[#0052CC] text-white' }
            ].map((item, idx) => (
              <div key={idx} className={`${item.color} dark:bg-[#1C1C1C] dark:text-white border-4 border-black dark:border-[#444] shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#0052CC] p-8 flex flex-col hover:-translate-y-2 hover:shadow-[12px_12px_0_#000] transition-all`}>
                <div className={`text-6xl font-black mb-6 border-b-4 border-black dark:border-[#444] pb-4 ${item.color.includes('bg-white') ? 'text-[#0052CC] dark:text-[#6699FF]' : 'text-white'}`}>{item.step}</div>
                <h3 className="text-3xl font-black uppercase mb-4">{item.title}</h3>
                <p className="text-lg font-bold leading-tight">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="relative z-10 w-full max-w-[1800px] mx-auto px-4 md:px-8 mb-48 md:mb-64 scroll-mt-32">
          <div className="bg-white dark:bg-[#1C1C1C] border-4 border-black dark:border-[#444] shadow-[12px_12px_0_#000] dark:shadow-[12px_12px_0_#0052CC] p-8 md:p-16">
            
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-black dark:text-white">
                SYSTEM FEATURES
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
              {[
                { title: 'AI VALIDATION', desc: 'No fake reports. ML filters out the noise.', bg: 'bg-white', darkBg: 'dark:bg-black' },
                { title: 'REAL-TIME MAP', desc: 'See the city\'s status live on the grid.', bg: 'bg-white', darkBg: 'dark:bg-black' },
                { title: 'SMART CLUSTERS', desc: 'Heatmaps automatically group identical issues.', bg: 'bg-[#0052CC]', darkBg: 'dark:bg-[#0052CC]' },
                { title: 'ROLE ACCESS', desc: 'Admin, Field Worker, and Citizen views.', bg: 'bg-white', darkBg: 'dark:bg-black' }
              ].map((feature, i) => (
                <div key={i} className={`border-4 border-black dark:border-[#444] ${feature.bg} ${feature.darkBg.replace('dark:bg-black', 'dark:bg-[#121212]')} p-6 relative overflow-hidden group shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#0052CC] flex flex-col min-h-[200px]`}>
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white dark:bg-[#121212] border-l-4 border-b-4 border-black dark:border-[#333] -mr-8 -mt-8 rotate-45 group-hover:scale-150 transition-transform"></div>
                  <h3 className={`text-2xl font-black mb-4 ${feature.bg.includes('0052CC') ? 'text-white dark:text-white' : 'text-[#0052CC] dark:text-[#6699FF]'} uppercase mt-auto`}>{feature.title}</h3>
                  <p className={`font-bold ${feature.bg.includes('0052CC') ? 'text-white dark:text-white' : 'text-black dark:text-white'} text-lg`}>{feature.desc}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* Download / Footer */}
        <section id="download" className="relative z-10 w-full max-w-[1800px] mx-auto px-4 md:px-8 pb-12 scroll-mt-32">
          <div className="bg-[#0052CC] dark:bg-[#1C1C1C] border-4 border-black dark:border-[#444] shadow-[8px_8px_0_#000] md:shadow-[12px_12px_0_#000] dark:shadow-[8px_8px_0_#0052CC] md:dark:shadow-[12px_12px_0_#0052CC] p-8 sm:p-12 md:p-24 text-center relative overflow-hidden">
            <div className="hidden md:block absolute top-10 left-10 text-[100px] opacity-30">✦</div>
            <div className="hidden md:block absolute bottom-10 right-10 text-[100px] opacity-30">✹</div>
            
            <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter text-white mb-6 md:mb-10 relative z-10 mix-blend-overlay dark:mix-blend-normal">
              HELP MAKE PASIG GREEN AGAIN
            </h2>
            
            <a href="/ecopin-app-release.apk" download className="inline-block px-6 py-4 sm:px-8 sm:py-5 md:px-12 md:py-6 bg-white dark:bg-[#0052CC] text-[#0052CC] dark:text-white border-4 border-black dark:border-[#444] font-black text-2xl sm:text-3xl md:text-4xl lg:text-5xl uppercase tracking-widest shadow-[6px_6px_0_#000] md:shadow-[8px_8px_0_#000] hover:translate-y-2 hover:shadow-none transition-all relative z-10 break-words max-w-full">
              DOWNLOAD .APK
            </a>
          </div>
        </section>

        <footer className="w-full border-t-4 border-black dark:border-[#444] bg-[#F4F0EA] dark:bg-[#121212] py-8 px-8 flex flex-col md:flex-row justify-between items-center gap-6 z-10 relative">
          <div className="font-black text-3xl uppercase tracking-tighter text-black dark:text-white">
            ECOPIN © 2026
          </div>
          <div className="font-bold text-black dark:text-white text-lg border-2 border-black dark:border-[#444] px-4 py-2 bg-white dark:bg-[#1C1C1C] shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#0052CC]">
            SOLID WASTE MANAGEMENT OFFICE
          </div>
        </footer>
      </div>
      
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
