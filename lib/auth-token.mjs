const eventName='ecopin-auth-changed';
export function readAuthToken(){return typeof window==='undefined'?null:localStorage.getItem('authToken');}
export function updateAuthToken(token){
 if(token==null)localStorage.removeItem('authToken');
 else localStorage.setItem('authToken',token);
 window.dispatchEvent(new Event(eventName));
}
export function subscribeAuthToken(listener){
 const changed=event=>{if(event.key==='authToken'||event.key===null)listener();};
 window.addEventListener(eventName,listener);window.addEventListener('storage',changed);
 return()=>{window.removeEventListener(eventName,listener);window.removeEventListener('storage',changed);};
}
export function triggerSessionExpired(){
 if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function') window.dispatchEvent(new CustomEvent('session-expired'));
}
