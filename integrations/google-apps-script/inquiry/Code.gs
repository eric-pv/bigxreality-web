/**
 * BXR 客戶詢問收件程式（正式版，支援產品／方案複選）。Astro 共用詢問表單 → 本 Web App → Google 試算表「客戶詢問」分頁。
 * 設定與部署：docs/inquiry/PRODUCTION-SETUP.md。傳輸協定已於 2026-11-04 以 Pages origin 實測（docs/inquiry/POC-VALIDATION.md）。
 *
 * 指令碼屬性：
 *   INQUIRY_SPREADSHEET_ID  收件試算表 ID（必填）
 *   ALLOW_INQUIRY_API       'true' 才接受送件；其他值一律回 DISABLED
 *   NOTIFY_EMAIL            （選填）收到新詢問時寄通知的信箱；留空不寄
 */
var INQUIRY_PROTOCOL = 'bxr-inquiry-v1';
var INQUIRY_SHEET = '客戶詢問';
var INQUIRY_HEADER = ['詢問編號', '收件時間', '處理狀態', '姓名', '公司／單位', '職稱', '國家／地區', 'Email', '電話',
  '洽詢項目', '相關產品／方案', '需求說明', '頁面語言', '來源頁面', '同意隱私權政策', '隱私權政策版本', '內容雜湊'];
var COL_ID = 0, COL_TIME = 1, COL_HASH = 16;
var NEW_STATUS = '未處理';
var TOPICS = ['general', 'demo', 'info', 'product', 'solution', 'solution-demo', 'needs'];
var TOPIC_LABELS = {general: '一般洽詢', demo: '預約產品展示', info: '索取產品資料', product: '產品洽詢', solution: '解決方案洽詢', 'solution-demo': '預約解決方案展示', needs: '訓練需求討論'};
// 欄位：[參數名稱, 最大長度, 是否必填]
var FIELDS = [['name', 100, true], ['organization', 150, true], ['jobTitle', 100, false], ['country', 80, false],
  ['email', 254, true], ['phone', 40, false], ['topic', 20, true], ['interest', 3000, false], ['message', 3000, true],
  ['language', 2, true], ['sourcePage', 300, true], ['privacyConsent', 3, true], ['privacyVersion', 20, true]];
var ALLOWED_KEYS = ['protocol', 'requestId', 'website'].concat(FIELDS.map(function(f) { return f[0]; }));
var MAX_PER_MINUTE = 20;

function setupInquiry() {
  var book = SpreadsheetApp.openById(prop_('INQUIRY_SPREADSHEET_ID'));
  var sheet = book.getSheetByName(INQUIRY_SHEET) || book.insertSheet(INQUIRY_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, INQUIRY_HEADER.length).setValues([INQUIRY_HEADER]);
    if (sheet.setFrozenRows) sheet.setFrozenRows(1);
  }
  assertHeader_(sheet);
}

function doGet() {
  return json_({ok: true, protocol: INQUIRY_PROTOCOL, persisted: false});
}

