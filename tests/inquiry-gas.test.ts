import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {endpointUrl, sendInquiry, UnknownResult, INQUIRY_PROTOCOL, serializeInterests, type InquiryPayload} from '../src/lib/inquiry.ts';

const protocol = INQUIRY_PROTOCOL, id = '2b0f6a54-6d1b-4c43-9a51-0d6f3c8e2a11';
const valid: InquiryPayload = {
  name: '王小明', organization: '測試單位', jobTitle: '', country: '台灣', email: 'test@example.com', phone: '+886-2-1234-5678',
  topic: 'demo', interest: 'SUT (product:sut)', message: '想了解訓練方案。', language: 'tw', sourcePage: '/bigxreality-web/tw/contact/',
  privacyConsent: 'yes', privacyVersion: '2026-11-04',
};

function harness(extraProps: Record<string, string> = {}) {
  const rows: unknown[][] = [], mail: Record<string, string>[] = [];
  const props: Record<string, string> = {INQUIRY_SPREADSHEET_ID: 'isolated-test-sheet', ALLOW_INQUIRY_API: 'true', ...extraProps};
  let busy = false, fail = false, release = 0;
  const sheet = {
    getLastRow: () => rows.length, setFrozenRows: () => {},
    getDataRange: () => ({getValues: () => rows.map(r => [...r])}),
    getRange: (row: number, _column: number, count: number) => ({
      getValues: () => Array.from({length: count}, (_, i) => rows[row - 1 + i] ?? []),
      setValues: (values: unknown[][]) => { if (fail) throw Error('simulated write failure'); for (let i = 0; i < values.length; i++) rows[row - 1 + i] = values[i]; },
    }),
  };
  const context = vm.createContext({
    Date, JSON, console: {error: () => {}},
    PropertiesService: {getScriptProperties: () => ({getProperty: (key: string) => props[key] ?? null})},
    LockService: {getScriptLock: () => ({tryLock: () => !busy, releaseLock: () => { release++; }})},
    SpreadsheetApp: {openById: () => ({getSheetByName: () => sheet, insertSheet: () => sheet}), flush: () => {}},
    Utilities: {DigestAlgorithm: {SHA_256: 'sha256'}, Charset: {UTF_8: 'utf8'},
      // GAS returns signed bytes (-128..127).
      computeDigest: (_a: string, value: string) => [...createHash('sha256').update(value, 'utf8').digest()].map(b => b > 127 ? b - 256 : b)},
    MailApp: {sendEmail: (message: Record<string, string>) => { mail.push(message); }},
    ContentService: {MimeType: {JSON: 'json'}, createTextOutput: (text: string) => ({setMimeType: () => text})},
  });
  vm.runInContext(fs.readFileSync(new URL('../integrations/google-apps-script/inquiry/Code.gs', import.meta.url), 'utf8'), context);
  vm.runInContext('setupInquiry()', context);
  const send = (overrides: Record<string, string> = {}, requestId = id) => {
    const parameter = {protocol, requestId, website: '', ...valid, ...overrides};
    context.event = {parameter, parameters: Object.fromEntries(Object.keys(parameter).map(k => [k, [parameter[k as keyof typeof parameter]]])), postData: {length: 800}};
    return JSON.parse(vm.runInContext('doPost(event)', context));
  };
  return {rows, props, mail, send, busy: () => busy = true, fail: () => fail = true, releases: () => release};
}

test('inquiry receiver writes one confirmed row; same ID is idempotent, changed content conflicts', () => {
  const h = harness();
  const first = h.send();
  assert.deepEqual([first.ok, first.persisted, first.duplicate], [true, true, false]);
  assert.equal(h.rows.length, 2);
  const row = h.rows[1];
  assert.equal(row[0], id); assert.ok(row[1] instanceof Date); assert.equal(row[2], '未處理');
  assert.equal(row[3], '王小明'); assert.equal(row[9], '預約產品展示'); assert.equal(row[14], '同意'); assert.equal(row[15], '2026-11-04');
  assert.match(String(row[16]), /^[0-9a-f]{64}$/);
  assert.equal(h.send().duplicate, true); assert.equal(h.rows.length, 2);
  assert.equal(h.send({message: '改過的內容'}).code, 'ID_CONFLICT'); assert.equal(h.rows.length, 2);
  assert.equal(h.releases(), 3);
});

test('inquiry receiver validates fields, consent and bots without writing', () => {
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
  assert.equal(h.rows.length, 1);
});

