# 核心技術第二批

> 現況（2026-11-09）：技術頁文案的唯一編輯來源已改為 `src/content/technologies／technology-overview/<zh-Hant|en|ja>/*.json`，可在 CMS 編輯；`src/data/technologies-content.ts` 只負責載入。下文提到的 TS 檔為當時紀錄。

沿用第一批共用資料格式、Astro 模板、Header／Footer、SEO、FAQ Accordion 與技術文章 CMS，補齊 `ai-simulation`、`digital-simulation`、`system-integration`、`decision-visualization` 的繁中、英文、日文詳細頁。全模組現在應有三語總覽與七項技術的三語詳細頁，共 24 頁。第一批三項技術的正文與既有產品／解決方案正式內容不得修改。

依業主持續有效的圖片要求，只保留既有圖位，不插入照片，也不新增網站圖片資產或動畫。圖位使用當語 `aria-label`；內容照片 Alt 為 N/A。

## 本批頁面路徑

| 技術 | 繁體中文 | English | 日本語 |
|---|---|---|---|
| AI 智慧模擬 | `/tw/technologies/ai-simulation/` | `/en/technologies/ai-simulation/` | `/jp/technologies/ai-simulation/` |
| 數位場景與模擬建構 | `/tw/technologies/digital-simulation/` | `/en/technologies/digital-simulation/` | `/jp/technologies/digital-simulation/` |
| 通訊與系統整合 | `/tw/technologies/system-integration/` | `/en/technologies/system-integration/` | `/jp/technologies/system-integration/` |
| 指揮決策與資訊視覺化 | `/tw/technologies/decision-visualization/` | `/en/technologies/decision-visualization/` | `/jp/technologies/decision-visualization/` |

此表是建置路徑，不代表已部署到正式站。

## 內容與關聯界線

繁中為唯一母版；英文與日文保留每個區塊、段落、清單、五組 FAQ、CTA 與 SEO。日文直接由繁中翻譯。技術介紹採原稿的條件語氣，不能藉由產品關聯推定所有產品具備 AI、數位孿生、全面互通或自動指揮功能。

- AI：相關應用領域連結 SUT、UAV 與軍事模擬，不以關聯宣稱生成式 AI、自動評分或 AI NPC 功能。
- 數位模擬：連結 SUT、兵棋圖台、悍馬車、快艇、USV 與虛擬滅火產品；三維場景不等於數位孿生，也不代表即時實體資料。
- 系統整合：連結 SUT、USV、軍事模擬，以及分開的 MUM-T、NOVA 子解決方案。已確認的 USV 影像提供至 SUT 情境，不延伸為所有產品全面互通。
- 指揮視覺化：連結兵棋圖台、軍事模擬與 NOVA；不據此聲稱兵棋圖台已與 NOVA 完成整合，資訊視覺化也不等同自動決策。

MUM-T、NOVA、Counter-UAS 都不新增為產品，智慧城市仍是解決方案領域。

## 驗收方式

先使用專案 Node 22 與可用 Chromium；本雲端環境可 `source /workspace/.cloud-tools/bxr-env.sh`。先停止自己啟動的開發伺服器再建置，完成後重新啟動。

```bash
npm test
npm run check
npm run build
npm run qa:technologies
npm run check:sitemap
npm run qa:links
npm run build:fixtures
QA_DIST=dist-fixtures/client npm run qa:technologies
```

`qa:technologies` 已擴充為全部七項詳細頁與三語總覽的 24 頁驗收，保護第一批三項回歸。實際檢查輸出 HTML 中的完整正文、三語區塊／段落／清單／FAQ 數量、SEO、canonical、hreflang、Breadcrumb、sitemap／索引、圖位、全頁無缺稿標記、FAQ 初始收合／單開／鍵盤，以及 390／820／1440px 版面。另檢查指定產品與解決方案 URL 身分、CTA 目的、同語最新六篇文章、空列表隱藏、雙向連結及 Article JSON-LD。

