'use client'
import { useState } from 'react'

export default function OfflineSyncBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [isMobileData, setIsMobileData] = useState(false)
  const [pendingCount, setPendingCount] = useState(4)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)

  const handleSyncPress = () => {
    if (!isOnline) return
    simulateSync()
  }

  const simulateSync = () => {
    setIsSyncing(true)
    setSyncProgress(0)

    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 1) {
          clearInterval(interval)
          setIsSyncing(false)
          setPendingCount(0)
          return 1
        }
        return prev + 0.1
      })
    }, 150)
  }

  const bannerBg = !isOnline
    ? 'bg-warning/10'
    : 'bg-success/10'

  const borderColor = !isOnline
    ? 'border-warning/50'
    : 'border-success/40'

  const iconColor = !isOnline ? 'text-warning' : 'text-success'

  return (
    <div className="card border-l-4 border-l-[var(--success)]">
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className={`p-2 rounded-full ${iconColor.replace('text', 'bg').replace('warning', 'warning/15').replace('success', 'success/15')}`}>
          {!isOnline ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
            </svg>
          ) : isMobileData ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        {/* Text Description */}
        <div className="flex-1">
          <p className={`font-bold ${iconColor}`}>
            {!isOnline ? 'Offline Mode Active' : 'Progress Safe & Connected'}
          </p>
          <p className="text-sm text-text-muted mt-1">
            {!isOnline
              ? 'Your progress is being saved offline. We will re-sync automatically when you regain internet.'
              : `Everything is securely saved. You have ${pendingCount} reports pending manual or automatic sync.`}
          </p>
          {pendingCount > 0 && isOnline && (
            <div className={`inline-block mt-2 px-2 py-1 rounded text-xs font-bold ${iconColor.replace('text', 'bg').replace('warning', 'warning/15').replace('success', 'success/15')}`}>
              {pendingCount} files waiting to sync
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {isSyncing && (
        <div className="mt-3 h-1 bg-surface dark:bg-surface-elevated rounded-full overflow-hidden">
          <div 
            className={`h-full ${iconColor.replace('text', 'bg')} transition-all duration-150`}
            style={{ width: `${syncProgress * 100}%` }}
          />
        </div>
      )}

      {/* Button Bar Footer */}
      <div className={`mt-3 pt-3 border-t ${isOnline ? 'border-border' : 'border-border/50'} flex items-center justify-between`}>
        {/* Network Label */}
        <div className="flex items-center gap-2 text-sm text-text-muted">
          {!isOnline ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
              </svg>
              <span className="font-semibold">No Connection</span>
            </>
          ) : isMobileData ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              <span className="font-semibold">Mobile Data Active</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              <span className="font-semibold">Wi-Fi Connected</span>
            </>
          )}
        </div>

        {/* Sync Button */}
        <button
          onClick={handleSyncPress}
          disabled={!isOnline || pendingCount === 0 || isSyncing}
          className={`btn-secondary flex items-center gap-2
            ${!isOnline || pendingCount === 0 || isSyncing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isSyncing ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
    </div>
  )
}
