'use client';
import React, { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import dynamic from 'next/dynamic';

const BackgroundMap = dynamic(() => import('./BackgroundMap'), {
  ssr: false,
});

// Interactive Particle Background Component
const InteractiveMapParticles = ({ isDark }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    let mouse = { x: -1000, y: -1000 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 1.5;
        this.size = Math.random() * 2 + 0.5;
        this.history = [];
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 200) {
          this.vx += dx * 0.0005;
          this.vy += dy * 0.0005;
        }

        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 3) {
          this.vx = (this.vx / speed) * 3;
          this.vy = (this.vy / speed) * 3;
        }

        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > 25) this.history.shift();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        // neon green for particles.
        ctx.fillStyle = '#ccff00';
        ctx.fill();

        if (this.history.length > 1) {
          ctx.beginPath();
          ctx.moveTo(this.history[0].x, this.history[0].y);
          for (let i = 1; i < this.history.length; i++) {
            ctx.lineTo(this.history[i].x, this.history[i].y);
          }
          ctx.strokeStyle = `rgba(204, 255, 0, 0.4)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    for (let i = 0; i < 70; i++) {
      particles.push(new Particle());
    }

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      // Clear the canvas completely so the background map is visible
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDark]);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-80" />;
};

export default function Home() {
  const [theme, setTheme] = useState('dark');
  const [phoneRotation, setPhoneRotation] = useState({ x: 0, y: 0 });

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

  const handlePhoneMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setPhoneRotation({ x: -y / 20, y: x / 20 });
  };

  const handlePhoneMouseLeave = () => {
    setPhoneRotation({ x: 0, y: 0 });
  };

  const isDark = theme === 'dark';

  return (
    <main
      className="min-h-screen bg-white text-black dark:bg-black dark:text-white relative overflow-hidden selection:bg-[#ccff00] selection:text-black transition-colors duration-300"
      style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
    >
      {/* Background System */}
      <div className="absolute inset-0 z-0 bg-white dark:bg-black transition-colors duration-300">
        <BackgroundMap isDark={isDark} />
        <InteractiveMapParticles isDark={isDark} />

        {/* Subtle Map Pattern Overlay - Turned up opacity */}
        <div
          className="absolute inset-0 opacity-40 dark:opacity-40 pointer-events-none"
          style={{
            backgroundImage: isDark
              ? 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)'
              : 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
            backgroundSize: '100px 100px',
            backgroundPosition: 'center center',
          }}
        >
          {/* Crosshairs & Coordinates */}
          <div className="absolute top-1/4 left-1/4 w-8 h-8 border-t border-l border-black dark:border-[#ccff00] opacity-80"></div>
          <div className="absolute bottom-1/4 right-1/4 w-8 h-8 border-b border-r border-black dark:border-[#ccff00] opacity-80"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black dark:text-[#ccff00] text-2xl font-light tracking-widest">+</div>
          <div className="absolute top-[30%] right-[20%] text-black dark:text-[#ccff00] text-2xl font-light tracking-widest">+</div>
          <div className="absolute bottom-[20%] left-[15%] text-black dark:text-[#ccff00] text-2xl font-light tracking-widest">+</div>
          <div className="absolute bottom-10 left-10 font-mono text-xs text-black dark:text-[#ccff00] font-bold">
            35° 42' 55" N / 139° 47' 07" E<br />
            INTERZONE // SECTOR 7
          </div>
        </div>
      </div>

      {/* Solid green blocks intersecting - brutalist geometry */}
      <div className="absolute top-0 right-0 w-64 md:w-96 h-64 bg-[#ccff00] z-0 hidden md:block mix-blend-difference"></div>
      <div className="absolute bottom-20 left-0 w-48 h-64 bg-[#ccff00] z-0 hidden md:block mix-blend-difference"></div>

      {/* Header */}
      <header className="relative z-50 flex items-center justify-between p-6 md:px-12 border-b-4 border-black dark:border-[#ccff00] bg-white dark:bg-black transition-colors duration-300">
        <a href="#home" className="text-3xl font-black tracking-tighter cursor-pointer text-black dark:text-white">
          ECOPIN<span className="text-[#ccff00]">.AI</span>
        </a>
        <nav className="hidden md:flex gap-8 items-center">
          <a href="#about" className="text-sm font-bold uppercase tracking-widest hover:text-[#ccff00] hover:bg-black dark:hover:bg-white dark:hover:text-black px-2 py-1 transition-all">About</a>
          <a href="#features" className="text-sm font-bold uppercase tracking-widest hover:text-[#ccff00] hover:bg-black dark:hover:bg-white dark:hover:text-black px-2 py-1 transition-all">Features</a>

          {/* Theme Toggler with SVG */}
          <button
            onClick={toggleTheme}
            className="p-2 border-2 border-black dark:border-[#ccff00] hover:bg-black hover:text-[#ccff00] dark:hover:bg-[#ccff00] dark:hover:text-black transition-colors flex items-center justify-center"
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

          <a href="/auth" className="px-6 py-2 bg-[#ccff00] text-black text-sm font-black uppercase tracking-widest border-2 border-black dark:border-[#ccff00] hover:bg-black hover:text-[#ccff00] dark:hover:bg-white dark:hover:text-black transition-colors">Login</a>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] px-6 text-center pointer-events-none">
        {/* Large abstract glowing arc */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[700px] md:h-[700px] rounded-full border-[40px] md:border-[80px] border-[#ccff00] blur-xl opacity-60 dark:opacity-40 mix-blend-difference pointer-events-none"></div>

        <div className="relative z-20 max-w-5xl mx-auto flex flex-col items-center pointer-events-auto">
          {/* Brutalist highlight box */}
          <div className="inline-block bg-[#ccff00] text-black px-8 py-2 mb-8 transform -rotate-2 border-4 border-black">
            <span className="text-xl md:text-2xl font-black uppercase tracking-tight">Civic Tech Platform</span>
          </div>

          <h1 className="text-6xl md:text-[8rem] font-black uppercase tracking-tighter leading-[0.85] mb-10 text-black dark:text-white drop-shadow-2xl">
            Clean the <br />
            <span className="text-black dark:text-[#ccff00]">Streets</span>, <br />
            Reclaim the <br />
            <span className="text-transparent relative" style={{ WebkitTextStroke: isDark ? '2px #ccff00' : '2px #000' }}>
              City.
              <span className="absolute inset-0 text-black dark:text-[#ccff00] mix-blend-overlay opacity-50 blur-sm">City.</span>
            </span>
          </h1>

          <div className="text-lg md:text-2xl font-medium max-w-4xl mx-auto mb-12 leading-tight text-center px-4 text-black dark:text-white inline-block p-4">
            <span className="bg-[#ccff00] text-black px-2 font-bold border-2 border-black inline-block">EcoPin A.I.</span> is a Crowdsourced Geospatial Platform for Transparent Environmental Reporting and Rapid Institutional Detection for the Pasig City Solid Waste Management Office.
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-2xl mt-4">
            <a href="#download" className="group relative w-full sm:w-auto px-10 py-5 bg-[#ccff00] text-black font-black uppercase text-xl md:text-2xl overflow-hidden border-4 border-black dark:border-[#ccff00]">
              <span className="relative z-10 block group-hover:scale-110 transition-transform duration-200">Download App</span>
            </a>
            <a href="/map" className="group relative w-full sm:w-auto px-10 py-5 bg-black dark:bg-black text-[#ccff00] font-black uppercase text-xl md:text-2xl overflow-hidden border-4 border-black dark:border-[#ccff00] hover:bg-[#ccff00] hover:text-black transition-colors">
              <span className="relative z-10 block group-hover:scale-110 transition-transform duration-200">Live Reports</span>
            </a>
          </div>
        </div>

        {/* Small floating brutalist text elements - Fixed text color in light mode */}
        <div className="absolute top-32 left-10 text-xs font-mono uppercase text-black dark:text-[#ccff00] hidden xl:block border-2 border-black dark:border-[#ccff00] p-2 bg-white dark:bg-black font-bold">
          [08] resources <br /> loaded.
        </div>
        <div className="absolute bottom-40 right-10 text-xs font-mono uppercase text-black dark:text-white hidden xl:block text-right border-r-4 border-[#ccff00] pr-2 font-bold bg-white/50 dark:bg-black/50 p-2">
          @pasig_city <br /> system.init()
        </div>
      </section>

      {/* Marquee Divider */}
      <div className="w-full bg-[#ccff00] text-black font-black text-2xl py-3 overflow-hidden whitespace-nowrap border-y-4 border-black dark:border-black relative z-20">
        <div className="inline-block animate-[marquee_20s_linear_infinite]">
          REPORT IT. TRACK IT. WATCH IT DISAPPEAR. // REPORT IT. TRACK IT. WATCH IT DISAPPEAR. // REPORT IT. TRACK IT. WATCH IT DISAPPEAR. //
        </div>
      </div>

      {/* How it Works Section */}
      <section id="about" className="relative z-10 py-32 px-6 bg-white dark:bg-black border-t-8 border-black dark:border-[#ccff00] transition-colors duration-300">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-12 leading-[0.9] text-black dark:text-white">
              How it <br /> <span className="text-black bg-[#ccff00] px-4 inline-block mt-2 transform rotate-1 border-4 border-black">Works</span>
            </h2>
            <div className="space-y-10 font-mono text-lg md:text-xl text-black dark:text-gray-300">
              <div className="border-l-8 border-[#ccff00] pl-6 bg-black/5 dark:bg-white/5 p-4 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                {/* Fixed dark mode text color for 01 */}
                <span className="text-black dark:text-black font-black text-2xl block mb-2 tracking-widest bg-[#ccff00] inline-block px-2">01. REPORT</span>
                <br />Citizens pin environmental issues on the map with photos and descriptions.
              </div>
              <div className="border-l-8 border-black dark:border-white pl-6 bg-black/5 dark:bg-white/5 p-4 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                <span className="text-white bg-black dark:bg-white dark:text-black font-black text-2xl block mb-2 tracking-widest inline-block px-2">02. VALIDATE</span>
                <br />AI automatically verifies each report for accuracy and relevance.
              </div>
              <div className="border-l-8 border-[#ccff00] pl-6 bg-black/5 dark:bg-white/5 p-4 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                {/* Fixed dark mode text color for 03 */}
                <span className="text-black dark:text-black font-black text-2xl block mb-2 tracking-widest bg-[#ccff00] inline-block px-2">03. PRIORITIZE</span>
                <br />The system clusters and ranks issues based on severity and location.
              </div>
              <div className="border-l-8 border-black dark:border-white pl-6 bg-black/5 dark:bg-white/5 p-4 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                <span className="text-white bg-black dark:bg-white dark:text-black font-black text-2xl block mb-2 tracking-widest inline-block px-2">04. ACT</span>
                <br />SWMO assigns cleanup tasks and tracks resolution in real time.
              </div>
            </div>
          </div>

          <div
            className="relative h-[700px] border-8 border-black dark:border-[#ccff00] bg-gray-100 dark:bg-[#111] flex items-center justify-center group [perspective:1000px] overflow-visible"
            onMouseMove={handlePhoneMouseMove}
            onMouseLeave={handlePhoneMouseLeave}
          >
            {/* Background pattern for the box */}
            <div className="absolute inset-0 opacity-20 dark:opacity-20 mix-blend-multiply dark:mix-blend-normal overflow-hidden" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ccff00 0, #ccff00 2px, transparent 2px, transparent 10px)' }}></div>

            {/* 3D Phone Mockup - Increased Size */}
            <div
              className="w-[360px] h-[780px] border-[12px] border-black dark:border-[#222] rounded-[3.5rem] relative overflow-hidden bg-black shadow-[20px_20px_0px_0px_rgba(0,0,0,0.4)] dark:shadow-[30px_30px_0px_0px_rgba(204,255,0,0.15)] transition-transform duration-100 ease-out flex flex-col items-center justify-center px-8 z-10"
              style={{
                transform: `rotateX(${phoneRotation.x}deg) rotateY(${phoneRotation.y}deg)`,
              }}
            >
              <div className="absolute top-0 inset-x-0 h-7 bg-black dark:bg-[#222] rounded-b-2xl w-40 mx-auto z-20"></div>

              <div className="w-full flex flex-col items-center justify-center h-full pt-16 pb-10 relative z-10">
                <h3 className="text-[3rem] font-bold text-white mb-12 text-center font-sans tracking-tight leading-tight">Ecopin<br />Login</h3>

                <div className="w-full space-y-5">
                  <div className="w-full bg-[#1A1A1A] border border-[#333] rounded-[1rem] p-5 text-gray-400 text-base font-sans font-medium flex items-center">
                    Email
                  </div>

                  <div className="w-full bg-[#1A1A1A] border border-[#333] rounded-[1rem] p-5 text-gray-400 text-base font-sans font-medium flex items-center justify-between">
                    <span>Password</span>
                    <svg className="w-6 h-6 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  </div>
                </div>

                <button className="w-full mt-8 bg-[#ccff00] text-black font-bold py-5 rounded-[1rem] text-[1.2rem] font-sans hover:bg-white transition-colors">
                  Login
                </button>

                <div className="mt-10 text-base text-gray-300 font-sans font-medium text-center">
                  Don't have an account? <span className="text-[#ccff00] cursor-pointer hover:underline">Sign Up</span>
                </div>
              </div>
            </div>

            {/* Floating UI Chips with Authentic SVG Emojis - Positioned securely above phone via z-30 */}
            <div className="absolute top-20 -left-12 bg-[#ccff00] text-black font-black text-xl py-4 px-8 border-4 border-black rotate-[-12deg] z-30 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] flex items-center">
              <svg className="w-7 h-7 mr-3 text-black inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              RESOLVED
            </div>
            <div className="absolute bottom-32 -right-12 bg-white dark:bg-black text-black dark:text-white font-black text-xl py-4 px-8 border-4 border-black dark:border-white rotate-[8deg] z-30 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(204,255,0,1)] flex items-center">
              <svg className="w-7 h-7 mr-3 text-red-600 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              URGENT
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32 px-6 bg-[#ccff00] border-t-8 border-black">
        {/* Wireframe background */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        ></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b-4 border-black pb-8">
            <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] text-black">
              System <br /> Features
            </h2>
            <div className="font-mono text-black font-bold uppercase border-2 border-black p-2 bg-[#ccff00] mt-4 md:mt-0">
              *004 [READY]
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-black text-white p-8 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
              <h3 className="text-3xl font-black uppercase tracking-tight mb-4 text-[#ccff00]">AI-Powered Validation</h3>
              <p className="font-mono text-gray-300">Reports are automatically verified using artificial intelligence to reduce false reports and ensure data accuracy.</p>
            </div>
            <div className="bg-black text-white p-8 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
              <h3 className="text-3xl font-black uppercase tracking-tight mb-4 text-[#ccff00]">Geospatial Mapping</h3>
              <p className="font-mono text-gray-300">Issues are pinned on an interactive map, giving SWMO a real-time geographic overview of environmental hotspots.</p>
            </div>
            <div className="bg-black text-white p-8 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
              <h3 className="text-3xl font-black uppercase tracking-tight mb-4 text-[#ccff00]">Smart Clustering</h3>
              <p className="font-mono text-gray-300">Related reports are automatically grouped by location and type, helping authorities identify patterns and prioritize action.</p>
            </div>
            <div className="bg-black text-white p-8 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
              <h3 className="text-3xl font-black uppercase tracking-tight mb-4 text-[#ccff00]">Role-Based Access</h3>
              <p className="font-mono text-gray-300">Separate interfaces for citizens and SWMO personnel, ensuring the right people have the right tools and access levels.</p>
            </div>
            <div className="bg-black text-white p-8 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
              <h3 className="text-3xl font-black uppercase tracking-tight mb-4 text-[#ccff00]">Cleanup Task Mgmt</h3>
              <p className="font-mono text-gray-300">SWMO can create, assign, and track cleanup tasks directly from reported issues, closing the loop from report to resolution.</p>
            </div>
            <div className="bg-black text-white p-8 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
              <h3 className="text-3xl font-black uppercase tracking-tight mb-4 text-[#ccff00]">Analytics Dashboard</h3>
              <p className="font-mono text-gray-300">Comprehensive insights into report volumes, resolution rates, and environmental trends to support data-driven decisions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Downloads */}
      <section id="download" className="relative z-10 py-40 px-6 bg-white dark:bg-black text-black dark:text-white text-center border-t-8 border-black dark:border-[#ccff00] transition-colors duration-300">
        <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-difference" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>

        <h2 className="text-6xl md:text-[8rem] font-black uppercase tracking-tighter mb-8 leading-[0.8] relative z-10 flex flex-col items-center">
          <span className="glitch-text cursor-crosshair" data-text="MAKE PASIG">MAKE PASIG</span>
          <span className="glitch-text cursor-crosshair" data-text="GREEN AGAIN.">GREEN AGAIN.</span>
        </h2>

        <p className="text-2xl md:text-3xl font-bold max-w-4xl mx-auto mb-16 relative z-10 border-b-8 border-black dark:border-[#ccff00] pb-8">
          Report, track, and manage environmental concerns in Pasig City. Available for Android devices.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 relative z-10">
          <button className="px-12 py-6 bg-[#ccff00] text-black font-black uppercase text-3xl hover:bg-black hover:text-[#ccff00] dark:hover:bg-white dark:hover:text-black transition-all border-8 border-black dark:border-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(204,255,0,0.5)] hover:shadow-none hover:translate-x-[12px] hover:translate-y-[12px]">
            Download App
          </button>
        </div>
      </section>

      {/* Expanded Detailed Footer */}
      <footer className="py-20 px-6 bg-black border-t-8 border-[#ccff00] text-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand Info */}
          <div className="md:col-span-2">
            <div className="text-[#ccff00] font-black text-5xl mb-4">ECOPIN<span className="text-white">.AI</span></div>
            <p className="font-mono text-gray-400 max-w-sm mb-6 leading-relaxed">
              A Crowdsourced Geospatial Platform for Transparent Environmental Reporting and Rapid Institutional Detection for the Pasig City Solid Waste Management Office.
            </p>
            <div className="inline-block border-2 border-[#ccff00] text-[#ccff00] font-mono text-sm px-3 py-1 font-bold">
              SYSTEM: ONLINE
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xl font-black uppercase tracking-widest text-[#ccff00] mb-2 border-b-2 border-gray-800 pb-2">Navigation</h4>
            <a href="#home" className="font-mono text-gray-300 hover:text-white hover:translate-x-2 transition-transform">Home</a>
            <a href="#about" className="font-mono text-gray-300 hover:text-white hover:translate-x-2 transition-transform">How It Works</a>
            <a href="#features" className="font-mono text-gray-300 hover:text-white hover:translate-x-2 transition-transform">System Features</a>
            <a href="#download" className="font-mono text-gray-300 hover:text-white hover:translate-x-2 transition-transform">Download App</a>
            <a href="/auth" className="font-mono text-gray-300 hover:text-white hover:translate-x-2 transition-transform">Citizen Login</a>
          </div>

          {/* Legal / Contact */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xl font-black uppercase tracking-widest text-[#ccff00] mb-2 border-b-2 border-gray-800 pb-2">Information</h4>
            <a href="#" className="font-mono text-gray-300 hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="font-mono text-gray-300 hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="font-mono text-gray-300 hover:text-white transition-colors">SWMO Contact</a>
            <a href="#" className="font-mono text-gray-300 hover:text-white transition-colors">Pasig City Gov</a>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t-2 border-gray-900 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-gray-500 font-mono text-sm uppercase tracking-widest">
            © 2026 ECOPIN. ALL RIGHTS RESERVED.
          </div>
          <div className="text-gray-500 font-mono text-sm uppercase tracking-widest text-right">
            PASIG CITY // ALL SYSTEMS GO.
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

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
          background: #ccff00;
          color: black;
          opacity: 0;
          pointer-events: none;
        }

        .glitch-text:hover::before,
        .glitch-text:hover::after {
          opacity: 1;
        }

        .glitch-text:hover::before {
          left: 6px;
          text-shadow: -2px 0 black;
          animation: glitch-anim-1 0.2s infinite linear alternate-reverse;
          clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
        }

        .glitch-text:hover::after {
          left: -6px;
          text-shadow: -2px 0 white;
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
  );
}
