'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronDown, X, HelpCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import styles from './SearchableFAQ.module.css'

const FAQ_ITEMS = [
  {
    id: 'report-timeline',
    category: 'reports',
    question: 'How long does it take for a reported issue to be cleaned or resolved?',
    answer: 'Once you submit a report through the EcoPin Android app, it undergoes validation by city desk ops. Approved reports are assigned an SLA countdown deadline and dispatched to the nearest SWMO field crew squad. Most standard waste cleanups are resolved within 24 to 48 hours.'
  },
  {
    id: 'report-not-appearing',
    category: 'reports',
    question: 'Why is my newly submitted report not visible on the public map immediately?',
    answer: 'To protect privacy and prevent duplicate spam, citizen reports undergo an automated and manual verification step before publication. Once confirmed as a valid environmental concern in Pasig, the pin becomes visible to the public.'
  },
  {
    id: 'report-wrong-location',
    category: 'reports',
    question: 'Can I edit or update the location if my GPS placed the pin on the wrong street?',
    answer: 'If the report is still in pending review, you can submit a Status Inquiry or Report Correction ticket below with your Reference Code. Alternatively, you can withdraw the report in the mobile app and re-submit with the pin dragged to the exact landmark.'
  },
  {
    id: 'status-meaning',
    category: 'status',
    question: 'What do the different report statuses mean?',
    answer: 'Unresolved: Incident verified and queued for dispatch. In Progress: An SWMO field crew has been assigned and is actively responding or on-site. Resolved: Crew submitted verifiable cleanup after-photos. Closed: Final sign-off completed.'
  },
  {
    id: 'evidence-photos',
    category: 'reports',
    question: 'What kind of photos should I take for the fastest verification?',
    answer: 'Take clear, well-lit photos showing both the hazard (such as overflowing garbage, flood debris, or obstructed drains) and a recognizable street landmark or corner. Avoid taking photos while moving in a vehicle to ensure proper geotag accuracy.'
  },
  {
    id: 'trust-score',
    category: 'citizen',
    question: 'What is the Citizen Trust Score and how do I earn it?',
    answer: 'The EcoPin Trust Score reflects verified, helpful reports submitted over time. Higher trust scores allow faster automatic approval and prioritization of your reports during monsoon and heavy rainfall alerts.'
  },
  {
    id: 'private-property',
    category: 'status',
    question: 'What happens if a waste hazard is on private property or a gated compound?',
    answer: 'City crews can only clean public roads, waterways, and public easements. If waste is located inside private property, SWMO coordinates with the barangay and property owner for formal clearance or sanitation compliance.'
  },
  {
    id: 'emergency-hotline',
    category: 'emergency',
    question: 'Should I report immediate dangers or live fallen wires on EcoPin?',
    answer: 'No. For immediate life-safety emergencies, collapsed live electrical wires, or active severe flooding, call the 24/7 Pasig City Emergency Hotline at (02) 8643-0000 or dial 161 directly.'
  }
]

const CATEGORIES = [
  { id: 'all', label: 'All Questions' },
  { id: 'reports', label: 'Reporting & GPS' },
  { id: 'status', label: 'Status & Verification' },
  { id: 'citizen', label: 'Citizen Trust' },
  { id: 'emergency', label: 'Emergency Guidance' }
]

export default function SearchableFAQ({ onSelectReferenceHelp }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [expandedId, setExpandedId] = useState(FAQ_ITEMS[0].id)

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return FAQ_ITEMS.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory
      const matchesQuery = !query || 
        item.question.toLowerCase().includes(query) || 
        item.answer.toLowerCase().includes(query)
      return matchesCategory && matchesQuery
    })
  }, [searchQuery, activeCategory])

  const toggleAccordion = (id) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return (
    <div className={styles.faqSection}>
      {/* Search Input Bar */}
      <div className={styles.searchBarWrapper}>
        <Search size={18} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search questions (e.g. status, cleanup time, GPS location, trust score)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search FAQ"
        />
        {searchQuery && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Category Pills */}
      <div className={styles.categoryPills} role="tablist" aria-label="FAQ categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={activeCategory === cat.id}
            className={`${styles.categoryPill} ${activeCategory === cat.id ? styles.categoryPillActive : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Accordion Items List */}
      {filteredItems.length > 0 ? (
        <div className={styles.accordionList}>
          {filteredItems.map(item => {
            const isOpen = expandedId === item.id
            return (
              <div
                key={item.id}
                className={`${styles.accordionItem} ${isOpen ? styles.accordionItemOpen : ''}`}
              >
                <button
                  type="button"
                  className={styles.accordionHeader}
                  onClick={() => toggleAccordion(item.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${item.id}`}
                >
                  <span className={styles.questionText}>{item.question}</span>
                  <ChevronDown
                    size={18}
                    className={`${styles.chevronIcon} ${isOpen ? styles.chevronOpen : ''}`}
                  />
                </button>
                {isOpen && (
                  <div
                    id={`faq-answer-${item.id}`}
                    className={styles.accordionContent}
                  >
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <HelpCircle size={32} className={styles.emptyIcon} />
          <h3>No matching answers found</h3>
          <p>Try searching for a different keyword or submit a ticket to the support team below.</p>
        </div>
      )}
    </div>
  )
}
