'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Send, 
  UploadCloud, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Loader2, 
  ShieldCheck, 
  HelpCircle,
  FileText
} from 'lucide-react'
import Link from 'next/link'
import { usePublicCms } from '@/components/public/PublicSiteProvider'
import styles from './CitizenTicketForm.module.css'

export default function CitizenTicketForm({ defaultReferenceCode = '' }) {
  const { cms } = usePublicCms()
  const [category, setCategory] = useState('status_inquiry')
  const [referenceCode, setReferenceCode] = useState(defaultReferenceCode)
  const [description, setDescription] = useState('')
  const [isStatusInquiry, setIsStatusInquiry] = useState(true)
  const [screenshotPreview, setScreenshotPreview] = useState(null)
  const [screenshotData, setScreenshotData] = useState(null)
  const [citizenEmail, setCitizenEmail] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ticketReference, setTicketReference] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (defaultReferenceCode) {
      setReferenceCode(defaultReferenceCode)
    }
  }, [defaultReferenceCode])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, or WebP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Screenshot exceeds 5MB size limit.')
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      setScreenshotPreview(reader.result)
      setScreenshotData(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveScreenshot = () => {
    setScreenshotPreview(null)
    setScreenshotData(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return

    if (!description.trim()) {
      setError('Please provide a description of your issue or inquiry.')
      return
    }

    if (!referenceCode.trim()) {
      setError('Please provide your Report ID or Reference Code so SWMO can verify ownership.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3000'
      const generatedTicketId = `TCK-${Date.now().toString().slice(-6)}`
      const recipientEmail = (cms?.contact_support_email || cms?.contact_office_email || 'ecopinmail@gmail.com').trim().toLowerCase()

      // Submit ticket inquiry payload
      const response = await fetch(`${API_BASE}/api/contact/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Citizen Reporter',
          email: citizenEmail.trim().toLowerCase(),
          subject: `[${category.toUpperCase()}] Ref: ${referenceCode.trim()} - Citizen Ticket`,
          message: `Category: ${category}\nReference Code / Report ID: ${referenceCode.trim()}\nStatus Inquiry: ${isStatusInquiry ? 'Yes' : 'No'}\n\nDescription:\n${description.trim()}`,
          recipient: recipientEmail
        })
      })

      if (!response.ok) {
        let errData
        try { errData = await response.json() } catch {}
        throw new Error(errData?.message || 'Failed to submit support ticket.')
      }

      setTicketReference(generatedTicketId)
      setDescription('')
      handleRemoveScreenshot()
    } catch (err) {
      setError(err.message || 'Unable to submit ticket. Please check your connection or contact SWMO.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.formCard}>
      <div className={styles.header}>
        <div className={styles.badge}>
          <ShieldCheck size={14} /> Citizen Helpdesk
        </div>
        <h2 className={styles.title}>Submit a Report Ticket or Status Inquiry</h2>
        <p className={styles.subtitle}>
          Directly follow up on your reported environmental incident with Pasig SWMO desk officers.
        </p>
      </div>

      {error && (
        <div className={styles.alertError} role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {ticketReference ? (
        <div className={styles.alertSuccess} role="status">
          <CheckCircle2 size={24} className="shrink-0" />
          <div>
            <h3 className="font-bold text-base mb-1">Ticket Submitted Successfully</h3>
            <p className="text-sm">
              Your inquiry has been recorded with ticket reference <strong>#{ticketReference}</strong> for report <strong>{referenceCode}</strong>. Desk ops will review your submission.
            </p>
            <button
              type="button"
              className="mt-3 text-sm font-semibold underline block"
              onClick={() => setTicketReference(null)}
            >
              Submit another inquiry
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.formRowTwo}>
            <div className={styles.field}>
              <label htmlFor="ticket-category" className={styles.label}>
                Category <span className={styles.required}>*</span>
              </label>
              <select
                id="ticket-category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  if (e.target.value === 'status_inquiry') setIsStatusInquiry(true)
                }}
                className={styles.select}
                required
              >
                <option value="status_inquiry">Status Inquiry (Check Cleanup Progress)</option>
                <option value="location_mismatch">Location or Landmark Correction</option>
                <option value="re_inspection">Re-inspection Request (Incomplete Cleanup)</option>
                <option value="hazard_escalation">Hazard Escalation (Obstructed Access)</option>
                <option value="other">Other Inquiry</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="ticket-reference" className={styles.label}>
                Reference Code / Report ID <span className={styles.required}>*</span>
              </label>
              <input
                id="ticket-reference"
                type="text"
                placeholder="e.g. rep-948271 or UUID"
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value)}
                className={styles.input}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="ticket-email" className={styles.label}>
              Your Email Address (for response dispatch) <span className={styles.required}>*</span>
            </label>
            <input
              id="ticket-email"
              type="email"
              placeholder="you@email.com"
              value={citizenEmail}
              onChange={(e) => setCitizenEmail(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          {/* Status Inquiry Toggle */}
          <div className={styles.statusInquiryToggle}>
            <input
              type="checkbox"
              id="ticket-status-inquiry"
              checked={isStatusInquiry}
              onChange={(e) => setIsStatusInquiry(e.target.checked)}
              className={styles.checkbox}
            />
            <div className={styles.toggleContent}>
              <label htmlFor="ticket-status-inquiry" className={styles.toggleTitle}>
                Priority Status Review Request
              </label>
              <span className={styles.toggleHint}>
                Check this if you are verifying whether field crew response has crossed SLA deadline or if site conditions changed.
              </span>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="ticket-description" className={styles.label}>
              Description of Concern or Inquiry <span className={styles.required}>*</span>
            </label>
            <textarea
              id="ticket-description"
              placeholder="Provide context about what changed, landmarks nearby, or details desk ops should verify..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textarea}
              required
            />
          </div>

          {/* Screenshot / Evidence File Upload */}
          <div className={styles.field}>
            <label className={styles.label}>Screenshot or Updated Evidence (Optional)</label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="ticket-screenshot"
            />

            {screenshotPreview ? (
              <div className={styles.filePreviewWrapper}>
                <img
                  src={screenshotPreview}
                  alt="Evidence preview"
                  className={styles.previewImg}
                />
                <button
                  type="button"
                  onClick={handleRemoveScreenshot}
                  className={styles.removeFileBtn}
                  aria-label="Remove photo"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                className={styles.fileDropZone}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click() }}
              >
                <UploadCloud size={24} className="text-primary" />
                <span className="text-xs font-semibold text-text-primary">
                  Click to attach photo or screenshot
                </span>
                <span className="text-xs text-text-muted">PNG, JPG, WebP up to 5MB</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Submitting Ticket...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Submit Ticket to SWMO</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
