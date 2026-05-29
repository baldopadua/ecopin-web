'use client'
import dynamic from 'next/dynamic'

const EcoPinMap = dynamic(
  () => import('@/components/map/EcoPinMap'),
  { ssr: false, loading: () => <p>Loading map...</p> }
)

export default function MapPage() {
  return <EcoPinMap />
}