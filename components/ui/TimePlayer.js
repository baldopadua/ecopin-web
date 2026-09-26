
'use client'
import React, { useState, useEffect } from 'react'

export default function TimePlayer({ dates, currentDate, onDateChange, isProjective }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    let interval;
    if (isPlaying && dates.length > 0) {
      interval = setInterval(() => {
         const currentIndex = dates.indexOf(currentDate);
         if (currentIndex < dates.length - 1) {
           onDateChange(dates[currentIndex + 1]);
         } else {
           onDateChange(dates[0]); // Loop back to start
         }
      }, 2000 / speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentDate, dates, speed, onDateChange]);

  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[1000] w-full max-w-3xl pointer-events-auto">
      <div className="bg-black/90 backdrop-blur border-2 border-border p-4 flex flex-col gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center px-2">
           <span className="text-xs font-mono text-accent-green uppercase tracking-widest">{isProjective ? 'Projective Timeline (Future)' : 'Retrospective Timeline (Past)'}</span>
           <span className="text-white font-bold font-mono">{currentDate ? new Date(currentDate).toLocaleDateString() : 'LIVE'}</span>
        </div>
        
        <div className="flex items-center gap-4">
           <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 bg-accent-green text-black flex items-center justify-center hover:bg-white transition-colors">
             {isPlaying ? (
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
               </svg>
             ) : (
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
               </svg>
             )}
           </button>
           
           <div className="flex-1 relative flex items-center">
             <input 
               type="range" 
               min={0} 
               max={Math.max(0, dates.length - 1)} 
               value={dates.indexOf(currentDate) === -1 ? 0 : dates.indexOf(currentDate)}
               onChange={(e) => {
                 setIsPlaying(false);
                 onDateChange(dates[e.target.value]);
               }}
               className="w-full h-2 appearance-none cursor-pointer outline-none timeline-slider"
               style={{
                 background: `linear-gradient(to right, #ccff00 ${(dates.indexOf(currentDate) / Math.max(1, dates.length - 1)) * 100}%, rgba(255,255,255,0.2) 0)`
               }}
             />
             <style>{`
               .timeline-slider::-webkit-slider-thumb {
                 -webkit-appearance: none;
                 appearance: none;
                 width: 12px;
                 height: 24px;
                 background: #ccff00;
                 cursor: pointer;
                 box-shadow: 0 0 10px rgba(204,255,0,0.8);
               }
               .timeline-slider::-moz-range-thumb {
                 width: 12px;
                 height: 24px;
                 background: #ccff00;
                 cursor: pointer;
                 border: none;
                 box-shadow: 0 0 10px rgba(204,255,0,0.8);
               }
             `}</style>
           </div>

           <div className="flex gap-2">
              {[1, 2, 5].map(s => (
                <button 
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-1 text-xs font-bold font-mono border ${speed === s ? 'bg-white text-black border-white' : 'text-white border-white/30 hover:border-white'}`}
                >
                  {s}x
                </button>
              ))}
           </div>
        </div>
      </div>
    </div>
  )
}
