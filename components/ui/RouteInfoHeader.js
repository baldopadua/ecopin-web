'use client'

export default function RouteInfoHeader({ eta, weather, traffic, isSimulated = false }) {
  return (
    <div className="card border-l-2 border-l-[var(--primary)] mb-4">
      {isSimulated && (
        <div className="text-xs font-mono uppercase tracking-wider text-warning bg-warning/15 px-3 py-1.5 border border-warning/30 mb-3 text-center">
          ⚠️ Simulated Conditions — Not Live Data
        </div>
      )}
      <h3 className="font-bold text-text-primary mb-4">Optimized Route Plan</h3>
      <div className="grid grid-cols-3 gap-4">
        {/* ETA */}
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-bold text-text-primary">{eta || '—'}</p>
          <p className="text-xs text-text-muted">ETA</p>
        </div>

        {/* Weather */}
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <svg className="w-7 h-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="font-bold text-text-primary">{weather || '—'}</p>
          <p className="text-xs text-text-muted">Weather{isSimulated ? ' (Sim)' : ''}</p>
        </div>

        {/* Traffic */}
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="font-bold text-text-primary">{traffic || '—'}</p>
          <p className="text-xs text-text-muted">Traffic{isSimulated ? ' (Sim)' : ''}</p>
        </div>
      </div>
    </div>
  )
}

