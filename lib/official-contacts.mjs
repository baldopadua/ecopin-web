import { DEFAULT_PUBLIC_CMS } from './public-cms.mjs'

export function contactTel(value) {
  if (typeof value !== 'string' || value.length > 40 || !/^\+?[\d ()-]+$/.test(value)) return null
  const digits = value.replace(/\D/g, '')
  if (!/^\d{3,15}$/.test(digits)) return null
  return `tel:${value.startsWith('+') ? '+' + digits : digits.startsWith('0') && digits.length >= 10 ? '+63' + digits.slice(1) : digits}`
}

export function getOfficialContacts(settings = {}) {
  const cms = { ...DEFAULT_PUBLIC_CMS, ...settings }
  const phone = key => contactTel(cms[key]) ? cms[key] : DEFAULT_PUBLIC_CMS[key]
  const source = key => {
    try {
      const url = new URL(cms[key])
      if (url.protocol === 'https:' && !url.username && !url.password) return url.href
    } catch {}
    return DEFAULT_PUBLIC_CMS[key]
  }
  return {
    office: cms.contact_office_name || DEFAULT_PUBLIC_CMS.contact_office_name,
    swmoPhone: phone('contact_phone'), swmoTel: contactTel(phone('contact_phone')),
    extension: typeof cms.contact_swmo_extension === 'string' && /^\d{0,8}$/.test(cms.contact_swmo_extension) ? cms.contact_swmo_extension : DEFAULT_PUBLIC_CMS.contact_swmo_extension,
    email: typeof cms.contact_office_email === 'string' && /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(cms.contact_office_email) ? cms.contact_office_email : '',
    emergencyPhone: phone('contact_emergency_phone'), emergencyTel: contactTel(phone('contact_emergency_phone')),
    directory: source('contact_directory_url'), emergencySource: source('contact_emergency_source_url'),
    checked: typeof cms.contact_verified_on === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(cms.contact_verified_on) ? cms.contact_verified_on : '',
  }
}
