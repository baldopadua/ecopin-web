'use client'
import { useEffect, useState, useCallback } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { DEFAULT_PUBLIC_CMS as DEFAULT_CMS } from '@/lib/public-cms.mjs'
import PageTabs from '@/components/ui/PageTabs'
import { AdminGuard } from '@/components/auth/RequireRole'
import Notification from '@/components/ui/Notification'
import { getSystemSettings, updateSystemSettings, uploadCmsMediaFile } from '@/lib/api'
import { SkeletonForm } from '@/components/ui/Skeleton'
import { reportDiagnostic } from '../../../../lib/diagnostics.mjs'
import { 
  ShieldCheck, 
  PhoneCall, 
  Image as ImageIcon, 
  Megaphone, 
  Smartphone, 
  Save, 
  AlertTriangle, 
  Info, 
  Upload,
  Loader2
} from 'lucide-react'



const SETTINGS_TABS = [
  { id: 'contact', label: 'Contact & office', icon: PhoneCall },
  { id: 'media', label: 'Media & gallery', icon: ImageIcon },
  { id: 'announcements', label: 'Advisories & app', icon: Megaphone },
  { id: 'security', label: 'Security & quotas', icon: ShieldCheck }
]

function SystemSettingsContent() {
  const [activeTab, setActiveTab] = useState('contact')
  const [settings, setSettings] = useState({
    password_min_length: 8,
    password_require_uppercase: true,
    password_require_lowercase: true,
    password_require_numbers: true,
    password_require_special_chars: true,
    daily_report_quota: 10,
    report_video_max_seconds: 10
  })
  const [cms, setCms] = useState(DEFAULT_CMS)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState(null)

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(false)
      const data = await getSystemSettings({ throwOnError: true })
      setSettings(prev => ({
        ...prev,
        password_min_length: data.password_min_length ?? 8,
        password_require_uppercase: data.password_require_uppercase ?? true,
        password_require_lowercase: data.password_require_lowercase ?? true,
        password_require_numbers: data.password_require_numbers ?? true,
        password_require_special_chars: data.password_require_special_chars ?? true,
        daily_report_quota: data.daily_report_quota ?? 10,
        report_video_max_seconds: data.report_video_max_seconds ?? 10,
        ...(data.id ? { id: data.id } : {})
      }))
      if (data.cms && typeof data.cms === 'object') {
        setCms(prev => ({ ...prev, ...data.cms }))
      }
    } catch (err) {
      setLoadError(true)
      reportDiagnostic('error', 'settings', 'Failed to load settings:', err)
      setNotification({ message: 'Failed to load system settings', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void loadSettings()
    })
  }, [loadSettings])

  const handleSave = async () => {
    if (saving || uploadingField || loadError) return
    const videoMaximum = Number(settings.report_video_max_seconds)
    if (!Number.isInteger(videoMaximum) || videoMaximum < 5 || videoMaximum > 10) {
      setNotification({ message: 'Maximum video duration must be a whole number from 5 to 10 seconds', type: 'error' })
      return
    }
    try {
      setSaving(true)
      await updateSystemSettings({
        ...settings,
        report_video_max_seconds: videoMaximum,
        cms
      })
      setNotification({ message: 'All configuration settings updated successfully', type: 'success' })
    } catch (err) {
      reportDiagnostic('error', 'settings', 'Failed to save settings:', err)
      setNotification({ message: err.message || 'Failed to save settings', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const [uploadingField, setUploadingField] = useState(null)

  const handleSettingChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleCmsChange = (field, value) => {
    setCms(prev => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = async (e, fieldKey) => {
    if (uploadingField) return
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingField(fieldKey)
      const res = await uploadCmsMediaFile(file, fieldKey)
      if (res?.url) {
        handleCmsChange(fieldKey, res.url)
        setNotification({
          message: `Uploaded ${file.name}. Save changes to publish it.`,
          type: 'success'
        })
      }
    } catch (err) {
      reportDiagnostic('error', 'settings', err)
      setNotification({
        message: err.message || `Failed to upload ${file.name}`,
        type: 'error'
      })
    } finally {
      setUploadingField(null)
      e.target.value = ''
    }
  }

  if (loading) {
    return (
      <div
        className="workspace-page h-full max-h-full min-h-0 flex-1 overflow-hidden flex flex-col"
        style={{
          position: 'absolute',
          inset: 0,
          boxSizing: 'border-box',
          height: '100%',
          maxHeight: '100%',
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="shrink-0 flex-shrink-0">
          <PageHeader
            title="System & CMS Settings"
            subtitle="Loading configuration..."
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Admin', href: '/dashboard/admin' },
              { label: 'Settings' }
            ]}
          />
        </div>
        <div className="workspace-fill flex-1 min-h-0 overflow-hidden flex flex-col" style={{ flex: 1, minHeight: 0 }}>
          <div className="card border border-border flex-1 min-h-0 overflow-hidden">
            <SkeletonForm fields={8} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="workspace-page h-full max-h-full min-h-0 flex-1 overflow-hidden flex flex-col"
      style={{
        position: 'absolute',
        inset: 0,
        boxSizing: 'border-box',
        height: '100%',
        maxHeight: '100%',
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div className="shrink-0 flex-shrink-0">
        <PageHeader
          title="System & CMS Settings"
          subtitle="Manage content and policies. Save changes applies updates from every tab."
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Admin', href: '/dashboard/admin' },
            { label: 'Settings' }
          ]}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || Boolean(uploadingField) || loadError}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
            <span>{saving ? 'Saving changes...' : 'Save changes'}</span>
          </button>
        </PageHeader>
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="shrink-0 flex-shrink-0">
        {loadError && <div role="alert" className="workspace-panel"><p>Settings could not load. Reload before saving.</p><button type="button" className="btn-secondary mt-3" onClick={loadSettings}>Reload settings</button></div>}
      <PageTabs label="System settings" tabs={SETTINGS_TABS} value={activeTab} onChange={setActiveTab} />
      </div>

      <div
        className="workspace-fill flex-1 min-h-0 overflow-hidden flex flex-col"
        style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
      >
        {/* Tab 1: Contact & Office Info */}
        {activeTab === 'contact' && (
          <section
            role="tabpanel"
            id="contact-panel"
            aria-labelledby="contact-tab"
            tabIndex={0}
            className="card border border-border flex-1 min-h-0 overflow-y-auto space-y-6 overscroll-contain"
            style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
          >
            <div>
              <h2 className="text-xl font-bold text-text-primary">Contact & Office Information</h2>
              <p className="text-sm text-text-muted mt-1">
                Customize contact numbers, official email mailboxes, and office visiting details displayed on the public landing page and help center.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="cms-contact_support_email" className="block text-sm font-medium text-text-primary mb-2">
                  Primary EcoPin Support Email
                </label>
                <input
                    id="cms-contact_support_email"
                    type="email"
                  value={cms.contact_support_email}
                  onChange={(e) => handleCmsChange('contact_support_email', e.target.value)}
                  className="w-full p-3 border border-border rounded-lg bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="ecopinmail@gmail.com"
                />
                <p className="text-xs text-text-muted mt-1">Recipient of general technical and citizen support questions.</p>
              </div>

              <div>
                <label htmlFor="cms-contact_office_email" className="block text-sm font-medium text-text-primary mb-2">
                  Solid Waste Management Office (SWMO) Email
                </label>
                <input
                    id="cms-contact_office_email"
                    type="email"
                  value={cms.contact_office_email}
                  onChange={(e) => handleCmsChange('contact_office_email', e.target.value)}
                  className="w-full p-3 border border-border rounded-lg bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="swmo@pasigcity.gov.ph"
                />
                <p className="text-xs text-text-muted mt-1">Official city government office mailbox for waste management.</p>
              </div>

              <div>
                <label htmlFor="cms-contact_phone" className="block text-sm font-medium text-text-primary mb-2">
                  Office Hotline / Phone Number
                </label>
                <input
                    id="cms-contact_phone"
                    type="text"
                  value={cms.contact_phone}
                  onChange={(e) => handleCmsChange('contact_phone', e.target.value)}
                  className="w-full p-3 border border-border rounded-lg bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="09173726888"
                />
                <p className="text-xs text-text-muted mt-1">Clickable call link on mobile browsers for urgent citizen concerns.</p>
              </div>

              <div>
                <label htmlFor="cms-contact_operating_hours" className="block text-sm font-medium text-text-primary mb-2">
                  Office Operating Hours
                </label>
                <input
                    id="cms-contact_operating_hours"
                    type="text"
                  value={cms.contact_operating_hours}
                  onChange={(e) => handleCmsChange('contact_operating_hours', e.target.value)}
                  className="w-full p-3 border border-border rounded-lg bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Monday – Friday: 8:00 AM – 5:00 PM"
                />
                <p className="text-xs text-text-muted mt-1">Scheduled service hours for public walk-ins and dispatches.</p>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="cms-contact_office_name" className="block text-sm font-medium text-text-primary mb-2">
                  Office Name & Physical Address
                </label>
                <input
                    id="cms-contact_office_name"
                    type="text"
                  value={cms.contact_office_name}
                  onChange={(e) => handleCmsChange('contact_office_name', e.target.value)}
                  className="w-full p-3 mb-3 border border-border rounded-lg bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Pasig Solid Waste Management Office (SWMO)"
                />
                <textarea
                    id="cms-contact_office_address"
                    rows={2}
                  value={cms.contact_office_address}
                  onChange={(e) => handleCmsChange('contact_office_address', e.target.value)}
                  className="w-full p-3 border border-border rounded-lg bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Pasig City Hall Complex, Caruncho Ave, Pasig, Metro Manila"
                />
              </div>

              <div>
                <label htmlFor="cms-contact_facebook_url" className="block text-sm font-medium text-text-primary mb-2">
                  Official Facebook / Social URL
                </label>
                <input
                    id="cms-contact_facebook_url"
                    type="url"
                  value={cms.contact_facebook_url}
                  onChange={(e) => handleCmsChange('contact_facebook_url', e.target.value)}
                  className="w-full p-3 border border-border rounded-lg bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://www.facebook.com/PasigPIO"
                />
              </div>

              <div>
                <label htmlFor="cms-contact_facebook_label" className="block text-sm font-medium text-text-primary mb-2">
                  Social Page Display Label
                </label>
                <input
                    id="cms-contact_facebook_label"
                    type="text"
                  value={cms.contact_facebook_label}
                  onChange={(e) => handleCmsChange('contact_facebook_label', e.target.value)}
                  className="w-full p-3 border border-border rounded-lg bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Pasig City Public Information Office"
                />
              </div>
              <div>
                <label htmlFor="cms-swmo-facebook-url" className="block text-sm font-medium text-text-primary mb-2">SWMO Facebook page URL</label>
                <input id="cms-swmo-facebook-url" type="url" value={cms.contact_swmo_facebook_url || ''}
                  onChange={event => handleCmsChange('contact_swmo_facebook_url', event.target.value)}
                  className="w-full p-3 border border-border rounded-lg bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://www.facebook.com/profile.php?id=61583154152189" />
                <p className="mt-2 text-sm text-text-muted">Shown in the public footer. Use an HTTPS Facebook URL, or leave blank to hide the link.</p>
              </div>
            </div>
          </section>
        )}

        {/* Tab 2: Media & Community Gallery */}
        {activeTab === 'media' && (
          <section
            role="tabpanel"
            id="media-panel"
            aria-labelledby="media-tab"
            tabIndex={0}
            className="card border border-border flex-1 min-h-0 overflow-y-auto space-y-6 overscroll-contain"
            style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
          >
            <div>
              <h2 className="text-xl font-bold text-text-primary">Media & Community Showcase</h2>
              <p className="text-sm text-text-muted mt-1">
                Configure community story photos, field crew highlights, and photographer photo credits shown on the homepage.
              </p>
            </div>

            {/* Lead Story Section */}
            <div className="p-4 rounded-xl border border-border bg-surface-elevated/40 space-y-4">
              <h3 className="text-md font-semibold text-text-primary flex items-center gap-2">
                <ImageIcon size={18} className="text-primary" /> Lead Photo Story
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cms-lead_story_title" className="block text-sm font-medium text-text-primary mb-1">
                    Section Heading
                  </label>
                  <input
                    id="cms-lead_story_title"
                    type="text"
                    value={cms.lead_story_title}
                    onChange={(e) => handleCmsChange('lead_story_title', e.target.value)}
                    className="w-full p-2.5 border border-border rounded-lg bg-surface text-text-primary"
                  />
                </div>

                <div>
                  <label htmlFor="cms-lead_photo_tagline" className="block text-sm font-medium text-text-primary mb-1">
                    Photo Tagline
                  </label>
                  <input
                    id="cms-lead_photo_tagline"
                    type="text"
                    value={cms.lead_photo_tagline}
                    onChange={(e) => handleCmsChange('lead_photo_tagline', e.target.value)}
                    className="w-full p-2.5 border border-border rounded-lg bg-surface text-text-primary"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="cms-lead_story_subtitle" className="block text-sm font-medium text-text-primary mb-1">
                    Lead Photo Description / Subtitle
                  </label>
                  <textarea
                    id="cms-lead_story_subtitle"
                    rows={2}
                    value={cms.lead_story_subtitle}
                    onChange={(e) => handleCmsChange('lead_story_subtitle', e.target.value)}
                    className="w-full p-2.5 border border-border rounded-lg bg-surface text-text-primary"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="cms-lead_photo_url" className="block text-sm font-medium text-text-primary mb-1">
                    Lead Photo URL
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <input
                    id="cms-lead_photo_url"
                    type="text"
                      value={cms.lead_photo_url}
                      onChange={(e) => handleCmsChange('lead_photo_url', e.target.value)}
                      className="flex-1 p-2.5 border border-border rounded-lg bg-surface text-text-primary"
                      placeholder="/images/community/street-cleanup.jpg or https://..."
                    />
                    <label className="cursor-pointer shrink-0 inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-surface-elevated hover:bg-surface text-sm font-medium text-text-primary transition-colors">
                      {uploadingField === 'lead_photo_url' ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-primary" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={16} className="text-primary" />
                          <span>Upload Image</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={Boolean(uploadingField)}
                        onChange={(e) => handleFileUpload(e, 'lead_photo_url')}
                      />
                    </label>
                  </div>
                  {cms.lead_photo_url && (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="relative w-16 h-12 rounded border border-border overflow-hidden bg-black/10 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cms.lead_photo_url} alt="Lead photo preview" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs text-text-muted">Live preview for homepage story header</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="cms-lead_photo_caption" className="block text-sm font-medium text-text-primary mb-1">
                    Photo Caption
                  </label>
                  <input
                    id="cms-lead_photo_caption"
                    type="text"
                    value={cms.lead_photo_caption}
                    onChange={(e) => handleCmsChange('lead_photo_caption', e.target.value)}
                    className="w-full p-2.5 border border-border rounded-lg bg-surface text-text-primary"
                  />
                </div>

                <div>
                  <label htmlFor="cms-lead_photo_credit_name" className="block text-sm font-medium text-text-primary mb-1">
                    Photo Credit Name
                  </label>
                  <input
                    id="cms-lead_photo_credit_name"
                    type="text"
                    value={cms.lead_photo_credit_name}
                    onChange={(e) => handleCmsChange('lead_photo_credit_name', e.target.value)}
                    className="w-full p-2.5 border border-border rounded-lg bg-surface text-text-primary"
                  />
                </div>

                <div>
                  <label htmlFor="cms-lead_photo_credit_url" className="block text-sm font-medium text-text-primary mb-1">
                    Photo Credit Link URL
                  </label>
                  <input
                    id="cms-lead_photo_credit_url"
                    type="url"
                    value={cms.lead_photo_credit_url}
                    onChange={(e) => handleCmsChange('lead_photo_credit_url', e.target.value)}
                    className="w-full p-2.5 border border-border rounded-lg bg-surface text-text-primary"
                    placeholder="https://facebook.com/..."
                  />
                </div>
              </div>
            </div>

            {/* Field Crew Gallery Photos */}
            <div className="p-4 rounded-xl border border-border bg-surface-elevated/40 space-y-4">
              <h3 className="text-md font-semibold text-text-primary">Action Gallery Photos</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Photo 1 */}
                <div className="p-3 border border-border rounded-lg bg-surface space-y-3">
                  <h4 className="text-sm font-semibold text-text-primary">Gallery Photo 1</h4>
                  <div>
                    <label htmlFor="cms-gallery_photo_1_url" className="block text-xs font-medium text-text-muted mb-1">Image URL</label>
                    <div className="flex gap-2 items-center">
                      <input
                    id="cms-gallery_photo_1_url"
                    type="text"
                        value={cms.gallery_photo_1_url}
                        onChange={(e) => handleCmsChange('gallery_photo_1_url', e.target.value)}
                        className="flex-1 p-2 text-sm border border-border rounded bg-surface-elevated text-text-primary"
                      />
                      <label className="cursor-pointer shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 rounded border border-border bg-surface hover:bg-surface-elevated text-xs font-medium text-text-primary transition-colors">
                        {uploadingField === 'gallery_photo_1_url' ? (
                          <Loader2 size={14} className="animate-spin text-primary" />
                        ) : (
                          <Upload size={14} className="text-primary" />
                        )}
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={Boolean(uploadingField)}
                          onChange={(e) => handleFileUpload(e, 'gallery_photo_1_url')}
                        />
                      </label>
                    </div>
                  </div>
                  {cms.gallery_photo_1_url && (
                    <div className="flex items-center gap-2">
                      <div className="relative w-12 h-10 rounded border border-border overflow-hidden bg-black/10 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cms.gallery_photo_1_url} alt="Gallery 1 preview" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[11px] text-text-muted">Preview</span>
                    </div>
                  )}
                  <div>
                    <label htmlFor="cms-gallery_photo_1_caption" className="block text-xs font-medium text-text-muted mb-1">Caption</label>
                    <input
                    id="cms-gallery_photo_1_caption"
                    type="text"
                      value={cms.gallery_photo_1_caption}
                      onChange={(e) => handleCmsChange('gallery_photo_1_caption', e.target.value)}
                      className="w-full p-2 text-sm border border-border rounded bg-surface-elevated text-text-primary"
                    />
                  </div>
                </div>

                {/* Photo 2 */}
                <div className="p-3 border border-border rounded-lg bg-surface space-y-3">
                  <h4 className="text-sm font-semibold text-text-primary">Gallery Photo 2</h4>
                  <div>
                    <label htmlFor="cms-gallery_photo_2_url" className="block text-xs font-medium text-text-muted mb-1">Image URL</label>
                    <div className="flex gap-2 items-center">
                      <input
                    id="cms-gallery_photo_2_url"
                    type="text"
                        value={cms.gallery_photo_2_url}
                        onChange={(e) => handleCmsChange('gallery_photo_2_url', e.target.value)}
                        className="flex-1 p-2 text-sm border border-border rounded bg-surface-elevated text-text-primary"
                      />
                      <label className="cursor-pointer shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 rounded border border-border bg-surface hover:bg-surface-elevated text-xs font-medium text-text-primary transition-colors">
                        {uploadingField === 'gallery_photo_2_url' ? (
                          <Loader2 size={14} className="animate-spin text-primary" />
                        ) : (
                          <Upload size={14} className="text-primary" />
                        )}
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={Boolean(uploadingField)}
                          onChange={(e) => handleFileUpload(e, 'gallery_photo_2_url')}
                        />
                      </label>
                    </div>
                  </div>
                  {cms.gallery_photo_2_url && (
                    <div className="flex items-center gap-2">
                      <div className="relative w-12 h-10 rounded border border-border overflow-hidden bg-black/10 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cms.gallery_photo_2_url} alt="Gallery 2 preview" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[11px] text-text-muted">Preview</span>
                    </div>
                  )}
                  <div>
                    <label htmlFor="cms-gallery_photo_2_caption" className="block text-xs font-medium text-text-muted mb-1">Caption</label>
                    <input
                    id="cms-gallery_photo_2_caption"
                    type="text"
                      value={cms.gallery_photo_2_caption}
                      onChange={(e) => handleCmsChange('gallery_photo_2_caption', e.target.value)}
                      className="w-full p-2 text-sm border border-border rounded bg-surface-elevated text-text-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tab 3: Announcements & App Distribution */}
        {activeTab === 'announcements' && (
          <section
            role="tabpanel"
            id="announcements-panel"
            aria-labelledby="announcements-tab"
            tabIndex={0}
            className="card border border-border flex-1 min-h-0 overflow-y-auto space-y-6 overscroll-contain"
            style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
          >
            <div>
              <h2 className="text-xl font-bold text-text-primary">Advisories & App Distribution</h2>
              <p className="text-sm text-text-muted mt-1">
                Post emergency alerts, weather advisories, APK downloads, and configure scheduled maintenance status.
              </p>
            </div>

            {/* Public Advisory Banner */}
            <div className="p-4 rounded-xl border border-border bg-surface-elevated/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-semibold text-text-primary flex items-center gap-2">
                    <Megaphone size={18} className="text-primary" /> Public Announcement Banner
                  </h3>
                  <p className="text-xs text-text-muted">Broadcast emergency advisories across the top of the landing page and public map.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Public advisory banner" checked={cms.announcement_enabled}
                    onChange={(e) => handleCmsChange('announcement_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {cms.announcement_enabled && (
                <div className="pt-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="cms-announcement_title" className="block text-sm font-medium text-text-primary mb-1">
                        Banner Title
                      </label>
                      <input
                    id="cms-announcement_title"
                    type="text"
                        value={cms.announcement_title}
                        onChange={(e) => handleCmsChange('announcement_title', e.target.value)}
                        className="w-full p-2.5 border border-border rounded-lg bg-surface text-text-primary"
                        placeholder="Notice to Residents"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">
                        Alert Severity Level
                      </label>
                      <select
                        value={cms.announcement_severity}
                        onChange={(e) => handleCmsChange('announcement_severity', e.target.value)}
                        className="w-full p-2.5 border border-border rounded-lg bg-surface text-text-primary"
                      >
                        <option value="info">Information (Blue)</option>
                        <option value="warning">Warning / Weather (Amber)</option>
                        <option value="urgent">Urgent Emergency (Red)</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="cms-announcement_message" className="block text-sm font-medium text-text-primary mb-1">
                        Advisory Message
                      </label>
                      <textarea
                    id="cms-announcement_message"
                    rows={2}
                        value={cms.announcement_message}
                        onChange={(e) => handleCmsChange('announcement_message', e.target.value)}
                        className="w-full p-2.5 border border-border rounded-lg bg-surface text-text-primary"
                        placeholder="Regular waste collection schedules may be adjusted during inclement weather..."
                      />
                    </div>

                    <div>
                      <label htmlFor="cms-announcement_link_url" className="block text-sm font-medium text-text-primary mb-1">
                        Link URL (Optional)
                      </label>
                      <input
                    id="cms-announcement_link_url"
                    type="url"
                        value={cms.announcement_link_url}
                        onChange={(e) => handleCmsChange('announcement_link_url', e.target.value)}
                        className="w-full p-2.5 border border-border rounded-lg bg-surface text-text-primary"
                        placeholder="https://facebook.com/..."
                      />
                    </div>

                    <div>
                      <label htmlFor="cms-announcement_link_text" className="block text-sm font-medium text-text-primary mb-1">
                        Link Button Text
                      </label>
                      <input
                    id="cms-announcement_link_text"
                    type="text"
                        value={cms.announcement_link_text}
                        onChange={(e) => handleCmsChange('announcement_link_text', e.target.value)}
                        className="w-full p-2.5 border border-border rounded-lg bg-surface text-text-primary"
                        placeholder="Read advisory"
                      />
                    </div>
                  </div>

                  {/* Banner Preview */}
                  <div className="mt-3 p-3 rounded-lg border text-sm flex items-start gap-3 bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400">
                    <Info size={18} className="shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">{cms.announcement_title || 'Notice to Residents'}</strong>
                      <span>{cms.announcement_message || 'Advisory text preview...'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile App Distribution */}
            <div className="p-4 rounded-xl border border-border bg-surface-elevated/40 space-y-4">
              <h3 className="text-md font-semibold text-text-primary flex items-center gap-2">
                <Smartphone size={18} className="text-primary" /> Citizen Mobile App Distribution
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cms-app_download_url" className="block text-sm font-medium text-text-primary mb-1">
                    Direct APK Download Link / URL
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <input
                    id="cms-app_download_url"
                    type="text"
                      value={cms.app_download_url}
                      onChange={(e) => handleCmsChange('app_download_url', e.target.value)}
                      className="flex-1 p-2.5 border border-border rounded-lg bg-surface text-text-primary"
                      placeholder="/ecopin-app-release.apk or https://..."
                    />
                    <label className="cursor-pointer shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-border bg-surface-elevated hover:bg-surface text-sm font-medium text-text-primary transition-colors">
                      {uploadingField === 'app_download_url' ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-primary" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={16} className="text-primary" />
                          <span>Upload APK</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".apk,application/vnd.android.package-archive"
                        className="sr-only"
                        disabled={Boolean(uploadingField)}
                        onChange={(e) => handleFileUpload(e, 'app_download_url')}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-text-muted mt-1">Upload an APK up to 100 MB directly to storage, then Save changes to publish it. Your storage project&apos;s file-size limit also applies.</p>
                </div>

                <div>
                  <label htmlFor="cms-app_version_name" className="block text-sm font-medium text-text-primary mb-1">
                    Latest App Version
                  </label>
                  <input
                    id="cms-app_version_name"
                    type="text"
                    value={cms.app_version_name}
                    onChange={(e) => handleCmsChange('app_version_name', e.target.value)}
                    className="w-full p-2.5 border border-border rounded-lg bg-surface text-text-primary"
                    placeholder="v1.2.0"
                  />
                </div>

                <div>
                  <label htmlFor="cms-app_playstore_url" className="block text-sm font-medium text-text-primary mb-1">
                    Google Play Store URL (Optional)
                  </label>
                  <input
                    id="cms-app_playstore_url"
                    type="url"
                    value={cms.app_playstore_url}
                    onChange={(e) => handleCmsChange('app_playstore_url', e.target.value)}
                    className="w-full p-2.5 border border-border rounded-lg bg-surface text-text-primary"
                    placeholder="https://play.google.com/store/apps/details?id=..."
                  />
                </div>

                <div>
                  <label htmlFor="cms-app_release_notes" className="block text-sm font-medium text-text-primary mb-1">
                    App Release Notes Summary
                  </label>
                  <input
                    id="cms-app_release_notes"
                    type="text"
                    value={cms.app_release_notes}
                    onChange={(e) => handleCmsChange('app_release_notes', e.target.value)}
                    className="w-full p-2.5 border border-border rounded-lg bg-surface text-text-primary"
                  />
                </div>
              </div>
            </div>

            {/* Maintenance Mode */}
            <div className="p-4 rounded-xl border border-border bg-surface-elevated/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-semibold text-text-primary flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" /> Maintenance Mode
                  </h3>
                  <p className="text-xs text-text-muted">Pause public web pages with this notice. Staff sign-in and dashboards stay available.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Maintenance mode" checked={cms.maintenance_mode}
                    onChange={(e) => handleCmsChange('maintenance_mode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {cms.maintenance_mode && (
                <div>
                  <label htmlFor="cms-maintenance_notice" className="block text-sm font-medium text-text-primary mb-1">Maintenance Notice Message</label>
                  <textarea
                    id="cms-maintenance_notice"
                    rows={2}
                    value={cms.maintenance_notice}
                    onChange={(e) => handleCmsChange('maintenance_notice', e.target.value)}
                    className="w-full p-2.5 border border-border rounded-lg bg-surface text-text-primary"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tab 4: Security & Citizen Quotas */}
        {activeTab === 'security' && (
          <section
            role="tabpanel"
            id="security-panel"
            aria-labelledby="security-tab"
            tabIndex={0}
            className="card border border-border flex-1 min-h-0 overflow-y-auto space-y-6 overscroll-contain"
            style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
          >
            <h2 className="text-xl font-bold text-text-primary">Password Requirements & Citizen Quotas</h2>

            <div className="space-y-6">
              {/* Minimum Password Length */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Minimum Password Length
                </label>
                <input
                  type="number"
                  min="6"
                  max="32"
                  value={settings.password_min_length}
                  onChange={(e) => handleSettingChange('password_min_length', parseInt(e.target.value) || 8)}
                  className="w-full p-3 border border-border rounded-lg bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-text-muted mt-1">
                  Minimum: 6 characters, Maximum: 32 characters
                </p>
              </div>

              {/* Password Complexity Requirements */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-text-primary">
                  Password Complexity Requirements
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="require_uppercase"
                    checked={settings.password_require_uppercase}
                    onChange={(e) => handleSettingChange('password_require_uppercase', e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor="require_uppercase" className="text-sm text-text-primary cursor-pointer">
                    Require uppercase letters (A-Z)
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="require_lowercase"
                    checked={settings.password_require_lowercase}
                    onChange={(e) => handleSettingChange('password_require_lowercase', e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor="require_lowercase" className="text-sm text-text-primary cursor-pointer">
                    Require lowercase letters (a-z)
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="require_numbers"
                    checked={settings.password_require_numbers}
                    onChange={(e) => handleSettingChange('password_require_numbers', e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor="require_numbers" className="text-sm text-text-primary cursor-pointer">
                    Require numbers (0-9)
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="require_special_chars"
                    checked={settings.password_require_special_chars}
                    onChange={(e) => handleSettingChange('password_require_special_chars', e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor="require_special_chars" className="text-sm text-text-primary cursor-pointer">
                    Require special characters (!@#$%^&*)
                  </label>
                </div>
              </div>

              <hr className="border-border" />

              <div>
                <h3 className="text-md font-semibold text-text-primary mb-2">Report videos</h3>
                <label htmlFor="report-video-maximum" className="block text-sm font-medium text-text-primary mb-2">
                  Maximum video duration (seconds)
                </label>
                <input id="report-video-maximum" type="number" min="5" max="10" step="1"
                  value={settings.report_video_max_seconds}
                  onChange={e => handleSettingChange('report_video_max_seconds', e.target.value)}
                  disabled={saving}
                  className="w-full p-3 border border-border rounded-lg bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
                <p className="text-sm text-text-secondary mt-1">
                  Choose 5–10 seconds. Every clip must be at least 5 seconds. The saved limit applies to new submissions, including previously recorded clips.
                </p>
              </div>
              <hr className="border-border" />

              {/* Citizen Submission Quota */}
              <div>
                <h3 className="text-md font-semibold text-text-primary mb-2">Citizen Submission Quota & Rate Limiting</h3>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Daily Report Submission Quota (per citizen account)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.daily_report_quota ?? 10}
                  onChange={(e) => handleSettingChange('daily_report_quota', parseInt(e.target.value, 10) || 1)}
                  className="w-full p-3 border border-border rounded-lg bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-text-muted mt-1">
                  Maximum reports a citizen account can submit within a rolling 24-hour window (default: 10). Exceeding this limit triggers a user-friendly countdown warning.
                </p>
              </div>

              <hr className="border-border" />

              <div>
                <h3 className="text-md font-semibold text-text-primary mb-2">Web Session Lifetime</h3>
                <p className="text-sm text-text-primary">30 days after sign-in</p>
                <p className="text-xs text-text-muted mt-1">
                  Users are signed out when this period ends. Inactivity does not prematurely terminate authenticated sessions.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default function SystemSettings() {
  return (
    <AdminGuard>
      <SystemSettingsContent />
    </AdminGuard>
  )
}

