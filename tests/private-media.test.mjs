import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePrivateMedia,fetchPrivateMedia} from '../lib/api/private-media.mjs';
test('stable and expired legacy references produce authenticated backend targets',()=>{
 const canonical='storage://Cleanup%20Task%20Photos/task/before/image.jpg';
 const old='https://project.test/storage/v1/object/sign/Cleanup%20Task%20Photos/task/before/image.jpg?token=expired';
 const target=resolvePrivateMedia(canonical,'https://project.test','http://localhost:3000');
 assert.equal(resolvePrivateMedia(old,'https://project.test','http://localhost:3000'),target);
 assert.ok(!target.includes('expired'));assert.equal(new URL(target).pathname,'/api/media/storage');
});
test('public assets are preserved and malformed private references fail closed',()=>{
 assert.equal(resolvePrivateMedia('https://external.test/image.jpg','https://project.test','http://localhost:3000'),undefined);
 assert.equal(resolvePrivateMedia('storage://Report%20Cleanup/task/before/../bad','https://project.test','http://localhost:3000'),null);
 assert.equal(resolvePrivateMedia('storage://Report%20Cleanup/task/before/image.jpg','https://project.test',undefined),null);
});
test('401 retries with the refreshed token, without caching media',async()=>{
 const calls=[];const bytes=new Blob(['image']);
 const blob=await fetchPrivateMedia('http://localhost:3000/api/media/storage',{getToken:()=> 'old',refreshToken:()=> 'new',fetcher:async(url,options)=>{calls.push(options);return calls.length===1?{status:401,ok:false}:{status:200,ok:true,blob:async()=>bytes}}});
 assert.equal(blob,bytes);assert.deepEqual(calls.map(call=>call.headers.Authorization),['Bearer old','Bearer new']);assert.ok(calls.every(call=>call.cache==='no-store'));
});
test('unauthenticated private reads never issue network requests',async()=>{
 await assert.rejects(fetchPrivateMedia('http://localhost:3000/api/media/storage',{getToken:()=>null,fetcher:()=>{throw new Error('Unexpected request')}}),/Authentication required/);
});
