// Monthly 104 openings sync (docs/careers/104-INTEGRATION.md). Run by .github/workflows/ci.yml.
//
//   BXR_104_CLIENT_ID / BXR_104_CLIENT_SECRET   GitHub Secrets issued by 104 (scope c_job)
//   BXR_104_ALLOW_EMPTY=1                         manual confirmation that 0 openings is real
//
// Exit 0 and write src/data/careers-104.json only after the whole response validated.
// Missing credentials: exit 0 without touching anything (the integration is not enabled yet).
// Any other problem: exit 1 and keep the last good snapshot.
import { readFile, writeFile, appendFile } from "node:fs/promises";
import { API_BASE, JOBS_PATH, TOKEN_PATH, SCOPE, PAGE_SIZE, COLUMNS, COMPANY_CUST_NO, parsePages, decide, SyncError } from "../../src/lib/careers-104.ts";

const FILE = new URL("../../src/data/careers-104.json", import.meta.url);
const TIMEOUT = 30_000;
const id = process.env.BXR_104_CLIENT_ID?.trim(), secret = process.env.BXR_104_CLIENT_SECRET?.trim();
const allowEmpty = process.env.BXR_104_ALLOW_EMPTY === "1";

async function summary(line) {
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
}
async function output(key, value) {
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}

async function request(url, init) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT) });
  const body = await res.text();
  if (!res.ok) throw new SyncError(`${init?.method ?? "GET"} ${new URL(url).pathname} → HTTP ${res.status}`);
  try { return JSON.parse(body); } catch { throw new SyncError(`${new URL(url).pathname}: response is not JSON`); }
}

async function token() {
  const form = new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret, scope: SCOPE });
  const json = await request(`${API_BASE}${TOKEN_PATH}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, body: form });
  if (typeof json.access_token !== "string" || !json.access_token) throw new SyncError("token response has no access_token");
  return json.access_token;
}

async function fetchPages(accessToken) {
  const pages = [];
  for (let page = 1; ; page++) {
    const q = new URLSearchParams({ custNo: COMPANY_CUST_NO, page: String(page), pageSize: String(PAGE_SIZE), columns: COLUMNS.join(",") });
    const json = await request(`${API_BASE}${JOBS_PATH}?${q}`, { headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" } });
    pages.push(json);
    const total = Number(json?.data?.totalPage);
    if (!Number.isInteger(total) || page >= total || page >= 6) break; // 104 caps paging at 3000 rows
  }
  return pages;
}

if (!id || !secret) {
  await summary("104 openings sync: skipped — BXR_104_CLIENT_ID / BXR_104_CLIENT_SECRET are not set. The site keeps its current snapshot.");
  await output("changed", "false");
  process.exit(0);
}

try {
  const previous = JSON.parse(await readFile(FILE, "utf8"));
  const result = parsePages(await fetchPages(await token()));
  const decision = decide(previous, result, new Date(), allowEmpty);
  if (decision.action === "write") {
    await writeFile(FILE, JSON.stringify(decision.snapshot, null, 2) + "\n");
    await summary(`104 openings sync: updated — ${decision.reason}.`);
    await output("changed", "true");
  } else if (decision.action === "keep") {
    await summary(`104 openings sync: ${decision.reason}; nothing to publish.`);
    await output("changed", "false");
  } else {
    await summary(`104 openings sync: held — ${decision.reason}`);
    await output("changed", "false");
    process.exit(1);
  }
} catch (error) {
  // Never print credentials or tokens; messages above contain paths and status codes only.
  await summary(`104 openings sync: FAILED, last snapshot kept — ${error instanceof SyncError ? error.message : error?.name ?? "error"}`);
  await output("changed", "false");
  process.exit(1);
}
