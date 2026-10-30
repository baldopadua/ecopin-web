import { rateLimitedFetch } from '../rateLimiter.js'
import { handleResponse } from './optimization.js'
import { ticketQueueQuery } from '../support-tickets.mjs'

const base = () => process.env.NEXT_PUBLIC_BACKEND_API_URL

export async function fetchTicketQueue({ status = 'open', cursor = null, signal } = {}) {
  const response = await rateLimitedFetch(`${base()}/api/support/queue?${ticketQueueQuery({ status, cursor })}`, {
    signal, cache: 'no-store', headers: { 'Content-Type': 'application/json' },
  })
  return handleResponse(response, 'Failed to load support tickets')
}

export async function replyToTicket(id, payload, { signal } = {}) {
  const response = await rateLimitedFetch(`${base()}/api/support/queue/${encodeURIComponent(id)}/respond`, {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  return handleResponse(response, 'Failed to save the ticket reply')
}
