'use client'
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, useRef, useSyncExternalStore } from 'react'
import { Loader2, ImageOff } from 'lucide-react'
import { resolvePrivateMedia, fetchPrivateMedia } from '@/lib/api/private-media.mjs'
import { readSessionKey, subscribeSession } from '@/lib/auth-token.mjs'
import { splitImageClassNames } from '@/lib/helpers/imageHelpers.mjs'

// In-memory persistent cache for resolved object URLs to prevent thrashing and refetches
const blobUrlCache = new Map() // target -> { url, token }
const inflightFetches = new Map() // target -> Promise<object>

export { splitImageClassNames }

export default function SecureImage({
  src,
  alt = '',
  loading = 'lazy',
  decoding = 'async',
  className = '',
  wrapperClassName = '',
  imgClassName = '',
  showSkeleton = true,
  spinnerSize = 'auto',
  loadingLabel = '',
  fallback = null,
  as: Component = 'span',
  style,
  onClick,
  onLoad,
  onError,
  ...props
}) {
  const target = resolvePrivateMedia(src, process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_BACKEND_API_URL)
  const token = useSyncExternalStore(subscribeSession, readSessionKey, () => null)
  const imgRef = useRef(null)

  const [resource, setResource] = useState(() => {
    if (target && blobUrlCache.has(target)) {
      const cached = blobUrlCache.get(target)
      if (cached?.token === token) return cached
    }
    return null
  })

  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Determine effective image source
  const effectiveSrc = target === undefined 
    ? src 
    : (token && resource?.target === target && resource.token === token ? resource.url : undefined)

  // Idiomatic React pattern: reset loading/error state when src changes
  const [prevSrc, setPrevSrc] = useState(effectiveSrc)
  if (prevSrc !== effectiveSrc) {
    setPrevSrc(effectiveSrc)
    setIsLoaded(false)
    setHasError(false)
  }

  // Handle immediate cache hits from the browser
  useEffect(() => {
    if (effectiveSrc && imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setIsLoaded(true)
    }
  }, [effectiveSrc])

  useEffect(() => {
    for (const [key, cached] of blobUrlCache) {
      if (cached.token !== token) {
        URL.revokeObjectURL(cached.url)
        blobUrlCache.delete(key)
      }
    }
    if (target === undefined) return
    if (!token) return

    // If already cached with matching token, update asynchronously to avoid effect render warnings
    if (blobUrlCache.has(target)) {
      const cached = blobUrlCache.get(target)
      if (cached.token === token) {
        queueMicrotask(() => {
          setResource(cached)
        })
        return
      }
    }

    let isMounted = true
    const controller = new AbortController()

    // Deduplicate in-flight requests for the same target
    const requestKey = `${token}:${target}`
    let fetchPromise = inflightFetches.get(requestKey)
    if (!fetchPromise) {
      fetchPromise = fetchPrivateMedia(target, { getSessionKey: () => token, signal: controller.signal })
        .then(blob => {
          if (readSessionKey() !== token) throw new Error('Session changed')
          const objectUrl = URL.createObjectURL(blob)
          const resObj = { url: objectUrl, target, token }
          blobUrlCache.set(target, resObj)
          inflightFetches.delete(requestKey)
          return resObj
        })
        .catch(err => {
          inflightFetches.delete(requestKey)
          throw err
        })
      inflightFetches.set(requestKey, fetchPromise)
    }

    fetchPromise
      .then(resObj => {
        if (isMounted) setResource(resObj)
      })
      .catch(() => {
        if (isMounted) {
          setResource(null)
          setHasError(true)
        }
      })

    return () => {
      isMounted = false
    }
  }, [target, token])

  const handleLoad = (e) => {
    setIsLoaded(true)
    setHasError(false)
    if (typeof onLoad === 'function') {
      onLoad(e)
    }
  }

  const handleError = (e) => {
    setIsLoaded(false)
    setHasError(true)
    if (typeof onError === 'function') {
      onError(e)
    }
  }

  // If skeleton is disabled, render raw img for backwards compatibility
  if (!showSkeleton) {
    return (
      <img
        {...props}
        ref={imgRef}
        loading={loading}
        decoding={decoding}
        src={effectiveSrc}
        alt={alt}
        className={className}
        style={style}
        onClick={onClick}
        onLoad={handleLoad}
        onError={handleError}
      />
    )
  }

  // Parse classes for wrapper and inner img
  const { wrapperClass: parsedWrapper, imgClass: parsedImg } = splitImageClassNames(className)
  const isBlock = className.includes('w-full') || className.includes('block') || className.includes('flex')
  const isSmall = className.includes('w-10') || className.includes('w-9') || className.includes('w-8') || className.includes('h-10') || className.includes('h-9') || className.includes('avatar')
  const isTiny = className.includes('w-6') || className.includes('w-5') || className.includes('h-6') || className.includes('h-5')

  const spinnerClass = spinnerSize === 'auto'
    ? (isTiny ? 'w-2.5 h-2.5' : isSmall ? 'w-3.5 h-3.5' : 'w-5 h-5')
    : spinnerSize

  const combinedWrapperClass = [
    isBlock ? 'block' : 'inline-block',
    'relative overflow-hidden',
    parsedWrapper,
    wrapperClassName
  ].filter(Boolean).join(' ')

  const combinedImgClass = [
    'w-full h-full transition-opacity duration-300 rounded-[inherit]',
    parsedImg,
    imgClassName,
    isLoaded ? 'opacity-100' : 'opacity-0'
  ].filter(Boolean).join(' ')

  const isLoading = !hasError && (!isLoaded || !effectiveSrc)

  return (
    <Component
      className={combinedWrapperClass}
      style={style}
      onClick={onClick}
    >
      {/* Skeleton Shimmer & Smooth Spinner (WT-91) */}
      {isLoading && (
        <span
          className="absolute inset-0 z-10 flex flex-col gap-2 items-center justify-center bg-surface-elevated/90 animate-pulse overflow-hidden select-none pointer-events-none rounded-[inherit]"
          role={loadingLabel ? 'status' : undefined}
          aria-label={loadingLabel || undefined}
          aria-hidden={loadingLabel ? undefined : true}
        >
          {/* Shimmer sweep */}
          <span className="absolute inset-0 -translate-x-full animate-shimmer shimmer-gradient pointer-events-none" />

          {/* Smooth centered spinner badge */}
          <span className="relative z-10 p-1.5 rounded-full bg-surface/80 dark:bg-surface-elevated/80 backdrop-blur-xs border border-border/40 shadow-xs flex items-center justify-center">
            <Loader2 className={`${spinnerClass} text-primary animate-spin`} aria-hidden="true" />
          </span>
          {loadingLabel && <span className="relative z-10 text-sm text-text-muted">{loadingLabel}</span>}
        </span>
      )}

      {/* Error State Fallback */}
      {hasError && (
        fallback || (
          <span
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-surface-elevated/95 border border-border/60 text-text-muted p-2 text-center rounded-[inherit] select-none"
            role="status"
            aria-label="Image failed to load"
          >
            <ImageOff className={`${spinnerClass} opacity-60`} aria-hidden="true" />
            {!isSmall && !isTiny && <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Unavailable</span>}
          </span>
        )
      )}

      {/* Actual Image Element */}
      <img
        {...props}
        ref={imgRef}
        loading={loading}
        decoding={decoding}
        src={effectiveSrc}
        alt={alt}
        className={combinedImgClass}
        onLoad={handleLoad}
        onError={handleError}
      />
    </Component>
  )
}
