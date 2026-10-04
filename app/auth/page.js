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
      <main className="min-h-screen bg-[#F4F0EA] dark:bg-[#121212] relative flex flex-col items-center justify-center transition-colors duration-300">
        <img src="/Solo Logo Light.png" alt="Loading..." className="h-24 w-auto object-contain animate-pulse dark:hidden" />
        <img src="/Solo Logo Dark.png" alt="Loading..." className="h-24 w-auto object-contain animate-pulse hidden dark:block" />
      </main>
    )
  }

  return (
    <main
      className="min-h-screen bg-[#F4F0EA] dark:bg-[#121212] text-black dark:text-white relative flex flex-col items-center justify-center p-4 md:p-6 transition-colors duration-300 overflow-hidden"
    >
      {/* Desktop Back Button */}
      <button 
        onClick={() => router.push('/')}
        className="hidden md:flex items-center justify-center absolute top-8 left-8 z-50 font-black text-lg uppercase bg-white dark:bg-[#1C1C1C] text-black dark:text-white border-4 border-black dark:border-[#333] rounded-full px-6 py-3 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all drop-shadow-[4px_4px_0_black] hover:translate-y-1 hover:drop-shadow-[0px_0px_0_black]"
      >
        ← BACK
      </button>

      {/* Auth Container */}
      <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row border-4 border-black dark:border-[#333] bg-white dark:bg-[#1C1C1C] rounded-[32px] md:rounded-[40px] drop-shadow-[8px_8px_0_black] relative z-10 overflow-hidden mt-8 md:mt-0">
        
        {/* Left Panel - Branding */}
        <div className="flex flex-col justify-between p-8 md:p-12 bg-[#0052CC] text-white border-b-4 md:border-b-0 md:border-r-4 border-black dark:border-[#333] relative w-full md:w-5/12 overflow-hidden">
          
          <div className="flex flex-col items-start gap-4 z-10 relative">
            <a href="/" className="inline-block bg-white border-4 border-black rounded-full px-6 py-2 drop-shadow-[4px_4px_0_black] hover:translate-y-1 hover:drop-shadow-[0px_0px_0_black] transition-all mb-4">
               <img src="/Full Logo Light.png" alt="EcoPin" className="h-6 md:h-8 w-auto" />
            </a>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter leading-[0.9]">
              PASIG SWMO <br /> PORTAL
            </h2>
            <p className="text-lg font-bold text-white/90 leading-snug">
              Monitor, manage, and resolve environmental concerns across the city.
            </p>
          </div>

          <div className="mt-12 md:mt-0 relative z-10 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white/80">
            <div className="w-2 h-2 rounded-full bg-[#0052CC] animate-pulse"></div>
            AUTHORIZED ACCESS ONLY
          </div>

          {/* Decorative Stars */}
          <div className="absolute top-10 right-10 text-[100px] opacity-20 text-white -rotate-12 pointer-events-none">✦</div>
          <div className="absolute bottom-10 -left-10 text-[120px] opacity-20 text-white rotate-45 pointer-events-none">✦</div>
        </div>

        {/* Right Panel - Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white dark:bg-[#1C1C1C] w-full md:w-7/12">
          
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl md:text-5xl font-black text-black dark:text-white uppercase tracking-tighter">
              SIGN IN
            </h1>
            
            {/* Mobile Back Button */}
            <button 
              onClick={() => router.push('/')}
              className="md:hidden font-black text-sm uppercase bg-[#F4F0EA] dark:bg-[#2A2A2A] text-black dark:text-white border-4 border-black dark:border-[#333] rounded-full px-4 py-2 hover:bg-black hover:text-white transition-all drop-shadow-[2px_2px_0_black]"
            >
              ← BACK
            </button>
          </div>

          <div className="space-y-6" suppressHydrationWarning>
            <div>
              <label className="block text-sm font-black text-black dark:text-gray-300 mb-2 uppercase tracking-widest">Email Address</label>
              <input
                suppressHydrationWarning
                ref={emailRef}
                type="email"
                placeholder="you@pasigcity.gov.ph"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                className="w-full bg-[#F4F0EA] dark:bg-[#2A2A2A] border-4 border-black dark:border-[#333] rounded-[20px] p-4 font-bold text-black dark:text-white focus:outline-none focus:border-[#0052CC] transition-colors placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-black dark:text-gray-300 mb-2 uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  suppressHydrationWarning
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handlePasswordKeyDown}
                  className="w-full bg-[#F4F0EA] dark:bg-[#2A2A2A] border-4 border-black dark:border-[#333] rounded-[20px] p-4 font-bold text-black dark:text-white focus:outline-none focus:border-[#0052CC] transition-colors placeholder:text-gray-500 pr-12"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-black dark:text-white hover:text-[#0052CC] transition-colors"
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
              <div className="flex items-start gap-3 p-4 border-4 border-black bg-white rounded-[20px] text-red-600 font-bold text-sm drop-shadow-[4px_4px_0_black]">
                <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-6 py-4 bg-[#0052CC] text-white font-black uppercase tracking-widest text-xl rounded-full border-4 border-black hover:bg-black hover:text-white transition-all drop-shadow-[4px_4px_0_black] animate-btn-pulse disabled:opacity-50 disabled:animate-none"
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
