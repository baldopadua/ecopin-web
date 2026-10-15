import { useEffect, useRef, useState } from 'react'
import { fetchBatchReportEvidence } from '@/lib/api/reports'

export default function useMapPhotoEvidence(reports, enabled) {
  const [photos, setPhotos] = useState({})
  const loaded = useRef(new Set())
  const idsKey = JSON.stringify(enabled ? [...new Set(reports.filter(report => report.location_precision === 'exact').map(report => report.id).filter(Boolean))].sort() : [])
  useEffect(() => {
    const pending = JSON.parse(idsKey).filter(id => !loaded.current.has(id))
    if (!pending.length) return
    const controller = new AbortController()
    const load = async () => {
      for (let offset = 0; offset < pending.length; offset += 32) {
        const ids = pending.slice(offset, offset + 32)
        try {
          const result = await fetchBatchReportEvidence(ids, controller.signal, { throwOnError: true })
          if (controller.signal.aborted) return
          const received = {}
          for (const id of ids) {
            loaded.current.add(id)
            const photo = (result[id] || []).find(item => !item.resource_type || item.resource_type === 'image')
            received[id] = photo?.photo_url || photo?.file_url || photo?.url || null
          }
          setPhotos(previous => ({ ...previous, ...received }))
        } catch { return }
      }
    }
    void load()
    return () => controller.abort()
  }, [idsKey])
  return photos
}
