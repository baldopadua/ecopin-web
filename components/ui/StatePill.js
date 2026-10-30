import styles from './StatePill.module.css'

// Written status first; the dot only reinforces it. tone: success | warning | error | info | neutral.
export default function StatePill({ tone = 'neutral', children, className = '', ...props }) {
  return <span className={`${styles.pill} ${styles[tone]} ${className}`} {...props}>{children}</span>
}
