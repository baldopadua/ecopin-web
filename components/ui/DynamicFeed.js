
'use client'
import React from 'react'

export default function DynamicFeed({ items, onHover, onClick, className }) {
  return (
    <div className={`flex flex-col gap-3 overflow-hidden ${className || 'absolute top-24 right-8 bottom-32 w-80 z-[1000] pointer-events-none'}`}>
      <div className="flex justify-between items-center pointer-events-auto bg-black/80 p-2 border border-border">
         <span className="text-[10px] font-mono text-accent-green uppercase tracking-widest">Live Feed</span>
         <span className="text-xs text-white/50 font-mono">{items.length} ACTIVE</span>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 pointer-events-auto pb-10" style={{ scrollbarWidth: 'none' }} onWheel={(e) => e.stopPropagation()}>
         {items.map((item, i) => {
           const risk = item.properties?.risk_level || 'low';
           const score = item.properties?.risk_score || 0;
           // Random trend for demo if not provided
           const trend = item.trend || (score > 0.8 ? 'growing' : score < 0.3 ? 'shrinking' : 'stable');
           return (
             <div 
               key={item.id || i}
               className="bg-black/80 backdrop-blur border border-white/20 p-4 hover:border-accent-green transition-all cursor-pointer group animate-fade-in relative overflow-hidden"
               style={{ animationDelay: `${i * 0.1}s` }}
               onMouseEnter={() => onHover && onHover(item)}
               onMouseLeave={() => onHover && onHover(null)}
               onClick={() => onClick && onClick(item)}
             >
               <div className={`absolute top-0 left-0 w-1 h-full ${
                 risk === 'high' ? 'bg-error' : 
                 risk === 'medium' ? 'bg-warning' : 'bg-success'
               }`} />
               <div className="flex justify-between items-start mb-2 pl-2">
                  <span className="text-xs font-mono font-bold text-white uppercase truncate flex-1">{item.properties?.top_issue_type?.replace(/_/g, ' ') || 'Cluster'}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white/10 text-white ml-2 flex-shrink-0">#{item.properties?.rank || (i+1)}</span>
               </div>
               <div className="pl-2">
                  <p className="text-[10px] font-mono text-white/70 mb-2 truncate">
                    {item.properties?.center_lat?.toFixed(4)}, {item.properties?.center_lng?.toFixed(4)}
                  </p>
                  <div className="flex justify-between items-center text-[10px] font-mono text-white/40">
                     <span>{item.properties?.report_count || 0} Reports</span>
                     <span className={`flex items-center gap-1 font-bold ${trend === 'growing' ? 'text-error' : trend === 'shrinking' ? 'text-success' : 'text-info'}`}>
                        {trend === 'growing' ? '↑ SURGE' : trend === 'shrinking' ? '↓ DECAY' : '→ STABLE'}
                     </span>
                  </div>
               </div>
             </div>
           )
         })}
      </div>
    </div>
  )
}
