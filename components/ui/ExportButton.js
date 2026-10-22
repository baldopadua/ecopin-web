'use client'
import React from 'react'
import { Download } from 'lucide-react'

export default function ExportButton({ data, filename = 'export.csv', className = '' }) {
  const handleExport = () => {
    if (!data || data.length === 0) return

    // Get headers
    const headers = Object.keys(data[0])
    
    // Convert data to CSV format
    const csvRows = []
    csvRows.push(headers.join(',')) // Add headers
    
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header]
        // Handle strings with commas, quotes, or newlines
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`
        }
        // Handle objects (like profiles, reports) by stringifying or extracting key parts
        if (val && typeof val === 'object') {
           return `"${JSON.stringify(val).replace(/"/g, '""')}"`
        }
        return val !== null && val !== undefined ? val : ''
      })
      csvRows.push(values.join(','))
    }
    
    const csvString = csvRows.join('\n')
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={!data || data.length === 0}
      className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-full border border-border bg-surface-elevated text-text-primary text-sm font-medium hover:bg-surface hover:border-primary/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-link)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Download className="w-4 h-4 text-text-secondary" />
      <span>Export CSV</span>
    </button>
  )
}
