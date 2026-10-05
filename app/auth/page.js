'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL + '/api/auth';

const SolidLeaf = ({ className }) => (
  <svg viewBox="200 1400 1400 1400" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M 10212.1,6632.9 C 10020.1,5259.3 9193.56,3987.5 8016.09,3254.4 6838.63,2521.3 5332.59,2340.7 4015.19,2774.6 4583.93,4666.2 5714.06,6385.1 7225.35,7657.1 6151.28,7115.4 5305.09,6195.2 4668.79,5174.3 4032.49,4153.4 3588.08,3027 3147.23,1907.9 c -418.54,65.3 -615.3,338.8 -615.3,338.8 19.38,173.4 347.11,861.8 679.39,1513.5 -730.82,1034.7 -212.9,2598.1 730.44,3460.5 727.11,664.8 1953.15,1033.1 2856.17,1427.1 903.03,393.9 1822.34,938.6 2228.22,1836.3 C 9957.66,9456.3 10404,8006.6 10212.1,6632.9" transform="matrix(0.13333333,0,0,-0.13333333,0,2933.3333)" />
  </svg>
);

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isChecking, setIsChecking] = useState(true)
  const [isExiting, setIsExiting] = useState(false)
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
      setTimeout(() => setIsChecking(false), 1000)
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

      if (userRole === 'field_crew') {
        localStorage.removeItem('authToken')
        setError('Field crew web access is restricted. Please use the mobile application.')
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
      <main className="min-h-screen bg-surface  relative flex items-center justify-center overflow-hidden transition-colors duration-300">
        {/* Logo underneath */}
        <div 
          className="relative z-0 flex flex-col items-center" 
          style={{ 
            animation: 'revealLogo 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards', 
            opacity: 0 
          }}
        >
          <img src="/Full Logo Light.png" alt="EcoPin" className="h-10 sm:h-12 w-auto object-contain dark:hidden" />
          <img src="/Full Logo Dark.png" alt="EcoPin" className="h-10 sm:h-12 w-auto object-contain hidden dark:block" />
          <div className="mt-6 font-bold uppercase tracking-[0.3em] text-[10px] text-text-muted animate-pulse">
            Loading
          </div>
        </div>

        {/* Royal blue wipe overlay */}
        <div 
          className="fixed inset-0 bg-primary z-10" 
          style={{ 
            transformOrigin: 'right',
            animation: 'wipeRight 0.9s cubic-bezier(0.8, 0, 0.2, 1) forwards'
          }} 
        />
        
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes wipeRight {
            0% { transform: scaleX(1); }
            100% { transform: scaleX(0); }
          }
          @keyframes revealLogo {
            0% { opacity: 0; transform: scale(0.95); }
            100% { opacity: 1; transform: scale(1); }
          }
          `
        }} />
      </main>
    )
  }

  function handleBack() {
    setIsExiting(true)
    setTimeout(() => {
      router.push('/')
    }, 900)
  }

  return (
    <main
      className="min-h-screen bg-background  text-text-primary  relative flex flex-col items-center justify-center p-0 md:p-6 transition-colors duration-300 overflow-hidden"
    >
      {isExiting && (
        <div 
          className="fixed inset-0 bg-primary z-[9999] flex flex-col items-center justify-center" 
          style={{ 
            animation: 'wipeInRightClip 0.9s cubic-bezier(0.8, 0, 0.2, 1) forwards'
          }} 
        >
          <img src="/Auth Logo.png" alt="EcoPin" className="h-16 md:h-20 w-auto object-contain" />
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
      {/* Desktop Back Button */}
      <button 
        onClick={handleBack}
        className="hidden md:flex items-center justify-center absolute top-8 left-8 z-50 font-bold text-lg uppercase bg-surface dark:bg-surface text-text-primary  border border-border  rounded-full px-6 py-3 hover:bg-black hover:text-white dark:hover:bg-surface dark:hover:text-text-primary transition-all drop-shadow-sm hover:translate-y-1 hover:drop-shadow-sm"
      >
        ← BACK
      </button>

      {/* Auth Container */}
      <div className="w-full min-h-screen md:min-h-0 max-w-5xl mx-auto flex flex-col md:flex-row border-0 md:border border-border  bg-surface dark:bg-surface rounded-xl md:rounded-xl drop-shadow-none md:drop-shadow-sm relative z-10 overflow-hidden mt-0">
        
        {/* Left Panel - Branding */}
        <div className="flex flex-col justify-between p-8 md:p-12 bg-primary text-white border-b-0 md:border-r-4 border-border  relative w-full md:w-5/12 overflow-hidden">
          
          <div className="flex flex-col items-center justify-center flex-1 z-10 relative py-12 md:py-0">
              <button onClick={handleBack} className="inline-block hover:scale-105 transition-transform hover:opacity-80">
                 <img src="/Auth Logo.png" alt="EcoPin" className="h-24 md:h-32 w-auto object-contain" />
              </button>
            </div>

          <div className="mt-12 md:mt-0 relative z-10 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/80">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            AUTHORIZED ACCESS ONLY
          </div>

          {/* Decorative Leaves */}
          <SolidLeaf className="absolute -top-4 -right-4 w-[120px] h-[120px] opacity-10 text-white -rotate-12 pointer-events-none" />
          <SolidLeaf className="absolute -bottom-4 -left-4 w-[160px] h-[160px] opacity-10 text-white rotate-45 pointer-events-none" />
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 md:flex-none p-8 md:p-12 flex flex-col justify-center bg-surface dark:bg-surface w-full md:w-7/12">
          
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-text-primary  uppercase tracking-tight">
              SIGN IN
            </h1>
            
            {/* Mobile Back Button */}
            <button 
              onClick={handleBack}
              className="md:hidden font-bold text-sm uppercase bg-background dark:bg-surface-elevated text-text-primary  border border-border  rounded-full px-4 py-2 hover:bg-black hover:text-white transition-all drop-shadow-sm"
            >
              ← BACK
            </button>
          </div>

          <div className="space-y-6" suppressHydrationWarning>
            <div>
              <label className="block text-sm font-bold text-text-primary dark:text-gray-300 mb-2 uppercase tracking-widest">Email Address</label>
              <input
                suppressHydrationWarning
                ref={emailRef}
                type="email"
                placeholder="you@pasigcity.gov.ph"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                className="w-full bg-background dark:bg-surface-elevated border border-border  rounded-lg p-4 font-bold text-text-primary  focus:outline-none focus:border-[#0052CC] transition-colors placeholder:text-text-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-text-primary dark:text-gray-300 mb-2 uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  suppressHydrationWarning
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handlePasswordKeyDown}
                  className="w-full bg-background dark:bg-surface-elevated border border-border  rounded-lg p-4 font-bold text-text-primary  focus:outline-none focus:border-[#0052CC] transition-colors placeholder:text-text-muted pr-12"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-primary  hover:text-[#0052CC] transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a9.953 9.953 0 015.71-2.29c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 border border-border bg-surface rounded-lg text-red-600 font-bold text-sm drop-shadow-sm">
                <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-6 py-4 bg-primary text-white font-bold uppercase tracking-widest text-xl rounded-full border border-border hover:bg-black hover:text-white transition-all drop-shadow-sm animate-btn-pulse disabled:opacity-50 disabled:animate-none"
            >
              {loading ? 'AUTHENTICATING...' : 'SYSTEM LOGIN'}
            </button>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes btn-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        .animate-btn-pulse {
          animation: btn-pulse 2s infinite ease-in-out;
        }
      `}} />
    </main>
  )
}










