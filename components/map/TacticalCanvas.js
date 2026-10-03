
'use client'
import React from 'react'
import HotspotForecastMap from './HotspotForecastMap'

export default function TacticalCanvas({ predictions, timeHorizon, viewMode, focusedItem }) {
  return (
    <div className="absolute inset-0 bg-surface z-0 overflow-hidden" 
         style={{ 
            backgroundImage: `linear-gradient(rgba(204, 255, 0, 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(204, 255, 0, 0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px' 
         }}>
      <div className="absolute inset-0 opacity-90">
         <HotspotForecastMap 
           predictions={predictions} 
           timeHorizon={timeHorizon} 
           viewModeOverride={viewMode} 
           focusedItem={focusedItem} 
           hideUI={true}
         />
      </div>
    </div>
  )
}
