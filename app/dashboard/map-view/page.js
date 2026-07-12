'use client'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'

const EcoPinMap = dynamic(
  () => import('@/components/map/EcoPinMap'),
  { ssr: false, loading: () => <div className="h-screen w-full bg-background" /> }
)

export default function MapViewPage() {
  const searchParams = useSearchParams()
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const id = searchParams.get('id')
  const validationStatus = searchParams.get('validationStatus')
  const status = searchParams.get('status')

  return (
    <div className="h-screen flex flex-col">
      <div className="p-8 pb-0">
        <PageHeader 
          title="Map View"
          subtitle="View validated environmental reports on the map"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Map View' }
          ]}
        />
      </div>
      <div className="flex-1">
        <EcoPinMap 
          centerLat={lat ? parseFloat(lat) : null} 
          centerLng={lng ? parseFloat(lng) : null} 
          focusReportId={id} 
          initialValidationStatus={validationStatus}
          initialStatus={status}
        />
      </div>
    </div>
  )
}
