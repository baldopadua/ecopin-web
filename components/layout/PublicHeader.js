'use client'
import React from 'react'
import Link from 'next/link'
import { Sun, Moon } from 'lucide-react'

export default function PublicHeader({ 
  activeNav = 'reports', 
  theme = 'light', 
  toggleTheme, 
  user = null, 
  hasSession = false 
}) {
  const isDark = theme === 'dark'

  return (
    <header className="bg-white dark:bg-[#1C1C1C] border-b border-gray-200/80 dark:border-[#2A2A2A] px-4 sm:px-6 py-2.5 flex items-center justify-between z-30 relative flex-shrink-0 transition-colors duration-300">
      {/* Left: Brand Logo & View Mode Navigation Tabs */}
      <div className="flex items-center gap-4 sm:gap-7 min-w-0">
        <Link href="/" className="cursor-pointer transition-all flex items-center group flex-shrink-0 mr-1 sm:mr-3" title="EcoPin Home">
          <img src="/Full Logo Light.png" alt="EcoPin" className="h-7 sm:h-8 w-auto dark:hidden" />
          <img src="/Full Logo Dark.png" alt="EcoPin" className="h-7 sm:h-8 w-auto hidden dark:block" />
        </Link>

        <nav className="flex items-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar">
          <Link 
            href="/"
            className={`text-sm pb-1.5 pt-1 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeNav === 'reports'
                ? 'font-bold text-[#0052CC] dark:text-[#60A5FA] border-b-2 border-[#0052CC] dark:border-[#60A5FA]'
                : 'font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>Public Reports</span>
          </Link>

          <Link 
            href="/gallery"
            className={`text-sm pb-1.5 pt-1 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeNav === 'gallery'
                ? 'font-bold text-[#0052CC] dark:text-[#60A5FA] border-b-2 border-[#0052CC] dark:border-[#60A5FA]'
                : 'font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>Incident Gallery</span>
          </Link>

          <Link 
            href="/mobile"
            className={`text-sm pb-1.5 pt-1 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeNav === 'mobile'
                ? 'font-bold text-[#0052CC] dark:text-[#60A5FA] border-b-2 border-[#0052CC] dark:border-[#60A5FA]'
                : 'font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>Mobile App</span>
          </Link>
        </nav>
      </div>

      {/* Right: Theme Toggle & User Auth */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 flex-shrink-0">
        {toggleTheme && (
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-[#2A2A2A] flex items-center justify-center cursor-pointer"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-gray-600" />
            )}
          </button>
        )}

        {hasSession ? (
          <Link 
            href="/dashboard"
            className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-[#2A2A2A] group cursor-pointer transition-all"
            title="Open Dashboard"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex-shrink-0 group-hover:ring-2 group-hover:ring-[#0052CC] transition-all">
              <img 
                src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.email || 'User')}&background=0052CC&color=fff`} 
                alt="Avatar" 
                className="w-full h-full object-cover" 
              />
            </div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 hidden md:inline truncate max-w-[100px]">
              {user?.full_name?.split(' ')[0] || 'Officer'}
            </span>
          </Link>
        ) : (
          <Link
            href="/auth"
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-[#0052CC] hover:bg-[#0042A3] transition-colors shadow-xs"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  )
}
