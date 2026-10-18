import { backendFetch } from '../backend-fetch.mjs';
import { readSessionKey } from '../auth-token.mjs';
// undefined = existing external/public asset; null = private reference that fails closed.
export function resolvePrivateMedia(source,supabaseOrigin,backendOrigin){
 if(typeof source!=='string')return undefined;
 try{
  const value=new URL(source);let bucket,path;
  if(value.protocol==='storage:'){
   bucket=decodeURIComponent(value.host);path=decodeURIComponent(value.pathname.slice(1));
   if(value.search||value.hash||value.username||value.password)return null;
  }else{
   if(!supabaseOrigin||value.origin!==new URL(supabaseOrigin).origin)return undefined;
   const match=value.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
   if(!match)return undefined;bucket=decodeURIComponent(match[1]);path=decodeURIComponent(match[2]);
   if(!['Report Evidence','Cleanup Task Photos','Report Cleanup'].includes(bucket))return undefined;
   if(value.username||value.password)return null;
  }
  if(!['Report Evidence','Cleanup Task Photos','Report Cleanup'].includes(bucket))return null;
  const parts=path.split('/');
  if(path.length>1024||parts.some(part=>!part||['.','..'].includes(part)||!/^[a-zA-Z0-9._-]{1,128}$/.test(part)))return null;
  if(bucket==='Report Evidence'?(parts.length<2||parts.length>6):(parts.length!==3||!['before','after'].includes(parts[1])))return null;
  const target=new URL('/api/media/storage',backendOrigin);
  target.searchParams.set('bucket',bucket);target.searchParams.set('path',path);return target.href;
 }catch{return source.startsWith('storage:')?null:undefined;}
}
export async function fetchPrivateMedia(url,{getSessionKey,getToken,refreshToken,signal,fetcher=backendFetch}={}){
 const getKey = getSessionKey || getToken || readSessionKey;
 let token = getKey();
 if(!url)throw new Error('Private media unavailable');
 if(!token)throw new Error('Authentication required');
 const makeOptions = (t) => ({
   credentials: 'same-origin',
   cache: 'no-store',
   signal,
   headers: t && typeof t === 'string' ? { Authorization: `Bearer ${t}` } : {}
 });
 let response = await fetcher(url, makeOptions(token));
 if(response.status === 401 && typeof refreshToken === 'function') {
   const nextToken = await refreshToken();
   if(nextToken) {
     response = await fetcher(url, makeOptions(nextToken));
   }
 }
 if(!response.ok)throw new Error('Private media unavailable');
 return response.blob();
}
