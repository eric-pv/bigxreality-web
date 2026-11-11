# 詢問表單第一階段驗收

日期：2026-10-30（台北）；初始基準 main：04358562f97ef7cfffeb96f6c8ba42a0820035d0；同步最新 main：1426d63dd3204f01ca7927d523915fd8e0717918（已合併的圖片壓縮 PR，本分支保留其結果）。分支：feature/customer-inquiry-gas。

## 已通過（真實 Google，2026-11-04）

- 使用者以公司帳號建立測試試算表 `BXR 詢問表單－測試`、Apps Script 與網頁應用程式部署（執行身分：我；存取：所有人）。部署 ID 不寫入 Git。
- 未登入 GET `/exec` 直接取得 doGet JSON，確認匿名可存取。
- `GAS_POC_ENDPOINT=… node scripts/qa-inquiry-poc.mjs`（LIVE，Google 請求不攔截，origin `https://magician-eric.github.io`）：PASS。requestId `667eca04-3587-4eb5-83bf-28c51c226c09`：首次寫入 ok／persisted／duplicate=false；同內容重送 duplicate=true；不同內容 ID_CONFLICT；空內容 INVALID_MESSAGE。瀏覽器以 cors 模式可讀全部 JSON，直接 POST 成立，不需 HTML Service 橋接。
- 使用者人工核對 `BXR_INQUIRY_POC` 分頁：該 requestId 只有一列，received_at 為伺服端時間，status=POC_ONLY。

## 已通過（本機）

- npm test：49 個測試通過，其中新增 5 個 GAS／傳輸測試；使用模擬 Google 服務，未呼叫真實 Google。
- npm run check：0 errors、0 warnings。
- npm run build：Astro Build 與 Pagefind 建置通過。
- npm run qa:inquiry-poc：Playwright 1440px／390px；模擬四種 JSON 回應、網路失敗顯示與保留 requestId 重試，只有一筆模擬寫入。
- GAS 單元測試：寫入確認、持久編號去重、內容衝突、欄位／Honeypot、儲存失敗、端點停用、Lock Busy 與全域上限。
- 傳輸單元測試：拒絕 opaque／錯誤 requestId／不符協定／不可信端點；使用 cors、URLSearchParams、無自訂 header 及 credentials。
- tools/inquiry-poc 不在 public 或 src/pages；測試工具不進正式站。原有聯絡頁、CTA、產品、解決方案、三語、SEO 與媒體未修改。

本機截圖（不提交時序不固定的產物）：.qa/inquiry-poc/MOCK-desktop.png、MOCK-mobile.png；回應：MOCK-result.txt。

## 尚未驗證／尚未開發

| 項目 | 狀態 |
| --- | --- |
| ALLOW_POC_API=false（DISABLED）與 STORAGE_ERROR 實測 | 尚未實測（選做） |
| GAS 公開端點正式防濫用能力 | 目前只有 POC 的全域限制，無可靠訪客 IP，也不保證阻擋 DoS／配額耗盡 |
| 正式三語 Astro 表單、智慧預選、隱私同意與成功視窗 | 待第一階段實測通過才開發，現有 Email 入口保持可用 |
| GitHub CI／正式部署 | 本機結果不能代替遠端執行；不自行合併或部署 |

[Google 端設定及最小技術方案](GAS-POC-SETUP.md)。取得測試 /exec 後，以 GAS_POC_ENDPOINT 執行同一個瀏覽器工具的 LIVE 模式，Google 網路請求不攔截，再核對試算表。若 CORS 不成立，先提出同一 GAS HTML Service 橋接方案供確認，不自行增加服務。

## 修改檔案

- integrations/google-apps-script/inquiry-poc/Code.gs：只接受合成資料的測試接收器。
- tools/inquiry-poc/index.html、probe.js：獨立人工測試工具及可讀回應檢查。
- scripts/qa-inquiry-poc.mjs：Pages-origin 瀏覽器驗證；預設 MOCK、提供端點才 LIVE。
- tests/inquiry-gas-poc.test.ts：Google 服務模擬與傳輸失敗／去重測試。
- package.json、.github/workflows/ci.yml：本機指令與明確標為 MOCK 的 CI 檢查。
- docs/ARCHITECTURE.md、docs/inquiry/*：開發門檻、設定操作及驗收限制。

原始正式資料、Google 線上資源均未修改。回復使用本 PR 的 Git revert；沒有新增外部服務可供程式自行刪除。
