import { useEffect, useRef, useState } from 'react'
import { fetchBatchReportEvidence } from '@/lib/api/reports'

export default function useMapPhotoEvidence(reports, enabled) {
  const [photos, setPhotos] = useState({})
  const loaded = useRef(new Set())
  const eligibleReports = reports.filter(report => report.location_precision !== 'approximate')
  const idsKey = JSON.stringify(enabled ? [...new Set(eligibleReports.map(report => report.id).filter(Boolean))].sort() : [])
  
  console.log('[useMapPhotoEvidence] enabled:', enabled, 'reports count:', reports.length, 'idsKey:', idsKey.substring(0, 100))
  
  useEffect(() => {
    const pending = JSON.parse(idsKey).filter(id => !loaded.current.has(id))
    console.log('[useMapPhotoEvidence] pending IDs:', pending.length, pending.slice(0, 5))
    if (!pending.length) return
    const controller = new AbortController()
    const load = async () => {
      for (let offset = 0; offset < pending.length; offset += 32) {
        const ids = pending.slice(offset, offset + 32)
        console.log('[useMapPhotoEvidence] Fetching batch for IDs:', ids.length)
        try {
          const result = await fetchBatchReportEvidence(ids, controller.signal, { throwOnError: true })
          console.log('[useMapPhotoEvidence] Batch result keys:', Object.keys(result || {}))
          if (controller.signal.aborted) return
          const received = {}
          for (const id of ids) {
            loaded.current.add(id)
            const photo = (result[id] || []).find(item => !item.resource_type || item.resource_type === 'image')
            received[id] = photo?.url || null
            console.log(`[useMapPhotoEvidence] Report ${id}:`, photo?.url ? 'has photo' : 'no photo', 'evidence count:', (result[id] || []).length)
          }
          setPhotos(previous => ({ ...previous, ...received }))
        } catch (error) {
          console.error('[useMapPhotoEvidence] Error fetching evidence:', error)
          return
        }
      }
    }
    void load()
    return () => controller.abort()
  }, [idsKey])
  return photos
}
