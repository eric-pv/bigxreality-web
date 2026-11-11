import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectFeaturedNews } from '../src/lib/news-featured.ts';
const row=(id:string,featured=false,featuredPriority=0)=>({id,base:{data:{featured,featuredPriority}}});
test('manual spotlight overrides chronological order and uses descending priority',()=>{
 const items=[row('newest'),row('older-marked',true,1),row('highest-priority',true,10)];
 assert.equal(selectFeaturedNews(items)?.id,'highest-priority');
 assert.deepEqual(items.map(x=>x.id),['newest','older-marked','highest-priority']);
});
test('spotlight ties keep publication order, unmarked fallback uses newest, empty is safe',()=>{
 assert.equal(selectFeaturedNews([row('first',true,3),row('second',true,3)])?.id,'first');
 assert.equal(selectFeaturedNews([row('newest'),row('older')])?.id,'newest');
 assert.equal(selectFeaturedNews([]),undefined);
});
