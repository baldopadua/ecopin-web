'use client'
import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

export default function Notification({ message, type = 'info', duration = 6000, onClose }) {
  useEffect(() => {
    if (type === 'error' || type === 'warning' || !duration || !onClose) return
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose, type, message])
  const Icon = type === 'success' ? CheckCircle : type === 'error' || type === 'warning' ? AlertCircle : Info
  return <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[9999] max-w-md bg-surface text-text-primary border border-border rounded-2xl shadow-lg p-4 flex items-start gap-3"
    role={type === 'error' ? 'alert' : 'status'}>
    <Icon size={20} className="shrink-0 mt-1" aria-hidden="true" />
    <p className="text-sm leading-relaxed flex-1 min-w-0 break-words">{message}</p>
    {onClose && <button type="button" onClick={onClose} aria-label="Dismiss notification" className="min-h-11 min-w-11 rounded-xl flex items-center justify-center hover:bg-surface-elevated"><X size={18} aria-hidden="true" /></button>}
  </div>
}
