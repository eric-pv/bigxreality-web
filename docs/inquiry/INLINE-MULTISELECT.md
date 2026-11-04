# 原頁展開、產品／方案複選與國家下拉清單

日期：2026-11-04。接續已合併的 PR #84；分支 `feature/inquiry-multiselect-inline`。不合併、不部署 main。

## 網站行為

- 產品及解決方案詳細頁按洽詢 CTA，在原頁底部展開一份共用表單，畫面捲至表單並移入鍵盤焦點；減少動態效果時直接定位。
- 關閉後再開，保留填寫內容、勾選項目及同一重送編號。普通 Header 聯絡入口仍進 `/contact/`；Ctrl／Cmd 開新分頁及 JavaScript 未載入時，原始 HTML 連結繼續進聯絡頁。
- `InquiryForm.astro` 是唯一表單與送件邏輯，`InlineInquiry.astro` 只處理展開／收合；聯絡頁也引用相同元件。
- 產品／方案使用有群組的勾選清單，可選多項、取消來源預選及保留其他項目；選項仍來自現有三語內容。多項合併儲存在既有「相關產品／方案」欄，不增加第二套選項清單或試算表。
- `sourcePage` 在表單開啟時取原頁路徑，與使用者之後修改的勾選項目分開保存。
- 國家／地區採原生下拉選單，選填、預設空白；不以語言、IP 或定位推測。共用 249 個 ISO 3166-1 alpha-2 代碼，顯示名稱在建置時由 ICU 產生 TW／EN／JP 文字並依當地排序。來源為公共領域的 IANA tzdb `iso3166.tab`（ISO/TC 46 N1127，2024-02-29；表格日期 2025-07-01）。沒有新增套件、API 或服務。試算表新資料保存 ISO 代碼（如 TW／JP／US），既有資料不改動。

## Apps Script：請整份替換

使用這份完整檔案：[Code.gs](../../integrations/google-apps-script/inquiry/Code.gs)。不是零碎 patch。

1. 打開完整 `Code.gs`，全選並複製。到 Apps Script，把既有程式內容全選刪除，貼上完整檔案後儲存。
2. 「部署」→「管理部署作業」→ 鉛筆 → 版本選「新版本」→「部署」。沿用同一個 `/exec`，不建立另一個服務。
3. 原有指令碼屬性、試算表、「客戶詢問」分頁和既有詢問都保留；不需刪除資料、重新建分頁或更改標題列。

複選清單可能超過舊版 200 字元的欄位限制。新程式將相關項目容量擴為 3000 字元、請求上限擴為 64 KiB，以容納合法的多項內容與 UTF-8 編碼；欄位驗證、公式注入防護、鎖定、同編號去重及限速全部保留。後端仍接受舊單選格式，可先更新 Google，再審核合併網站 PR。**不要只上前端而繼續沿用舊 200 字元限制。**

## GA4

不需要以固定 final landing page 才能分析洽詢。固定 `/contact/` 保留供直接來訪與無 JavaScript 備援，原頁表單可依來源頁與成功事件分析。

目前沒有啟用 GA4、載入追蹤套件或新增 Cookie。提供本機 `bxr:inquiry` 自訂事件，`detail` 只有 `stage`（open／submit／success／error）、`sourcePage`、`topic`、`interestCount`，不含姓名、Email、電話、訊息或詢問編號。成功事件只在可讀且匹配的後端確認 `ok && persisted` 後發出；未來整合 GA4 可將此階段映射到 `generate_lead`，避免以點擊送出或換頁當成成功收件。啟用實際追蹤需另行處理同意與隱私權揭露。

## 驗證

執行 `npm test`、`npm run check`、`npm run build`、`npm run qa:inquiry-production`。瀏覽器驗證預設只 MOCK Google HTTP，不對真實 Google 寫入；涵蓋三語聯絡頁、SUT、消防解決方案、1440／390px、鍵盤展開、關閉再開保留資料、來源與選項分離、複選、國家下拉及無 JS 的正常連結。

Google 正式端點在本環境仍受 CONNECT 403 阻擋，不能宣稱新版 GAS 已部署或真實試算表已驗收。在可連 Google 的環境更新完整 Code.gs 後，再執行 `npm run qa:inquiry-production:live`，由有權限者核對結果的 requestId 恰好一列。LIVE 首筆會勾選完整清單，明確驗證超過舊 200 字元的情境。

## 本次本機結果

- `npm test`：55 項通過；含複選大於舊 200 字元、同編號不重複、國家清單完整性與姓名相容性。
- `npm run check`：0 errors／0 warnings（既有 hints）。
- `npm run build`：295 頁；`build:fixtures`：184 頁。
- `qa:inquiry-production`：MOCK ONLY，18 組三語桌機／手機畫面通過；包含原頁開啟、關閉再開、來源頁與選項獨立、複選、國家下拉、匿名事件欄位與無 JS 備援。Google 真實寫入未驗證。
- Pages 封裝檢查、CMS schema、SEO、202 個 Sitemap URL 通過；36,211 個內部連結／資產，失效 0。
- 已檢視英文桌機及日文手機的實際瀏覽器截圖；完整截圖與模擬結果位於 `.qa/inquiry-production/`（本機測試產物，不是官網新素材）。
