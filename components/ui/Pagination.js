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
      onPageChange(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
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
    <div className={`flex items-center justify-between ${className}`}>
      {/* Items Info */}
      {showItemsInfo && totalItems > 0 && (
        <div className="text-sm font-mono tracking-widest text-text-secondary">
          SHOWING {getStartIndex()} TO {getEndIndex()} OF {totalItems}
        </div>
      )}

      {/* Page Navigation */}
      <div className="flex items-center gap-2 font-mono uppercase tracking-widest">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="border-2 border-border px-3 py-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              onClick={() => handlePageChange(page)}
              className={`px-3 py-1 border-2 border-border transition-colors ${
                currentPage === page
                  ? 'bg-black text-white dark:bg-accent-green dark:text-black dark:border-accent-green'
                  : 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
              }`}
            >
              {page}
            </button>
          )
        ))}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="border-2 border-border px-3 py-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}