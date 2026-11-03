import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {photoCount,redactionsPerPhoto,reviewState,allPhotosReady,publicPhotoUrls,MAX_PROOF_PHOTOS} from '../lib/cleanup-proof-photos.mjs';
test('staff incident page mounts the proof review for staff only',()=>{
 const page=readFileSync(new URL('../app/dashboard/(shared)/raw-data/[id]/page.js',import.meta.url),'utf8');
 assert.match(page,/import CleanupProofReview from '@\/components\/reports\/CleanupProofReview'/);
 assert.match(page,/\{isStaff && <CleanupProofReview key=\{report\.id\} reportId=\{report\.id\} \/>\}/);
});
test('photo counts follow the source lists, capped at five, with a single-photo fallback',()=>{
 assert.equal(photoCount({before_urls:['a','b']},'before'),2);assert.equal(photoCount({before_url:'a'},'before'),1);
 assert.equal(photoCount({after_urls:Array(9).fill('x')},'after'),MAX_PROOF_PHOTOS);assert.equal(photoCount(null,'after'),0);
});
test('stored hidden areas map to the right photo or start empty',()=>{
 const r=[{x:0,y:0,width:.1,height:.1}];
 assert.deepEqual(redactionsPerPhoto(r,1),[r]);assert.deepEqual(redactionsPerPhoto([r,[]],2),[r,[]]);
 assert.deepEqual(redactionsPerPhoto(r,2),[[],[]]);assert.deepEqual(redactionsPerPhoto([r],3),[[],[],[]]);assert.deepEqual(redactionsPerPhoto(undefined,2),[[],[]]);
});
test('review needs every photo of both slots to have loaded',()=>{
 const s=reviewState({before_urls:['a','b'],after_urls:['c'],existing_redactions:{before:[[],[]],after:[]}});
 assert.deepEqual(s.counts,{before:2,after:1});assert.equal(allPhotosReady(s.ready),false);
 assert.equal(allPhotosReady({before:[true,true],after:[true]}),true);assert.equal(allPhotosReady({before:[true,false],after:[true]}),false);
 assert.equal(allPhotosReady({before:[],after:[true]}),false);
});
test('public delivery prefers indexed links and never exceeds five',()=>{
 assert.deepEqual(publicPhotoUrls({before_urls:['/1','/2'],before_url:'/1'},'before'),['/1','/2']);
 assert.deepEqual(publicPhotoUrls({after_url:'/x'},'after'),['/x']);assert.equal(publicPhotoUrls({before_urls:Array(8).fill('/x')},'before').length,5);assert.deepEqual(publicPhotoUrls({},'after'),[]);
});
