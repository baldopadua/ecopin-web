'use client'
import { useId, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import Dialog from '@/components/ui/Dialog'
import { useUser } from '@/components/auth/UserContext'
import { fetchTicketQueue, replyToTicket } from '@/lib/api/support'
import { DASHBOARD_QUERY_KEY } from '@/lib/dashboard-query-client.mjs'
import { ticketCategoryLabel, ticketQueueFilters, ticketReplyStatuses, ticketStatusLabel } from '@/lib/support-tickets.mjs'
import styles from './SupportTicketQueue.module.css'

const QUERY_KEY = [...DASHBOARD_QUERY_KEY, 'support-tickets']
const formatDate = value => new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function ReplyDialog({ ticket, onClose, onSaved }) {
  const [reply, setReply] = useState(ticket.response ?? '')
  const [status, setStatus] = useState(ticket.status === 'open' ? 'in_progress' : ticket.status)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const titleId = useId(), replyId = useId(), statusId = useId()
  const submit = async event => {
    event.preventDefault()
    if (saving || !reply.trim()) return
    setSaving(true); setError(null)
    try {
      await replyToTicket(ticket.id, { response: reply.trim(), status })
      onSaved()
    } catch (err) {
      setError(err.message || 'The reply was not saved. Your text is still here; try again.')
      setSaving(false)
    }
  }
  return <Dialog open labelledBy={titleId} onClose={onClose} dismissible={!saving} className={styles.dialog}>
    <form onSubmit={submit} className={styles.replyForm}>
      <h2 id={titleId}>Reply to {ticket.reference}</h2>
      <p className={styles.quote}>{ticket.description}</p>
      <label htmlFor={replyId}>Reply shown to the citizen</label>
      <textarea id={replyId} rows={5} maxLength={2000} required disabled={saving} value={reply} onChange={event => setReply(event.target.value)} />
      <label htmlFor={statusId}>Ticket status after replying</label>
      <select id={statusId} disabled={saving} value={status} onChange={event => setStatus(event.target.value)}>
        {ticketReplyStatuses.map(value => <option key={value} value={value}>{ticketStatusLabel(value)}</option>)}
      </select>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving || !reply.trim()}>{saving ? 'Saving…' : 'Send reply'}</button>
      </div>
    </form>
  </Dialog>
}

export default function SupportTicketQueue() {
  const user = useUser()
  const client = useQueryClient()
  const [status, setStatus] = useState('open')
  const [replying, setReplying] = useState(null)
  const queue = useInfiniteQuery({
    queryKey: [...QUERY_KEY, status],
    queryFn: ({ pageParam, signal }) => fetchTicketQueue({ status, cursor: pageParam, signal }),
    initialPageParam: null,
    getNextPageParam: page => page.next_cursor ?? undefined,
    enabled: ['officer', 'admin'].includes(user?.role),
    staleTime: 0,
  })
  const tickets = queue.data?.pages.flatMap(page => page.tickets) ?? []
  const waiting = queue.data?.pages[0]?.open_count
  return <section className={styles.panel} aria-label="Citizen support tickets">
    <header className={styles.header}>
      <h2>Tickets {typeof waiting === 'number' && <span>({waiting} awaiting a reply)</span>}</h2>
      <button type="button" className="btn-secondary" onClick={() => queue.refetch()} disabled={queue.isFetching}>Refresh</button>
    </header>
    <p>Citizens open tickets from the EcoPin Android app and see your reply there. Tickets show their reference and request only; citizen identities are not shown.</p>
    <div className={styles.filters} role="group" aria-label="Ticket status">
      {ticketQueueFilters.map(value => <button key={value} type="button" aria-pressed={status === value}
        className={status === value ? 'btn-primary' : 'btn-secondary'} onClick={() => setStatus(value)}>{ticketStatusLabel(value)}</button>)}
    </div>
    {queue.isPending && <p role="status">Loading tickets…</p>}
    {queue.isError && <p role="alert">{tickets.length ? 'Tickets could not refresh. Previously loaded tickets remain shown.' : 'Tickets could not load.'} <button type="button" onClick={() => queue.refetch()}>Try again</button></p>}
    {!queue.isPending && !queue.isError && !tickets.length && <p>No {ticketStatusLabel(status).toLowerCase()} tickets.</p>}
    <ul className={styles.list}>
      {tickets.map(ticket => <li key={ticket.id} className={styles.ticket}>
        <div className={styles.header}>
          <h3>{ticket.reference} · {ticketCategoryLabel(ticket.category)}</h3>
          <span className={styles.status}>{ticketStatusLabel(ticket.status)}</span>
        </div>
        <p className={styles.meta}>Opened {formatDate(ticket.created_at)}{ticket.report_id && <> · Report <code>{ticket.report_id.slice(0, 8)}</code></>}</p>
        <p>{ticket.description}</p>
        {ticket.response && <p className={styles.reply}><strong>Reply{ticket.responded_at && ` (${formatDate(ticket.responded_at)})`}:</strong> {ticket.response}</p>}
        <div className={styles.actions}>
          <button type="button" className="btn-secondary" onClick={() => setReplying(ticket)}>{ticket.response ? 'Edit reply' : 'Reply'}</button>
        </div>
      </li>)}
    </ul>
    {queue.hasNextPage && <button type="button" className="btn-secondary" disabled={queue.isFetchingNextPage} onClick={() => queue.fetchNextPage()}>
      {queue.isFetchingNextPage ? 'Loading…' : 'Load more tickets'}
    </button>}
    {replying && <ReplyDialog key={replying.id} ticket={replying} onClose={() => setReplying(null)}
      onSaved={() => { setReplying(null); void client.invalidateQueries({ queryKey: QUERY_KEY }) }} />}
  </section>
}
