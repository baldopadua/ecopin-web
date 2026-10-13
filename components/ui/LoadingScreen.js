'use client'
import React from 'react'

export default function LoadingScreen({ 
  mode = 'static', // 'in' | 'out' | 'static'
  showText = false,
  className = '',
  onAnimationEnd
}) {
  let animationStyle = {}
  if (mode === 'in') {
    animationStyle = {
      animation: 'wipeInRightClip 0.9s cubic-bezier(0.8, 0, 0.2, 1) forwards'
    }
  } else if (mode === 'out') {
    animationStyle = {
      animation: 'wipeOutRightClip 0.9s cubic-bezier(0.8, 0, 0.2, 1) forwards'
    }
  }

  return (
    <div 
      className={`fixed inset-0 bg-[#0052CC] z-[9999] flex flex-col items-center justify-center ${
        mode === 'out' ? 'pointer-events-none' : 'pointer-events-auto'
      } ${className}`}
      style={animationStyle}
      onAnimationEnd={onAnimationEnd}
    >
      <img 
        src="/Auth Logo.png" 
        alt="EcoPin" 
        className="h-16 md:h-20 w-auto object-contain relative z-10 animate-pulse" 
      />
      {showText && (
        <div className="mt-6 font-bold uppercase tracking-[0.3em] text-[10px] text-white/50 animate-pulse">
          Loading
        </div>
      )}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes wipeInRightClip {
          0% { clip-path: inset(0 100% 0 0); }
          100% { clip-path: inset(0 0 0 0); }
        }
        @keyframes wipeOutRightClip {
          0% { clip-path: inset(0 0 0 0); }
          100% { clip-path: inset(0 0 0 100%); }
        }
        `
      }} />
    </div>
  )
}
