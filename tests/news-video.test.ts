import {test} from 'node:test';import assert from 'node:assert/strict';
import {externalVideo} from '../src/lib/news-video.ts';
test('confirmed video providers derive safe non-autoplay players; unconfirmed sources stay links',()=>{
 const url='https://youtu.be/GUrKtH_TKjU';assert.equal(externalVideo('youtube',url,false)?.embed,undefined);
 assert.equal(externalVideo('youtube',url,true)?.embed,'https://www.youtube-nocookie.com/embed/GUrKtH_TKjU?autoplay=0&rel=0');
 const fb='https://www.facebook.com/gpttcom/videos/1741246489814363/';assert.equal(externalVideo('facebook',fb,false)?.embed,undefined);
 assert.ok(externalVideo('facebook',fb,true)?.embed?.includes('autoplay=false'));
 assert.equal(externalVideo('youtube','https://evil.example/watch?v=GUrKtH_TKjU',true),undefined);
 assert.equal(externalVideo('youtube','javascript:alert(1)',true),undefined);
 assert.equal(externalVideo('facebook','https://facebook.com.evil.example/videos/1/',true),undefined);
});
