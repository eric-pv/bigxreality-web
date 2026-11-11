import metadata from '../data/site.json' with { type: 'json' };
/**
 * Single published URL authority: src/data/site.json `url`. Routes stay /tw/... internally;
 * Pages adds the base once. Two shapes are supported:
 * - project site, base "/name/": https://eric-pv.github.io/bigxreality-web (current)
 * - domain root, base "/": a custom domain such as https://www.bigxreality.com
 */
export function publicUrls(siteUrl: string) {
 const publicSiteRoot = siteUrl.replace(/\/+$/, '');
 const publicBasePath = new URL(publicSiteRoot + '/').pathname;
 const root = new URL(publicSiteRoot + '/');
 function publicUrl(path: string | URL): URL {
  const input = String(path);
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(input)) return new URL(input, root);
  if (publicBasePath !== '/' && input.startsWith(publicBasePath)) return new URL(input, root.origin);
  return new URL(input.replace(/^\/+/, ''), root);
 }
 /** Files in an artifact are not physically nested under the Pages mount point. */
 function artifactPath(url: string | URL): string {
  const path = new URL(String(url), root).pathname;
  if (publicBasePath !== '/' && path.startsWith(publicBasePath)) return '/' + path.slice(publicBasePath.length);
  return path;
 }
 return { publicSiteRoot, publicBasePath, publicUrl, artifactPath };
}

const site = publicUrls(metadata.url);
export const publicSiteRoot = site.publicSiteRoot;
export const publicBasePath = site.publicBasePath;
export const publicUrl = site.publicUrl;
export const artifactPath = site.artifactPath;
