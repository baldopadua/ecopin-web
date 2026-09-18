'use client'

export function SkeletonLine({ className = '' }) {
  return (
    <div className={`animate-pulse rounded bg-border/50 ${className}`} />
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`card animate-pulse ${className}`}>
      <SkeletonLine className="h-4 w-1/3 mb-3" />
      <SkeletonLine className="h-3 w-2/3 mb-2" />
      <SkeletonLine className="h-3 w-1/2" />
    </div>
  )
}

export function SkeletonStatCard({ className = '' }) {
  return (
    <div className={`card animate-pulse ${className}`}>
      <SkeletonLine className="h-3 w-1/2 mb-3" />
      <SkeletonLine className="h-8 w-1/3 mb-2" />
      <SkeletonLine className="h-3 w-2/5" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 5, className = '' }) {
  return (
    <div className={`card animate-pulse ${className}`}>
      <div className="space-y-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <SkeletonLine key={`h-${i}`} className="h-4 flex-1" />
          ))}
        </div>
        <div className="border-t border-border/30" />
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex gap-4">
            {Array.from({ length: cols }).map((_, col) => (
              <SkeletonLine key={`c-${row}-${col}`} className="h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonPageHeader() {
  return (
    <div className="mb-8 animate-pulse">
      <SkeletonLine className="h-8 w-1/4 mb-2" />
      <SkeletonLine className="h-4 w-1/3" />
    </div>
  )
}

export function SkeletonChartCard({ className = '' }) {
  return (
    <div className={`card animate-pulse ${className}`}>
      <SkeletonLine className="h-4 w-1/3 mb-4" />
      <SkeletonLine className="h-48 w-full rounded-lg" />
    </div>
  )
}

export function SkeletonForm({ fields = 4, className = '' }) {
  return (
    <div className={`card animate-pulse ${className}`}>
      <SkeletonLine className="h-6 w-1/4 mb-6" />
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <SkeletonLine className="h-3 w-1/6 mb-2" />
            <SkeletonLine className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <SkeletonLine className="h-10 w-1/4 rounded-lg" />
      </div>
    </div>
  )
}
