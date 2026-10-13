'use client'
import { useState } from 'react'
import {
  Car, Bike, Footprints, Motorbike, ChevronDown, ChevronUp,
  Save, Trash2, Sliders, Check
} from 'lucide-react'

const TRAVEL_MODE_ICONS = {
  WALKING: Footprints,
  BICYCLE: Bike,
  MOTORCYCLE: Motorbike,
  DRIVING: Car,
}

const TRAVEL_MODE_HINTS = {
  WALKING: '~4 km/h · Foot patrols & sweepers',
  BICYCLE: '~15 km/h · Cargo bikes & trikes',
  MOTORCYCLE: '~35 km/h · Rapid response scooters',
  DRIVING: '~25 km/h · Utility vehicles & compactors',
}

// Fallback municipal defaults if backend metadata is loading or offline
const DEFAULT_TASK_TYPES = [
  'Cleanup',
  'Investigation',
  'Verification',
  'Emergency Response',
  'Reinspection',
  'Monitoring',
  'Escalation',
  'Deferred',
]

const DEFAULT_OVERTIME_PILLS = [
  { label: '+0 min', value: 0 },
  { label: '+15 min', value: 15 },
  { label: '+30 min', value: 30 },
  { label: '+60 min', value: 60 },
]

const DEFAULT_TRAVEL_MODES = [
  { value: 'WALKING', label: 'Walking' },
  { value: 'BICYCLE', label: 'Bicycle' },
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'DRIVING', label: 'Vehicle' },
]

const DEFAULT_BREAK_DURATIONS = [0, 15, 30, 60, 90]

/**
 * OptimizationSettings panel.
 * Streamlined 2-parameter municipal dispatch settings with collapsible advanced controls.
 */
