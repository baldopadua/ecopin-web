'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronDown, X, HelpCircle } from 'lucide-react'
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
    answer: 'If the report is still in pending review, you can open a Location Correction ticket from the Help screen in the EcoPin Android app and link it to your report. Alternatively, you can withdraw the report in the mobile app and re-submit with the pin dragged to the exact landmark.'
  },
  {
    id: 'status-meaning',
    category: 'status',
    question: 'What do the different report statuses mean?',
    answer: 'Each report shows one of these statuses.',
    terms: [
      ['Unresolved', 'The incident is verified and queued for dispatch.'],
      ['In progress', 'An SWMO field crew has been assigned and is responding or on site.'],
      ['Resolved', 'The crew submitted cleanup after-photos.'],
      ['Closed', 'Final sign-off is complete.']
    ]
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
  { id: 'all', label: 'All questions' },
  { id: 'reports', label: 'Reporting and GPS' },
  { id: 'status', label: 'Status and verification' },
  { id: 'citizen', label: 'Citizen trust' },
  { id: 'emergency', label: 'Emergency guidance' }
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
      <label htmlFor="faq-search" className={styles.searchLabel}>Search questions</label>
      <div className={styles.searchBarWrapper}>
        <Search size={18} className={styles.searchIcon} aria-hidden="true" />
        <input
          id="faq-search"
          type="search"
          className={styles.searchInput}
          placeholder="Try “status”, “photos” or “GPS”"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className={styles.categoryPills} role="group" aria-label="FAQ categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            aria-pressed={activeCategory === cat.id}
            className={`${styles.categoryPill} ${activeCategory === cat.id ? styles.categoryPillActive : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <p className={styles.resultCount} role="status">
        {filteredItems.length === 1 ? '1 answer' : `${filteredItems.length} answers`}
      </p>

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
                    aria-hidden="true"
                    className={`${styles.chevronIcon} ${isOpen ? styles.chevronOpen : ''}`}
                  />
                </button>
                {isOpen && (
                  <div
                    id={`faq-answer-${item.id}`}
                    role="region"
                    aria-label={item.question}
                    className={styles.accordionContent}
                  >
                    <p>{item.answer}</p>
                    {item.terms && (
                      <dl className={styles.termList}>
                        {item.terms.map(([term, meaning]) => (
                          <div key={term}>
                            <dt>{term}</dt>
                            <dd>{meaning}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <HelpCircle size={32} className={styles.emptyIcon} aria-hidden="true" />
          <p className={styles.emptyTitle}>No answers match your search</p>
          <p>Try a different keyword, or open a support ticket from the Help screen in the EcoPin Android app.</p>
          <button
            type="button"
            className={styles.resetButton}
            onClick={() => { setSearchQuery(''); setActiveCategory('all') }}
          >
            Clear search and filters
          </button>
        </div>
      )}
    </div>
  )
}
