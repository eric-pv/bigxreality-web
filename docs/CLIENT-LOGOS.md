# 首頁統計與合作夥伴 Logo

唯一名單：`src/data/client-logos.json`。每筆包含原檔名、三語 alt（單位名稱）、分類 ID、分類內排序、enabled 及審核狀態。`src/lib/client-logos.ts` 使用 Astro 本地圖片匯入，依分類與排序產生群組；首頁與合作夥伴均使用同一份群組，統計為每組 items.length，不另外維護固定數字。

分類顯示名稱放在既有 `src/content/ui/{tw,en,jp}.json` 的 clientCategories。四組順序固定為國防與公共安全（11）、研究與技術機構（3）、政府與公共事業（9）、產業與專業協會（3）。第一張為中華民國國防部；26 個 PNG 均使用，保留原檔。

首頁：`HomePartners.astro` 提供靠左標題與內頁入口，內嵌 `PartnerStatistics.astro`；四大解決方案之後、最新消息之前，數字最大 760px，桌面四欄、手機 2×2，沒有 Logo、動畫或客戶端 JavaScript。合作夥伴內頁也保留數字作輔助資訊。

既有 `/{lang}/company/partners/`：`ClientLogos.astro`，四個分類標題及靜態 4／2 欄網格，無可見單位名稱、數量、外部連結、動畫、輪播或額外媒體清單。關於 BXR 主頁不再放 Logo。既有 partners CMS 資料模型未刪除，但此頁依使用者本次指定統一展示共用素材清單。

TW Alt 使用原檔名去除副檔名。EN／JP 在正式譯名確認前依使用者要求保留正式原名，不自行編造。公司已於本次任務確認 26 張 Logo 全數可公開，publicationReview 均為 approved，不再要求確認授權。`CLIENT-LOGO-REVIEW.csv` 僅保留正式外語名稱審核狀態。依使用者最後修正，首頁不顯示任何 Logo，所有 Logo 僅在合作夥伴內頁展示。

新增或移除：在 clients 目錄維護原檔，於單一 JSON 設定 category、order、enabled 與三語 alt。統計與網格會同步更新；本次驗收測試固定檢查使用者指定的 26 張及 11／3／9／3，未來經核准變更名單時也要更新對應驗收期望。

既有合作夥伴頁的 SEO Title／Description 未改寫；完成 EN／JP 原有頁首翻譯，資料存在時沿用既有 SEO 機制產生 canonical、hreflang 與 sitemap，不手動複製網址。

驗證：npm run build、npm run check、npm run qa:client-logos、npm run qa:company、npm run qa:seo、npm run qa:links；GitHub Pages 以 preview rebase 後實際檢查三語圖片路徑。
