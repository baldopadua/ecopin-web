'use client'
import React, { useState } from 'react'

export default function PhotoGalleryCard({ task, reports }) {
  const [lightboxImage, setLightboxImage] = useState(null)

  const getPhotosByType = (type) => {
    const photos = []
    if (type === 'before' && task.before_photo_url) {
      photos.push({ url: task.before_photo_url, label: 'Task Before' })
    }
    if (type === 'after' && task.after_photo_url) {
      photos.push({ url: task.after_photo_url, label: 'Task After' })
    }
    reports.forEach(report => {
      if (type === 'before' && report.before_photo_url) {
        photos.push({ url: report.before_photo_url, label: `Report ${report.id} Before` })
      }
      if (type === 'after' && report.after_photo_url) {
        photos.push({ url: report.after_photo_url, label: `Report ${report.id} After` })
      }
    })
    return photos
  }

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
        <h3 className="font-medium mb-3 text-text-muted">Before Photos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {task.before_photo_url && (
            <div className="relative cursor-pointer" onClick={() => setLightboxImage({ url: task.before_photo_url, type: 'before', index: 0 })}>
              <img src={task.before_photo_url} alt="Before cleanup" className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity border border-border" />
              <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">Task Before</span>
            </div>
          )}
          {reports.filter(r => r.before_photo_url).map((report, idx) => (
            <div 
              key={`${report.id}-before`} 
              className="relative cursor-pointer"
              onClick={() => setLightboxImage({ url: report.before_photo_url, type: 'before', index: (task.before_photo_url ? 1 : 0) + idx })}
            >
              <img src={report.before_photo_url} alt={`Report ${report.title} Before`} className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity border border-border" />
              <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded truncate max-w-[90%]">{report.title}</span>
            </div>
          ))}
        </div>
        {(!task.before_photo_url && !reports.some(r => r.before_photo_url)) && (
          <div className="flex flex-col items-center justify-center p-8 bg-surface-elevated rounded-lg border border-dashed border-border">
            <p className="text-text-muted text-sm">No before photos uploaded yet</p>
          </div>
        )}
      </div>

      {/* After Photos Section */}
      <div>
        <h3 className="font-medium mb-3 text-text-muted">After Photos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {task.after_photo_url && (
            <div className="relative cursor-pointer" onClick={() => setLightboxImage({ url: task.after_photo_url, type: 'after', index: 0 })}>
              <img src={task.after_photo_url} alt="After cleanup" className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity border border-border" />
              <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">Task After</span>
            </div>
          )}
          {reports.filter(r => r.after_photo_url).map((report, idx) => (
            <div 
              key={`${report.id}-after`} 
              className="relative cursor-pointer"
              onClick={() => setLightboxImage({ url: report.after_photo_url, type: 'after', index: (task.after_photo_url ? 1 : 0) + idx })}
            >
              <img src={report.after_photo_url} alt={`Report ${report.title} After`} className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity border border-border" />
              <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded truncate max-w-[90%]">{report.title}</span>
            </div>
          ))}
        </div>
        {(!task.after_photo_url && !reports.some(r => r.after_photo_url)) && (
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
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-50 bg-black/50 rounded-full p-2"
              onClick={() => setLightboxImage(null)}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button 
              className="absolute left-4 text-white hover:text-gray-300 z-50 bg-black/50 rounded-full p-3"
              onClick={handlePreviousPhoto}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <img 
              src={lightboxImage.url} 
              alt="Lightbox" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button 
              className="absolute right-4 text-white hover:text-gray-300 z-50 bg-black/50 rounded-full p-3"
              onClick={handleNextPhoto}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
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
