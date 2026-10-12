'use client'
import {useEffect,useState} from 'react'
import {resolvePrivateMedia,fetchPrivateMedia} from '@/lib/api/private-media.mjs'
import {refreshAuthToken} from '@/lib/api/auth'

export default function SecureImage({src,alt='',...props}){
 const target=resolvePrivateMedia(src,process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_BACKEND_API_URL)
 const [resource,setResource]=useState(null)
 const [authVersion,setAuthVersion]=useState(0)
 useEffect(()=>{
  const changed=event=>{if(event.key==='authToken')setAuthVersion(value=>value+1)}
  window.addEventListener('storage',changed)
  return()=>window.removeEventListener('storage',changed)
 },[])
 useEffect(()=>{
  if(target===undefined)return
  const controller=new AbortController();let objectUrl

  fetchPrivateMedia(target,{getToken:()=>localStorage.getItem('authToken'),refreshToken:refreshAuthToken,signal:controller.signal})
   .then(blob=>{if(controller.signal.aborted)return;objectUrl=URL.createObjectURL(blob);setResource({url:objectUrl,target,authVersion})})
   .catch(()=>{if(!controller.signal.aborted)setResource(null)})
  return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl)}
 },[target,authVersion])
 return <img {...props} src={target===undefined?src:(resource?.target===target&&resource.authVersion===authVersion?resource.url:undefined)} alt={alt} />
}
