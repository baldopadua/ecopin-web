'use client'

import { useState } from 'react'
import { Send, Check, Loader2 } from 'lucide-react'
import { reportDiagnostic } from '@/lib/diagnostics.mjs'
import PublicSelect from '@/components/ui/PublicSelect'
import styles from './LandingPage.module.css'

export default function FooterContactForm({ cms }) {
  const [emailForm, setEmailForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    recipient: 'support'
  })
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState(null)
  const [emailSuccess, setEmailSuccess] = useState(null)

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    const recipient = emailForm.recipient === 'office' ? cms.contact_office_email : (cms.contact_support_email || cms.contact_office_email)
    if (!recipient) {
      setEmailError('Contact messaging is currently unavailable. Please use the office phone number.')
      return
    }
    setEmailSending(true)
    setEmailError(null)

    try {
      const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4002'

      const response = await fetch(`${API_BASE}/api/contact/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: emailForm.name,
          email: emailForm.email || 'no-reply@ecopin.com',
          subject: emailForm.subject,
          message: emailForm.message,
          recipient
        })
      })

      let data
      try {
        data = await response.json()
      } catch {
        data = { message: 'Server error. Please try again.' }
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message')
      }

      setEmailSuccess("Message emailed to SWMO/EcoPin. This is an email inquiry, not a support ticket, so it will not appear in the app's Support tickets. To track a reply there, open a ticket from the Help screen in the EcoPin Android app.")
      setEmailSent(true)
      setEmailForm({
        name: '',
        email: '',
        subject: '',
        message: '',
        recipient: 'support'
      })

      setTimeout(() => {
        setEmailSuccess(null)
        setEmailSent(false)
      }, 12000)
    } catch (error) {
      reportDiagnostic('error', 'contact', 'Contact form failed', error)

      let errorMessage = 'Failed to send message. Please try again or email us directly.'
      if (error.message === 'Failed to fetch') {
        errorMessage = 'Unable to connect to server. Please email us directly at ' + recipient
      }

      setEmailError(errorMessage)
    } finally {
      setEmailSending(false)
    }
  }

  const handleEmailChange = (e) => {
    setEmailForm({ ...emailForm, [e.target.name]: e.target.value })
  }

  return (
          <div className={styles.footerColForm}>
            <div className={styles.contactFormCard}>
              <div className={styles.contactFormHeader}>
                <h2 id="message-heading" className={styles.contactFormTitle}>Send us a message</h2>
                <p className={styles.contactFormSubtitle}>General questions by email. For your own report, open a support ticket in the Android app.</p>
              </div>

              {emailError && (
                <div className={styles.formErrorAlert} role="alert">
                  {emailError}
                </div>
              )}
              {emailSuccess && (
                <div className={styles.formSuccessAlert} role="status">
                  {emailSuccess}
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className={styles.footerForm}>
                <PublicSelect
                  id="contact-recipient"
                  label="Send to"
                  value={emailForm.recipient}
                  onChange={recipient => setEmailForm(form => ({ ...form, recipient }))}
                  options={[{ value: 'support', label: 'EcoPin support' }, ...(cms.contact_office_email ? [{ value: 'office', label: 'SWMO office' }] : [])]}
                  className={styles.formFieldCompact}
                />
                <div className={styles.formRowTwo}>
                  <div className={styles.formFieldCompact}>
                    <label htmlFor="contact-name" className={styles.formLabelCompact}>Name</label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      value={emailForm.name}
                      onChange={handleEmailChange}
                      className={styles.formInputCompact}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className={styles.formFieldCompact}>
                    <label htmlFor="contact-email" className={styles.formLabelCompact}>Email</label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      value={emailForm.email}
                      onChange={handleEmailChange}
                      className={styles.formInputCompact}
                      placeholder="name@email.com"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formFieldCompact}>
                  <label htmlFor="contact-subject" className={styles.formLabelCompact}>Subject</label>
                  <input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    value={emailForm.subject}
                    onChange={handleEmailChange}
                    className={styles.formInputCompact}
                    placeholder="What is this about?"
                    required
                  />
                </div>

                <div className={styles.formFieldCompact}>
                  <label htmlFor="contact-message" className={styles.formLabelCompact}>Message</label>
                  <textarea
                    id="contact-message"
                    name="message"
                    value={emailForm.message}
                    onChange={handleEmailChange}
                    className={styles.formTextareaCompact}
                    placeholder="How can we help?"
                    rows={3}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className={styles.footerSubmitBtn}
                  disabled={emailSending}
                >
                  {emailSending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : emailSent ? (
                    <>
                      <Check size={16} />
                      <span>Message Sent!</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
  )
}
