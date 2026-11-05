import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {endpointUrl, sendInquiry, UnknownResult, INQUIRY_PROTOCOL, serializeInterests, isInquiryId, type InquiryPayload} from '../src/lib/inquiry.ts';

const protocol = INQUIRY_PROTOCOL, id = '2b0f6a54-6d1b-4c43-9a51-0d6f3c8e2a11';
const valid: InquiryPayload = {
  name: '王小明', organization: '測試單位', jobTitle: '', country: '台灣(中華民國)', email: 'test@example.com', phone: '+886-2-1234-5678',
  topic: 'demo', interest: 'SUT (product:sut)', message: '想了解訓練方案。', language: 'tw', sourcePage: '/bigxreality-web/tw/contact/',
  privacyConsent: 'yes', privacyVersion: '2026-11-04',
};
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const BUSINESS = '客戶詢問', SYSTEM = '_BXR_INQUIRY_SYSTEM', BACKUP = '_BXR_INQUIRY_BACKUP_V1';
const LEGACY_HEADER = ['詢問編號', '收件時間', '處理狀態', '姓名', '公司／單位', '職稱', '國家／地區', 'Email', '電話',
  '洽詢項目', '相關產品／方案', '需求說明', '頁面語言', '來源頁面', '同意隱私權政策', '隱私權政策版本', '內容雜湊'];

/** Minimal Sheets model: cells hold exactly what was written (a leading ' stays visible, as setValues input). */
class MockSheet {
  rows: unknown[][] = []; hidden = false; failWrites = false; frozen = 0;
  name: string;
  constructor(name: string) { this.name = name; }
  getName() { return this.name; }
  setName(name: string) { this.name = name; return this; }
  hideSheet() { this.hidden = true; return this; }
  isSheetHidden() { return this.hidden; }
  setFrozenRows(n: number) { this.frozen = n; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return Math.max(0, ...this.rows.map(r => r.length)); }
  getDataRange() { return {getValues: () => this.rows.map(r => [...r])}; }
  getRange(row: number, col: number, numRows = 1, numCols = 1) {
    const sheet = this;
    return {
      getValues: () => Array.from({length: numRows}, (_, i) => Array.from({length: numCols}, (_, j) => sheet.rows[row - 1 + i]?.[col - 1 + j] ?? '')),
      setValues(values: unknown[][]) {
        if (sheet.failWrites) throw Error('simulated write failure');
        values.forEach((line, i) => { const r = (sheet.rows[row - 1 + i] ??= []); line.forEach((v, j) => { r[col - 1 + j] = v; }); });
      },
      setValue(value: unknown) { this.setValues([[value]]); },
    };
  }
  deleteColumns(start: number, count: number) { this.rows.forEach(r => r.splice(start - 1, count)); }
  copyTo(book: MockBook) { const copy = book.insertSheet('Copy of ' + this.name); copy.rows = this.rows.map(r => [...r]); return copy; }
}
class MockBook {
  sheets: MockSheet[] = [];
  getSheetByName(name: string) { return this.sheets.find(s => s.name === name) ?? null; }
  insertSheet(name: string) { const s = new MockSheet(name); this.sheets.push(s); return s; }
}

