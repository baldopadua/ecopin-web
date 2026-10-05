'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Lenis from 'lenis';
import Navbar from '../components/layout/Navbar';

const SolidLeaf = ({ className }) => (
  <svg viewBox="200 1400 1400 1400" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M 10212.1,6632.9 C 10020.1,5259.3 9193.56,3987.5 8016.09,3254.4 6838.63,2521.3 5332.59,2340.7 4015.19,2774.6 4583.93,4666.2 5714.06,6385.1 7225.35,7657.1 6151.28,7115.4 5305.09,6195.2 4668.79,5174.3 4032.49,4153.4 3588.08,3027 3147.23,1907.9 c -418.54,65.3 -615.3,338.8 -615.3,338.8 19.38,173.4 347.11,861.8 679.39,1513.5 -730.82,1034.7 -212.9,2598.1 730.44,3460.5 727.11,664.8 1953.15,1033.1 2856.17,1427.1 903.03,393.9 1822.34,938.6 2228.22,1836.3 C 9957.66,9456.3 10404,8006.6 10212.1,6632.9" transform="matrix(0.13333333,0,0,-0.13333333,0,2933.3333)" />
  </svg>
);

export default function Home() {
  const [theme, setTheme] = useState('light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [hasSession, setHasSession] = useState(false);
  
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -15; // Max 15 deg
    const rotateY = ((x - centerX) / centerX) * 15;
    
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

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
    <main className="min-h-screen bg-background  text-text-primary  relative overflow-x-hidden selection:bg-black selection:text-white transition-colors duration-300">
      
      {/* Background System */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center opacity-30 dark:opacity-20">
        <div className="w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-multiply dark:mix-blend-overlay"></div>
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      </div>

      {/* Shared Navbar Component */}
      <Navbar 
        theme={theme}
        toggleTheme={toggleTheme}
        hasSession={hasSession}
        user={user}
        isFloating={true}
        className="shadow-sm"
      />

      {/* 100VH Wrapper */}
      <div className="w-full min-h-[100svh] flex flex-col">
        {/* FULL WIDTH HERO BACKGROUND */}
        <div className="w-full bg-primary pt-[120px] md:pt-[160px] pb-8 md:pb-12 relative z-0 overflow-hidden flex-1 flex flex-col justify-center">
          <SolidLeaf className="absolute top-10 right-4 md:right-20 w-[120px] md:w-[150px] opacity-20 pointer-events-none -rotate-12 select-none text-white" />
          <SolidLeaf className="absolute bottom-10 left-4 md:left-20 w-[80px] md:w-[100px] opacity-20 pointer-events-none rotate-45 select-none text-white" />

          <section id="home" className="relative z-10 w-full max-w-[1800px] mx-auto px-4 md:px-8 flex flex-col gap-16">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="flex flex-col gap-6 items-start text-white">
                <h1 className="text-[12vw] sm:text-6xl lg:text-[7rem] xl:text-[8.5rem] font-bold uppercase tracking-tight leading-[0.85] text-white">
                  Clean the <br className="hidden md:block" /> Streets.
                </h1>
                
                <p className="text-lg md:text-2xl font-normal max-w-2xl leading-snug text-white/90">
                  A crowdsourced geospatial platform for transparent environmental reporting. Every pin you drop helps the Solid Waste Management Office keep Pasig City clean. Start making an impact today.
                </p>
                
                <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap gap-4 w-full">
                  <a href="/map" className="w-full sm:w-auto text-center inline-block bg-surface text-primary px-8 py-4 rounded-full font-bold text-xl border border-transparent hover:bg-surface/90 hover:scale-105 transition-all drop-shadow-sm animate-btn-pulse">
                    LIVE MAP
                  </a>
                  <a href="#download" className="w-full sm:w-auto text-center inline-block bg-transparent text-white px-8 py-4 rounded-full font-bold text-xl border border-white/50 hover:border-white hover:bg-white/10 transition-all">
                    GET THE APP
                  </a>
                </div>
              </div>
              
              <div 
                 ref={containerRef}
                 onMouseMove={handleMouseMove}
                 onMouseLeave={handleMouseLeave}
                 className="hidden lg:flex justify-center items-center w-full relative perspective-container"
              >
                 <div 
                    className="relative w-full max-w-[600px] aspect-square flex items-center justify-center transform-style-3d"
                    style={{
                       transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                       transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'transform 0.1s linear'
                    }}
                 >
                   
                   {/* 3D Shadow underneath the phone */}
                   <div className="absolute inset-0 bg-black/20 blur-3xl rounded-xl z-0" style={{ transform: 'translateZ(-50px) scale(0.8)' }}></div>

                   {/* The Phone Mockup */}
                   <div 
                      className="relative w-[220px] sm:w-[260px] lg:w-[280px] xl:w-[300px] aspect-[9/19] bg-surface rounded-[36px] sm:rounded-[40px] border-[10px] sm:border-[12px] border-[#111827] overflow-hidden shadow-2xl group cursor-pointer flex flex-col z-20 mx-auto"
                      style={{ transform: 'translateZ(30px)' }}
                   >
                      
                      {/* Dynamic Island */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[100px] h-[28px] bg-black rounded-full z-[60] flex items-center justify-between px-3 shadow-inner">
                          <div className="w-3 h-3 rounded-full bg-surface/10"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/90 shadow-[0_0_5px_#0052CC]"></div>
                      </div>

                      {/* App Bar */}
                      <div className="pt-10 pb-3 bg-surface border-b-4 border-border z-40 flex items-center px-4 justify-between shrink-0">
                         <img src="/Solo Logo Light.png" alt="EcoPin" className="h-6 w-6 object-contain" />
                         <div className="font-bold uppercase tracking-widest text-sm text-text-primary">Report Issue</div>
                         <div className="w-6 h-6"></div>
                      </div>

                      {/* Map Content Container */}
                      <div className="flex-1 bg-background relative overflow-hidden flex items-center justify-center">
                          <img 
                             src="/pasig.svg" 
                             alt="Map" 
                             className="w-[150%] max-w-none opacity-10 relative top-10" 
                          />
                       
                          {/* Hover Overlay: Connecting Pins */}
                          <div className="absolute inset-0 z-20 pointer-events-none">
                      
                          {/* Connections */}
                          <svg className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-0 group-hover:delay-[500ms]">
                            {/* Cluster 1: Top Right */}
                            <line x1="60%" y1="25%" x2="65%" y2="35%" stroke="black" strokeWidth="4" strokeDasharray="8" className="animate-[dash_1s_linear_infinite]" />
                            <line x1="65%" y1="35%" x2="63%" y2="45%" stroke="black" strokeWidth="4" strokeDasharray="8" className="animate-[dash_1s_linear_infinite]" />
                            <line x1="63%" y1="45%" x2="72%" y2="38%" stroke="black" strokeWidth="4" strokeDasharray="8" className="animate-[dash_1s_linear_infinite]" />
                            
                            {/* Cluster 2: Bottom Left */}
                            <line x1="30%" y1="65%" x2="42%" y2="65%" stroke="black" strokeWidth="4" strokeDasharray="8" className="animate-[dash_1s_linear_infinite]" />
                            <line x1="42%" y1="65%" x2="48%" y2="72%" stroke="black" strokeWidth="4" strokeDasharray="8" className="animate-[dash_1s_linear_infinite]" />
                            <line x1="48%" y1="72%" x2="35%" y2="78%" stroke="black" strokeWidth="4" strokeDasharray="8" className="animate-[dash_1s_linear_infinite]" />
                            
                            {/* Cluster 3: Bottom Right */}
                            <line x1="75%" y1="62%" x2="80%" y2="70%" stroke="black" strokeWidth="4" strokeDasharray="8" className="animate-[dash_1s_linear_infinite]" />
                            <line x1="80%" y1="70%" x2="62%" y2="68%" stroke="black" strokeWidth="4" strokeDasharray="8" className="animate-[dash_1s_linear_infinite]" />
                            <line x1="62%" y1="68%" x2="65%" y2="88%" stroke="black" strokeWidth="4" strokeDasharray="8" className="animate-[dash_1s_linear_infinite]" />
                            <line x1="62%" y1="68%" x2="55%" y2="82%" stroke="black" strokeWidth="4" strokeDasharray="8" className="animate-[dash_1s_linear_infinite]" />
                        </svg>

                        {/* Staggered Circles */}
                        {[
                          // Cluster 1
                          { top: '25%', left: '60%', color: 'bg-red-500', delay: 'group-hover:delay-[100ms]' },
                          { top: '35%', left: '65%', color: 'bg-orange-500', delay: 'group-hover:delay-[200ms]' },
                          { top: '45%', left: '63%', color: 'bg-yellow-400', delay: 'group-hover:delay-[300ms]' },
                          { top: '38%', left: '72%', color: 'bg-orange-500', delay: 'group-hover:delay-[450ms]' },
                          
                          // Cluster 2
                          { top: '65%', left: '30%', color: 'bg-orange-500', delay: 'group-hover:delay-[500ms]' },
                          { top: '65%', left: '42%', color: 'bg-yellow-400', delay: 'group-hover:delay-[400ms]' },
                          { top: '72%', left: '48%', color: 'bg-red-500', delay: 'group-hover:delay-[600ms]' },
                          { top: '78%', left: '35%', color: 'bg-yellow-400', delay: 'group-hover:delay-[550ms]' },
                          
                          // Cluster 3
                          { top: '70%', left: '80%', color: 'bg-red-500', delay: 'group-hover:delay-[700ms]' },
                          { top: '68%', left: '62%', color: 'bg-yellow-400', delay: 'group-hover:delay-[350ms]' },
                          { top: '62%', left: '75%', color: 'bg-red-500', delay: 'group-hover:delay-[250ms]' },
                          { top: '88%', left: '65%', color: 'bg-orange-500', delay: 'group-hover:delay-[800ms]' },
                          { top: '82%', left: '55%', color: 'bg-yellow-400', delay: 'group-hover:delay-[550ms]' },
                        ].map((pin, i) => (
                          <div 
                            key={i}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-[3px] border-border ${pin.color} opacity-0 group-hover:opacity-100 transition-all duration-300 scale-50 group-hover:scale-100 delay-0 ${pin.delay} drop-shadow-sm origin-center`}
                            style={{ top: pin.top, left: pin.left }}
                          />
                        ))}
                          </div>

                          {/* Central Pin */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
                             <div className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-1 shadow-md whitespace-nowrap">Current Location</div>
                             <svg viewBox="0 0 24 24" className="w-10 h-10 animate-bounce text-[#0052CC]" fill="currentColor" stroke="black" strokeWidth="1.5">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                             </svg>
                          </div>
                      </div>

                      {/* Bottom Sheet */}
                      <div className="h-[140px] bg-surface border-t-4 border-border z-40 rounded-t-3xl flex flex-col p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.1)] shrink-0 relative -mt-4">
                         <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3"></div>
                         <div className="font-bold text-[10px] mb-1 text-text-muted uppercase tracking-widest">Location</div>
                         <div className="font-bold text-lg leading-tight mb-auto text-text-primary">Pasig City, Metro Manila</div>
                         <div className="w-full bg-primary border border-border text-white rounded-full py-2.5 text-center font-bold uppercase tracking-widest mt-2 hover:bg-[#60A5FA] hover:text-text-primary transition-colors cursor-pointer text-sm">
                            Confirm Pin
                         </div>
                      </div>

                   </div>

                   {/* Floating UI Badges */}
                   <div 
                      className="absolute top-[5%] sm:top-[15%] right-0 sm:-right-[0%] lg:-right-[5%] bg-surface text-text-primary border border-border px-3 py-2 sm:px-5 sm:py-4 rounded-2xl drop-shadow-sm sm:drop-shadow-sm z-30 hover:-translate-y-2 transition-all scale-75 sm:scale-100 origin-top-right sm:origin-center"
                      style={{ transform: 'translateZ(60px) rotate(3deg)' }}
                   >
                      <div className="text-[10px] sm:text-xs font-bold uppercase text-text-muted mb-1 flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        AI System
                      </div>
                      <div className="text-lg sm:text-xl md:text-2xl font-bold">100% VERIFIED</div>
                   </div>

                   <div 
                      className="absolute bottom-[5%] sm:bottom-[15%] left-0 sm:-left-[0%] lg:-left-[5%] bg-[#60A5FA] text-text-primary border border-border px-3 py-2 sm:px-5 sm:py-4 rounded-2xl drop-shadow-sm sm:drop-shadow-sm z-30 hover:-translate-y-2 transition-all scale-75 sm:scale-100 origin-bottom-left sm:origin-center"
                      style={{ transform: 'translateZ(80px) rotate(-3deg)' }}
                   >
                      <div className="text-[10px] sm:text-xs font-bold uppercase text-text-primary mb-1 flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                        Live Status
                      </div>
                      <div className="text-lg sm:text-xl md:text-2xl font-bold">24 NEW REPORTS</div>
                   </div>

                 </div>
              </div>
            </div>

          </section>
        </div>

        {/* Full-Width Marquee */}
        <div className="w-full bg-black text-white font-bold text-3xl md:text-5xl py-6 overflow-hidden flex uppercase tracking-tight whitespace-nowrap relative z-10 shrink-0">
          <div className="flex animate-marquee shrink-0 items-center gap-8 md:gap-12 pr-8 md:pr-12">
            <span>SNAP</span><SolidLeaf className="w-10 h-10 md:w-12 md:h-12" />
            <span>PIN</span><SolidLeaf className="w-10 h-10 md:w-12 md:h-12" />
            <span>VERIFY</span><SolidLeaf className="w-10 h-10 md:w-12 md:h-12" />
            <span>DISPATCH</span><SolidLeaf className="w-10 h-10 md:w-12 md:h-12" />
            <span>SNAP</span><SolidLeaf className="w-10 h-10 md:w-12 md:h-12" />
            <span>PIN</span><SolidLeaf className="w-10 h-10 md:w-12 md:h-12" />
            <span>VERIFY</span><SolidLeaf className="w-10 h-10 md:w-12 md:h-12" />
            <span>DISPATCH</span><SolidLeaf className="w-10 h-10 md:w-12 md:h-12" />
          </div>
          <div className="flex animate-marquee shrink-0 items-center gap-8 md:gap-12 pr-8 md:pr-12" aria-hidden="true">
            <span>SNAP</span><SolidLeaf className="w-10 h-10 md:w-12 md:h-12" />
            <span>PIN</span><SolidLeaf className="w-10 h-10 md:w-12 md:h-12" />
            <span>VERIFY</span><SolidLeaf className="w-10 h-10 md:w-12 md:h-12" />
            <span>DISPATCH</span><SolidLeaf className="w-10 h-10 md:w-12 md:h-12" />
            <span>SNAP</span><SolidLeaf className="w-10 h-10 md:w-12 md:h-12" />
            <span>PIN</span><SolidLeaf className="w-10 h-10 md:w-12 md:h-12" />
            <span>VERIFY</span><SolidLeaf className="w-10 h-10 md:w-12 md:h-12" />
            <span>DISPATCH</span><SolidLeaf className="w-10 h-10 md:w-12 md:h-12" />
          </div>
        </div>
      </div>

      <div className="flex flex-col px-4 md:px-8 pb-12 gap-12 max-w-[1800px] mx-auto w-full mt-12 relative z-10">

        {/* Features Section */}
        <section id="features" className="relative z-10 w-full scroll-mt-32">
          <div className="bg-[#121212] dark:bg-surface text-white dark:text-text-primary border border-border  rounded-[32px] md:rounded-xl p-6 sm:p-8 md:p-16 lg:p-20">
            <div className="flex flex-col md:flex-row gap-6 md:gap-12 lg:gap-20 items-start md:items-end mb-12">
               <h2 className="text-[11vw] sm:text-5xl md:text-7xl lg:text-[6rem] font-bold uppercase tracking-tight leading-[0.9] flex-1 break-words">
                 BUILT FOR <br/> TRANSPARENCY
               </h2>
               <p className="text-lg md:text-2xl font-bold max-w-sm text-gray-300 dark:text-gray-700">
                 Everything you need to report, track, and resolve environmental issues in one place.
               </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
               <div className="bg-surface dark:bg-surface text-text-primary  rounded-[32px] border border-border  p-8 flex flex-col justify-center min-h-[200px]">
                 <h3 className="text-3xl lg:text-4xl font-bold uppercase mb-3">LIVE MAP</h3>
                 <p className="font-bold text-lg leading-snug">See the city's status in real-time on the grid.</p>
               </div>
               <div className="bg-[#60A5FA] text-text-primary rounded-[32px] border border-border p-8 flex flex-col justify-center min-h-[200px]">
                 <h3 className="text-3xl lg:text-4xl font-bold uppercase mb-3">AI VERIFIED</h3>
                 <p className="font-bold text-lg leading-snug">No fake reports. ML filters out the noise automatically.</p>
               </div>
               <div className="bg-primary text-white rounded-[32px] border border-border p-8 flex flex-col justify-center min-h-[200px]">
                 <h3 className="text-3xl lg:text-4xl font-bold uppercase mb-3">SMART CLUSTERS</h3>
                 <p className="font-bold text-lg leading-snug">Heatmaps group identical issues automatically.</p>
               </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="about" className="relative z-10 w-full scroll-mt-32">
          <div className="bg-surface dark:bg-surface border border-border  rounded-[32px] md:rounded-xl p-6 sm:p-8 md:p-16 lg:p-20">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
              
              <div className="flex flex-col gap-6 justify-center">
                <h2 className="text-[11vw] sm:text-5xl md:text-7xl lg:text-[6rem] font-bold uppercase tracking-tight text-text-primary  leading-[0.9] break-words">
                  HOW IT WORKS IN <br/> FOUR EASY STEPS
                </h2>
                <p className="text-lg md:text-2xl font-bold max-w-lg mt-4 dark:text-gray-300">
                  Follow these steps and start making a visible impact in minutes.
                </p>
                <div className="mt-8">
                  <a href="#download" className="inline-block bg-black dark:bg-surface text-white dark:text-text-primary px-8 py-4 rounded-full font-bold text-xl border border-border  hover:scale-105 transition-transform">
                    Get Started ↗
                  </a>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { step: 'STEP 01', title: 'SNAP A PHOTO', desc: 'Capture the environmental issue clearly.', color: 'bg-primary' },
                  { step: 'STEP 02', title: 'PIN LOCATION', desc: 'Geolocate the exact coordinates on the map.', color: 'bg-[#60A5FA]' },
                  { step: 'STEP 03', title: 'AI VERIFY', desc: 'System automatically validates the report.', color: 'bg-primary', text: 'text-white' },
                  { step: 'STEP 04', title: 'DISPATCH', desc: 'SWMO deploys a team to resolve the issue.', color: 'bg-black', text: 'text-white' }
                ].map((item, idx) => (
                  <div key={idx} className={`bg-surface  border border-border dark:border-[#444] rounded-[32px] p-8 flex flex-col min-h-[240px]`}>
                    <div className={`text-sm font-bold uppercase tracking-widest mb-6 inline-flex w-max px-3 py-1 rounded-md ${item.color} ${item.text || 'text-text-primary'}`}>
                      {item.step}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold uppercase mb-3 text-text-primary ">{item.title}</h3>
                    <p className="text-base md:text-lg font-bold text-gray-700 dark:text-gray-300 leading-snug">{item.desc}</p>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* Download Section */}
        <section id="download" className="relative z-10 w-full scroll-mt-32">
          <div className="bg-primary border border-border  rounded-[32px] md:rounded-xl p-8 sm:p-12 md:p-24 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[40vh] md:min-h-[50vh]">
            <SolidLeaf className="hidden md:block absolute top-10 left-10 w-[150px] opacity-20 text-white -rotate-12 pointer-events-none" />
            <SolidLeaf className="hidden md:block absolute bottom-10 right-10 w-[150px] opacity-20 text-white rotate-45 pointer-events-none" />
            
            <h2 className="text-[11vw] sm:text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-tight text-white mb-8 relative z-10 leading-[0.9] break-words">
              HELP MAKE PASIG <br className="hidden md:block" /> GREEN AGAIN
            </h2>
            
            <Link href="/downloads" className="inline-block px-8 py-5 md:px-12 md:py-6 bg-surface text-text-primary rounded-full font-bold text-2xl sm:text-3xl md:text-4xl uppercase tracking-widest border border-border hover:scale-105 transition-transform relative z-10 break-words max-w-full">
              DOWNLOAD .APK
            </Link>
          </div>
        </section>

        <footer className="w-full bg-surface dark:bg-surface border border-border  rounded-[32px] md:rounded-xl py-6 px-6 md:px-8 flex flex-col md:flex-row justify-between items-center gap-6 z-10 relative text-center md:text-left">
          <div className="font-bold text-2xl uppercase tracking-tight text-text-primary ">
            ECOPIN © 2026
          </div>
          <div className="flex flex-col items-center md:items-end gap-2">
            <div className="font-bold text-text-primary  text-base bg-background  border border-border dark:border-[#444] rounded-full px-6 py-2">
              SOLID WASTE MANAGEMENT OFFICE
            </div>
            <div className="text-sm font-medium text-text-primary/80 /70 tracking-wide font-mono">
              swmo@pasigcity.gov.ph &bull; 09173726888
            </div>
          </div>
        </footer>
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes dash {
          to { stroke-dashoffset: -12; }
        }
        @keyframes btn-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .animate-btn-pulse {
          animation: btn-pulse 2s infinite ease-in-out;
        }
        .perspective-container {
          perspective: 1200px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
      `}} />
    </main>
  );
}
