'use client'
import { Clock, Sun, Zap } from 'lucide-react'

export default function RouteInfoHeader({ eta, weather, traffic, isSimulated = false }) {
  return (
    <div className="card border-l border-l-[var(--primary)] mb-4">
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
            <Clock size={28} className="text-primary" aria-hidden="true" />
          </div>
          <p className="font-bold text-text-primary">{eta || '—'}</p>
          <p className="text-xs text-text-muted">ETA</p>
        </div>

        {/* Weather */}
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <Sun size={28} className="text-orange-500" aria-hidden="true" />
          </div>
          <p className="font-bold text-text-primary">{weather || '—'}</p>
          <p className="text-xs text-text-muted">Weather{isSimulated ? ' (Sim)' : ''}</p>
        </div>

        {/* Traffic */}
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <Zap size={28} className="text-success" aria-hidden="true" />
          </div>
          <p className="font-bold text-text-primary">{traffic || '—'}</p>
          <p className="text-xs text-text-muted">Traffic{isSimulated ? ' (Sim)' : ''}</p>
        </div>
      </div>
    </div>
  )
}

