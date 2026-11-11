/** Transport proof only. Deploy against a dedicated TEST spreadsheet; never customer data. */
var POC_PROTOCOL = 'bxr-inquiry-poc-v1';
var POC_SHEET = 'BXR_INQUIRY_POC';
var POC_HEADER = ['request_id', 'received_at', 'test_message', 'payload_hash', 'status'];

function setupPoc() {
  var id = PropertiesService.getScriptProperties().getProperty('TEST_SPREADSHEET_ID');
  if (!id) throw new Error('Set TEST_SPREADSHEET_ID first.');
  var book = SpreadsheetApp.openById(id);
  var sheet = book.getSheetByName(POC_SHEET) || book.insertSheet(POC_SHEET);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, POC_HEADER.length).setValues([POC_HEADER]);
  assertHeader_(sheet);
}

function doGet() {
  return json_({ok: true, protocol: POC_PROTOCOL, mode: 'transport-proof-only', persisted: false});
}

function doPost(e) {
  var p = e && e.parameter || {};
  var id = typeof p.requestId === 'string' ? p.requestId : '';
  var result = function(code) { return json_({ok: false, persisted: false, protocol: POC_PROTOCOL, requestId: id, code: code}); };
  if (PropertiesService.getScriptProperties().getProperty('ALLOW_POC_API') !== 'true') return result('DISABLED');
  if (!e || !e.postData || e.postData.length > 4096) return result('INVALID_REQUEST');
  if (Object.keys(p).some(function(k) { return ['protocol', 'requestId', 'message', 'website'].indexOf(k) < 0; })) return result('INVALID_REQUEST');
  if (Object.keys(e.parameters || {}).some(function(k) { return e.parameters[k].length !== 1; })) return result('INVALID_REQUEST');
  if (p.protocol !== POC_PROTOCOL || id.length !== 36 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return result('INVALID_REQUEST');
  if (p.website) return result('REJECTED');
  // Restrict the public proof to unmistakable synthetic data; this is NOT the production form receiver.
  if (typeof p.message !== 'string' || !/^BXR-POC[\s\S]{1,150}$/.test(p.message)) return result('INVALID_MESSAGE');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return result('BUSY');
  try {
    var sheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('TEST_SPREADSHEET_ID')).getSheetByName(POC_SHEET);
    assertHeader_(sheet);
    var rows = sheet.getDataRange().getValues();
    var hash = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, p.message));
    var existing = rows.slice(1).find(function(row) { return row[0] === id; });
    if (existing) {
      if (existing[3] !== hash) return result('ID_CONFLICT');
      return json_({ok: true, protocol: POC_PROTOCOL, requestId: id, persisted: true, duplicate: true});
    }
    // A small global bound for a test endpoint, NOT per-IP protection or production abuse prevention.
    var now = new Date();
    if (rows.length > 100 || rows.slice(1).filter(function(row) { return row[1] instanceof Date && now.getTime() - row[1].getTime() < 60000; }).length >= 10) return result('RATE_LIMITED');
    var rowNumber = sheet.getLastRow() + 1;
    sheet.getRange(rowNumber, 1, 1, POC_HEADER.length).setValues([[id, now, p.message, hash, 'POC_ONLY']]);
    SpreadsheetApp.flush();
    var saved = sheet.getRange(rowNumber, 1, 1, POC_HEADER.length).getValues()[0];
    if (saved[0] !== id || saved[3] !== hash) return result('WRITE_UNCONFIRMED');
    return json_({ok: true, protocol: POC_PROTOCOL, requestId: id, persisted: true, duplicate: false});
  } catch (error) {
    console.error('BXR_POC_STORAGE_ERROR');
    return result('STORAGE_ERROR');
  } finally {
    lock.releaseLock();
  }
}

function assertHeader_(sheet) {
  if (!sheet || JSON.stringify(sheet.getRange(1, 1, 1, POC_HEADER.length).getValues()[0]) !== JSON.stringify(POC_HEADER)) throw new Error('Unexpected test sheet schema.');
}

function json_(value) {
  // ContentService cannot set arbitrary CORS headers/status. Browser readability must be measured on the real deployment.
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
