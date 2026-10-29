import {Suspense} from 'react'
import {RequireRole} from '@/components/auth/RequireRole'
import FieldCrewOperationsSummary from '@/components/reports/FieldCrewOperationsSummary'
export default function OperationsSummaryPage(){return <RequireRole allowedRoles={['officer','admin']}><Suspense fallback={<p>Loading operations summary…</p>}><FieldCrewOperationsSummary/></Suspense></RequireRole>}
