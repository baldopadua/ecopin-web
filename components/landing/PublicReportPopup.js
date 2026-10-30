import Link from 'next/link'
import ResponseDeadline from '@/components/ui/ResponseDeadline'
import { ArrowUpRight, MapPin } from 'lucide-react'
import { formatReportAddress } from '@/lib/format-location.mjs'
import styles from './LandingPage.module.css'

const types = { waste: 'Waste', flooding: 'Flooding', pollution: 'Pollution', infrastructure: 'Infrastructure', illegal_logging: 'Illegal logging', others: 'Other concerns' }

export default function PublicReportPopup({ report, onOpen, compact }) {
  const address = formatReportAddress(report)
  const status = (report.status || 'Under review').replaceAll('_', ' ')

  // Landing dots get a tiny summary; the full map keeps the detailed popup.
  if (compact) return <div className={styles.reportPopupCompact}>
    <span>{types[report.issue_type] || 'Environmental concern'} · {status}</span>
    <strong>{report.title || 'Reported environmental concern'}</strong>
    {address && <small title={address}>{address}</small>}
    <Link className={styles.popupAction} href={`/explore?report=${encodeURIComponent(report.id)}`}>View on full map <ArrowUpRight size={13} /></Link>
  </div>

  return <div className={styles.reportPopup}>
    <span>{types[report.issue_type] || 'Environmental concern'}</span>
    <strong>{report.title || 'Reported environmental concern'}</strong>
    {address && (
      <div className={styles.popupLocation} title={address}>
        <MapPin size={13} />
        <span>{address}</span>
      </div>
    )}
    <p>{report.description || 'Open the report for more details.'}</p>
    <small>Status: {(report.status || 'Under review').replaceAll('_', ' ')}</small>
    <ResponseDeadline report={report} />
    {onOpen ? <button type="button" className={styles.popupAction} onClick={onOpen}>View report <ArrowUpRight size={14} /></button> : <Link className={styles.popupAction} href={`/explore?report=${encodeURIComponent(report.id)}`}>Explore full map <ArrowUpRight size={14} /></Link>}
  </div>
}
