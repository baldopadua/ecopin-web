'use client'
import { useState } from 'react'
import {
  Car, Bike, Footprints, ChevronDown, ChevronUp,
  Save, Trash2, BookTemplate, Plus, Check
} from 'lucide-react'

// All valid task types from the DB taxonomy (cleanup_tasks.task_type CHECK constraint)
const TASK_TYPE_OPTIONS = [
  'Cleanup',
  'Investigation',
  'Verification',
  'Emergency Response',
  'Reinspection',
  'Monitoring',
  'Escalation',
  'Deferred',
]

const OVERTIME_PILLS = [
  { label: '+0 min', value: 0 },
  { label: '+15 min', value: 15 },
  { label: '+30 min', value: 30 },
  { label: '+60 min', value: 60 },
]

const TRAVEL_MODES = [
  { value: 'WALKING', label: 'Walking', Icon: Footprints },
  { value: 'BICYCLE', label: 'Bicycle', Icon: Bike },
  { value: 'DRIVING', label: 'Vehicle', Icon: Car },
]

const BREAK_DURATIONS = [0, 15, 30, 60, 90]

/**
 * OptimizationSettings panel.
 * Renders the template selector (always visible) and an accordion for advanced settings.
 */
export default function OptimizationSettings({
  settings,
  onChange,
  templates = [],
  onSaveTemplate,
  onDeleteTemplate,
  disabled = false,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [saving, setSaving] = useState(false)

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
    <div className="border border-border bg-surface-elevated mb-6">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider flex items-center gap-2 mb-3">
          <BookTemplate className="w-4 h-4" />
          Generation Settings
        </h3>

        {/* Template Selector row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <select
              id="opt-template-select"
              disabled={disabled}
              value={settings._templateId || ''}
              onChange={handleTemplateSelect}
              className="w-full appearance-none border border-border bg-surface text-text-primary text-sm font-bold px-3 py-2 pr-8 focus:outline-none focus:border-[#ccff00] disabled:opacity-50 cursor-pointer"
            >
              <option value="">— Custom / No Template —</option>
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

          {/* Save as New button */}
          {!showSaveInput ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setShowSaveInput(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-border text-xs font-bold uppercase tracking-wider text-text-primary hover:border-[#ccff00] hover:text-[#ccff00] transition-colors disabled:opacity-50"
              title="Save current settings as a new template"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Template name…"
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveInput(false) }}
                className="border border-border border-[#ccff00] bg-surface text-text-primary text-sm px-2 py-1.5 focus:outline-none w-40"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !newTemplateName.trim()}
                className="p-2 bg-[#ccff00] text-text-primary border border-border border-[#ccff00] hover:bg-[#bbee00] disabled:opacity-50 transition-colors"
              >
                {saving ? <span className="text-xs font-bold">…</span> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button type="button" onClick={() => setShowSaveInput(false)} className="p-2 border border-border text-text-muted hover:border-error hover:text-error transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Delete template button (only for user-owned templates) */}
          {canDelete && (
            <button
              type="button"
              disabled={disabled}
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 border border-border border-error text-error text-xs font-bold uppercase tracking-wider hover:bg-error/10 transition-colors disabled:opacity-50"
              title="Delete this saved template"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>

        {selectedTemplate?.description && (
          <p className="text-xs text-text-muted font-mono mt-2">{selectedTemplate.description}</p>
        )}
      </div>

      {/* ── Travel Mode (always visible) ─────────────────── */}
      <div className="px-4 py-4 border-b border-border">
        <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
          Travel Mode
          <span className="ml-2 text-[10px] font-mono normal-case text-text-muted">(auto-adjusts travel buffer time)</span>
        </label>
        <div className="flex gap-2">
          {TRAVEL_MODES.map(({ value, label, Icon }) => {
            const active = settings.travel_mode === value
            return (
              <button
                key={value}
                type="button"
                disabled={disabled}
                onClick={() => update('travel_mode', value)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 border border-border text-sm font-bold uppercase tracking-wide transition-all duration-150 disabled:opacity-50
                  ${active
                    ? 'bg-[#ccff00] border-[#ccff00] text-text-primary shadow-sm'
                    : 'border-border text-text-muted hover:border-[#ccff00] hover:text-text-primary'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Advanced Settings Accordion ───────────────────── */}
      <div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowAdvanced(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
        >
          <span className="flex items-center gap-2">
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Advanced Settings
          </span>
          {!showAdvanced && (
            <span className="text-[10px] font-mono normal-case">Breaks · Overtime · Priority · Task Types · Capacity</span>
          )}
        </button>

        {showAdvanced && (
          <div className="px-4 pb-4 border-t border-border space-y-5 pt-4">

            {/* Break Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  Break Duration
                </label>
                <select
                  disabled={disabled}
                  value={settings.break_duration_min ?? 60}
                  onChange={e => update('break_duration_min', Number(e.target.value))}
                  className="w-full border border-border bg-surface text-text-primary text-sm font-bold px-3 py-2 focus:outline-none focus:border-[#ccff00] disabled:opacity-50"
                >
                  {BREAK_DURATIONS.map(d => (
                    <option key={d} value={d}>{d === 0 ? 'No break' : `${d} minutes`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  Break Window
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    disabled={disabled || (settings.break_duration_min ?? 60) === 0}
                    value={settings.break_window_start || '12:00'}
                    onChange={e => update('break_window_start', e.target.value)}
                    className="flex-1 border border-border bg-surface text-text-primary text-sm font-bold px-3 py-2 focus:outline-none focus:border-[#ccff00] disabled:opacity-40"
                  />
                  <span className="text-text-muted font-mono text-xs">to</span>
                  <input
                    type="time"
                    disabled={disabled || (settings.break_duration_min ?? 60) === 0}
                    value={settings.break_window_end || '13:30'}
                    onChange={e => update('break_window_end', e.target.value)}
                    className="flex-1 border border-border bg-surface text-text-primary text-sm font-bold px-3 py-2 focus:outline-none focus:border-[#ccff00] disabled:opacity-40"
                  />
                </div>
              </div>
            </div>

            {/* Overtime Tolerance */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                Overtime Tolerance
                <span className="ml-2 font-mono normal-case text-[10px]">(allow crews to run over shift to finish a high-priority task)</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {OVERTIME_PILLS.map(({ label, value }) => {
                  const active = (settings.overtime_tolerance_min ?? 15) === value
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={disabled}
                      onClick={() => update('overtime_tolerance_min', value)}
                      className={`px-4 py-2 border border-border text-xs font-bold uppercase tracking-wide transition-all duration-150 disabled:opacity-50
                        ${active
                          ? 'bg-[#ccff00] border-[#ccff00] text-text-primary shadow-sm'
                          : 'border-border text-text-muted hover:border-[#ccff00]'
                        }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Age vs Priority Slider */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                Age vs. Priority Sort
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-text-muted whitespace-nowrap">Oldest First</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  disabled={disabled}
                  value={settings.priority_age_weight ?? 50}
                  onChange={e => update('priority_age_weight', Number(e.target.value))}
                  className="flex-1 accent-[#ccff00] h-2 cursor-pointer disabled:opacity-50"
                />
                <span className="text-xs font-mono text-text-muted whitespace-nowrap">Priority First</span>
              </div>
              <p className="text-[10px] font-mono text-text-muted mt-1">
                {(settings.priority_age_weight ?? 50) <= 20
                  ? 'Strongly favoring oldest unresolved tasks'
                  : (settings.priority_age_weight ?? 50) >= 80
                  ? 'Strongly favoring highest-priority tasks'
                  : 'Balanced blend of age and priority score'}
              </p>
            </div>

            {/* Task Type Focus */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                Task Type Focus
                <span className="ml-2 font-mono normal-case text-[10px]">(uncheck all = include all types)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TASK_TYPE_OPTIONS.map(type => {
                  const included = (settings.included_task_types || []).includes(type)
                  return (
                    <label
                      key={type}
                      className={`flex items-center gap-2 border border-border px-3 py-2 cursor-pointer transition-colors
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#ccff00]'}
                        ${included ? 'border-[#ccff00] bg-[#ccff00]/10' : 'border-border'}`}
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
                      <span className="text-xs font-bold text-text-primary truncate">{type}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Density Focus + Max Tasks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  Density Focus (Clustering)
                </label>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => update('density_focus', !settings.density_focus)}
                  className={`w-full flex items-center justify-between px-4 py-3 border border-border font-bold text-sm uppercase tracking-wide transition-all duration-150 disabled:opacity-50
                    ${settings.density_focus
                      ? 'bg-[#ccff00] border-[#ccff00] text-text-primary shadow-sm'
                      : 'border-border text-text-muted hover:border-[#ccff00]'
                    }`}
                >
                  <span>{settings.density_focus ? 'ON — Minimize Travel Distance' : 'OFF — Spread by Priority'}</span>
                  <span className={`w-4 h-4 border border-border rounded-full transition-colors ${settings.density_focus ? 'bg-black border-border' : 'border-current'}`} />
                </button>
                <p className="text-[10px] font-mono text-text-muted mt-1">
                  {settings.density_focus
                    ? 'Algorithm clusters tasks geographically, even if a higher-priority task is further away.'
                    : 'Algorithm selects tasks by priority, regardless of geographic distance.'}
                </p>
              </div>

              <div>
                <label htmlFor="max-tasks-cap" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  Max Tasks Per Shift (Hard Cap)
                </label>
                <input
                  id="max-tasks-cap"
                  type="number"
                  min="1"
                  max="50"
                  disabled={disabled}
                  value={settings.max_tasks_per_shift ?? 15}
                  onChange={e => update('max_tasks_per_shift', Math.max(1, Number(e.target.value) || 1))}
                  className="w-full border border-border bg-surface text-text-primary text-sm font-bold px-3 py-2 focus:outline-none focus:border-[#ccff00] disabled:opacity-50 text-center tabular-nums"
                />
                <p className="text-[10px] font-mono text-text-muted mt-1">
                  Prevents over-scheduling even when crews have remaining time.
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
