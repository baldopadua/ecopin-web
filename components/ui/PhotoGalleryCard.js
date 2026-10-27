'use client'
import SecureImage from '@/components/ui/SecureImage'
import React, { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export default function PhotoGalleryCard({ task, reports }) {
  const [lightboxImage, setLightboxImage] = useState(null)

  const getPhotosByType = (type) => {
    const photos = []
    const seen = new Set()
    const addPhoto = (url, label) => {
      if (!url || seen.has(url)) return
      seen.add(url)
      photos.push({ url, label })
    }
    if (type === 'before' && task.before_photo_url) {
      addPhoto(task.before_photo_url, 'Task Before')
    }
    if (type === 'after' && task.after_photo_url) {
      addPhoto(task.after_photo_url, 'Task After')
    }
    reports.forEach(report => {
      const title = report.title || `Report ${report.id}`
      if (type === 'before') {
        const list = Array.isArray(report.before_photos) && report.before_photos.length > 0
          ? report.before_photos.map(p => p?.url).filter(Boolean)
          : (report.before_photo_url ? [report.before_photo_url] : [])
        list.forEach((url, i) => addPhoto(url, list.length > 1 ? `${title} (${i + 1})` : title))
      }
      if (type === 'after') {
        const list = Array.isArray(report.after_photos) && report.after_photos.length > 0
          ? report.after_photos.map(p => p?.url).filter(Boolean)
          : (report.after_photo_url ? [report.after_photo_url] : [])
        list.forEach((url, i) => addPhoto(url, list.length > 1 ? `${title} (${i + 1})` : title))
      }
    })
    return photos
  }

  const beforePhotos = getPhotosByType('before')
  const afterPhotos = getPhotosByType('after')

  const handleNextPhoto = () => {
    if (!lightboxImage) return
    const photos = getPhotosByType(lightboxImage.type)
    const nextIndex = (lightboxImage.index + 1) % photos.length
    setLightboxImage({ ...lightboxImage, url: photos[nextIndex].url, index: nextIndex })
  }

  const handlePreviousPhoto = () => {
    if (!lightboxImage) return
    const photos = getPhotosByType(lightboxImage.type)
    const prevIndex = (lightboxImage.index - 1 + photos.length) % photos.length
    setLightboxImage({ ...lightboxImage, url: photos[prevIndex].url, index: prevIndex })
  }

  return (
    <div className="card mt-6">
      <h2 className="text-xl font-bold text-text-primary mb-4">Photo Gallery</h2>
      
      {/* Before Photos Section */}
      <div className="mb-6">
        <h3 className="font-medium mb-3 text-text-muted">Before Photos ({beforePhotos.length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {beforePhotos.map((photo, idx) => (
            <div 
              key={`before-${idx}-${photo.url}`} 
              className="relative cursor-pointer"
              onClick={() => setLightboxImage({ url: photo.url, type: 'before', index: idx })}
            >
              <SecureImage src={photo.url} alt={photo.label} className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity border border-border" />
              <span className="absolute bottom-2 left-2 z-20 bg-black/70 text-white text-xs px-2 py-1 rounded truncate max-w-[90%]">{photo.label}</span>
            </div>
          ))}
        </div>
        {beforePhotos.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 bg-surface-elevated rounded-lg border border-dashed border-border">
            <p className="text-text-muted text-sm">No before photos uploaded yet</p>
          </div>
        )}
      </div>

      {/* After Photos Section */}
      <div>
        <h3 className="font-medium mb-3 text-text-muted">After Photos ({afterPhotos.length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {afterPhotos.map((photo, idx) => (
            <div 
              key={`after-${idx}-${photo.url}`} 
              className="relative cursor-pointer"
              onClick={() => setLightboxImage({ url: photo.url, type: 'after', index: idx })}
            >
              <SecureImage src={photo.url} alt={photo.label} className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity border border-border" />
              <span className="absolute bottom-2 left-2 z-20 bg-black/70 text-white text-xs px-2 py-1 rounded truncate max-w-[90%]">{photo.label}</span>
            </div>
          ))}
        </div>
        {afterPhotos.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 bg-surface-elevated rounded-lg border border-dashed border-border">
            <p className="text-text-muted text-sm">No after photos uploaded yet</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-7xl max-h-screen p-4 flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <button 
              type="button"
              aria-label="Close lightbox"
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-50 bg-black/50 rounded-full p-2 flex items-center justify-center"
              onClick={() => setLightboxImage(null)}
            >
              <X size={24} aria-hidden="true" />
            </button>
            <button 
              type="button"
              aria-label="Previous photo"
              className="absolute left-4 text-white hover:text-gray-300 z-50 bg-black/50 rounded-full p-3 flex items-center justify-center"
              onClick={handlePreviousPhoto}
            >
              <ChevronLeft size={32} aria-hidden="true" />
            </button>
            <SecureImage 
              src={lightboxImage.url} 
              alt="Lightbox" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              wrapperClassName="min-w-[280px] min-h-[280px] md:min-w-[480px] md:min-h-[400px] flex items-center justify-center"
            />
            <button 
              type="button"
              aria-label="Next photo"
              className="absolute right-4 text-white hover:text-gray-300 z-50 bg-black/50 rounded-full p-3 flex items-center justify-center"
              onClick={handleNextPhoto}
            >
              <ChevronRight size={32} aria-hidden="true" />
            </button>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded-full">
              {getPhotosByType(lightboxImage.type)[lightboxImage.index].label}
              ({lightboxImage.index + 1} / {getPhotosByType(lightboxImage.type).length})
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
