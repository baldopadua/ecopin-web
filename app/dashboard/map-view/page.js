'use client'
import dynamic from 'next/dynamic'
import PageHeader from '@/components/layout/PageHeader'

const EcoPinMap = dynamic(
  () => import('@/components/map/EcoPinMap'),
  { ssr: false, loading: () => <div className="h-screen w-full bg-background" /> }
)

export default function MapViewPage() {
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
        <EcoPinMap />
      </div>
    </div>
  )
}
