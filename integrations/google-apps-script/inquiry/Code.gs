/**
 * BXR 客戶詢問收件程式（正式版）。Astro 詢問表單 → 本 Web App → Google 試算表。
 * 設定與部署：docs/inquiry/PRODUCTION-SETUP.md。
 *
 * 更新方式：整份替換本檔 → 儲存 → 執行一次 setupInquiry → 部署「管理部署作業 → 鉛筆 → 新版本」。
 *
 * 分頁：
 *   客戶詢問              業務用，14 欄。詢問編號為台北日期＋當日流水號（20261104001）。
 *   _BXR_INQUIRY_SYSTEM   隱藏。請求識別碼（UUID，去重用）、內容雜湊、同意紀錄、政策版本。
 *   _BXR_INQUIRY_BACKUP_V1 隱藏。setupInquiry 從舊 17 欄格式移轉前的完整備份（只在有舊資料時建立）。
 *
 * 指令碼屬性（沿用）：INQUIRY_SPREADSHEET_ID、ALLOW_INQUIRY_API、NOTIFY_EMAIL（選填，多人以逗號分隔）。
 * 程式另自動維護 INQUIRY_SEQ_yyyyMMdd（每天已發出的最大流水號），請勿手動修改。
 */
var INQUIRY_PROTOCOL = 'bxr-inquiry-v1';
var INQUIRY_SHEET = '客戶詢問';
var SYSTEM_SHEET = '_BXR_INQUIRY_SYSTEM';
var BACKUP_SHEET = '_BXR_INQUIRY_BACKUP_V1';
var TIME_ZONE = 'Asia/Taipei';
var INQUIRY_HEADER = ['詢問編號', '收件時間', '處理狀態', '姓名', '公司／單位', '職稱', '國家', 'Email', '電話',
  '洽詢項目', '相關產品／方案', '需求說明', '頁面語言', '來源頁面'];
var SYSTEM_HEADER = ['請求識別碼', '詢問編號', '內容雜湊', '同意紀錄', '政策版本', '收件時間', '寫入狀態'];
// 舊版（2026-11-04 起）17 欄格式；setupInquiry 會移轉成上面的格式。
var LEGACY_HEADER = ['詢問編號', '收件時間', '處理狀態', '姓名', '公司／單位', '職稱', '國家／地區', 'Email', '電話',
  '洽詢項目', '相關產品／方案', '需求說明', '頁面語言', '來源頁面', '同意隱私權政策', '隱私權政策版本', '內容雜湊'];
var S_REQUEST = 0, S_INQUIRY = 1, S_HASH = 2, S_TIME = 5, S_STATE = 6;
var NEW_STATUS = '未處理';
var TOPICS = ['general', 'demo', 'info', 'product', 'solution', 'solution-demo', 'needs'];
var TOPIC_LABELS = {general: '一般洽詢', demo: '預約產品展示', info: '索取產品資料', product: '產品洽詢', solution: '解決方案洽詢', 'solution-demo': '預約解決方案展示', needs: '訓練需求討論'};
// 舊版網站送出 ISO 代碼；這兩個依業主指定名稱顯示。其他代碼原樣保存。
var LEGACY_COUNTRY = {TW: '台灣(中華民國)', CN: '中國(中華人民共和國)'};
// 欄位：[參數名稱, 最大長度, 是否必填]
var FIELDS = [['name', 100, true], ['organization', 150, true], ['jobTitle', 100, false], ['country', 80, false],
  ['email', 254, true], ['phone', 40, false], ['topic', 20, true], ['interest', 3000, false], ['message', 3000, true],
  ['language', 2, true], ['sourcePage', 300, true], ['privacyConsent', 3, true], ['privacyVersion', 20, true]];
var ALLOWED_KEYS = ['protocol', 'requestId', 'website'].concat(FIELDS.map(function(f) { return f[0]; }));
var MAX_PER_MINUTE = 20;