若原始需求附件仍可用，可另指定 `QA_TECHNOLOGIES_MASTER` 為該 UTF-8 文字檔路徑。工具將逐一檢查新四頁所有繁中正式資料欄位與對應原稿完全一致；附件不被複製為正式內容，也不是未來執行一般驗收的必需環境檔案。這項精確文字比對不取代人工確認原稿是否有段落遺漏或翻譯語意偏差。

輸出：`.qa/technologies-batch-two-content-audit.md` 與 `.qa/technologies-content-audit.md`。第二批交付報告另存 `docs/TECHNOLOGIES-BATCH-TWO-AUDIT.md`；不覆寫第一批的 `docs/TECHNOLOGIES-CONTENT-AUDIT.md`。

## CMS 與發布

沿用現有 `insights.technology_tags` 固定七 ID 與網站 `technologyTags` 多選欄位。TW 來源維護結構標籤，每個語言保留獨立正文及發布／翻譯狀態；缺少翻譯與 pending 文章不補成其他語言文章。

既有發布、取消發布、刪除事件會透過 `bxr-cms` 排程重新建置（兩分鐘 debounce、最長十分鐘）。只儲存草稿不影響已發布版本；修改標籤後需再次發布。靜態公開頁需等 `BXR_CONTENT_SOURCE=emdash` 的建置及部署完成才更新，不宣稱內容即時顯示。真正更新流程及增量 schema 工具沿用 [第一批說明](TECHNOLOGIES.md)。

本地 API → 真正 EmDash loader → 共用查詢 → rebuild task 的驗證，與正式遠端 Deploy Hook HTTP、Workers Builds 及正式部署是不同證據。此次未授權改動正式 CMS 資料；若無正式憑證與授權，不宣稱已測正式發布。

技術頁保留完整可檢索 FAQ HTML，不承諾 FAQ 複合式搜尋結果、搜尋排名或 AI 推薦；SEO／AEO／GEO 沿用第一批規則。

## 本次修改檔案與交付

- `src/data/technologies-batch-two-a.ts`、`src/data/technologies-batch-two-b.ts`：四項新技術的完整三語內容，沿用第一批型別。
- `src/data/technologies-content.ts`：合併新內容；第一批三項正文保持相同，更新新四項總覽英語名稱。
- `src/data/technology-relations.ts`：集中既有產品／解決方案的主題連結及能力限制。
- `src/lib/technologies.ts`：七項技術均啟用公開詳細頁，文章共用查詢不另建系統。
- `src/pages/[lang]/technologies/[slug].astro`、`src/components/TechnologySections.astro`：擴充原共用模板，依資料選擇 CTA 與資源，不新建四套頁面。
- `src/components/RelatedTechnologies.astro`、`src/components/ProductLanding.astro`、`src/components/SolutionLanding.astro`、`src/pages/[lang]/products/[slug].astro`、`src/pages/[lang]/solutions/[slug].astro`：同一關聯表的反向連結，保留正式產品資料。
- `src/lib/navigation.ts`：將核心技術由規劃項目改為已發布，Header／Footer 共用入口。
- `scripts/qa-technologies.mjs`、`scripts/qa-behaviour.mjs`、`scripts/qa-header.mjs`、`tests/technologies.test.ts`、`tests/cms/technology-tags.mjs`、`tests/fixtures/content/insights/tw/fixture-insight-1.md`：七項技術、標籤、雙向連結與新增相關區塊的驗收。
- `.github/workflows/ci.yml`：正式與 fixture build 後皆執行技術頁驗收。
- `README.md`、`docs/TECHNOLOGIES.md`：文件入口與第一批紀錄的延續說明。
- `docs/TECHNOLOGIES-BATCH-TWO-AUDIT.md`：本批四頁三語比對與最終驗收證據。

PR 同時包含先前尚未提交的第一批必要架構；其檔案與既有 CMS 增量欄位工具詳見第一批文件。本批未再變更 CMS schema。已同步主分支的產品／解決方案三語翻譯與共用導覽成果，未以舊檔覆蓋。

最終數量與限制見 [驗收報告](TECHNOLOGIES-BATCH-TWO-AUDIT.md)。網站圖位截圖僅保存為忽略的 QA 產物，不加入網站圖片資產或 Git。
