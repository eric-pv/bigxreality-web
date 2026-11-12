# 關於 BXR：徵才頁（104 職缺小工具）

業主決定（2026-11-12）：不使用 104 API，改用 104 官方提供給企業官網的「職缺小工具」（qjob）。人資只維護 104，官網職缺清單由 104 即時顯示。

- 頁面：`/[lang]/company/careers/`（`src/pages/[lang]/company/careers/index.astro`），列在「關於 BXR」選單；「關於 BXR」頁的徵才區塊連到此頁。
- 嵌入方式：直接以寬度隨螢幕縮放的 iframe 載入 `https://www.104.com.tw/jb/104i/joblist/qjob?c=...&order=8,0`。**不載入** 104 的 `qjob.js`：它用 `document.write` 並寫死 1143px 寬，會讓手機破版。
- 職缺清單的外觀、語言（繁中）與內容由 104 決定；頁面下方另有前往 104 公司頁的按鈕。
- 第三方內容：iframe 由 104 提供，104 可能設定自己的 cookie；隱私權政策需補充說明（待業主確認文字）。
- 已移除：104 Open API 同步程式、每月排程與相關測試（不再需要憑證）。
