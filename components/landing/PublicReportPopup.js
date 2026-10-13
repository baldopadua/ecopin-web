import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import styles from './LandingPage.module.css'

const types = { waste: 'Waste', flooding: 'Flooding', pollution: 'Pollution', infrastructure: 'Infrastructure', illegal_logging: 'Illegal logging', others: 'Other concerns' }

export default function PublicReportPopup({ report, illustration = false, onOpen }) {
  return <div className={styles.reportPopup}>
    <span>{types[report.issue_type] || 'Environmental concern'}</span>
    <strong>{report.title || 'Reported environmental concern'}</strong>
    <p>{report.description || 'Open the report for more details.'}</p>
    <small>Status: {(report.status || 'Under review').replaceAll('_', ' ')}</small>
    {illustration && <small>Photo: category illustration</small>}
    {onOpen ? <button type="button" className={styles.popupAction} onClick={onOpen}>View report <ArrowUpRight size={14} /></button> : <Link className={styles.popupAction} href={`/explore?report=${encodeURIComponent(report.id)}`}>Explore full map <ArrowUpRight size={14} /></Link>}
  </div>
}
