export const PROTOCOL = 'bxr-inquiry-poc-v1';
export function endpointUrl(value) {
  const url = new URL(value);
  if (url.origin !== 'https://script.google.com' || !/^\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(url.pathname) || url.search || url.hash || url.username || url.password) throw new Error('請使用測試 Web App 的 https://script.google.com/macros/s/…/exec 網址。');
  return url.href;
}
export async function post(endpoint, requestId, message, fetcher = fetch) {
  const response = await fetcher(endpointUrl(endpoint), {
    method: 'POST', mode: 'cors', credentials: 'omit', redirect: 'follow',
    body: new URLSearchParams({protocol: PROTOCOL, requestId, message, website: ''}),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok || response.type === 'opaque') throw new Error(`無可讀的成功 HTTP 回應：${response.status}`);
  const value = await response.json();
  if (value.protocol !== PROTOCOL || value.requestId !== requestId || typeof value.ok !== 'boolean' || typeof value.persisted !== 'boolean') throw new Error('回應不是預期的 GAS JSON 協定。');
  return value;
}
export async function runProof(endpoint, onProgress = () => {}, fetcher = fetch, requestId = crypto.randomUUID(), retry = false) {
  endpointUrl(endpoint);
  const message = 'BXR-POC browser transport verification';
  const cases = [
    ['write', message, v => v.ok === true && v.persisted === true && (v.duplicate === false || (retry && v.duplicate === true))],
    ['duplicate', message, v => v.ok === true && v.persisted === true && v.duplicate === true],
    ['conflict', message + ' changed', v => v.ok === false && v.persisted === false && v.code === 'ID_CONFLICT'],
    ['validation', '', v => v.ok === false && v.persisted === false && v.code === 'INVALID_MESSAGE'],
  ];
  const results = [];
  for (const [test, payload, accepted] of cases) {
    const response = await post(endpoint, requestId, payload, fetcher);
    if (!accepted(response)) throw new Error(`${test} 驗證失敗：${JSON.stringify(response)}`);
    results.push({test, response}); onProgress({requestId, results: [...results]});
  }
  return {requestId, origin: location.origin, results};
}
if (typeof document !== 'undefined') {
  const button = document.querySelector('#run'), output = document.querySelector('#result');
  const requestId = crypto.randomUUID(); let attempted = false, progress = {requestId, results: []};
  button.addEventListener('click', async () => {
    button.disabled = true;
    output.textContent = `requestId: ${requestId}\n驗證中…若逾時，寫入結果未知；不可視為成功。重試沿用同一編號。`;
    const retry = attempted; attempted = true;
    try {
      const result = await runProof(document.querySelector('#endpoint').value.trim(), value => { progress = value; output.textContent = JSON.stringify(value, null, 2); }, fetch, requestId, retry);
      output.textContent = 'PASS：瀏覽器可讀取四種預期回應。請在測試試算表人工確認該 requestId 只有一列。\n' + JSON.stringify(result, null, 2);
    } catch (error) {
      output.textContent = 'FAIL／尚未確認寫入：' + error.message + '\n' + JSON.stringify(progress, null, 2) + '\n請保留上次 requestId、核對測試表與 Apps Script 執行紀錄。不要改成 no-cors。';
    } finally { button.disabled = false; }
  });
}
