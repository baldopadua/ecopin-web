'use client'

/**
 * Universal Pagination component
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  itemsPerPage = 8,
  totalItems = 0,
  showItemsInfo = true,
  className = ''
}) {
  const getVisiblePages = () => {
    const pages = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        pages.push(currentPage - 1)
        pages.push(currentPage)
        pages.push(currentPage + 1)
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange?.(page)
    }
  }

  const getStartIndex = () => {
    return (currentPage - 1) * itemsPerPage + 1
  }

  const getEndIndex = () => {
    return Math.min(currentPage * itemsPerPage, totalItems)
  }

  if (totalPages <= 1) return null

  return (
    <nav aria-label="Results pages" className={`flex flex-wrap items-center justify-between gap-4 ${className}`}>
      {/* Items Info */}
      {showItemsInfo && totalItems > 0 && (
        <div role="status" className="text-sm text-text-secondary">
          Showing {getStartIndex()}–{getEndIndex()} of {totalItems}
        </div>
      )}

      {/* Page Navigation */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="btn-secondary min-w-11 disabled:opacity-50"
        >
          Prev
        </button>

        {getVisiblePages().map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-3 py-1 text-text-muted">
              ...
            </span>
          ) : (
            <button
              key={page}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
              onClick={() => handlePageChange(page)}
              className={`min-h-11 min-w-11 rounded-xl border border-border transition-colors ${
                currentPage === page
                  ? 'bg-primary text-white border-primary'
                  : 'hover:bg-surface-elevated'
              }`}
            >
              {page}
            </button>
          )
        ))}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className="btn-secondary min-w-11 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </nav>
  )
}
