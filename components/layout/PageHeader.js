export default function PageHeader({ title, subtitle, breadcrumbs }) {
  return (
    <div className="mb-8">
      {breadcrumbs && (
        <nav className="flex text-sm text-text-secondary mb-2">
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
      <h1 className="text-3xl font-bold text-text-primary mb-2">{title}</h1>
      {subtitle && <p className="text-text-secondary">{subtitle}</p>}
    </div>
  )
}
