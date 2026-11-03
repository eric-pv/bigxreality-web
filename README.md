# bigxreality-web

Big x Reality 官網：Astro＋GitHub main＋Sveltia CMS＋GitHub Actions＋GitHub Pages。唯一架構規範：[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。建置為純靜態輸出，不使用 Cloudflare 或 EmDash（舊架構已移除，外部資源退役見 [docs/LEGACY-REMOVAL-PLAN.md](docs/LEGACY-REMOVAL-PLAN.md)）。

## 本機執行

使用 `.node-version` 的 Node 22 系列；本機建議至少 22.18，以支援現有原生 TypeScript 腳本。

```bash
npm install
npm run dev        # http://localhost:4321/tw/products/
npm run pages:build # Git 內容建置、封裝 dist-pages、正式 Pages 檢查
```

## 品質檢查

先 `npm run build`，再執行：

| 指令 | 內容 |
|---|---|
| `npm test` | 單元測試（區塊顯示規則、[待提供] 標記） |
| `npm run check` | Astro / TypeScript 型別檢查 |
| `npm run check:i18n` | 三語檔案完整度（build 時也會自動列出） |
| `npm run qa:links` | 內部連結檢查，分開列出「尚未建立的頁面」與「壞連結」 |
| `npm run qa:a11y` | axe（WCAG 2.1 AA）三頁 × 1440 / 390，加手機選單鍵盤測試 |
| `npm run qa:behaviour` | 篩選、語言切換、hreflang、noindex、JSON-LD、關聯正反查等行為測試 |
| `npm run qa:lighthouse [路徑]` | Lighthouse 四項分數（預設 `/tw/products/sut/`），報告寫到 `.qa/lighthouse.html` |
| `npm run qa:shots` | Playwright 截圖到 `docs/screenshots/phase-1/` |

瀏覽器預設用 `/opt/pw-browsers/chromium`；其他環境請設定 `CHROMIUM_PATH`。

## 內容

- 內容在 `src/content/<collection>/<tw|en|jp>/<slug>.md`（Sveltia 三語明確集合，共用原 slug）。
- 排序、領域、關聯、日期、草稿這些結構欄位只讀 `tw` 檔。
- 沒有填的欄位：整個區塊不顯示；填 `[待提供]`：區塊照常顯示並標出缺什麼。
- 介面文字在 `src/content/ui/<lang>.json`，站點設定在 `src/data/site.json`。
- `design-source/` 是設計來源，程式直接引用，不要修改。

## 核心技術模組

三語總覽與第一批技術頁、CMS 技術標籤遷移及驗收方式見 [TECHNOLOGIES.md](docs/TECHNOLOGIES.md)。完成建置後執行 `npm run qa:technologies`，三語完整性報告輸出至 `.qa/technologies-content-audit.md`。

第二批四項技術頁、七項技術的產品／解決方案雙向關聯與三語驗收見 [TECHNOLOGIES-BATCH-TWO.md](docs/TECHNOLOGIES-BATCH-TWO.md)。
