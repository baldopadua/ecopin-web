
'use client'
import React from 'react'

export default function CommandHUD({ accuracy, lastUpdated, viewMode, setViewMode }) {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] flex gap-4 pointer-events-auto">
      <div className="bg-black/80 backdrop-blur border-2 border-accent-green px-6 py-3 flex items-center gap-6 shadow-[4px_4px_0px_0px_rgba(204,255,0,0.3)]">
        <div>
          <p className="text-[10px] text-accent-green font-mono uppercase tracking-widest">Command HUD</p>
          <h1 className="text-white font-black uppercase tracking-tighter text-xl">Spatial Scan</h1>
        </div>
        <div className="h-8 w-px bg-white/20"></div>
        <div className="flex gap-4">
          <div className="text-center">
             <p className="text-[10px] text-text-muted font-mono uppercase">AI Confidence</p>
             <p className="text-white font-bold">{accuracy ? `${(accuracy.averageAccuracy * 100).toFixed(1)}%` : 'Calibrating...'}</p>
          </div>
          <div className="text-center">
             <p className="text-[10px] text-text-muted font-mono uppercase">Last Updated</p>
             <p className="text-white font-bold">{lastUpdated || 'Live'}</p>
          </div>
        </div>
        <div className="h-8 w-px bg-white/20"></div>
        <div className="flex gap-2">
           <button 
             onClick={() => setViewMode('clusters')}
             className={`px-3 py-1 text-xs font-bold font-mono border ${viewMode === 'clusters' ? 'bg-accent-green text-white border-accent-green' : 'bg-transparent text-white border-white/30 hover:border-white'}`}
           >
             POLYGONS
           </button>
           <button 
             onClick={() => setViewMode('heatmap')}
             className={`px-3 py-1 text-xs font-bold font-mono border ${viewMode === 'heatmap' ? 'bg-accent-green text-white border-accent-green' : 'bg-transparent text-white border-white/30 hover:border-white'}`}
           >
             EVENTS
           </button>
        </div>
      </div>
    </div>
  )
}
