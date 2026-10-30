import styles from './Skeleton.module.css'

export function SkeletonLine({ className = '', shimmer = true }) {
  return (
    <div className={`rounded-xl ${styles.skeletonBase} ${shimmer ? styles.shimmer : ''} ${className}`} />
  )
}

export function SkeletonCard({ className = '', shimmer = true }) {
  return (
    <div className={`bg-surface-elevated border border-border rounded-xl p-6 relative overflow-hidden ${className}`}>
      <SkeletonLine className="h-4 w-1/3 mb-3" shimmer={shimmer} />
      <SkeletonLine className="h-3 w-2/3 mb-2" shimmer={shimmer} />
      <SkeletonLine className="h-3 w-1/2" shimmer={shimmer} />
    </div>
  )
}

export function SkeletonStatCard({ className = '', shimmer = true }) {
  return (
    <div className={`bg-surface-elevated border border-border rounded-xl p-6 relative overflow-hidden ${className}`}>
      <SkeletonLine className="h-3 w-1/2 mb-3" shimmer={shimmer} />
      <SkeletonLine className="h-8 w-1/3 mb-2" shimmer={shimmer} />
      <SkeletonLine className="h-3 w-2/5" shimmer={shimmer} />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 5, className = '', shimmer = true }) {
  return (
    <div className={`bg-surface-elevated border border-border rounded-xl p-6 relative overflow-hidden ${className}`}>
      <div className="space-y-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <SkeletonLine key={`h-${i}`} className="h-4 flex-1" shimmer={shimmer} />
          ))}
        </div>
        <div className="border-t border-border/30" />
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex gap-4">
            {Array.from({ length: cols }).map((_, col) => (
              <SkeletonLine key={`c-${row}-${col}`} className="h-3 flex-1" shimmer={shimmer} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonPageHeader({ shimmer = true }) {
  return (
    <div className="mb-8">
      <SkeletonLine className="h-8 w-1/4 mb-2" shimmer={shimmer} />
      <SkeletonLine className="h-4 w-1/3" shimmer={shimmer} />
    </div>
  )
}

export function SkeletonChartCard({ className = '', shimmer = true }) {
  return (
    <div className={`bg-surface-elevated border border-border rounded-xl p-6 relative overflow-hidden ${className}`}>
      <SkeletonLine className="h-4 w-1/3 mb-4" shimmer={shimmer} />
      <SkeletonLine className="h-48 w-full rounded-xl" shimmer={shimmer} />
    </div>
  )
}

export function SkeletonForm({ fields = 4, className = '', shimmer = true }) {
  return (
    <div className={`bg-surface-elevated border border-border rounded-xl p-6 relative overflow-hidden ${className}`}>
      <SkeletonLine className="h-6 w-1/4 mb-6" shimmer={shimmer} />
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <SkeletonLine className="h-3 w-1/6 mb-2" shimmer={shimmer} />
            <SkeletonLine className="h-10 w-full rounded-xl" shimmer={shimmer} />
          </div>
        ))}
        <SkeletonLine className="h-10 w-1/4 rounded-xl" shimmer={shimmer} />
      </div>
    </div>
  )
}

export function ColdStartWorkspaceSkeleton() {
  return (
    <div className={styles.coldStartContainer} aria-busy="true" aria-label="Authenticating EcoPin workspace">
      <div className={styles.coldStartTopBar}>
        <div className="flex items-center gap-3">
          <SkeletonLine className="w-8 h-8 rounded-lg" />
          <SkeletonLine className="w-28 h-6" />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonLine className="w-20 h-8 rounded-full" />
          <SkeletonLine className="w-8 h-8 rounded-full" />
        </div>
      </div>
      <div className={styles.coldStartBody}>
        <aside className={styles.coldStartSidebar}>
          <div className="space-y-3 mb-6">
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="h-3 w-36" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
                <SkeletonLine className="w-5 h-5 rounded-lg" />
                <SkeletonLine className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </aside>
        <main className={styles.coldStartMain}>
          <div className="space-y-2">
            <SkeletonLine className="h-8 w-64" />
            <SkeletonLine className="h-4 w-96 max-w-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SkeletonChartCard />
            </div>
            <div>
              <SkeletonCard />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