export default function OptimizationSettings({
  settings,
  onChange,
  templates = [],
  options = null,
  onSaveTemplate,
  onDeleteTemplate,
  disabled = false,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [saving, setSaving] = useState(false)

  const travelModes = (options?.travel_modes || DEFAULT_TRAVEL_MODES).map(mode => ({
    ...mode,
    Icon: TRAVEL_MODE_ICONS[mode.value] || Car,
    hint: TRAVEL_MODE_HINTS[mode.value] || ''
  }))
  const taskTypeOptions = options?.task_types || DEFAULT_TASK_TYPES
  const overtimePills = options?.overtime_options || DEFAULT_OVERTIME_PILLS
  const breakDurations = options?.break_durations || DEFAULT_BREAK_DURATIONS

  const update = (key, value) => onChange({ ...settings, [key]: value })

  const handleTemplateSelect = (e) => {
    const templateId = e.target.value
    if (!templateId) return
    const tpl = templates.find((t) => t.id === templateId)
    if (tpl) onChange({ ...settings, ...tpl.settings, _templateId: tpl.id })
  }

  const handleSave = async () => {
    if (!newTemplateName.trim()) return
    setSaving(true)
    try {
      await onSaveTemplate(newTemplateName.trim())
      setNewTemplateName('')
      setShowSaveInput(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!settings._templateId) return
    const tpl = templates.find((t) => t.id === settings._templateId)
    if (!tpl || tpl.is_default) return
    await onDeleteTemplate(settings._templateId)
    onChange({ ...settings, _templateId: undefined })
  }

  const selectedTemplate = templates.find((t) => t.id === settings._templateId)
  const canDelete = selectedTemplate && !selectedTemplate.is_default

  return (
    <div className="space-y-4">
      {/* ── 2. Fleet Transport Mode ─────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">
            2. Fleet Transport Mode
          </label>
          <span className="text-[10px] font-mono text-text-muted">
            Speed heuristics & route matrix adjust automatically
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {travelModes.map(({ value, label, Icon, hint }) => {
            const active = settings.travel_mode === value
            return (
              <button
                key={value}
                type="button"
                disabled={disabled}
                onClick={() => update('travel_mode', value)}
                className={`flex flex-col items-start p-3 border text-left transition-all duration-150 disabled:opacity-50 cursor-pointer
                  ${active
                    ? 'bg-surface-elevated border-[#ccff00] text-text-primary shadow-[2px_2px_0px_0px_#ccff00]'
                    : 'bg-surface border-border text-text-muted hover:border-[#ccff00]/60 hover:text-text-primary'
                  }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${active ? 'text-[#ccff00]' : 'text-text-muted'}`} />
                  <span className="text-sm font-bold uppercase tracking-wide">{label}</span>
                </div>
                {hint && <span className="text-[10px] font-mono text-text-muted">{hint}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Advanced Settings Accordion ───────────────────── */}
      <div className="border border-border bg-surface-elevated">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowAdvanced(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors disabled:opacity-50 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-text-muted" />
            <span>Advanced System Settings</span>
            <span className="text-[10px] font-mono lowercase font-normal text-text-muted">(optional)</span>
          </span>
          <span className="flex items-center gap-2 text-[10px] font-mono normal-case">
            {!showAdvanced && <span>Breaks · Overtime · Shift Cap · Presets</span>}
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {showAdvanced && (
          <div className="px-4 pb-4 border-t border-border space-y-5 pt-4">

            {/* Presets Row */}
            <div className="p-3 bg-surface border border-border">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                Preset Configuration Templates
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <select
                    id="opt-template-select"
                    disabled={disabled}
                    value={settings._templateId || ''}
                    onChange={handleTemplateSelect}
                    className="w-full appearance-none border border-border bg-surface-elevated text-text-primary text-xs font-bold px-3 py-2 pr-8 focus:outline-none focus:border-[#ccff00] disabled:opacity-50 cursor-pointer"
                  >
                    <option value="">— Custom Settings —</option>
                    {templates.filter(t => t.is_default).length > 0 && (
                      <optgroup label="System Presets">
                        {templates.filter(t => t.is_default).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {templates.filter(t => !t.is_default).length > 0 && (
                      <optgroup label="My Templates">
                        {templates.filter(t => !t.is_default).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                </div>

                {!showSaveInput ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setShowSaveInput(true)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-border text-xs font-bold uppercase tracking-wider text-text-primary hover:border-[#ccff00] hover:text-[#ccff00] transition-colors disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Preset
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Preset name…"
                      value={newTemplateName}
                      onChange={e => setNewTemplateName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveInput(false) }}
                      className="border border-[#ccff00] bg-surface-elevated text-text-primary text-xs px-2 py-1.5 focus:outline-none w-36"
                    />
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !newTemplateName.trim()}
                      className="p-1.5 bg-[#ccff00] text-black border border-[#ccff00] hover:bg-[#bbee00] disabled:opacity-50 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setShowSaveInput(false)} className="p-1.5 border border-border text-text-muted hover:border-error hover:text-error transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {canDelete && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 px-3 py-2 border border-error text-error text-xs font-bold uppercase tracking-wider hover:bg-error/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Shift Breaks & Overtime */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  Shift Break Duration
                </label>
                <select
                  disabled={disabled}
                  value={settings.break_duration_min ?? 60}
                  onChange={e => update('break_duration_min', Number(e.target.value))}
                  className="w-full border border-border p-2 bg-surface text-text-primary text-xs font-bold focus:outline-none focus:border-[#ccff00]"
                >
                  {breakDurations.map(val => (
                    <option key={val} value={val}>{val} minutes</option>
                  ))}
                </select>
                <p className="text-[10px] font-mono text-text-muted mt-1">Deducted from available daily crew shift budget.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  Overtime Tolerance
                </label>
                <div className="flex gap-2">
                  {overtimePills.map(({ label, value }) => {
                    const active = (settings.overtime_tolerance_min ?? 15) === value
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={disabled}
                        onClick={() => update('overtime_tolerance_min', value)}
                        className={`flex-1 py-1.5 px-2 border text-xs font-bold font-mono transition-all disabled:opacity-50
                          ${active
                            ? 'bg-[#ccff00] border-[#ccff00] text-black font-bold'
                            : 'border-border text-text-muted bg-surface hover:border-[#ccff00]'
                          }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px] font-mono text-text-muted mt-1">Allows crews to finish critical tasks slightly past shift end.</p>
              </div>
            </div>

            {/* Density Focus + Max Tasks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  Shift Capacity Target (%)
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  step="5"
                  disabled={disabled}
                  value={Math.round((settings.capacity_utilization ?? 1) * 100)}
                  onChange={e => update('capacity_utilization', Number(e.target.value) / 100)}
                  className="w-full border border-border p-2 bg-surface text-text-primary text-xs font-bold font-mono focus:outline-none focus:border-[#ccff00]"
                />
                <p className="text-[10px] font-mono text-text-muted mt-1">Target utilization percentage of available crew minutes.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  Max Tasks Per Shift Cap
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  disabled={disabled}
                  value={settings.max_tasks_per_shift ?? 15}
                  onChange={e => update('max_tasks_per_shift', Math.max(1, Number(e.target.value) || 1))}
                  className="w-full border border-border p-2 bg-surface text-text-primary text-xs font-bold font-mono focus:outline-none focus:border-[#ccff00]"
                />
                <p className="text-[10px] font-mono text-text-muted mt-1">Upper limit per crew to prevent fatigue.</p>
              </div>
            </div>

            {/* Task Type Focus */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                Task Type Inclusion Focus
                <span className="ml-2 font-mono normal-case text-[10px]">(leave all unselected to include all types)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {taskTypeOptions.map(type => {
                  const included = (settings.included_task_types || []).includes(type)
                  return (
                    <label
                      key={type}
                      className={`flex items-center gap-2 border px-3 py-2 cursor-pointer transition-colors text-xs
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#ccff00]'}
                        ${included ? 'border-[#ccff00] bg-[#ccff00]/10 font-bold' : 'border-border bg-surface text-text-muted'}`}
                    >
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={included}
                        onChange={() => {
                          const current = settings.included_task_types || []
                          update('included_task_types', included
                            ? current.filter(t => t !== type)
                            : [...current, type])
                        }}
                        className="accent-[#ccff00] w-3.5 h-3.5"
                      />
                      <span className="truncate">{type}</span>
                    </label>
                  )
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
