'use client'

const fields = [
  ['contact_phone', 'SWMO trunkline', 'tel'],
  ['contact_swmo_extension', 'SWMO extension', 'text'],
  ['contact_emergency_phone', 'City emergency hotline', 'tel'],
  ['contact_directory_url', 'Official directory source', 'url'],
  ['contact_emergency_source_url', 'Emergency hotline source', 'url'],
  ['contact_verified_on', 'Last verified', 'date'],
]

export default function OfficialContactFields({ cms, onChange }) {
  return <fieldset className="md:col-span-2 border-t border-border pt-5">
    <legend className="text-base font-medium text-text-primary">Official cleanup coordination</legend>
    <p className="text-sm text-text-secondary mt-2 mb-4">Published on Official contacts, the website footer and the mobile app. Use public office contacts, not personal numbers. Verify both sources before saving.</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {fields.map(([key, label, type]) => <div key={key}>
        <label htmlFor={`cms-${key}`} className="block text-sm font-medium text-text-primary mb-2">{label}</label>
        <input id={`cms-${key}`} type={type} value={cms[key]} onChange={event => onChange(key, event.target.value)}
          maxLength={type === 'url' ? 2048 : type === 'tel' ? 40 : key === 'contact_swmo_extension' ? 8 : undefined}
          inputMode={key === 'contact_swmo_extension' ? 'numeric' : undefined}
          className="w-full p-3 min-h-11 border border-border rounded-xl bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>)}
    </div>
    <p className="text-xs text-text-secondary mt-3">The call button dials the trunkline; extension instructions appear separately. Leave the extension or verification date blank when unavailable. Source links must use HTTPS.</p>
    <a href="/contact" target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-11 text-sm text-[var(--workspace-link)] underline">View published official contacts</a>
  </fieldset>
}
