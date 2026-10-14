import Link from 'next/link'

export default function PageHeader({ title, titleAccent, subtitle, breadcrumbs, children }) {
  return (
    <header className="relative bg-surface mb-6 pb-4 border-b border-border">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-text-secondary mb-4">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-accent-green">/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-accent-green hover:underline transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-text-primary">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-text-primary mb-2 break-words">
            {title}
            {titleAccent && <span className="text-accent-green ml-2">{titleAccent}</span>}
          </h1>
          {subtitle && (
            <p className="text-sm leading-relaxed text-text-secondary max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
    </header>
  )
}