/** 建立分頁；若「客戶詢問」仍是舊 17 欄格式，先備份再移轉。可重複執行。 */
function setupInquiry() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('系統忙碌中，請稍後再執行 setupInquiry。');
  try {
    var book = SpreadsheetApp.openById(prop_('INQUIRY_SPREADSHEET_ID'));
    var system = systemSheet_(book);
    var sheet = book.getSheetByName(INQUIRY_SHEET);
    if (!sheet) {
      sheet = book.insertSheet(INQUIRY_SHEET);
      sheet.getRange(1, 1, 1, INQUIRY_HEADER.length).setValues([INQUIRY_HEADER]);
      if (sheet.setFrozenRows) sheet.setFrozenRows(1);
    } else if (isLegacy_(sheet)) {
      migrate_(book, sheet, system);
    }
    assertHeader_(sheet);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ok: true, protocol: INQUIRY_PROTOCOL, persisted: false, referenceFormat: 'YYYYMMDDNNN'});
}

function doPost(e) {
  var p = e && e.parameter || {};
  var id = typeof p.requestId === 'string' ? p.requestId : '';
  var fail = function(code, field) {
    var out = {ok: false, persisted: false, protocol: INQUIRY_PROTOCOL, requestId: id, code: code};
    if (field) out.field = field;
    return json_(out);
  };
  var done = function(inquiryId, duplicate) {
    return json_({ok: true, protocol: INQUIRY_PROTOCOL, requestId: id, inquiryId: inquiryId, persisted: true, duplicate: duplicate});
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

  // 雜湊以收到的原始欄位計算（國家名稱轉換前），與舊版資料相容。
  var hash = hash_(v);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return fail('BUSY');
  var created = null, now = new Date();
  try {
    var book = SpreadsheetApp.openById(prop_('INQUIRY_SPREADSHEET_ID'));
    var sheet = book.getSheetByName(INQUIRY_SHEET), system = book.getSheetByName(SYSTEM_SHEET);
    assertHeader_(sheet);
    assertSystem_(system);
    var records = system.getDataRange().getValues().slice(1);
    var index = -1;
    for (var r = 0; r < records.length; r++) if (text_(records[r][S_REQUEST]) === id) { index = r; break; }
    if (index >= 0) {
      var existing = records[index];
      if (text_(existing[S_HASH]) !== hash) return fail('ID_CONFLICT');
      var existingId = text_(existing[S_INQUIRY]);
      if (existing[S_STATE] === 'PENDING') {
        // 上次在寫入業務列前中斷：補寫同一個編號，不重新配號。
        if (!findRow_(sheet, existingId)) writeBusiness_(sheet, existingId, existing[S_TIME] instanceof Date ? existing[S_TIME] : now, v);
        if (!findRow_(sheet, existingId)) return fail('WRITE_UNCONFIRMED');
        system.getRange(index + 2, S_STATE + 1).setValue('COMPLETE');
        SpreadsheetApp.flush();
        created = existingId;
      } else {
        return done(existingId, true);
      }
    } else {
      // 全域上限：GAS 取不到訪客 IP，這只防止大量灌單，不是每位訪客的限速。
      var recent = records.filter(function(row) { return row[S_TIME] instanceof Date && now.getTime() - row[S_TIME].getTime() < 60000; });
      if (recent.length >= MAX_PER_MINUTE) return fail('RATE_LIMITED');
      var inquiryId = allocate_(now, records.map(function(row) { return text_(row[S_INQUIRY]); }));
      // 先記錄系統列（PENDING），再寫業務列，最後標記 COMPLETE。中斷時以同一請求重送可補完。
      var systemRow = system.getLastRow() + 1;
      system.getRange(systemRow, 1, 1, SYSTEM_HEADER.length).setValues([[asText_(id), asText_(inquiryId), asText_(hash), '同意', asText_(v.privacyVersion), now, 'PENDING']]);
      writeBusiness_(sheet, inquiryId, now, v);
      SpreadsheetApp.flush();
      if (!findRow_(sheet, inquiryId)) return fail('WRITE_UNCONFIRMED');
      system.getRange(systemRow, S_STATE + 1).setValue('COMPLETE');
      SpreadsheetApp.flush();
      created = inquiryId;
    }
  } catch (error) {
    console.error('BXR_INQUIRY_STORAGE_ERROR');
    return fail('STORAGE_ERROR');
  } finally {
    lock.releaseLock();
  }
  notify_(created, now, v);
  return done(created, false);
}

/** 台北日期＋當日流水號（至少 3 位）。屬性保存每天的最高號，刪列不會重用；失敗可能跳號。 */
function allocate_(now, existingIds) {
  var day = Utilities.formatDate(now, TIME_ZONE, 'yyyyMMdd');
  var props = PropertiesService.getScriptProperties();
  var key = 'INQUIRY_SEQ_' + day;
  var high = Number(props.getProperty(key) || 0);
  existingIds.forEach(function(value) {
    if (value.length > 8 && value.slice(0, 8) === day && /^\d+$/.test(value.slice(8))) high = Math.max(high, Number(value.slice(8)));
  });
  var next = high + 1;
  props.setProperty(key, String(next));
  return day + String(next).padStart(3, '0');
}

function writeBusiness_(sheet, inquiryId, time, v) {
  var row = sheet.getLastRow() + 1;
  var country = LEGACY_COUNTRY[v.country] || v.country;
  sheet.getRange(row, 1, 1, INQUIRY_HEADER.length).setValues([[asText_(inquiryId), time].concat(
    [NEW_STATUS, v.name, v.organization, v.jobTitle, country, v.email, v.phone, TOPIC_LABELS[v.topic],
      v.interest, v.message, v.language, v.sourcePage].map(cell_))]);
}

function findRow_(sheet, inquiryId) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) if (text_(ids[i][0]) === inquiryId) return i + 2;
  return 0;
}

