
'use client'
import React from 'react'

export default function CommandHUD({ accuracy, lastUpdated, viewMode, setViewMode }) {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] flex gap-4 pointer-events-auto">
      <div className="bg-surface/80 backdrop-blur border border-border border-primary px-6 py-3 flex items-center gap-6 shadow-md">
        <div>
          <p className="text-[10px] text-primary font-mono uppercase tracking-widest">Command HUD</p>
          <h1 className="text-text-primary font-bold uppercase tracking-tight text-xl">Spatial Scan</h1>
        </div>
        <div className="h-8 w-px bg-border"></div>
        <div className="flex gap-4">
          <div className="text-center">
             <p className="text-[10px] text-text-muted font-mono uppercase">AI Confidence</p>
             <p className="text-text-primary font-bold">{accuracy ? `${(accuracy.averageAccuracy * 100).toFixed(1)}%` : 'Calibrating...'}</p>
          </div>
          <div className="text-center">
             <p className="text-[10px] text-text-muted font-mono uppercase">Last Updated</p>
             <p className="text-text-primary font-bold">{lastUpdated || 'Live'}</p>
          </div>
        </div>
        <div className="h-8 w-px bg-border"></div>
        <div className="flex gap-2">
           <button 
             onClick={() => setViewMode('clusters')}
             className={`px-3 py-1 text-xs font-bold font-mono border ${viewMode === 'clusters' ? 'bg-primary text-white border-primary' : 'bg-transparent text-text-primary border-border hover:border-text-primary'}`}
           >
             POLYGONS
           </button>
           <button 
             onClick={() => setViewMode('heatmap')}
             className={`px-3 py-1 text-xs font-bold font-mono border ${viewMode === 'heatmap' ? 'bg-primary text-white border-primary' : 'bg-transparent text-text-primary border-border hover:border-text-primary'}`}
           >
             EVENTS
           </button>
        </div>
      </div>
    </div>
  )
}
