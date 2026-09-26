'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL + '/api/auth';

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()
  const [theme, setTheme] = useState('dark')

  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    setTheme(isDarkMode ? 'dark' : 'light')
    
    // Redirect to dashboard if a session already exists
    const token = localStorage.getItem('authToken')
    if (token) {
      router.replace('/dashboard')
    } else {
      setIsChecking(false)
    }
  }, [router])

  async function handleSubmit() {
    setLoading(true); setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Login error response:', data);
        throw new Error(data.error || data.message || 'Authentication failed');
      }

      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('lastActivity', Date.now().toString());
      }

      console.log('Authentication successful:', data);

      const userRole = data.user?.role || 'citizen'
      if (userRole === 'citizen') {
        localStorage.removeItem('authToken')
        setError('Authorized personnel only. Contact an administrator to create an account.')
        setLoading(false)
        return
      }

      router.push('/dashboard');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      passwordRef.current?.focus()
    }
  }

  const handlePasswordKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isDark = theme === 'dark'

  if (isChecking) {
    return (
      <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white relative flex flex-col items-center justify-center selection:bg-[#ccff00] selection:text-black transition-colors duration-300">
        <div className="text-4xl font-black uppercase tracking-tighter animate-pulse text-[#ccff00]">LOADING...</div>
      </main>
    )
  }

  return (
    <main
      className="min-h-screen bg-white dark:bg-black text-black dark:text-white relative flex flex-col items-center justify-center p-4 md:p-6 selection:bg-[#ccff00] selection:text-black transition-colors duration-300"
      style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
    >
      {/* Desktop Back Button */}
      <button 
        onClick={() => router.push('/')}
        className="hidden md:block absolute top-8 left-8 z-50 font-mono text-base font-bold uppercase bg-white dark:bg-black text-black dark:text-white border-2 border-[#1a1a1a] dark:border-[#333333] px-4 py-2 hover:bg-[#ccff00] hover:text-black dark:hover:bg-[#ccff00] dark:hover:text-black transition-all shadow-[6px_6px_0px_0px_#1a1a1a] dark:shadow-[6px_6px_0px_0px_rgba(204,255,0,0.5)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px]"
      >
        [← Back]
      </button>
      {/* Subtle Map Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: isDark
            ? 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)'
            : 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
          backgroundSize: '100px 100px',
          backgroundPosition: 'center center',
        }}
      >
        <div className="absolute top-1/4 left-1/4 w-8 h-8 border-t border-l border-[#1a1a1a] dark:border-[#333333] opacity-80"></div>
        <div className="absolute bottom-1/4 right-1/4 w-8 h-8 border-b border-r border-[#1a1a1a] dark:border-[#333333] opacity-80"></div>
      </div>

      {/* Auth Container */}
      <div className="w-full max-w-5xl mx-auto grid md:grid-cols-2 border-2 md:border-8 border-[#1a1a1a] dark:border-[#333333] bg-white dark:bg-black shadow-[10px_10px_0px_0px_#1a1a1a] md:shadow-[20px_20px_0px_0px_#1a1a1a] dark:shadow-[10px_10px_0px_0px_rgba(204,255,0,0.5)] md:dark:shadow-[20px_20px_0px_0px_rgba(204,255,0,0.5)] relative z-10 animate-fade-in-up mt-4 md:mt-0">

        {/* Left Panel - Branding */}
        <div className="flex flex-col justify-between p-6 md:p-12 bg-[#ccff00] text-black border-r-0 md:border-r-8 border-b-2 md:border-b-0 border-[#1a1a1a] dark:border-[#333333] relative overflow-hidden group">
          <div className="relative z-10 hidden md:block">
            <a href="/" className="text-3xl md:text-4xl font-black tracking-tighter hover:underline">
              ECOPIN<span className="text-[#3300FF]">.AI</span>
            </a>
          </div>

          <div className="relative z-10 mt-0 md:mt-20 mb-6 md:mb-10 flex flex-row md:flex-col items-center md:items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-0 md:mb-6 transition-transform origin-left">
                Pasig SWMO <br className="hidden md:block" /> Portal
              </h2>
              <p className="font-mono text-sm font-bold border-[#1a1a1a] hidden md:block mt-6">
                MONITOR, MANAGE, AND RESOLVE ENVIRONMENTAL CONCERNS ACROSS THE CITY WITH AI-POWERED REPORTING.
              </p>
            </div>
            
            {/* Mobile Back Button */}
            <button 
              onClick={() => router.push('/')}
              className="md:hidden shrink-0 font-mono text-sm font-bold uppercase bg-white dark:bg-black text-black dark:text-white border-2 border-[#1a1a1a] dark:border-[#333333] px-3 py-1.5 hover:bg-[#ccff00] hover:text-black dark:hover:bg-[#ccff00] dark:hover:text-black transition-all shadow-[2px_2px_0px_0px_#1a1a1a] dark:shadow-[2px_2px_0px_0px_rgba(204,255,0,0.5)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              [← Back]
            </button>
          </div>

          <div className="relative z-10 flex items-center gap-3 font-mono text-xs font-bold uppercase">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span>SECURED & MANAGED BY PASIG CITY LGU</span>
          </div>

        </div>

        {/* Right Panel - Form */}
        <div className="p-6 md:p-12 flex flex-col justify-center bg-white dark:bg-black relative">
          <div className="mb-6 md:mb-10 relative">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black dark:text-white mb-2 uppercase tracking-tighter glitch-text hover:cursor-crosshair w-fit" data-text="SIGN IN">
              SIGN IN
            </h1>
            <p className="font-mono text-sm font-bold text-gray-500 dark:text-gray-400 hidden md:block">
              ENTER YOUR CREDENTIALS TO ACCESS THE DASHBOARD
            </p>
          </div>

          <div className="space-y-6" suppressHydrationWarning>
            <div>
              <label className="block font-mono text-sm font-bold text-black dark:text-[#ccff00] mb-2 uppercase">Email Address</label>
              <input
                suppressHydrationWarning
                ref={emailRef}
                type="email"
                placeholder="YOU@PASIGCITY.GOV.PH"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                className="w-full bg-white dark:bg-[#111] border-2 border-[#1a1a1a] dark:border-[#333] p-4 font-mono font-bold text-black dark:text-white focus:outline-none focus:border-[#ccff00] dark:focus:border-[#ccff00] transition-colors placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="block font-mono text-sm font-bold text-black dark:text-[#ccff00] mb-2 uppercase">Password</label>
              <div className="relative">
                <input
                  suppressHydrationWarning
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="ENTER PASSWORD"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handlePasswordKeyDown}
                  className="w-full bg-white dark:bg-[#111] border-2 border-[#1a1a1a] dark:border-[#333] p-4 font-mono font-bold text-black dark:text-white focus:outline-none focus:border-[#ccff00] dark:focus:border-[#ccff00] transition-colors placeholder:text-gray-400 pr-12"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-black dark:text-white hover:text-[#ccff00] transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a9.953 9.953 0 015.71-2.29c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 border-2 border-[#1a1a1a] dark:border-white bg-red-500 text-white font-mono font-bold text-sm shadow-[2px_2px_0px_0px_#1a1a1a] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-4 py-5 bg-black dark:bg-[#ccff00] text-white dark:text-black font-black uppercase text-xl border-2 border-[#1a1a1a] hover:bg-[#ccff00] dark:hover:bg-white hover:text-black transition-all shadow-[8px_8px_0px_0px_#1a1a1a] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:shadow-none hover:translate-x-[8px] hover:translate-y-[8px] disabled:opacity-50 disabled:hover:shadow-[8px_8px_0px_0px_#1a1a1a] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
            >
              {loading ? 'AUTHENTICATING...' : 'SYSTEM LOGIN'}
            </button>

            <div className="pt-6">
              <p className="text-center font-mono text-xs font-bold text-gray-500 dark:text-gray-400 border-t-2 border-[#1a1a1a] dark:border-[#333] pt-6">
                AUTHORIZED PERSONNEL ONLY. <br />CONTACT AN ADMINISTRATOR FOR ACCOUNT ACCESS.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
          background: ${isDark ? '#000' : '#fff'};
          color: ${isDark ? '#fff' : '#000'};
          opacity: 0;
          pointer-events: none;
        }
        .glitch-text:hover::before,
        .glitch-text:hover::after {
          opacity: 1;
        }
        .glitch-text:hover::before {
          left: 4px;
          text-shadow: -2px 0 #ccff00;
          animation: glitch-anim-1 0.2s infinite linear alternate-reverse;
          clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
        }
        .glitch-text:hover::after {
          left: -4px;
          text-shadow: -2px 0 red;
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