/** 舊 17 欄 → 新 14 欄。先複製整份分頁為隱藏備份，再就地改寫（保留格式、篩選與業務已改的處理狀態）。 */
function migrate_(book, sheet, system) {
  if (!book.getSheetByName(BACKUP_SHEET)) {
    var backup = sheet.copyTo(book);
    backup.setName(BACKUP_SHEET);
    backup.hideSheet();
  }
  var last = sheet.getLastRow();
  var rows = last > 1 ? sheet.getRange(2, 1, last - 1, LEGACY_HEADER.length).getValues() : [];
  var records = system.getDataRange().getValues().slice(1);
  var byRequest = {}, byInquiry = {};
  records.forEach(function(rec) { byRequest[text_(rec[S_REQUEST])] = text_(rec[S_INQUIRY]); byInquiry[text_(rec[S_INQUIRY])] = true; });
  // 依原收件時間配號，同一天由早到晚 001、002…
  var order = rows.map(function(row, i) { return i; }).sort(function(a, b) {
    var ta = rows[a][1] instanceof Date ? rows[a][1].getTime() : 0, tb = rows[b][1] instanceof Date ? rows[b][1].getTime() : 0;
    return ta - tb || a - b;
  });
  var ids = rows.map(function(row) { return text_(row[0]); });
  var known = records.map(function(rec) { return text_(rec[S_INQUIRY]); });
  order.forEach(function(i) {
    var row = rows[i], original = ids[i];
    if (byInquiry[original]) return; // 重跑：此列已改成新編號
    if (!byRequest[original]) {
      var time = row[1] instanceof Date ? row[1] : new Date();
      var inquiryId = allocate_(time, known);
      known.push(inquiryId);
      system.getRange(system.getLastRow() + 1, 1, 1, SYSTEM_HEADER.length).setValues([[asText_(original), asText_(inquiryId),
        asText_(text_(row[16])), text_(row[14]), asText_(text_(row[15])), time, 'MIGRATED']]);
      byRequest[original] = inquiryId;
    }
    ids[i] = byRequest[original];
  });
  SpreadsheetApp.flush();
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, 1).setValues(ids.map(function(value) { return [asText_(value)]; }));
    sheet.getRange(2, 7, rows.length, 1).setValues(rows.map(function(row) { var c = text_(row[6]); return [cell_(LEGACY_COUNTRY[c] || c)]; }));
  }
  sheet.getRange(1, 7).setValue('國家');
  SpreadsheetApp.flush();
  sheet.deleteColumns(INQUIRY_HEADER.length + 1, LEGACY_HEADER.length - INQUIRY_HEADER.length);
}

