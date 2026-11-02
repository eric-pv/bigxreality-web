import { existsSync } from "node:fs";
// Static QA server for the Astro client output (directory index + real 404 status).
// Project-base publication is separately checked against dist-pages (startPages). Run npm run build first.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

// Pre-installed Chromium in the dev container; elsewhere (CI) Playwright's own download.
export const CHROMIUM = process.env.CHROMIUM_PATH ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
// QA_DIST=dist-fixtures/client runs the QA scripts against the TEST FIXTURE build.
export const DIST = path.resolve(import.meta.dirname, "../..", process.env.QA_DIST ?? "dist/client");

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".xml": "application/xml", ".txt": "text/plain", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2", ".ico": "image/x-icon",
};

/** Resolves a URL path to a file in dist, or null. */
export async function resolveDist(urlPath) {
  let p = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(DIST, p);
  if (!file.startsWith(DIST)) return null;
  try {
    return (await stat(file)).isFile() ? file : null;
  } catch {
    return null;
  }
}

export async function startPreview(port = 4329) {
  const server = createServer(async (req, res) => {
    const file = await resolveDist(req.url ?? "/");
    if (!file) {
      // Like GitHub Pages: a missing path answers 404 with the site's 404 page when it is built.
      const notFound = path.join(DIST, "404.html");
      if (existsSync(notFound)) res.writeHead(404, { "content-type": TYPES[".html"] }).end(await readFile(notFound));
      else res.writeHead(404, { "content-type": "text/plain" }).end("404");
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    res.end(await readFile(file));
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return { base: `http://127.0.0.1:${port}`, stop: () => server.close() };
}

const PAGES_TYPES = { ...TYPES, ".jpeg": "image/jpeg", ".mp4": "video/mp4", ".webm": "video/webm", ".wasm": "application/wasm", ".yml": "text/yaml", ".pf_fragment": "application/octet-stream" };
/** Path under `base` → file in `root` (directory index), or null. Works for "/" and "/name/" bases. */
export async function resolveUnder(root, base, urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath.split(/[?#]/)[0]); } catch { return null; }
  if (!p.startsWith(base)) return null;
  p = "/" + p.slice(base.length);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(root, p);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  try { return (await stat(file)).isFile() ? file : null; } catch { return null; }
}

/**
 * Serves a Pages artifact (dist-pages) the way GitHub Pages does: under `base` ("/" for a
 * custom domain, "/name/" for a project site), directory URLs without a slash redirect,
 * and a missing path answers 404 with <base>404.html.
 */
export async function startPages({ root, base, port }) {
  const notFound = path.join(root, "404.html");
  const server = createServer(async (req, res) => {
    const url = req.url ?? "/";
    const file = await resolveUnder(root, base, url);
    if (file) {
      res.writeHead(200, { "content-type": PAGES_TYPES[path.extname(file)] ?? "application/octet-stream" });
      return res.end(await readFile(file));
    }
    const pathname = url.split(/[?#]/)[0];
    if (!pathname.endsWith("/") && (await resolveUnder(root, base, pathname + "/"))) {
      return res.writeHead(301, { location: pathname + "/" }).end();
    }
    if (existsSync(notFound)) return res.writeHead(404, { "content-type": PAGES_TYPES[".html"] }).end(await readFile(notFound));
    res.writeHead(404, { "content-type": "text/plain" }).end("404");
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return { origin: `http://127.0.0.1:${port}`, stop: () => server.close() };
}
