'use client'
import {useParams} from 'next/navigation'
import {RequireRole} from '@/components/auth/RequireRole'
import IncidentCaseRecord from '@/components/reports/IncidentCaseRecord'
export default function PrintIncidentPage(){const {id}=useParams();return <RequireRole allowedRole={['officer','admin']}><IncidentCaseRecord reportId={id} /></RequireRole>}
