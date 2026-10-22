'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

export default function useLandingMotion(pageRef) {
  useEffect(() => {
    const root = pageRef.current
    document.documentElement.classList.add('ecopin-smooth-scroll')
    const lenis = new Lenis({ autoRaf: true, lerp: 0.075, smoothWheel: true, anchors: true,
      prevent: node => Boolean(node.closest?.('.leaflet-popup, [data-native-scroll]')),
    })
    const animations = new Map()
    const elements = [...root.querySelectorAll('[data-reveal]')]
    // Only prepare content below the fold; the hero remains readable immediately.
    elements.forEach(element => {
      if (element.getBoundingClientRect().top >= window.innerHeight) {
        element.style.opacity = '0'
        element.style.transform = 'translateY(24px)'
      }
    })
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || entry.target.dataset.revealed) return
        const element = entry.target
        element.dataset.revealed = 'true'
        observer.unobserve(element)
        const animation = element.animate([
          { opacity: .15, transform: 'translateY(24px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ], { duration: 820, delay: Number(element.dataset.reveal) || 0, fill: 'both', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
        animations.set(element, animation)
        animation.finished.then(() => {
          element.style.opacity = '1'
          element.style.transform = ''
          animations.delete(element)
          animation.cancel()
        }).catch(() => {})
      })
    }, { threshold: 0.12 })
    elements.forEach(element => observer.observe(element))
    return () => {
      lenis.stop()
      lenis.destroy()
      observer.disconnect()
      animations.forEach(animation => animation.cancel())
      elements.forEach(element => { element.style.opacity = ''; element.style.transform = ''; delete element.dataset.revealed })
      document.documentElement.classList.remove('ecopin-smooth-scroll')
    }
  }, [pageRef])
}
