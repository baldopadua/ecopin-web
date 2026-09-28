'use client'
import React, { useState } from 'react';

export default function Navbar({ 
  theme, 
  toggleTheme, 
  hasSession, 
  user, 
  isFloating = false, 
  wrapperClassName = '', 
  className = '' 
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navContent = (
    <>
      <a href="/#home" className="cursor-pointer transition-all">
        <img src="/Full Logo Light.png" alt="EcoPin" className="h-8 md:h-10 w-auto dark:hidden" />
        <img src="/Full Logo Dark.png" alt="EcoPin" className="h-8 md:h-10 w-auto hidden dark:block" />
      </a>
      
      <div className="flex items-center gap-6 ml-auto">
        <nav className="hidden md:flex gap-6 items-center">
          <a href="/#about" className="text-sm font-black uppercase tracking-widest text-black dark:text-white hover:text-[#0052CC] transition-colors">About</a>
          <a href="/#features" className="text-sm font-black uppercase tracking-widest text-black dark:text-white hover:text-[#0052CC] transition-colors">Features</a>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="text-black dark:text-white hover:opacity-70 transition-all flex items-center justify-center"
            title="Toggle Theme"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>

          {hasSession ? (
            <a href="/dashboard" className="w-9 h-9 rounded-full border-2 border-black overflow-hidden hover:opacity-80 transition-opacity flex-shrink-0 bg-black" title="Dashboard">
              <img src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.full_name || 'User'}&background=random&color=fff`} alt="Profile" className="w-full h-full object-cover" />
            </a>
          ) : (
            <a href="/auth" className="text-xs font-black uppercase tracking-widest text-black dark:text-white hover:text-white hover:bg-black dark:hover:bg-white dark:hover:text-black rounded-full px-6 py-2 border-2 border-black dark:border-white transition-all">LOGIN</a>
          )}
        </div>

        <button
          className="md:hidden p-2 text-black dark:text-white hover:opacity-70 transition-all z-[60]"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>
    </>
  );

  const mobileMenu = isMenuOpen && (
    <div className="fixed inset-0 z-[1200] bg-[#F4F0EA] dark:bg-[#121212] flex flex-col items-center justify-center p-6 border-b-4 border-black dark:border-[#333] pointer-events-auto">
      <nav className="flex flex-col gap-6 items-center w-full max-w-sm">
        <a href="/#about" onClick={() => setIsMenuOpen(false)} className="w-full text-center text-2xl font-black uppercase tracking-widest text-black dark:text-white py-2 hover:opacity-70">About</a>
        <a href="/#features" onClick={() => setIsMenuOpen(false)} className="w-full text-center text-2xl font-black uppercase tracking-widest text-black dark:text-white py-2 hover:opacity-70">Features</a>
        
        <button
          onClick={toggleTheme}
          className="w-full text-center mt-4 p-2 text-xl font-black uppercase tracking-widest text-black dark:text-white hover:opacity-70"
        >
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        {hasSession ? (
          <a href="/dashboard" onClick={() => setIsMenuOpen(false)} className="w-16 h-16 rounded-full border-4 border-black overflow-hidden hover:opacity-80 transition-opacity mt-4 mx-auto bg-black" title="Dashboard">
            <img src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.full_name || 'User'}&background=random&color=fff`} alt="Profile" className="w-full h-full object-cover" />
          </a>
        ) : (
          <a href="/auth" onClick={() => setIsMenuOpen(false)} className="w-full text-center mt-4 p-4 text-xl font-black uppercase tracking-widest bg-black text-white rounded-full border-4 border-black">LOGIN</a>
        )}
      </nav>
    </div>
  );

  if (isFloating) {
    return (
      <header className={`fixed w-full top-0 left-0 z-50 p-4 md:p-6 transition-colors duration-300 pointer-events-none ${wrapperClassName}`}>
        <div className={`w-full max-w-[1600px] mx-auto bg-white dark:bg-[#1C1C1C] border-4 border-black dark:border-[#333] rounded-full flex items-center justify-between px-6 py-3 pointer-events-auto ${className}`}>
          {navContent}
        </div>
        {mobileMenu}
      </header>
    );
  }

  return (
    <>
      <header className={`relative z-[1100] flex flex-shrink-0 items-center justify-between px-6 py-3 border-4 border-black dark:border-[#333] bg-white dark:bg-[#1C1C1C] rounded-[32px] md:rounded-full ${className}`}>
        {navContent}
      </header>
      {mobileMenu}
    </>
  );
}
