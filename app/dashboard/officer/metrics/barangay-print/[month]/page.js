'use client'
import {useParams} from 'next/navigation'
import {RequireRole} from '@/components/auth/RequireRole'
import BarangayExecutiveReport from '@/components/analytics/BarangayExecutiveReport'
export default function ExecutiveReportPage(){const {month}=useParams();return <RequireRole allowedRoles={['officer','admin']}><BarangayExecutiveReport month={month} /></RequireRole>}
