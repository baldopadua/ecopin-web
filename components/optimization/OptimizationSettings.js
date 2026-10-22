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

import { normalizeCapacitySettings } from '@/lib/optimization-settings.mjs'

export { normalizeCapacitySettings }

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
    if (tpl) {
      const normalizedSettings = normalizeCapacitySettings(tpl.settings || {})
      onChange({ ...settings, ...normalizedSettings, _templateId: tpl.id })
    }
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
      {/* ── 2. Route transport mode ─────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="block text-sm font-semibold text-text-primary">
            2. Route transport mode
          </p>
          <span className="text-xs font-sans text-text-muted">
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
                aria-pressed={active}
                disabled={disabled}
                onClick={() => update('travel_mode', value)}
                className={`flex flex-col items-start p-3 border text-left transition-all duration-150 disabled:opacity-50 cursor-pointer
                  ${active
                    ? 'bg-primary/5 border-primary text-text-primary shadow-sm'
                    : 'bg-surface border-border text-text-muted hover:border-primary/60 hover:text-text-primary'
                  }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-text-muted'}`} />
                  <span className="text-sm font-semibold normal-case tracking-normal">{label}</span>
                </div>
                {hint && <span className="text-xs font-sans text-text-muted">{hint}</span>}
              </button>
            )
          })}
        </div>
        <p className="text-sm text-text-muted mt-3">This controls travel-time calculations for this plan. Crew vehicle type in Admin settings describes the actual equipment and load capacity; it does not automatically change this mode. Use Vehicle for pickup or compactor trucks, and match Walking, Bicycle, or Motorcycle to the crews you dispatch.</p>
      </div>

      {/* ── Advanced Settings Accordion ───────────────────── */}
      <div className="border border-border bg-surface-elevated">
        <button
          type="button"
          disabled={disabled}
          aria-expanded={showAdvanced}
          aria-controls="optimization-advanced-settings"
          onClick={() => setShowAdvanced(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold normal-case tracking-normal text-text-muted hover:text-text-primary transition-colors disabled:opacity-50 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-text-muted" />
            <span>Advanced settings</span>
            <span className="text-xs font-sans lowercase font-normal text-text-muted">(optional)</span>
          </span>
          <span className="flex items-center gap-2 text-xs font-sans normal-case">
            {!showAdvanced && <span>Breaks · Overtime · Shift Cap · Presets</span>}
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {showAdvanced && (
          <div id="optimization-advanced-settings" className="px-4 pb-4 border-t border-border space-y-5 pt-4">

            {/* Presets Row */}
            <div className="p-3 bg-surface border border-border">
              <label className="block text-xs font-semibold normal-case tracking-normal text-text-muted mb-2">
                Preset templates
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <select
                    id="opt-template-select"
                    aria-label="Preset template"
                    disabled={disabled}
                    value={settings._templateId || ''}
                    onChange={handleTemplateSelect}
                    className="w-full appearance-none border border-border bg-surface-elevated text-text-primary text-xs font-semibold px-3 py-2 pr-8 focus:outline-none focus:border-primary disabled:opacity-50 cursor-pointer"
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
                    className="flex items-center gap-1.5 px-3 py-2 border border-border text-xs font-semibold normal-case tracking-normal text-text-primary hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save preset
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      aria-label="Preset name"
                      placeholder="Preset name…"
                      value={newTemplateName}
                      onChange={e => setNewTemplateName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveInput(false) }}
                      className="border border-primary bg-surface-elevated text-text-primary text-xs px-2 py-1.5 focus:outline-none w-36"
                    />
                    <button
                      type="button"
                      onClick={handleSave}
                      aria-label="Save preset"
                      disabled={saving || !newTemplateName.trim()}
                      className="p-1.5 bg-primary text-white border border-primary hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" aria-label="Cancel saving preset" onClick={() => setShowSaveInput(false)} className="p-1.5 border border-border text-text-muted hover:border-error hover:text-error transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {canDelete && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 px-3 py-2 border border-error text-error text-xs font-semibold normal-case tracking-normal hover:bg-error/10 transition-colors disabled:opacity-50"
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
                <label className="block text-xs font-semibold normal-case tracking-normal text-text-muted mb-2">
                  Shift break duration
                </label>
                <select
                  aria-label="Shift break duration"
                  disabled={disabled}
                  value={settings.break_duration_min ?? 60}
                  onChange={e => update('break_duration_min', Number(e.target.value))}
                  className="w-full border border-border p-2 bg-surface text-text-primary text-xs font-semibold focus:outline-none focus:border-primary"
                >
                  {breakDurations.map(val => (
                    <option key={val} value={val}>{val} minutes</option>
                  ))}
                </select>
                <p className="text-xs font-sans text-text-muted mt-1">Deducted from available daily crew shift budget.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold normal-case tracking-normal text-text-muted mb-2">
                  Overtime tolerance
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
                        className={`flex-1 py-1.5 px-2 border text-xs font-semibold font-sans transition-all disabled:opacity-50
                          ${active
                            ? 'bg-primary border-primary text-white font-semibold'
                            : 'border-border text-text-muted bg-surface hover:border-primary'
                          }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs font-sans text-text-muted mt-1">Allows crews to finish critical tasks slightly past shift end.</p>
              </div>
            </div>

            {/* Density Focus + Max Tasks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold normal-case tracking-normal text-text-muted mb-2">
                  Shift capacity target (%)
                </label>
                <input
                  aria-label="Shift capacity target (%)"
                  type="number"
                  min="10"
                  max="100"
                  step="5"
                  disabled={disabled}
                  value={Math.round((settings.capacity_utilization ?? (settings.shift_capacity_target != null ? (settings.shift_capacity_target > 1 ? settings.shift_capacity_target / 100 : settings.shift_capacity_target) : 1)) * 100)}
                  onChange={e => {
                    const rawVal = Number(e.target.value)
                    const val = Number.isFinite(rawVal) ? Math.min(100, Math.max(10, rawVal)) : 100
                    onChange({
                      ...settings,
                      capacity_utilization: val / 100,
                      shift_capacity_target: val
                    })
                  }}
                  className="w-full border border-border p-2 bg-surface text-text-primary text-xs font-semibold font-sans focus:outline-none focus:border-primary"
                />
                <p className="text-xs font-sans text-text-muted mt-1">Target utilization percentage of available crew minutes.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold normal-case tracking-normal text-text-muted mb-2">
                  Maximum tasks per shift
                </label>
                <input
                  aria-label="Maximum tasks per shift"
                  type="number"
                  min="1"
                  max="50"
                  disabled={disabled}
                  value={settings.max_tasks_per_shift ?? 15}
                  onChange={e => update('max_tasks_per_shift', Math.max(1, Number(e.target.value) || 1))}
                  className="w-full border border-border p-2 bg-surface text-text-primary text-xs font-semibold font-sans focus:outline-none focus:border-primary"
                />
                <p className="text-xs font-sans text-text-muted mt-1">Upper limit per crew to prevent fatigue.</p>
              </div>
            </div>

            {/* Travel Route Limits (WT-01) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold normal-case tracking-normal text-text-muted mb-2">
                  Max route distance limit (km)
                </label>
                <input
                  aria-label="Max route distance limit (km)"
                  type="number"
                  min="5"
                  max="500"
                  step="5"
                  disabled={disabled}
                  value={settings.max_route_distance_km ?? 50}
                  onChange={e => update('max_route_distance_km', Math.max(5, Number(e.target.value) || 50))}
                  className="w-full border border-border p-2 bg-surface text-text-primary text-xs font-semibold font-sans focus:outline-none focus:border-primary"
                />
                <p className="text-xs font-sans text-text-muted mt-1">Upper bound on total crew travel distance per shift.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold normal-case tracking-normal text-text-muted mb-2">
                  Max route travel duration (mins)
                </label>
                <input
                  aria-label="Max route travel duration (mins)"
                  type="number"
                  min="30"
                  max="1440"
                  step="15"
                  disabled={disabled}
                  value={settings.max_route_duration_minutes ?? 480}
                  onChange={e => update('max_route_duration_minutes', Math.max(30, Number(e.target.value) || 480))}
                  className="w-full border border-border p-2 bg-surface text-text-primary text-xs font-semibold font-sans focus:outline-none focus:border-primary"
                />
                <p className="text-xs font-sans text-text-muted mt-1">Upper bound on total transit time to prevent excessive detours.</p>
              </div>
            </div>

            {/* Task Type Focus */}
            <div>
              <label className="block text-xs font-semibold normal-case tracking-normal text-text-muted mb-2">
                Task types to include
                <span className="ml-2 font-sans normal-case text-xs">(leave all unselected to include all types)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {taskTypeOptions.map(type => {
                  const included = (settings.included_task_types || []).includes(type)
                  return (
                    <label
                      key={type}
                      className={`flex items-center gap-2 border px-3 py-2 cursor-pointer transition-colors text-xs
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}
                        ${included ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-border bg-surface text-text-muted'}`}
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
                        className="accent-primary w-3.5 h-3.5"
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
