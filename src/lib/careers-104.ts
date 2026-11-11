/**
 * 104 Job Bank public openings for About BXR (docs/careers/104-INTEGRATION.md).
 *
 * Source: the official 104 人力銀行 Open API, GET https://apis.104api.com.tw/jobs/1.0/jobs
 * filtered by the company's custNo, OAuth2 client credentials (scope c_job). Only public job
 * fields are kept; no applicant, resume or apply-count data is requested or stored.
 *
 * The snapshot in src/data/careers-104.json is written only after a fully validated sync, so a
 * timeout, an auth error or a changed response format leaves the last good snapshot in place.
 * Pure functions: shared by scripts/careers/sync-104.mjs and the unit tests.
 */

export const COMPANY_CUST_NO = "1a2x6bjhcz";
export const API_BASE = "https://apis.104api.com.tw";
export const JOBS_PATH = "/jobs/1.0/jobs";
export const TOKEN_PATH = "/oauth2/token";
export const SCOPE = "c_job";
export const PAGE_SIZE = 500;
/** Public fields only. applyCount, lat/lon and logos are deliberately not requested. */
export const COLUMNS = ["jobNo", "jobName", "custNo", "custName", "area", "areaEng", "jobRole", "periodDesc", "optionEdu", "needEmp", "salaryDesc", "appearDate", "link"];

export type SnapshotStatus = "not-configured" | "ok";

export interface CareerJob {
  jobNo: string;
  name: string;
  area: string;
  areaEng?: string;
  role?: string;
  experience?: string;
  education?: string;
  headcount?: string;
  salary?: string;
  /** 104 exposure date, YYYY-MM-DD. */
  appearDate?: string;
  /** Official 104 job page returned by the API (link.job), normalised to https. */
  url: string;
}

export interface CareersSnapshot {
  status: SnapshotStatus;
  source: { api: string; custNo: string; companyUrl: string };
  /** Set only by a successful, validated sync; never by a scheduled run that failed. */
  syncedAt: string | null;
  totalCount: number;
  jobs: CareerJob[];
}

export class SyncError extends Error {}

const JOB_NO = /^[0-9a-z]+$/;
const text = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
const opt = (v: unknown) => text(v) || undefined;

/** link.job comes as protocol-relative "//www.104.com.tw/job/4u46a". Anything else is rejected. */
export function officialJobUrl(link: unknown, jobNo: string): string {
  const raw = text(link);
  let url: URL;
  try { url = new URL(raw.startsWith("//") ? `https:${raw}` : raw); } catch { throw new SyncError(`job ${jobNo}: missing or invalid link.job`); }
  if (url.protocol !== "https:" || url.hostname !== "www.104.com.tw") throw new SyncError(`job ${jobNo}: link is not on www.104.com.tw (${raw})`);
  if (url.pathname.replace(/\/$/, "") !== `/job/${jobNo}`) throw new SyncError(`job ${jobNo}: link does not point to its own job page (${raw})`);
  url.search = "";
  url.hash = "";
  return url.href.replace(/\/$/, "");
}

function appearDate(v: unknown): string | undefined {
  const s = text(v);
  return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : undefined;
}

export interface ApiPage {
  data?: { totalCount?: unknown; totalPage?: unknown; pageNo?: unknown; list?: unknown };
}

/**
 * Validates every page of one sync and returns the jobs. Throws SyncError on anything
 * unexpected, so the caller keeps the previous snapshot.
 */
export function parsePages(pages: ApiPage[], custNo = COMPANY_CUST_NO): { totalCount: number; jobs: CareerJob[] } {
  if (!pages.length) throw new SyncError("no API response");
  const first = pages[0].data;
  const totalCount = first?.totalCount;
  if (!first || !Number.isInteger(totalCount) || (totalCount as number) < 0) throw new SyncError("response has no valid data.totalCount");
  const jobs: CareerJob[] = [];
  const seen = new Set<string>();
  for (const [i, page] of pages.entries()) {
    const list = page.data?.list;
    if (!Array.isArray(list)) throw new SyncError(`page ${i + 1}: data.list is not an array`);
    if (page.data?.totalCount !== totalCount) throw new SyncError(`page ${i + 1}: totalCount changed during the sync`);
    for (const item of list as Record<string, unknown>[]) {
      const jobNo = text(item?.jobNo);
      // The custNo filter must hold for every row: a filter the API ignored would otherwise
      // publish other companies' openings as ours.
      if (text(item?.custNo) !== custNo) throw new SyncError(`job ${jobNo || "?"}: belongs to company ${text(item?.custNo) || "?"}, expected ${custNo}`);
      if (!JOB_NO.test(jobNo)) throw new SyncError(`invalid jobNo "${jobNo}"`);
      if (seen.has(jobNo)) throw new SyncError(`duplicate jobNo ${jobNo}`);
      const name = text(item.jobName);
      if (!name) throw new SyncError(`job ${jobNo}: missing jobName`);
      seen.add(jobNo);
      jobs.push({
        jobNo,
        name,
        area: text(item.area),
        areaEng: opt(item.areaEng),
        role: opt(item.jobRole),
        experience: opt(item.periodDesc),
        education: opt(item.optionEdu),
        headcount: opt(item.needEmp),
        salary: opt(item.salaryDesc),
        appearDate: appearDate(item.appearDate),
        url: officialJobUrl((item.link as Record<string, unknown> | undefined)?.job, jobNo),
      });
    }
  }
  if (jobs.length !== totalCount) throw new SyncError(`received ${jobs.length} jobs, API reported totalCount ${totalCount}`);
  jobs.sort((a, b) => (b.appearDate ?? "").localeCompare(a.appearDate ?? "") || a.jobNo.localeCompare(b.jobNo));
  return { totalCount: totalCount as number, jobs };
}

export function companyUrl(custNo = COMPANY_CUST_NO) {
  return `https://www.104.com.tw/company/${custNo}`;
}

export function emptySnapshot(): CareersSnapshot {
  return { status: "not-configured", source: { api: `${API_BASE}${JOBS_PATH}`, custNo: COMPANY_CUST_NO, companyUrl: companyUrl() }, syncedAt: null, totalCount: 0, jobs: [] };
}

export type Decision =
  | { action: "write"; snapshot: CareersSnapshot; reason: string }
  | { action: "keep"; reason: string }
  | { action: "hold-empty"; reason: string };

/**
 * What a validated sync does with the stored snapshot.
 * - A valid zero-openings answer while the site still lists jobs is not published on a schedule
 *   ("hold-empty"): it may be real, or an API/account problem. A person confirms it with a manual
 *   run (allowEmpty), so the page is never emptied by an unattended job.
 * - Unchanged openings keep the file as is: syncedAt records content changes, not every run.
 */
export function decide(previous: CareersSnapshot, result: { totalCount: number; jobs: CareerJob[] }, now: Date, allowEmpty = false): Decision {
  const same = previous.status === "ok" && JSON.stringify(previous.jobs) === JSON.stringify(result.jobs);
  if (same) return { action: "keep", reason: `no change (${result.jobs.length} openings)` };
  if (result.jobs.length === 0 && previous.status === "ok" && previous.jobs.length > 0 && !allowEmpty) {
    return { action: "hold-empty", reason: `104 reported 0 openings; the site keeps the last ${previous.jobs.length}. Confirm with a manual run (allow_empty) if the company really has no openings.` };
  }
  const snapshot: CareersSnapshot = { ...emptySnapshot(), status: "ok", syncedAt: now.toISOString(), totalCount: result.totalCount, jobs: result.jobs };
  return { action: "write", snapshot, reason: `${result.jobs.length} openings` };
}
