# 正式詢問表單：Google 端設定與上線步驟

日期：2026-11-04（台北）。業主決定沿用已通過 POC 實測的同一份試算表、同一個 Apps Script 專案與同一個 `/exec` 網址（[架構規範 §10](../ARCHITECTURE.md)）。

## 目前狀態

| 項目 | 狀態 |
| --- | --- |
| 正式收件程式 `integrations/google-apps-script/inquiry/Code.gs` | 已完成，模擬測試通過（`tests/inquiry-gas.test.ts`）；使用者已提供 Google 端目前程式，與此檔內容一致（忽略換行差異）；本環境仍待真實連線驗證 |
| 三語聯絡頁表單 | 已完成；本接續分支已填入使用者提供的 `/exec`；待 PR 審核合併與部署後才會出現在官網 |
| 隱私權政策三語 | 依業主 2026-11-04 指示完成三語定稿；TW 已設定 `draft: false`，仍須隨 PR 審核與部署 |
| 同意方式 | 「同意並送出」／「不同意」兩個按鈕，不用勾選框。按「同意並送出」才送出，並記錄同意的政策版本 |

`inquiry.endpoint` 一設定，建置時會檢查隱私權政策已公開；政策還是草稿時建置會直接失敗，避免表單連到不存在的政策頁。

## 一、Google 端（業主操作）

1. **試算表改名**：開啟 `BXR 詢問表單－測試`，左上角檔名改為例如 `BXR 客戶詢問`。右上「共用」只留需要看客戶資料的人。
2. **換程式**：擴充功能 → Apps Script，`程式碼.gs` 全部內容換成 `integrations/google-apps-script/inquiry/Code.gs`，存檔。
3. **指令碼屬性**（左側齒輪「專案設定」→ 最下方「指令碼屬性」→「編輯指令碼屬性」）：

| 屬性 | 值 |
| --- | --- |
| INQUIRY_SPREADSHEET_ID | 與 TEST_SPREADSHEET_ID 相同的試算表 ID |
| ALLOW_INQUIRY_API | `true` |
| NOTIFY_EMAIL | （選填）收到新詢問時要寄通知的信箱，例如 `service@gptt.com.tw`；留空不寄 |

舊的 `TEST_SPREADSHEET_ID`、`ALLOW_POC_API` 可以刪除。

4. **建立正式分頁**：回編輯器，函式下拉選 `setupInquiry` →「執行」。程式新增了寄信功能，Google 會再要求一次授權（審查權限 → 選帳號 → 進階 → 前往〈專案名稱〉→ 允許）。試算表應出現「客戶詢問」分頁，第一列 17 個欄位標題。**不要修改第一列**，否則程式會停止寫入。
5. **刪除測試分頁**：試算表的 `BXR_INQUIRY_POC` 分頁按右鍵刪除。
6. **更新部署（網址不變）**：部署 → 管理部署作業 → 鉛筆圖示 → 版本選「新版本」→ 部署。
7. **自查**：無痕視窗開 `/exec`，應看到 `{"ok":true,"protocol":"bxr-inquiry-v1","persisted":false}`。若仍是 `bxr-inquiry-poc-v1`，代表第 6 步沒有選「新版本」。

「處理狀態」欄預設「未處理」，業務可自行改成「處理中」「已回覆」等；程式只用「詢問編號」和「內容雜湊」兩欄判斷重複送出。

## 二、上線前（網站端）

1. 業主已於 2026-11-04 授權直接定稿；三語已移除草稿標註與內部備註，避免未經確認的保存年限、郵件供應商品牌或稽核成果宣稱。正式政策也說明現有 `bxr-motion` 本機動畫偏好。
2. `src/content/pages/tw/privacy.md` 改 `draft: false`。
3. `src/data/site.json` 的 `inquiry.endpoint` 填入 `/exec` 網址。
4. 聯絡頁 Hero 說明（`src/content/pages/<lang>/contact.md` 的 `hero.description`）仍寫「請透過 Email 聯絡」，同步改成提到表單的說法。
5. 上線後實際送出一筆測試詢問，確認試算表多一列、Email 通知（若有設定）收到，再把該列刪除。