const taipeiDay = (d: Date) => new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'}).format(d).replace(/-/g, '');
const plain = (v: unknown) => String(v ?? '').replace(/^'/, '');

function harness(opts: {props?: Record<string, string>; book?: MockBook; now?: () => Date} = {}) {
  const book = opts.book ?? new MockBook(), mail: Record<string, string>[] = [];
  const props: Record<string, string> = {INQUIRY_SPREADSHEET_ID: 'isolated-test-sheet', ALLOW_INQUIRY_API: 'true', ...opts.props};
  let busy = false, release = 0;
  const RealDate = Date;
  let clock = opts.now ?? (() => new RealDate());
  // `new Date()` inside the script follows the test clock; `new Date(x)` is untouched.
  const FakeDate = function (this: unknown, ...args: unknown[]) { return args.length ? new (RealDate as any)(...args) : clock(); } as unknown as DateConstructor;
  (FakeDate as any).prototype = RealDate.prototype; (FakeDate as any).now = () => clock().getTime();
  const context = vm.createContext({
    Date: FakeDate, JSON, console: {error: () => {}},
    PropertiesService: {getScriptProperties: () => ({getProperty: (key: string) => props[key] ?? null, setProperty: (key: string, v: string) => { props[key] = v; }})},
    LockService: {getScriptLock: () => ({tryLock: () => !busy, releaseLock: () => { release++; }})},
    SpreadsheetApp: {openById: () => book, flush: () => {}},
    Utilities: {DigestAlgorithm: {SHA_256: 'sha256'}, Charset: {UTF_8: 'utf8'},
      formatDate: (d: Date, tz: string, pattern: string) => {
        assert.equal(tz, 'Asia/Taipei');
        if (pattern === 'yyyyMMdd') return taipeiDay(d);
        return new Intl.DateTimeFormat('sv-SE', {timeZone: tz, dateStyle: 'short', timeStyle: 'medium'}).format(d);
      },
      // GAS returns signed bytes (-128..127).
      computeDigest: (_a: string, value: string) => [...createHash('sha256').update(value, 'utf8').digest()].map(b => b > 127 ? b - 256 : b)},
    MailApp: {sendEmail: (message: Record<string, string>) => { mail.push(message); }},
    ContentService: {MimeType: {JSON: 'json'}, createTextOutput: (text: string) => ({setMimeType: () => text})},
  });
  vm.runInContext(fs.readFileSync(new URL('../integrations/google-apps-script/inquiry/Code.gs', import.meta.url), 'utf8'), context);
  const setup = () => vm.runInContext('setupInquiry()', context);
  setup();
  const send = (overrides: Record<string, string> = {}, requestId = id) => {
    const parameter = {protocol, requestId, website: '', ...valid, ...overrides};
    context.event = {parameter, parameters: Object.fromEntries(Object.keys(parameter).map(k => [k, [parameter[k as keyof typeof parameter]]])), postData: {length: 800}};
    return JSON.parse(vm.runInContext('doPost(event)', context));
  };
  const business = () => book.getSheetByName(BUSINESS)!, system = () => book.getSheetByName(SYSTEM)!;
  return {book, props, mail, send, setup, business, system, rows: () => business().rows,
    setClock: (f: () => Date) => { clock = f; }, busy: () => busy = true, releases: () => release};
}

test('business sheet has 14 columns; consent, hash and request ID live in the hidden system sheet', () => {
  const h = harness();
  assert.deepEqual(h.rows()[0], ['詢問編號', '收件時間', '處理狀態', '姓名', '公司／單位', '職稱', '國家', 'Email', '電話', '洽詢項目', '相關產品／方案', '需求說明', '頁面語言', '來源頁面']);
  assert.equal(h.system().hidden, true);
  const first = h.send();
  assert.deepEqual([first.ok, first.persisted, first.duplicate, first.requestId], [true, true, false, id]);
  assert.ok(isInquiryId(first.inquiryId), first.inquiryId);
  const row = h.rows()[1];
  assert.equal(row.length, 14);
  assert.equal(plain(row[0]), first.inquiryId); assert.equal(row[0], "'" + first.inquiryId, 'stored as text, not a number');
  assert.equal(row[2], '未處理'); assert.equal(row[3], '王小明'); assert.equal(row[6], '台灣(中華民國)'); assert.equal(row[9], '預約產品展示');
  assert.ok(!row.some(v => v === '同意' || /^'?[0-9a-f]{64}$/.test(String(v))), 'no consent/hash in business row');
  const rec = h.system().rows[1];
  assert.deepEqual([plain(rec[0]), plain(rec[1]), rec[3], plain(rec[4]), rec[6]], [id, first.inquiryId, '同意', '2026-11-04', 'COMPLETE']);
  assert.match(plain(rec[2]), /^[0-9a-f]{64}$/);
});

test('same request ID returns the same inquiry number; changed content conflicts; nothing is duplicated', () => {
  const h = harness();
  const first = h.send();
  const again = h.send();
  assert.deepEqual([again.duplicate, again.inquiryId], [true, first.inquiryId]);
  assert.equal(h.send({message: '改過的內容'}).code, 'ID_CONFLICT');
  assert.equal(h.rows().length, 2); assert.equal(h.system().rows.length, 2);
  assert.equal(h.releases(), 4); // setup + 3 posts
});

test('numbers: Taipei date + daily sequence, midnight reset, 999 → 1000, deleted rows never reused', () => {
  // 2026-11-04 15:59:59Z is 23:59:59 in Taipei; one second later is the next Taipei day.
  let t = new Date('2026-11-04T15:59:00Z');
  const h = harness({now: () => t});
  const a = h.send({}, uuid(1)).inquiryId, b = h.send({}, uuid(2)).inquiryId;
  assert.deepEqual([a, b], ['20261104001', '20261104002']);
  h.rows().splice(2, 1); // staff deletes the 002 row
  assert.equal(h.send({}, uuid(3)).inquiryId, '20261104003', 'deleted number is not reused');
  t = new Date('2026-11-04T16:00:01Z');
  assert.equal(h.send({}, uuid(4)).inquiryId, '20261105001', 'resets at Taipei midnight, not UTC');
  h.props.INQUIRY_SEQ_20261105 = '998';
  for (let i = 0; i < 25; i++) h.system().rows.forEach(r => { if (r[5] instanceof Date) r[5] = new Date(0); }); // keep rate limit out of the way
  assert.equal(h.send({}, uuid(5)).inquiryId, '20261105999');
  h.system().rows.forEach(r => { if (r[5] instanceof Date) r[5] = new Date(0); });
  assert.equal(h.send({}, uuid(6)).inquiryId, '202611051000');
  assert.ok(isInquiryId('202611051000'));
});

test('a lost property never re-issues a number that is still recorded', () => {
  const h = harness({now: () => new Date('2026-11-04T02:00:00Z')});
  h.send({}, uuid(1)); h.send({}, uuid(2));
  delete h.props.INQUIRY_SEQ_20261104;
  assert.equal(h.send({}, uuid(3)).inquiryId, '20261104003');
});

test('interrupted write: business row missing after a PENDING system row is completed on retry with the same number', () => {
  const h = harness();
  h.business().failWrites = true;
  const failed = h.send();
  assert.deepEqual([failed.ok, failed.persisted, failed.code], [false, false, 'STORAGE_ERROR']);
  const pending = h.system().rows[1];
  assert.equal(pending[6], 'PENDING');
  h.business().failWrites = false;
  const retry = h.send();
  assert.deepEqual([retry.ok, retry.persisted, retry.inquiryId], [true, true, plain(pending[1])]);
  assert.equal(h.rows().length, 2); assert.equal(h.system().rows[1][6], 'COMPLETE');
  assert.equal(h.send().duplicate, true); assert.equal(h.rows().length, 2);
});

test('validates fields, consent and bots without writing', () => {
  const h = harness();
  assert.equal(h.send({name: ''}).field, 'name');
  assert.equal(h.send({email: 'not-an-email'}).field, 'email');
  assert.equal(h.send({phone: 'abc'}).field, 'phone');
  assert.equal(h.send({topic: 'other'}).field, 'topic');
  assert.equal(h.send({language: 'fr'}).field, 'language');
  assert.equal(h.send({sourcePage: 'https://evil.example/'}).field, 'sourcePage');
  assert.equal(h.send({message: 'x'.repeat(3001)}).field, 'message');
  assert.equal(h.send({privacyConsent: ''}).code, 'INVALID_FIELD');
  assert.equal(h.send({privacyConsent: 'no'}).code, 'CONSENT_REQUIRED');
  assert.equal(h.send({website: 'bot'}).code, 'REJECTED');
  assert.equal(h.send({}, id + 'x').code, 'INVALID_REQUEST');
  assert.equal(h.send({extra: '1'} as Record<string, string>).code, 'INVALID_REQUEST');
  assert.equal(h.rows().length, 1); assert.equal(h.system().rows.length, 1);
});

test('formula-looking input is stored as text; legacy TW/CN codes become the agreed names', () => {
  const h = harness();
  h.send({name: '=HYPERLINK("https://x.invalid")', organization: '@org', message: '+1 line\nsecond\u0007', country: 'TW'});
  const row = h.rows()[1];
  assert.equal(row[3], `'=HYPERLINK("https://x.invalid")`); assert.equal(row[4], "'@org");
  assert.equal(row[8], "'+886-2-1234-5678"); assert.equal(row[11], "'+1 line\nsecond");
  assert.equal(row[6], '台灣(中華民國)');
  h.send({country: 'CN'}, uuid(9));
  assert.equal(h.rows()[2][6], '中國(中華人民共和國)');
  h.send({country: 'EC'}, uuid(10));
  assert.equal(h.rows()[3][6], '厄瓜多');
  h.send({country: 'Japan'}, uuid(11));
  assert.equal(h.rows()[4][6], 'Japan');
});

test('country and phone are required', () => {
  const h = harness();
  assert.equal(h.send({country: ''}).field, 'country');
  assert.equal(h.send({phone: ''}).field, 'phone');
  assert.equal(h.rows().length, 1);
});

test('setupInquiry converts country codes already in the sheet to Chinese names, idempotently', () => {
  const h = harness();
  h.business().rows.push(["'20261105001", new Date(), '未處理', 'ERIC', 'BXR', 'MKT', 'EC'], ["'20261105002", new Date(), '未處理', 'A', 'B', '', '日本']);
  h.setup(); h.setup();
  assert.deepEqual(h.rows().slice(1).map(r => r[6]), ['厄瓜多', '日本']);
});

test('opt-in, lock-protected, globally bounded', () => {
  const h = harness();
  h.props.ALLOW_INQUIRY_API = 'false'; assert.equal(h.send().code, 'DISABLED'); h.props.ALLOW_INQUIRY_API = 'true';
  const limited = harness();
  for (let i = 0; i < 20; i++) limited.system().rows.push([uuid(100 + i), '20990101' + i, 'h', '同意', 'v', new Date(), 'COMPLETE']);
  assert.equal(limited.send().code, 'RATE_LIMITED');
  h.busy(); assert.equal(h.send().code, 'BUSY');
});

test('notification only when NOTIFY_EMAIL is set, only for new rows, and it carries the inquiry number', () => {
  const off = harness(); off.send(); assert.equal(off.mail.length, 0);
  const on = harness({props: {NOTIFY_EMAIL: 'a@example.com,b@example.com'}});
  const first = on.send(); on.send();
  assert.equal(on.mail.length, 1); assert.equal(on.mail[0].to, 'a@example.com,b@example.com'); assert.equal(on.mail[0].replyTo, 'test@example.com');
  assert.match(on.mail[0].subject, new RegExp(first.inquiryId)); assert.match(on.mail[0].body, /想了解訓練方案/);
});

test('notification is a table: Chinese product names only, page path from the language segment, HTML escaped', () => {
  const h = harness({props: {NOTIFY_EMAIL: 'a@example.com'}});
  h.send({interest: '狙擊槍模擬系統 (product:sniper-simulator); 警勤模擬 (solution:police)', sourcePage: '/bigxreality-web/tw/products/sut/',
    message: '第一行\n<script>x</script>'});
  const {htmlBody, body} = h.mail[0];
  assert.match(htmlBody, /<table/);
  assert.match(htmlBody, /相關產品／方案<\/th><td[^>]*>狙擊槍模擬系統、警勤模擬<\/td>/);
  assert.match(htmlBody, /來源頁面<\/th><td[^>]*>tw\/products\/sut\/<\/td>/);
  assert.doesNotMatch(htmlBody, /product:|solution:|bigxreality-web|<script>/);
  assert.match(htmlBody, /第一行<br>&lt;script&gt;/);
  assert.match(body, /相關產品／方案：狙擊槍模擬系統、警勤模擬/);
});

function legacyBook(rows: unknown[][]) {
  const book = new MockBook();
  const sheet = book.insertSheet(BUSINESS);
  sheet.rows = [[...LEGACY_HEADER], ...rows.map(r => [...r])];
  return book;
}
const legacyRow = (requestId: string, time: string, country: string, status = '未處理', name = '舊客戶') =>
  [requestId, new Date(time), status, name, '單位', '', country, 'old@example.com', '', '產品洽詢', 'SUT (product:sut)', '舊需求', 'tw', '/tw/contact/', '同意', '2026-11-04', 'a'.repeat(64)];

test('setupInquiry migrates the old 17-column sheet: backup first, numbers by received time, status kept', () => {
  const book = legacyBook([
    legacyRow(uuid(2), '2026-11-04T05:00:00Z', 'TW', '已回覆', '第二位'),
    legacyRow(uuid(1), '2026-11-04T03:00:00Z', 'CN', '處理中', '第一位'),
    legacyRow(uuid(3), '2026-11-05T01:00:00Z', 'JP'),
  ]);
  const h = harness({book});
  const backup = book.getSheetByName(BACKUP)!;
  assert.ok(backup && backup.hidden);
  assert.equal(backup.rows.length, 4); assert.equal(backup.rows[0].length, 17); assert.equal(backup.rows[1][0], uuid(2));
  const rows = h.rows();
  assert.equal(rows[0].length, 14); assert.equal(rows[0][6], '國家');
  assert.deepEqual(rows.slice(1).map(r => [plain(r[0]), r[2], r[3], r[6]]), [
    ['20261104002', '已回覆', '第二位', '台灣(中華民國)'],
    ['20261104001', '處理中', '第一位', '中國(中華人民共和國)'],
    ['20261105001', '未處理', '舊客戶', '日本'],
  ]);
  const sys = h.system().rows.slice(1);
  assert.deepEqual(sys.map(r => [plain(r[0]), plain(r[1]), r[3], r[6]]).sort(), [
    [uuid(1), '20261104001', '同意', 'MIGRATED'], [uuid(2), '20261104002', '同意', 'MIGRATED'], [uuid(3), '20261105001', '同意', 'MIGRATED']]);
  // Re-running is a no-op.
  h.setup();
  assert.equal(h.rows().length, 4); assert.equal(h.system().rows.length, 4); assert.equal(book.sheets.filter(s => s.name === BACKUP).length, 1);
  // New inquiries continue after migrated numbers; an old-front-end retry of a migrated request is a duplicate.
  h.setClock(() => new Date('2026-11-04T08:00:00Z'));
  assert.equal(h.send({}, uuid(50)).inquiryId, '20261104003');
});

test('migration interrupted after the first column was renumbered resumes without new numbers', () => {
  const book = legacyBook([legacyRow(uuid(1), '2026-11-04T03:00:00Z', 'TW'), legacyRow(uuid(2), '2026-11-04T04:00:00Z', 'TW')]);
  // Simulate a crash before deleteColumns: run the migration, then put the three old columns back.
  const h = harness({book});
  const sheet = h.business();
  sheet.rows.forEach((r, i) => r.push(...(i === 0 ? LEGACY_HEADER.slice(14) : ['同意', '2026-11-04', 'a'.repeat(64)])));
  sheet.rows[0][6] = '國家';
  h.setup();
  assert.equal(h.rows()[0].length, 14);
  assert.deepEqual(h.rows().slice(1).map(r => plain(r[0])), ['20261104001', '20261104002']);
  assert.equal(h.system().rows.length, 3);
});

test('browser transport: cors POST, readable JSON with matching request ID; malformed reference is "unknown"', async () => {
  assert.throws(() => endpointUrl('https://example.com/exec'));
  assert.throws(() => endpointUrl('https://script.google.com/macros/s/abc/dev'));
  const endpoint = 'https://script.google.com/macros/s/abc/exec';
  const h = harness();
  const fetcher = (async (_input: unknown, init: RequestInit = {}) => {
    assert.equal(init.mode, 'cors'); assert.equal(init.credentials, 'omit'); assert.equal(init.headers, undefined);
    const {protocol: _p, requestId, ...rest} = Object.fromEntries((init.body as URLSearchParams).entries());
    return {ok: true, type: 'cors', status: 200, json: async () => h.send(rest, requestId)} as Response;
  }) as typeof fetch;
  const reply = await sendInquiry(endpoint, id, valid, '', fetcher);
  assert.deepEqual([reply.ok, reply.persisted], [true, true]); assert.ok(isInquiryId(reply.inquiryId));
  assert.equal((await sendInquiry(endpoint, id, valid, '', fetcher)).inquiryId, reply.inquiryId);
  assert.equal(h.rows().length, 2);
  const fake = (value: unknown) => (async () => ({ok: true, type: 'cors', status: 200, json: async () => value})) as unknown as typeof fetch;
  await assert.rejects(sendInquiry(endpoint, id, valid, '', fake({ok: true, persisted: true, protocol, requestId: id, inquiryId: 'abc'})), UnknownResult);
  await assert.rejects(sendInquiry(endpoint, id, valid, '', fake({ok: true, persisted: true, protocol, requestId: id, inquiryId: 20261104001})), UnknownResult);
  // A receiver deployed before numbering omits inquiryId: still a confirmed write, just no reference.
  assert.equal((await sendInquiry(endpoint, id, valid, '', fake({ok: true, persisted: true, protocol, requestId: id}))).inquiryId, undefined);
  await assert.rejects(sendInquiry(endpoint, id, valid, '', (async () => ({ok: true, type: 'opaque', status: 0})) as unknown as typeof fetch), UnknownResult);
  await assert.rejects(sendInquiry(endpoint, id, valid, '', (async () => { throw new TypeError('network'); }) as typeof fetch), UnknownResult);
  await assert.rejects(sendInquiry(endpoint, id, valid, '', fake({ok: true, persisted: true, protocol, requestId: 'other'})), UnknownResult);
});

// A full-name field must preserve cultural ordering, spaces, accents and single names.
test('inquiry names preserve given/family ordering and international spelling without splitting', () => {
  for (const name of ['Alex Morgan', 'Morgan Alex', '山田 太郎', '山田太郎', 'François O’Connor', 'María-José García López', 'Sukarno']) {
    const h = harness();
    assert.equal(h.send({name}).persisted, true, name);
    assert.equal(h.rows()[1][3], name, name);
  }
});

test('multiple interests remain in one existing cell without truncation or duplicate values', () => {
  const values = Array.from({length: 18}, (_, i) => `產品／方案 ${i} (product:example-${i})`);
  const interest = serializeInterests([...values, values[0], '']);
  assert.ok(interest.length > 200);
  assert.equal(interest, values.join('; '));
  const h = harness();
  assert.equal(h.send({interest}).persisted, true);
  assert.equal(h.rows()[1][10], interest);
  assert.equal(h.send({interest}).duplicate, true);
  assert.equal(h.rows().length, 2);
  assert.equal(h.send({interest: 'x'.repeat(3001)}).field, 'interest');
});