test('formula-looking input is stored as text, control characters removed', () => {
  const h = harness();
  h.send({name: '=HYPERLINK("https://x.invalid")', organization: '@org', message: '+1 line\nsecond\u0007'});
  const row = h.rows[1];
  assert.equal(row[3], `'=HYPERLINK("https://x.invalid")`); assert.equal(row[4], "'@org");
  assert.equal(row[8], "'+886-2-1234-5678"); assert.equal(row[11], "'+1 line\nsecond");
});

test('receiver is opt-in, lock-protected, globally bounded and reports storage failure', () => {
  const h = harness();
  h.props.ALLOW_INQUIRY_API = 'false'; assert.equal(h.send().code, 'DISABLED'); h.props.ALLOW_INQUIRY_API = 'true';
  h.busy(); assert.equal(h.send().code, 'BUSY');
  const limited = harness();
  for (let i = 0; i < 20; i++) limited.rows.push(['other-' + i, new Date(), '未處理']);
  assert.equal(limited.send().code, 'RATE_LIMITED');
  const broken = harness(); broken.fail();
  const failed = broken.send(); assert.deepEqual([failed.ok, failed.persisted, failed.code], [false, false, 'STORAGE_ERROR']);
});

test('notification e-mail is sent only when NOTIFY_EMAIL is set, and only for new rows', () => {
  const off = harness(); off.send(); assert.equal(off.mail.length, 0);
  const on = harness({NOTIFY_EMAIL: 'sales@example.com'});
  on.send(); on.send();
  assert.equal(on.mail.length, 1); assert.equal(on.mail[0].to, 'sales@example.com'); assert.equal(on.mail[0].replyTo, 'test@example.com');
  assert.match(on.mail[0].body, /想了解訓練方案/);
});

test('browser transport: cors POST, only matching readable JSON counts, everything else is "unknown"', async () => {
  assert.throws(() => endpointUrl('https://example.com/exec'));
  assert.throws(() => endpointUrl('https://script.google.com/macros/s/abc/dev'));
  const endpoint = 'https://script.google.com/macros/s/abc/exec';
  const h = harness();
  const fetcher = (async (_input: unknown, init: RequestInit = {}) => {
    assert.equal(init.mode, 'cors'); assert.equal(init.credentials, 'omit'); assert.equal(init.headers, undefined);
    const body = init.body as URLSearchParams;
    const params = Object.fromEntries(body.entries());
    const {protocol: _p, requestId, ...rest} = params;
    return {ok: true, type: 'cors', status: 200, json: async () => h.send(rest, requestId)} as Response;
  }) as typeof fetch;
  const reply = await sendInquiry(endpoint, id, valid, '', fetcher);
  assert.deepEqual([reply.ok, reply.persisted], [true, true]);
  assert.equal((await sendInquiry(endpoint, id, valid, '', fetcher)).duplicate, true);
  assert.equal(h.rows.length, 2);
  await assert.rejects(sendInquiry(endpoint, id, valid, '', (async () => ({ok: true, type: 'opaque', status: 0})) as unknown as typeof fetch), UnknownResult);
  await assert.rejects(sendInquiry(endpoint, id, valid, '', (async () => { throw new TypeError('network'); }) as typeof fetch), UnknownResult);
  await assert.rejects(sendInquiry(endpoint, id, valid, '', (async () => ({ok: true, type: 'cors', status: 200, json: async () => ({ok: true, persisted: true, protocol, requestId: 'other'})})) as unknown as typeof fetch), UnknownResult);
});

// A full-name field must preserve cultural ordering, spaces, accents and single names.
test('inquiry names preserve given/family ordering and international spelling without splitting', () => {
  for (const name of ['Alex Morgan', 'Morgan Alex', '山田 太郎', '山田太郎', 'François O’Connor', 'María-José García López', 'Sukarno']) {
    const h = harness();
    assert.equal(h.send({name}).persisted, true, name);
    assert.equal(h.rows[1][3], name, name);
  }
});

test('multiple interests remain in one existing cell without truncation or duplicate values', () => {
  const values=Array.from({length:18},(_,i)=>`產品／方案 ${i} (product:example-${i})`);
  const interest=serializeInterests([...values,values[0], ""]);
  assert.ok(interest.length>200);
  assert.equal(interest,values.join("; "));
  const h=harness();
  assert.equal(h.send({interest}).persisted,true);
  assert.equal(h.rows[1][10],interest);
  assert.equal(h.send({interest}).duplicate,true);
  assert.equal(h.rows.length,2);
  assert.equal(h.send({interest:"x".repeat(3001)}).field,"interest");
});