function isLegacy_(sheet) {
  if (sheet.getLastColumn() < LEGACY_HEADER.length) return false;
  var head = sheet.getRange(1, 1, 1, LEGACY_HEADER.length).getValues()[0];
  return head.every(function(value, i) { return value === LEGACY_HEADER[i] || (i === 6 && value === '國家'); });
}

function systemSheet_(book) {
  var system = book.getSheetByName(SYSTEM_SHEET);
  if (!system) {
    system = book.insertSheet(SYSTEM_SHEET);
    system.getRange(1, 1, 1, SYSTEM_HEADER.length).setValues([SYSTEM_HEADER]);
    if (system.setFrozenRows) system.setFrozenRows(1);
  }
  if (!system.isSheetHidden()) system.hideSheet();
  assertSystem_(system);
  return system;
}

/** 通知失敗不影響收件結果：資料已寫入試算表。 */
function notify_(inquiryId, time, v) {
  var to = prop_('NOTIFY_EMAIL');
  if (!to) return;
  try {
    MailApp.sendEmail({
      to: to,
      replyTo: v.email,
      subject: '[BXR 官網詢問] ' + inquiryId + ' ' + TOPIC_LABELS[v.topic] + '－' + v.organization + ' ' + v.name,
      body: ['官網收到新的客戶詢問，完整資料在收件試算表「' + INQUIRY_SHEET + '」分頁。', '',
        '詢問編號：' + inquiryId, '收件時間：' + Utilities.formatDate(time, TIME_ZONE, 'yyyy-MM-dd HH:mm:ss'),
        '姓名：' + v.name, '公司／單位：' + v.organization, '職稱：' + v.jobTitle,
        '國家：' + (LEGACY_COUNTRY[v.country] || v.country), 'Email：' + v.email, '電話：' + v.phone,
        '洽詢項目：' + TOPIC_LABELS[v.topic], '相關產品／方案：' + v.interest, '頁面語言：' + v.language,
        '來源頁面：' + v.sourcePage, '', '需求說明：', v.message].join('\n'),
    });
  } catch (error) {
    console.error('BXR_INQUIRY_NOTIFY_ERROR');
  }
}

function hash_(v) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(FIELDS.map(function(f) { return v[f[0]]; })), Utilities.Charset.UTF_8);
  return bytes.map(function(b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join('');
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

/** 編號、雜湊等一律存成文字（加 ' 前綴），避免 20261104001 被試算表轉成數字。 */
function asText_(value) {
  return "'" + value;
}

/** 讀回時一律轉成字串比對（相容數字格式或殘留的 ' 前綴）。 */
function text_(value) {
  return String(value === null || value === undefined ? '' : value).replace(/^'/, '');
}

function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function assertHeader_(sheet) {
  if (!sheet || JSON.stringify(sheet.getRange(1, 1, 1, INQUIRY_HEADER.length).getValues()[0]) !== JSON.stringify(INQUIRY_HEADER)) {
    throw new Error('「' + INQUIRY_SHEET + '」分頁的標題列不符，請先執行 setupInquiry，且不要修改第一列。');
  }
}

function assertSystem_(sheet) {
  if (!sheet || JSON.stringify(sheet.getRange(1, 1, 1, SYSTEM_HEADER.length).getValues()[0]) !== JSON.stringify(SYSTEM_HEADER)) {
    throw new Error('「' + SYSTEM_SHEET + '」分頁不存在或標題列不符，請先執行 setupInquiry。');
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
