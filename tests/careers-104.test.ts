import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePages, decide, officialJobUrl, emptySnapshot, SyncError, COMPANY_CUST_NO, COLUMNS, type CareersSnapshot } from '../src/lib/careers-104.ts';

const item = (jobNo: string, extra: Record<string, unknown> = {}) => ({
  jobNo, jobName: `職缺 ${jobNo}`, custNo: COMPANY_CUST_NO, custName: '全球動力科技股份有限公司', area: '台北市大安區', areaEng: "Da'an Dist., Taipei City",
  jobRole: '1', periodDesc: '經歷不拘', optionEdu: '大學', needEmp: '1人', salaryDesc: '待遇面議', appearDate: '20261101',
  link: { job: `//www.104.com.tw/job/${jobNo}`, cust: `//www.104.com.tw/company/${COMPANY_CUST_NO}` }, ...extra,
});
const page = (list: unknown[], totalCount = list.length, pageNo = 1, totalPage = 1) => ({ data: { totalCount, totalPage, pageNo, list }, metadata: {} });
const now = new Date('2026-12-01T02:17:00Z');

test('valid company openings keep only public fields and the official 104 job URL', () => {
  const { jobs, totalCount } = parsePages([page([item('8abc1', { appearDate: '20261020' }), item('8abc2')])]);
  assert.equal(totalCount, 2);
  assert.deepEqual(jobs.map((j) => j.jobNo), ['8abc2', '8abc1'], 'newest first');
  assert.equal(jobs[0].url, 'https://www.104.com.tw/job/8abc2');
  assert.equal(jobs[0].appearDate, '2026-11-01');
  assert.ok(!('applyCount' in jobs[0]) && !('custName' in jobs[0]));
  assert.ok(!COLUMNS.includes('applyCount'), 'applicant counts are never requested');
});

test('anything unexpected throws, so the previous snapshot is kept', () => {
  const bad: [string, unknown[]][] = [
    ['another company (filter ignored)', [page([item('a1', { custNo: '12v3o7uw' })])]],
    ['link to another job', [page([item('a1', { link: { job: '//www.104.com.tw/job/zz9' } })])]],
    ['link off 104', [page([item('a1', { link: { job: 'https://evil.example/job/a1' } })])]],
    ['missing link', [page([item('a1', { link: undefined })])]],
    ['missing title', [page([item('a1', { jobName: ' ' })])]],
    ['duplicate job', [page([item('a1'), item('a1')])]],
    ['count mismatch (truncated paging)', [page([item('a1')], 2)]],
    ['no totalCount', [{ data: { list: [] } }]],
    ['list not an array', [{ data: { totalCount: 0, list: null } }]],
    ['error body', [{ error: { message: 'Unauthorized' } }]],
    ['totalCount changes between pages', [page([item('a1')], 2, 1, 2), page([item('a2')], 3, 2, 2)]],
  ];
  for (const [name, pages] of bad) assert.throws(() => parsePages(pages as never), SyncError, name);
  assert.throws(() => officialJobUrl('http://www.104.com.tw/job/a1', 'a1'), SyncError);
  assert.equal(officialJobUrl('https://www.104.com.tw/job/a1?jobsource=x', 'a1'), 'https://www.104.com.tw/job/a1');
});

test('multi-page responses are combined', () => {
  const { jobs } = parsePages([page([item('a1')], 2, 1, 2), page([item('a2')], 2, 2, 2)]);
  assert.equal(jobs.length, 2);
});

test('zero openings: published on a first sync, held on a schedule while jobs are listed, published when confirmed', () => {
  const zero = parsePages([page([])]);
  const first = decide(emptySnapshot(), zero, now);
  assert.equal(first.action, 'write');
  const listed = decide(emptySnapshot(), parsePages([page([item('a1')])]), now);
  assert.equal(listed.action, 'write');
  const prev = (listed as { snapshot: CareersSnapshot }).snapshot;
  assert.equal(decide(prev, zero, now).action, 'hold-empty');
  const confirmed = decide(prev, zero, now, true);
  assert.equal(confirmed.action, 'write');
  assert.equal((confirmed as { snapshot: CareersSnapshot }).snapshot.jobs.length, 0);
});

test('an unchanged result keeps the file and its last sync date', () => {
  const result = parsePages([page([item('a1')])]);
  const prev = (decide(emptySnapshot(), result, new Date('2026-11-01T00:00:00Z')) as { snapshot: CareersSnapshot }).snapshot;
  assert.deepEqual(decide(prev, result, now), { action: 'keep', reason: 'no change (1 openings)' });
});

test('committed snapshots are well-formed and the official one shows no openings before the first sync', () => {
  for (const file of ['src/data/careers-104.json', 'tests/fixtures/careers-104.json']) {
    const s = JSON.parse(readFileSync(file, 'utf8')) as CareersSnapshot;
    assert.equal(s.source.custNo, COMPANY_CUST_NO);
    assert.ok(['not-configured', 'ok'].includes(s.status));
    if (s.status === 'not-configured') assert.equal(s.jobs.length + Number(s.syncedAt !== null), 0);
    for (const j of s.jobs) assert.equal(officialJobUrl(j.url, j.jobNo), j.url);
  }
});
