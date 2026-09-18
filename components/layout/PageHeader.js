export default function PageHeader({ title, titleAccent, subtitle, breadcrumbs, children }) {
  return (
    <div className="sticky top-0 z-10 bg-surface dark:bg-[#0a0f08] -mx-8 -mt-8 px-8 pt-8 pb-4 border-b border-border/50 mb-4">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span>/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-text-primary transition-colors">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-text-primary">{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">
            {title}
            {titleAccent && <span className="text-accent-green">{titleAccent}</span>}
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
