import { AlertCircle, Clock3, Check, MessageSquare, LockKeyhole, CheckCheck, HelpCircle } from 'lucide-react'

export const REPORT_PIN_STATUSES = {
  unresolved: { label: 'Unresolved', tone: 'error', Icon: AlertCircle },
  in_progress: { label: 'In progress', tone: 'warning', Icon: Clock3 },
  resolved: { label: 'Resolved', tone: 'success', Icon: Check },
  waiting_for_feedback: { label: 'Waiting for feedback', tone: 'info', Icon: MessageSquare },
  pending_owner_consent: { label: 'Pending owner consent', tone: 'info', Icon: LockKeyhole },
  closed: { label: 'Closed', tone: 'muted', Icon: CheckCheck },
}

export const UNKNOWN_PIN_STATUS = { label: 'Status unavailable', tone: 'muted', Icon: HelpCircle }
