# 正式客戶詢問表單接續驗收

日期：2026-11-04（台北）。基準：`main` 1c460b6，已包含 PR #83（原分支 `claude/awesome-newton-7o3ui4`）。本次在獨立分支接續，不合併或部署正式站。

## 變更

- `src/data/site.json` 設定使用者提供的正式 `/exec`，政策版號為 2026-11-04。
- 依業主直接定稿指示，同步三語 privacy.md、TW `draft: false`；移除草稿與內部備註、未確認事實，保留資料利用目的、必要期間、服務地區、權利、聯絡及 Google／GitHub 處理方式。依實際程式說明 `bxr-motion` localStorage，不再宣稱完全沒有本機儲存；不宣稱尚未證實的定期稽核或認證。
- 三語聯絡頁 Hero 說明表單與 Email；姓名以完整姓名欄位處理，不強制拆姓／名或西方排序，`autocomplete="name"` 與三語提示可供鍵盤／輔助科技讀取。Google 資料欄位及協定不變。
- 使用者貼上的 Apps Script 與 `integrations/google-apps-script/inquiry/Code.gs` 內容一致（忽略換行差異），本次無需重新貼 Google 程式。
- 新增可重跑的正式表單瀏覽器驗證；預設 MOCK，LIVE 必須明確指定，不在 CI 對 Google 寫入。

## 已通過

- `npm test`：53 項通過，包括實際 GAS 程式的模擬儲存／讀回、鎖定、去重、資料驗證與公式注入防護，以及英文／日文等姓名保存測試。
- `npm run check`：0 errors、0 warnings（既有 hints）。
- `npm run build`：純靜態產物 295 頁，三語表單與三語隱私權頁均可建置。
- `npm run qa:inquiry-production`：MOCK ONLY，正式編譯後表單、6 組三語／桌機手機畫面（1440、390）。姓名、欄位驗證、不同意不送出、SUT 智慧預選、政策連結、可讀成功回應、回應遺失後沿用編號重送、同編號衝突及空訊息拒絕均通過。Google 模擬共 6 筆，真實 Google 0 筆。
- `npm run pages:check`：正式子路徑封裝及瀏覽器檢查通過。
- `npm run cms:sveltia:check`：schema／2403 個巢狀欄位相容性通過。
- 內部連結與資產：36,034 個，失效 0 個。
- SEO QA 與 Sitemap：無錯誤、重複標題或描述；202 個索引網址。同步修正原有共用 Sitemap 遺漏三語已公開隱私權頁的問題，依原本發布／翻譯狀態收錄，不強制收錄草稿。
- `npm run build:fixtures`：184 頁，無需關閉正式政策公開保護。
- `npm run qa:behaviour`：產品篩選、CTA、聯絡參數、語言與既有頁面互動通過。

## 尚未驗證：真實 Google 收件與單列確認

使用者提供的端點為：

`https://script.google.com/macros/s/AKfycbzujEwgbXI1vGk5yBycXrGDv7hdrUBpN7SXeB3ctn-q7qTW2mc-LFzP8uM5GfJwlowaXg/exec`

本環境以 curl、Chromium 及提升執行權限重試後，Google 健康檢查仍因代理 CONNECT 403／`net::ERR_TUNNEL_CONNECTION_FAILED` 而失敗。`npm run qa:inquiry-production:live` 正確回報 `LIVE NOT VERIFIED`；沒有成功讀取健康 JSON、沒有送出真實 POST、沒有宣稱真實寫入、通知信或去重成功。

目前沒有 Google Sheets 授權讀取工具，因此也沒有直接開啟「客戶詢問」分頁或查驗列數。此為本次正式驗收缺口，不能以先前 POC 或 MOCK 通過替代。

在可連 Google 的環境執行 `npm run build && npm run qa:inquiry-production:live` 後，應將 LIVE 結果與有權限者核對的單列結果補回 PR。測試只建立一筆明確標記、使用 example.com 電子郵件的合成詢問；若開啟通知信可能收到一封測試通知。完整操作見 [設定文件](PRODUCTION-SETUP.md#四接續驗證pr-83-已合併後)。未完成前，不宣稱已可正式收件。
