import React from 'react';
import { Layers, Sparkles, Shuffle } from 'lucide-react';

export default function TemplateSelector({ selectedTemplate, onTemplateChange, outlierCount, standardCount }) {
  const options = [
    {
      id: 'standard',
      title: 'Clusters Focus',
      description: 'Consolidated waste piles',
      countLabel: `${standardCount} ${standardCount === 1 ? 'cluster' : 'clusters'}`,
      Icon: Layers,
    },
    {
      id: 'sweeper',
      title: 'Sweeper Focus',
      description: 'Street sweeps & citizen reports',
      countLabel: `${outlierCount} ${outlierCount === 1 ? 'eligible report' : 'eligible reports'}`,
      Icon: Sparkles,
    },
    {
      id: 'mixed',
      title: 'Mixed Focus',
      badge: 'Recommended',
      description: 'Clusters with bundled sweeper stops',
      countLabel: `${standardCount} clusters · ${outlierCount} reports`,
      Icon: Shuffle,
    },
  ];

  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
        1. Target Dispatch Focus
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {options.map(({ id, title, description, countLabel, badge, Icon }) => {
          const isSelected = selectedTemplate === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onTemplateChange(id)}
              className={`p-4 text-left border transition-all duration-150 flex flex-col justify-between relative cursor-pointer
                ${isSelected
                  ? 'bg-surface-elevated border-[#ccff00] shadow-[2px_2px_0px_0px_#ccff00]'
                  : 'bg-surface border-border hover:border-[#ccff00]/60'
                }`}
            >
              {badge && (
                <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider bg-[#ccff00] text-black px-1.5 py-0.5">
                  {badge}
                </span>
              )}
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`p-2 border ${isSelected ? 'border-[#ccff00] text-[#ccff00] bg-[#ccff00]/10' : 'border-border text-text-muted'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-text-primary uppercase tracking-wide">{title}</h4>
                  <p className="text-[11px] text-text-muted">{description}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs font-mono font-bold text-text-primary">
                <span>{countLabel}</span>
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#ccff00]' : 'bg-border'}`} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
