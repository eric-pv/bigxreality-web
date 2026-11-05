import {test} from 'node:test';import assert from 'node:assert/strict';
import{publicUrl,artifactPath,publicBasePath}from'../src/lib/public-url.ts';
test('canonical and assets keep the project base exactly once',()=>{
 assert.equal(publicBasePath,'/bigxreality-web/');
 assert.equal(publicUrl('/tw/products/sut/').href,'https://eric-pv.github.io/bigxreality-web/tw/products/sut/');
 assert.equal(publicUrl('/bigxreality-web/_astro/a.jpg').href,'https://eric-pv.github.io/bigxreality-web/_astro/a.jpg');
 assert.equal(publicUrl('/_astro/a.jpg').href,'https://eric-pv.github.io/bigxreality-web/_astro/a.jpg');
 assert.equal(publicUrl('https://example.com/video').href,'https://example.com/video');
 assert.equal(artifactPath(publicUrl('/tw/news/')),'/tw/news/');
});
test('a custom domain at the root keeps every URL at the domain root',async()=>{
 const{publicUrls}=await import('../src/lib/public-url.ts');
 const root=publicUrls('https://www.bigxreality.com/');
 assert.equal(root.publicSiteRoot,'https://www.bigxreality.com');
 assert.equal(root.publicBasePath,'/');
 assert.equal(root.publicUrl('/tw/products/sut/').href,'https://www.bigxreality.com/tw/products/sut/');
 assert.equal(root.publicUrl('/_astro/a.jpg').href,'https://www.bigxreality.com/_astro/a.jpg');
 assert.equal(root.publicUrl('sitemap.xml').href,'https://www.bigxreality.com/sitemap.xml');
 assert.equal(root.publicUrl('https://example.com/video').href,'https://example.com/video');
 assert.equal(root.artifactPath(root.publicUrl('/tw/news/')),'/tw/news/');
 assert.equal(root.artifactPath('https://www.bigxreality.com/bigxreality-web/tw/'),'/bigxreality-web/tw/');
 const project=publicUrls('https://eric-pv.github.io/bigxreality-web');
 assert.equal(project.publicUrl('sitemap.xml').href,'https://eric-pv.github.io/bigxreality-web/sitemap.xml');
 assert.equal(project.artifactPath('https://eric-pv.github.io/bigxreality-web/tw/'),'/tw/');
});
