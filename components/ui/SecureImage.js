'use client'
import {useEffect,useState,useSyncExternalStore} from 'react'
import {resolvePrivateMedia,fetchPrivateMedia} from '@/lib/api/private-media.mjs'
import {refreshAuthToken} from '@/lib/api/auth'
import {readAuthToken,subscribeAuthToken} from '@/lib/auth-token.mjs'

export default function SecureImage({src,alt='',...props}){
 const target=resolvePrivateMedia(src,process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_BACKEND_API_URL)
 const [resource,setResource]=useState(null)
 const token=useSyncExternalStore(subscribeAuthToken,readAuthToken,()=>null)
 useEffect(()=>{
  if(target===undefined)return
  const controller=new AbortController();let objectUrl

  fetchPrivateMedia(target,{getToken:()=>token,refreshToken:refreshAuthToken,signal:controller.signal})
   .then(blob=>{if(controller.signal.aborted)return;objectUrl=URL.createObjectURL(blob);setResource({url:objectUrl,target,token})})
   .catch(()=>{if(!controller.signal.aborted)setResource(null)})
  return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl)}
 },[target,token])
 return <img {...props} src={target===undefined?src:(token&&resource?.target===target&&resource.token===token?resource.url:undefined)} alt={alt} />
}
