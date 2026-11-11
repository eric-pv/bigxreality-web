# SEO 驗收報告

本次依業主指定文案更新 SEO，未變更正文、Hero、FAQ、圖片、導航、版面或微互動。

| 項目 | 結果 |
|---|---:|
| 實際檢查 URL | 120 |
| 更新 SEO 資料的頁面 | 120 |
| TW / EN / JP | 各 40 |
| 可索引且列入 Sitemap | 89 |
| 維持 noindex | 31 |
| 重複 Title / Description | 0 / 0 |
| 缺漏欄位、佔位 SEO、失效連結 | 0 |

## Noindex 分類

- 公司子頁缺乏正式發布內容：12 頁（發展歷程、團隊、夥伴、投資人，三語各 4 頁）。
- 未有正式文章的資源列表：9 頁（消息、文章、案例，三語各 3 頁）。
- 工具頁：搜尋 3 頁、標籤索引 3 頁。
- 原本翻譯狀態為 pending：EN / JP 的公司介紹及聯絡頁，共 4 頁。補齊 SEO 不會解除原有 noindex。

## 驗證

- 120 頁逐一比對指定 Title / Description；核心技術 21 頁原 Description 保留。
- 品牌尾碼、Canonical、可索引語言 hreflang、OG / Twitter、正式圖片或品牌備援、Organization、Product、頁面主體及真實 Breadcrumb 路由通過。
- Sitemap 精確對應 89 個可索引頁面；未新增路由或公開未完成內容。
- Astro Build、測試資料 Build、型別檢查與 30 個單元測試通過。
- 核心技術正常建置 888 項、測試資料 930 項檢查及既有網站行為檢查通過。
- 測試文章的 NewsArticle 日期、列表分頁的獨立 Canonical / Description / CollectionPage，以及 noindex 語言排除通過。

未發現阻擋性異常；上述 31 頁依既有發布狀態或工具頁政策保留 noindex。GitHub CI 結果請查看 PR。

重跑：`npm run qa:seo`、`npm run check:sitemap`、`npm run qa:links`。

## 2026-10-22 全站技術 SEO 複查

修正（未改動核定 Title / Description、正文、版面或圖片槽位）：

- hreflang 繁中代碼改為 `zh-TW`（HTML lang 維持 `zh-Hant-TW`，JSON-LD `inLanguage` 與 HTML lang 一致）。
- 首頁 `WebSite` JSON-LD：`inLanguage` 原輸出 `tw` / `jp` 無效代碼，改為正式語言代碼；三語各自使用獨立 `@id`。
- `WebPage` / `CollectionPage` / `Article` 節點自動補 `inLanguage` 與頁面 Description；未翻譯（`[待翻譯]`）的名稱與 Breadcrumb 不再寫入 JSON-LD。
- 解決方案總覽、文章列表、標籤頁卡片標題由 `h3` 改為 `h2`（樣式類別不變），消除 H1 → H3 跳層。
- EmDash 後台（`/_emdash/*`，非預先產生的頁面）回應加上 `X-Robots-Tag: noindex, nofollow`；robots.txt 不封鎖任何公開頁、CSS、JS 或圖片。

`npm run qa:seo` 新增檢查：HTML lang / og:locale、重複 Meta、og:url、hreflang 代碼、所有 JSON-LD 區塊可解析且無佔位文字、Article 必要欄位、BreadcrumbList 終點為本頁、單一 H1 與標題層級、圖片 alt 與寬高、Sitemap 與 noindex 精確對應、robots.txt。可索引頁正文仍有 `[待提供]` 時列為 warning。

待補（需正式素材或業主確認）：三語產品總覽頁正文 Description 與 CTA 標題仍為 `[待提供]`；正式品牌 OG 分享圖（目前以 `icon-512.png` 備援）；社群帳號網址（`sameAs`）；EN / JP 公司介紹與聯絡頁翻譯。
