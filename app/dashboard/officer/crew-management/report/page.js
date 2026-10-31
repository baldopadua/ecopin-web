import {OfficerGuard} from '@/components/auth/RequireRole'
import CrewPerformanceReport from '@/components/reports/CrewPerformanceReport'
export const metadata={title:'Crew performance report | EcoPin'}
export default function CrewPerformanceReportPage(){return <OfficerGuard><CrewPerformanceReport/></OfficerGuard>}
