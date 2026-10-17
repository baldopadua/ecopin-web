'use client'
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sun, Moon, Menu, X } from 'lucide-react';

import LoadingScreen from '@/components/ui/LoadingScreen';

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
  const [isExiting, setIsExiting] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogoClick = (e) => {
    e.preventDefault();
    if (pathname !== '/') {
      setIsExiting(true);
      setTimeout(() => {
        router.push('/');
        setTimeout(() => setIsExiting(false), 100);
      }, 900);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLinkClick = (e, path) => {
    e.preventDefault();
    if (pathname !== path) {
      setIsExiting(true);
      setTimeout(() => {
        setIsMenuOpen(false);
        router.push(path);
        setTimeout(() => setIsExiting(false), 100);
      }, 900);
    } else {
      setIsMenuOpen(false);
    }
  };

  const navContent = (
    <>
      {isExiting && <LoadingScreen mode="in" />}
      <button onClick={handleLogoClick} className="cursor-pointer transition-all bg-transparent border-none p-0 outline-none">
        <img src="/Full Logo Light.png" alt="EcoPin" className="h-8 md:h-10 w-auto dark:hidden" />
        <img src="/Full Logo Dark.png" alt="EcoPin" className="h-8 md:h-10 w-auto hidden dark:block" />
      </button>
      
      <div className="flex items-center gap-6 ml-auto">
        <nav className="hidden md:flex gap-6 items-center">
          <a href="/mobile#features" className="text-sm font-bold uppercase tracking-widest text-text-primary hover:text-[#0052CC] transition-colors">Features</a>
          <a href="/mobile#how-it-works" className="text-sm font-bold uppercase tracking-widest text-text-primary hover:text-[#0052CC] transition-colors">How It Works</a>
          <a href="/downloads" onClick={(e) => handleLinkClick(e, '/downloads')} className="text-sm font-bold uppercase tracking-widest text-text-primary hover:text-[#0052CC] transition-colors cursor-pointer">Download APK</a>
          <a href="/" onClick={(e) => handleLinkClick(e, '/')} className="text-sm font-bold uppercase tracking-widest text-[#0052CC] dark:text-[#60A5FA] transition-colors cursor-pointer">Live Map</a>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="text-text-primary hover:opacity-70 transition-all flex items-center justify-center p-2 rounded-full"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun size={20} aria-hidden="true" />
            ) : (
              <Moon size={20} aria-hidden="true" />
            )}
          </button>

          {hasSession ? (
            <a href="/dashboard" className="w-9 h-9 rounded-full border border-border overflow-hidden hover:opacity-80 transition-opacity flex-shrink-0 bg-black" title="Dashboard">
              <img src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.full_name || 'User'}&background=random&color=fff`} alt="Profile" className="w-full h-full object-cover" />
            </a>
          ) : (
            <Link href="/auth" className="text-xs font-bold uppercase tracking-widest text-text-primary  hover:text-white hover:bg-black dark:hover:bg-surface dark:hover:text-text-primary rounded-full px-6 py-2 border border-border  transition-all">LOGIN</Link>
          )}
        </div>

        <button
          type="button"
          className="md:hidden p-2 text-text-primary hover:opacity-70 transition-all z-[60] flex items-center justify-center"
          aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <X size={24} aria-hidden="true" />
          ) : (
            <Menu size={24} aria-hidden="true" />
          )}
        </button>
      </div>
    </>
  );

  const mobileMenu = isMenuOpen && (
    <div className="fixed inset-0 z-[1200] bg-background  flex flex-col items-center justify-center p-6 border-b-4 border-border  pointer-events-auto">
      <nav className="flex flex-col gap-6 items-center w-full max-w-sm">
        <a href="/mobile#features" onClick={() => setIsMenuOpen(false)} className="w-full text-center text-2xl font-bold uppercase tracking-widest text-text-primary py-2 hover:opacity-70">Features</a>
        <a href="/mobile#how-it-works" onClick={() => setIsMenuOpen(false)} className="w-full text-center text-2xl font-bold uppercase tracking-widest text-text-primary py-2 hover:opacity-70">How It Works</a>
        <a href="/downloads" onClick={(e) => handleLinkClick(e, '/downloads')} className="w-full text-center text-2xl font-bold uppercase tracking-widest text-text-primary py-2 hover:opacity-70 cursor-pointer">Download APK</a>
        <a href="/" onClick={(e) => handleLinkClick(e, '/')} className="w-full text-center text-2xl font-bold uppercase tracking-widest text-[#0052CC] dark:text-[#60A5FA] py-2 hover:opacity-70 cursor-pointer">Live Map</a>
        
        <button
          onClick={toggleTheme}
          className="w-full text-center mt-4 p-2 text-xl font-bold uppercase tracking-widest text-text-primary  hover:opacity-70"
        >
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        {hasSession ? (
          <a href="/dashboard" onClick={() => setIsMenuOpen(false)} className="w-16 h-16 rounded-full border border-border overflow-hidden hover:opacity-80 transition-opacity mt-4 mx-auto bg-black" title="Dashboard">
            <img src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.full_name || 'User'}&background=random&color=fff`} alt="Profile" className="w-full h-full object-cover" />
          </a>
        ) : (
          <Link href="/auth" onClick={() => setIsMenuOpen(false)} className="w-full text-center mt-4 p-4 text-xl font-bold uppercase tracking-widest bg-black text-white rounded-full border border-border">LOGIN</Link>
        )}
      </nav>
    </div>
  );

  if (isFloating) {
    return (
      <header className={`fixed w-full top-0 left-0 z-50 p-4 md:p-6 transition-colors duration-300 pointer-events-none ${wrapperClassName}`}>
        <div className={`w-full max-w-[1600px] mx-auto bg-surface dark:bg-surface border border-border  rounded-full flex items-center justify-between px-6 py-3 pointer-events-auto ${className}`}>
          {navContent}
        </div>
        {mobileMenu}
      </header>
    );
  }

  return (
    <>
      <header className={`relative z-[1100] flex flex-shrink-0 items-center justify-between px-6 py-3 border border-border  bg-surface dark:bg-surface rounded-[32px] md:rounded-full ${className}`}>
        {navContent}
      </header>
      {mobileMenu}
    </>
  );
}