function doPost(e) {
  var p = e && e.parameter || {};
  var id = typeof p.requestId === 'string' ? p.requestId : '';
  var fail = function(code, field) {
    var out = {ok: false, persisted: false, protocol: INQUIRY_PROTOCOL, requestId: id, code: code};
    if (field) out.field = field;
    return json_(out);
  };
  if (prop_('ALLOW_INQUIRY_API') !== 'true') return fail('DISABLED');
  if (!e || !e.postData || e.postData.length > 65536) return fail('INVALID_REQUEST');
  if (Object.keys(p).some(function(k) { return ALLOWED_KEYS.indexOf(k) < 0; })) return fail('INVALID_REQUEST');
  if (Object.keys(e.parameters || {}).some(function(k) { return e.parameters[k].length !== 1; })) return fail('INVALID_REQUEST');
  if (p.protocol !== INQUIRY_PROTOCOL || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return fail('INVALID_REQUEST');
  if (p.website) return fail('REJECTED');

  var v = {};
  for (var i = 0; i < FIELDS.length; i++) {
    var key = FIELDS[i][0], value = typeof p[key] === 'string' ? clean_(p[key], key === 'message') : '';
    if (value.length > FIELDS[i][1]) return fail('INVALID_FIELD', key);
    if (FIELDS[i][2] && !value) return fail('INVALID_FIELD', key);
    v[key] = value;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return fail('INVALID_FIELD', 'email');
  if (v.phone && !/^[0-9+()#.\-\s]{5,40}$/.test(v.phone)) return fail('INVALID_FIELD', 'phone');
  if (TOPICS.indexOf(v.topic) < 0) return fail('INVALID_FIELD', 'topic');
  if (['tw', 'en', 'jp'].indexOf(v.language) < 0) return fail('INVALID_FIELD', 'language');
  if (!/^\/[\w\-./%]*$/.test(v.sourcePage)) return fail('INVALID_FIELD', 'sourcePage');
  if (v.privacyConsent !== 'yes') return fail('CONSENT_REQUIRED', 'privacyConsent');

  var hash = hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(FIELDS.map(function(f) { return v[f[0]]; })), Utilities.Charset.UTF_8));
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return fail('BUSY');
  var saved = false, now = new Date();
  try {
    var sheet = SpreadsheetApp.openById(prop_('INQUIRY_SPREADSHEET_ID')).getSheetByName(INQUIRY_SHEET);
    assertHeader_(sheet);
    var rows = sheet.getDataRange().getValues().slice(1);
    var existing = rows.find(function(row) { return row[COL_ID] === id; });
    if (existing) {
      if (existing[COL_HASH] !== hash) return fail('ID_CONFLICT');
      return json_({ok: true, protocol: INQUIRY_PROTOCOL, requestId: id, persisted: true, duplicate: true});
    }
    // 全域上限：GAS 取不到訪客 IP，這只防止大量灌單，不是每位訪客的限速。
    var recent = rows.filter(function(row) { return row[COL_TIME] instanceof Date && now.getTime() - row[COL_TIME].getTime() < 60000; });
    if (recent.length >= MAX_PER_MINUTE) return fail('RATE_LIMITED');
    var rowNumber = sheet.getLastRow() + 1;
    var record = [id, now, NEW_STATUS, v.name, v.organization, v.jobTitle, v.country, v.email, v.phone,
      TOPIC_LABELS[v.topic], v.interest, v.message, v.language, v.sourcePage, v.privacyConsent === 'yes' ? '同意' : '',
      v.privacyVersion].map(cell_).concat([hash]);
    sheet.getRange(rowNumber, 1, 1, INQUIRY_HEADER.length).setValues([record]);
    SpreadsheetApp.flush();
    var check = sheet.getRange(rowNumber, 1, 1, INQUIRY_HEADER.length).getValues()[0];
    if (check[COL_ID] !== id || check[COL_HASH] !== hash) return fail('WRITE_UNCONFIRMED');
    saved = true;
  } catch (error) {
    console.error('BXR_INQUIRY_STORAGE_ERROR');
    return fail('STORAGE_ERROR');
  } finally {
    lock.releaseLock();
  }
  if (saved) notify_(id, now, v);
  return json_({ok: true, protocol: INQUIRY_PROTOCOL, requestId: id, persisted: true, duplicate: false});
}

/** 通知失敗不影響收件結果：資料已寫入試算表。 */
function notify_(id, time, v) {
  var to = prop_('NOTIFY_EMAIL');
  if (!to) return;
  try {
    MailApp.sendEmail({
      to: to,
      replyTo: v.email,
      subject: '[BXR 官網詢問] ' + TOPIC_LABELS[v.topic] + '－' + v.organization + ' ' + v.name,
      body: ['官網收到新的客戶詢問，完整資料在收件試算表「' + INQUIRY_SHEET + '」分頁。', '',
        '詢問編號：' + id, '收件時間：' + time.toISOString(), '姓名：' + v.name, '公司／單位：' + v.organization,
        '職稱：' + v.jobTitle, '國家／地區：' + v.country, 'Email：' + v.email, '電話：' + v.phone,
        '洽詢項目：' + TOPIC_LABELS[v.topic], '相關產品／方案：' + v.interest, '頁面語言：' + v.language,
        '來源頁面：' + v.sourcePage, '', '需求說明：', v.message].join('\n'),
    });
  } catch (error) {
    console.error('BXR_INQUIRY_NOTIFY_ERROR');
  }
}

/** 去除控制字元；單行欄位併成一行。 */
function clean_(value, multiline) {
  var text = String(value).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  if (!multiline) text = text.replace(/[\n\t]+/g, ' ');
  return text.trim();
}

/** 試算表公式注入防護：以 = + - @ 開頭的文字前加 '，一律存成純文字。 */
function cell_(value) {
  return typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
}

/** 雜湊以小寫十六進位儲存，開頭不會是公式字元。GAS 的位元組是 -128～127。 */
function hex_(bytes) {
  return bytes.map(function(b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join('');
}

function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function assertHeader_(sheet) {
  if (!sheet || JSON.stringify(sheet.getRange(1, 1, 1, INQUIRY_HEADER.length).getValues()[0]) !== JSON.stringify(INQUIRY_HEADER)) {
    throw new Error('「' + INQUIRY_SHEET + '」分頁的標題列不符，請先執行 setupInquiry，且不要修改第一列。');
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
