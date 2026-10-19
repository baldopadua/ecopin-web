import Link from 'next/link'
import styles from './PageHeader.module.css'

export default function PageHeader({ title, titleAccent, subtitle, breadcrumbs, children, className = '' }) {
  return (
    <header className={`${styles.header} ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true">/</span>}
              {crumb.href ? (
                <Link href={crumb.href}>
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-text-primary">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className={styles.row}>
        <div className={styles.copy}>
          <h1 className={styles.title}>
            {title}
            {titleAccent && <span className={styles.accent}>{titleAccent}</span>}
          </h1>
          {subtitle && (
            <p className={styles.subtitle}>
              {subtitle}
            </p>
          )}
        </div>
        {children && <div className={styles.actions}>{children}</div>}
      </div>
    </header>
  )
}
