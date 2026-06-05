'use client'
import dynamic from 'next/dynamic'

const EcoPinMap = dynamic(
  () => import('@/components/map/EcoPinMap'),
  { ssr: false, loading: () => <div className="h-screen w-full bg-background" /> }
)

export default function MapViewPage() {
  return (
    <div className="h-screen w-full">
      <EcoPinMap />
    </div>
  )
}