政策內容或表單欄位改變時，同步修訂隱私權政策第二節並更新 `inquiry.privacyVersion`，新送出的詢問會記錄新版本。

## 三、安全界限

- 欄位長度、Email／電話格式、洽詢項目、語言、來源路徑都在伺服端驗證；`= + - @` 開頭的文字前加 `'` 存成純文字，防止試算表公式注入。
- 同一詢問編號重送不會重複寫入；內容不同則拒絕（ID_CONFLICT）。結果不明時畫面保留資料，按鈕再送沿用同一編號。
- Honeypot 欄位擋簡單機器人；全站每分鐘最多 20 筆新詢問。GAS 取不到訪客 IP，無法做到每位訪客限速，也不能保證擋住惡意灌單。若出現大量垃圾詢問，可先把 `ALLOW_INQUIRY_API` 改 `false` 暫停收件，再評估 CAPTCHA 等方案（須另行核准）。
- 通知信寄送失敗不影響收件結果，資料以試算表為準。

## 四、接續驗證（PR #83 已合併後）

業主上次提供的 Google 程式與 PR #83 的 `Code.gs` 相同。**本次新增複選後，須依 [原頁表單／複選部署說明](INLINE-MULTISELECT.md) 整份更新 Google 程式，再合併前端 PR**。仍支援一個完整姓名欄位；英文 given/family name、日文姓／名、重音字母、連字號與單一姓名均可原樣保存，不需要更動 17 欄試算表；本次重新貼完整程式僅擴充複選文字容量與合法請求大小，不更動既有資料。若日後真的需要修改 GAS，交付完整 `integrations/google-apps-script/inquiry/Code.gs` 供整份替換，不要求逐行修改。

執行順序：

```sh
npm ci
npx playwright-core install --with-deps chromium
npm test
npm run check
npm run build
npm run qa:inquiry-production
# 只有明確執行這一行才會連 Google，成功時寫入一筆合成測試詢問：
npm run qa:inquiry-production:live
```

- 預設測試是 **MOCK ONLY**：實際封裝後的三語表單及正式傳輸程式，Google HTTP 回應模擬；不對 Google 寫入。另有正式 GAS 程式的 Google 服務模擬單元測試。
- LIVE 不攔截 Google：先檢查正式 `bxr-inquiry-v1` 協定，再由正式表單送出一筆明確標記的合成詢問，重送相同編號應為 `duplicate: true`，改內容應為 `ID_CONFLICT`，空訊息應為 `INVALID_FIELD`。三語／手機其餘畫面只驗證而不另送真實詢問。
- 瀏覽器使用本機建置檔案，攔截本站資產以 Pages URL 載入，測試 origin 是 `https://eric-pv.github.io`；這不是已部署網站的畫面驗收。
- 結果在 `.qa/inquiry-production/MOCK-results.json` 與 `LIVE-results.json`；截圖同目錄。無可讀 JSON、網路受阻或協定不符，一律失敗／尚未驗證，不以 `no-cors` 當成功。
- 沒有試算表登入權限時，LIVE 即使收到已寫入／重複回應，仍須由有權限者確認「客戶詢問」分頁中結果的 `requestId` 只出現一列。確認後可自行刪除這筆合成測試資料；自動測試不刪既有資料。
- 本次環境的 curl 與 Chromium 均被代理拒絕（CONNECT 403／`ERR_TUNNEL_CONNECTION_FAILED`），未送出真實 POST、未取得收件／重複回應，不能宣稱已確認試算表寫入。請在可連線 Google 的環境完成 LIVE 與單列確認，再視為正式收件驗收通過。

完整結果見 [正式收件驗收紀錄](PRODUCTION-VALIDATION.md)。
