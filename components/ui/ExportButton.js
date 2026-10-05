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
      onClick={handleExport}
      disabled={!data || data.length === 0}
      className={`px-4 py-2 bg-transparent text-text-primary font-bold border border-border dark:border-[#333333] hover:bg-surface-elevated transition-colors flex items-center gap-2 ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <Download className="w-4 h-4" /> Export CSV
    </button>
  )
}
