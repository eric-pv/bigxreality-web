# 第一階段：GAS → Google Sheets 瀏覽器回應驗證

狀態：**2026-11-04 已通過 Pages-origin 實測（見 [驗收紀錄](POC-VALIDATION.md)）**；正式網站仍使用 Email，三語共用收件表單尚未開發。

## 1. 建立專用測試試算表

1. 用公司管理的 Google 帳號登入 Google Sheets，建立空白試算表，例如 `BXR 詢問表單－測試`。不用 Google Forms，不要放真實姓名、Email 或客戶內容。
2. 表格保持私人，不要「發布到網路」、開啟任何人可讀或可編輯。僅開發驗收所需人員有讀取權限。
3. 網址 `https://docs.google.com/spreadsheets/d/這一段是ID/edit` 的 ID 留給下一步 Script Properties；不要貼入官網前端或提交 Git。

## 2. 建立 Apps Script

1. 在測試試算表選「擴充功能 → Apps Script」，會開新分頁。
2. 將預設 `程式碼.gs`（或 Code.gs）全部內容換成 [完整 Code.gs](../../integrations/google-apps-script/inquiry-poc/Code.gs)，按磁碟圖示或 Ctrl+S 儲存。新專案一律是 V8 執行環境（舊 Rhino 已於 2026-01-31 停止），介面不需也沒有選項設定。
3. 左側齒輪「專案設定」：（選做）一般設定的時區改為 `(GMT+08:00) 台北`。捲到最下方「指令碼屬性 → 新增指令碼屬性」，新增後按「儲存指令碼屬性」：

| 屬性 | 值 |
| --- | --- |
| TEST_SPREADSHEET_ID | 第一步的試算表 ID |
| ALLOW_POC_API | `true`（小寫） |

4. 左側 `< >`「編輯器」，上方工具列「執行」旁的函式下拉選 `setupPoc`，按「執行」。首次會要求授權：「審查權限」→ 選公司帳號 →（若顯示 Google 尚未驗證此應用程式）「進階 → 前往〈專案名稱〉（不安全）」→「允許」。這是自有程式的正常提示；若是組織政策阻擋，交由管理者確認，不要改為公開試算表繞過。
5. 回到試算表，應新增 `BXR_INQUIRY_POC` 分頁，第一列為 `request_id / received_at / test_message / payload_hash / status`。此函式不覆寫非空白的既有分頁，遇到不符 schema 會停止。

## 3. 部署測試 Web App

1. 右上藍色「部署 → 新增部署作業」，「選取類型」旁齒輪選「網頁應用程式」。
2. 說明可填 `POC 測試`；執行身分選「我」。
3. 具有存取權的使用者選「所有人」（含未登入 Google 的訪客）；不能是「僅限我自己」或「任何擁有 Google 帳戶的使用者」。若沒有此選項，先由 Workspace 管理者確認政策，不能宣稱匿名官網表單已可用。
4. 按「部署」，複製結尾為 `/exec` 的網頁應用程式網址。不要提供 `/dev`、編輯器網址、私人 Token 或 API key。快速自查：用無痕視窗開啟 `/exec`，應看到 `{"ok":true,"protocol":"bxr-inquiry-poc-v1",...}`；若跳到登入頁代表存取權設錯。
5. 修改 Code.gs 後須「部署 → 管理部署作業 → 鉛筆圖示 → 版本選『新版本』→ 部署」，網址不變；只儲存檔案不會更新 `/exec`。Script Properties 修改則立即生效，不需重新部署。
6. 把測試 `/exec` 網址交給工程師。這是公開呼叫端點，不是密鑰；試算表本身仍保持私人。現階段不要處理真實客戶資料。
7. 若工程師在 Claude Code 雲端環境執行實測，環境的 Network access 需允許 `script.google.com` 與 `script.googleusercontent.com`（GAS 回應會轉址到後者），否則連線會被環境代理拒絕。

## 4. 實測方式

工程師可在專案根目錄執行：

```sh
GAS_POC_ENDPOINT='https://script.google.com/macros/s/部署ID/exec' node scripts/qa-inquiry-poc.mjs
```

此程式以 Playwright 在 `https://eric-pv.github.io` 的瀏覽器 origin 載入**本機攔截的測試工具頁**，向真實 GAS 發出請求，不部署或修改 Pages。工具頁的 HTML／JS 由本機攔截；Google 網路請求在 LIVE 模式不攔截。輸出在 `.qa/inquiry-poc/LIVE-result.txt` 與桌面／手機截圖。

手動執行可在根目錄開另一個終端機：

```sh
python3 -m http.server 4399 --bind 127.0.0.1
```

開啟 `http://127.0.0.1:4399/tools/inquiry-poc/`，輸入 `/exec` 按「執行」。localhost 測試不能替代上面的 Pages-origin 實測。不要雙擊 file:// HTML，也不要關閉瀏覽器 CORS 防護。

依序應得到：

