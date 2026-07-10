export default function PageHeader({ title, subtitle, breadcrumbs }) {
  return (
    <div className="mb-4">
      {breadcrumbs && (
        <nav className="flex text-sm text-text-secondary mb-1">
          {breadcrumbs.map((crumb, index) => (
            <span key={index}>
              {index > 0 && <span className="mx-2">/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-accent-green transition-colors">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-text-primary font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <h1 className="text-2xl font-bold text-text-primary mb-1">{title}</h1>
      {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
    </div>
  )
}
