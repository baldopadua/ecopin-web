import Link from 'next/link'

export default function PageHeader({ title, titleAccent, subtitle, breadcrumbs, children }) {
  return (
    <div className="sticky top-0 z-[40] bg-surface -mx-8 -mt-8 px-8 pt-8 pb-4 mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-text-muted mb-4">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-accent-green">/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-accent-green hover:underline transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-text-primary">{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-text-primary mb-2">
            {title}
            {titleAccent && <span className="text-accent-green ml-2">{titleAccent}</span>}
          </h1>
          {subtitle && (
            <p className="text-sm text-text-muted">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
