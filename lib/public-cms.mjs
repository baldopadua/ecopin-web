export const DEFAULT_PUBLIC_CMS = {
  // Contact & Office Information
  contact_support_email: 'ecopinmail@gmail.com',
  contact_office_email: 'swmo@pasigcity.gov.ph',
  contact_phone: '09173726888',
  contact_office_name: 'Pasig Solid Waste Management Office (SWMO)',
  contact_office_address: 'Pasig City Hall Complex, Caruncho Ave, Pasig, Metro Manila',
  contact_operating_hours: 'Monday – Friday: 8:00 AM – 5:00 PM',
  contact_facebook_url: 'https://www.facebook.com/PasigPIO',
  contact_facebook_label: 'Pasig City Public Information Office',
  contact_swmo_facebook_url: 'https://www.facebook.com/profile.php?id=61583154152189',

  // Media & Community Showcase
  lead_story_title: 'From reports to response.',
  lead_story_subtitle: 'Meet the field crews of Pasig’s Solid Waste Management Office (SWMO), working on the ground to collect waste and clear neighborhood streets.',
  lead_photo_url: '/images/community/street-cleanup.jpg',
  lead_photo_caption: 'Pasig Solid Waste Management Office',
  lead_photo_tagline: 'On the ground. Getting it done.',
  lead_photo_credit_name: 'Pasig Tayo (Jonah Talagtag)',
  lead_photo_credit_url: 'https://www.facebook.com/share/p/19hk6BA5W8/',

  gallery_photo_1_url: '/images/community/neighborhood-team.jpg',
  gallery_photo_1_caption: 'SWMO crews collecting waste.',

  gallery_photo_2_url: '/images/community/working-together.jpg',
  gallery_photo_2_caption: 'Working together to clear bulky debris.',

  // Public Announcement / Advisory Banner
  announcement_enabled: false,
  announcement_title: 'Notice to Residents',
  announcement_message: 'Regular waste collection schedules may be adjusted during inclement weather. Check your barangay advisories for real-time updates.',
  announcement_severity: 'info',
  announcement_link_url: '',
  announcement_link_text: 'Read advisory',

  // App Distribution & Downloads
  app_download_url: '/ecopin-app-release.apk',
  app_version_name: 'v1.0.0',
  app_release_notes: 'EcoPin official Android release for verified Pasig residents.',
  app_playstore_url: '',

  // Public System Notice
  maintenance_mode: false,
  maintenance_notice: 'The reporting service is currently undergoing scheduled maintenance. Please check back shortly.'
}

export function safeCmsUrl(value, fallback = '') {
  if (typeof value !== 'string' || !value.trim()) return fallback
  const input = value.trim()
  if (input.startsWith('/') && !input.startsWith('//') && !input.includes('\\')) return input
  try {
    const url = new URL(input)
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href
  } catch {}
  return fallback
}

export function isPublicSitePath(pathname) {
  return ['/', '/landing', '/downloads', '/delete-account', '/explore', '/gallery', '/map', '/mobile', '/mobile-app'].includes(pathname) || pathname?.startsWith('/reports/')
}
