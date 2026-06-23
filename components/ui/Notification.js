'use client'
import { useEffect, useState } from 'react'

export default function Notification({ message, type = 'info', duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)

    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'warning':
        return 'bg-yellow-500'
      default:
        return 'bg-blue-500'
    }
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 transform transition-all duration-500 ease-out ${
        isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'
      }`}
    >
      <div className={`${getBackgroundColor()} text-white px-6 py-4 rounded-lg shadow-lg max-w-md`}>
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  )
}