| 測試 | 端點 JSON | Sheet |
| --- | --- | --- |
| 首次寫入 | ok=true、persisted=true、duplicate=false | 新增 1 列 |
| 相同編號、相同內容 | ok=true、persisted=true、duplicate=true | 仍只有 1 列 |
| 相同編號、不同內容 | ok=false、code=ID_CONFLICT | 不新增 |
| 空內容 | ok=false、code=INVALID_MESSAGE | 不新增 |

四項成功後，請在測試表依輸出的 requestId 人工確認**只有一列**、時間為伺服端接收時間、status=POC_ONLY。瀏覽器收到的 requestId、protocol、persisted 都須相符；單純 HTTP 200 不是寫入成功。

若網路中斷或逾時，寫入結果可能未知。工具不顯示成功；同一頁面再次執行沿用 requestId，可查回第一次已寫入的結果。不要在結果未知時重整／另開頁面產生新編號；先記下原編號並查 Sheet／Apps Script「執行項目」。

另測：將 ALLOW_POC_API 改 false，應取得 DISABLED 且不寫入，完成後再設回 true。要實測存取／儲存失敗，另以測試部署的 TEST_SPREADSHEET_ID 暫設無效測試值，應回 STORAGE_ERROR、persisted=false；恢復後以同一 requestId 重試。只操作專用測試專案，不能動正式客戶表。

## 5. CORS 與回應判準

採瀏覽器 `fetch`，POST body 為 URLSearchParams，不放自訂 header、不傳 cookies、不用 application/json 觸發預檢；redirect=follow，mode=cors。GAS ContentService 可能重新導向 script.googleusercontent.com，且無法任意設定 CORS header 或 HTTP status，因此必須檢查部署後實際行為。

可讀 JSON 的業務失敗以 ok=false／code 表達；Google 平台的登入轉址、403、HTML、CORS 或網路錯誤則是傳輸失敗／結果未知。**不得改用 no-cors、JSONP、把客戶資料放 GET query，或用 iframe load 事件當成功。**

若直接 POST 的回應在 Pages origin 不可讀：停止正式表單接入，保存瀏覽器錯誤及 Apps Script 執行紀錄，再提出最低替代方案：同一 GAS 的 HTML Service 作橋接，以 google.script.run 寫 Sheet，向 Astro 外層傳送經 source／origin／一次性 nonce 與 requestId 驗證的 postMessage 回執。它使用同一 GAS／Sheets，不新增雲端服務。**此替代方案尚未實作／驗證，須先確認，不能直接當成可用。**

## 6. 此 POC 的安全界限

- 只接受 `BXR-POC` 前綴的短測試文字，拒絕一般客戶內容與公式字串，不是正式資料欄位驗證器。
- Honeypot、長度／UUID／參數驗證、Script Lock、持久 Sheet 編號去重；flush 後讀回 ID／hash 才確認。
- 每分鐘最多 10 筆新增、總共最多 100 筆測試資料。這是全域測試上限，不是每 IP 限速；到上限須人工檢查後換測試分頁／測試表並保留驗收證據，不在程式自動刪列。
- GAS 公開 doPost 無可靠訪客 IP，不能保證擋機器人、阻止配額耗盡／DoS 或保證企業級可用性；Honeypot 與公開端點／nonce 也不是身分驗證。
- 正式版還需要完整欄位驗證、公式注入防護、限速／配額與告警方案評估。若需要 CAPTCHA 等新增服務，先提出方案供確認，不自行安裝。
- 不儲存個資到瀏覽器、Git、Apps Script Cache／Properties 或紀錄檔；本工具只顯示合成測試編號與回應。Script Properties 只放伺服端測試設定。
- 完成驗收後將 ALLOW_POC_API=false，或由管理者封存／停止測試部署；本次不自行刪試算表或服務。

## 7. 下一階段（門檻通過後）

共用 Astro 表單整合既有 `getUi(lang)` 與三語 UI JSON；產品／方案選項由 `getLocalized` 及既有 hero.code／slug／name 產生，穩定 ID 採 product:<slug>／solution:<slug>，不用另一份手動名單。

保留 `contactHref(lang, topic, item)` 相容性；CTA 帶入的 code／方案名稱對應到上述選項。另傳送並固定初始 sourcePage／topic／item，與可修改的 checkbox interests 分離；來源限制為本網站路徑，UTM 僅允許列出的參數與長度。來源是使用者提供的歸因資料，不是可信身分證明。

正式 Sheet 規劃：inquiry_id、received_at、name、organization、email、phone、interest_ids、interest_labels、message、language、source_page、source_topic、source_item、utm_source／medium／campaign／term／content、privacy_consent、privacy_version／url、consented_at、status（未處理）、request_hash。所有使用者文字在伺服端作長度限制及試算表公式注入防護。詢問資料只存在唯一正式 Google Sheet。

只有後端確認寫入或同編號查回已寫入，才顯示三語成功視窗；傳輸結果未知保留輸入與編號、以同編號重試。正式收件尚未開發／啟用；不更改既有聯絡頁 SEO、三語、版型或 CTA。
