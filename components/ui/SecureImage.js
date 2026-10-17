'use client'
import {useEffect,useState,useSyncExternalStore} from 'react'
import {resolvePrivateMedia,fetchPrivateMedia} from '@/lib/api/private-media.mjs'
import {readSessionKey,subscribeSession} from '@/lib/auth-token.mjs'

// In-memory persistent cache for resolved object URLs to prevent thrashing and refetches
const blobUrlCache = new Map() // target -> { url, token }
const inflightFetches = new Map() // target -> Promise<object>

export default function SecureImage({src,alt='',loading='lazy',decoding='async',...props}){
 const target=resolvePrivateMedia(src,process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_BACKEND_API_URL)
 const token=useSyncExternalStore(subscribeSession,readSessionKey,()=>null)

 const [resource,setResource]=useState(()=>{
  if(target && blobUrlCache.has(target)){
   return blobUrlCache.get(target)
  }
  return null
 })

 useEffect(()=>{
  for(const [key,cached] of blobUrlCache){
   if(cached.token!==token){URL.revokeObjectURL(cached.url);blobUrlCache.delete(key)}
  }
  if(target===undefined)return
  if(!token)return

  // If already cached with matching token, use it immediately
  if(blobUrlCache.has(target)){
   const cached = blobUrlCache.get(target)
   if(cached.token === token){
    setResource(cached)
    return
   }
  }

  let isMounted = true
  const controller = new AbortController()

  // Deduplicate in-flight requests for the same target
  const requestKey = `${token}:${target}`
  let fetchPromise = inflightFetches.get(requestKey)
  if(!fetchPromise){
   fetchPromise = fetchPrivateMedia(target,{getSessionKey:()=>token,signal:controller.signal})
    .then(blob=>{
     if(readSessionKey()!==token)throw new Error('Session changed')
     const objectUrl = URL.createObjectURL(blob)
     const resObj = {url:objectUrl,target,token}
     blobUrlCache.set(target, resObj)
     inflightFetches.delete(requestKey)
     return resObj
    })
    .catch(err=>{
     inflightFetches.delete(requestKey)
     throw err
    })
   inflightFetches.set(requestKey, fetchPromise)
  }

  fetchPromise
   .then(resObj=>{
    if(isMounted) setResource(resObj)
   })
   .catch(()=>{
    if(isMounted) setResource(null)
   })

  return()=>{
   isMounted = false
  }
 },[target,token])

 return (
  <img 
   {...props} 
   loading={loading}
   decoding={decoding}
   src={target===undefined?src:(token&&resource?.target===target&&resource.token===token?resource.url:undefined)} 
   alt={alt} 
  />
 )
}

