# 正式詢問表單：Google 端設定與上線步驟

日期：2026-11-04（台北）。業主決定沿用已通過 POC 實測的同一份試算表、同一個 Apps Script 專案與同一個 `/exec` 網址（[架構規範 §10](../ARCHITECTURE.md)）。

## 目前狀態

| 項目 | 狀態 |
| --- | --- |
| 正式收件程式 `integrations/google-apps-script/inquiry/Code.gs` | 已完成，模擬測試通過（`tests/inquiry-gas.test.ts`）；**尚未貼到 Google** |
| 三語聯絡頁表單 | 已完成；`site.json` 的 `inquiry.endpoint` 仍是 `[待提供]`，所以網站上**還不會出現** |
| 隱私權政策三語 | 已補表單一節與資料安全一節；**仍是 draft（法務審閱中）**，有 `[待確認]` 項目 |
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

1. 法務審閱隱私權政策三語，補齊所有 `[待確認]`，刪除三語開頭的「法務審閱中」標註與 TW 結尾的「內部備註」段落。
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
