# 舊架構（Cloudflare／EmDash）移除紀錄與外部退役步驟

唯一架構見 [ARCHITECTURE.md](ARCHITECTURE.md)。業主於 2026-11-03 確認正式站不使用 Cloudflare。本文件分兩部分：已在程式中完成的移除，以及仍需管理者在外部服務操作的退役步驟。

## 一、程式移除（已完成，2026-11-03）

### 移除的檔案與設定

| 項目 | 說明 |
| --- | --- |
| `@astrojs/cloudflare`、`@emdash-cms/cloudflare`、`emdash`、`bxr-cms`（`plugins/bxr-cms/`） | Astro adapter、EmDash integration 與發布 hook 插件 |
| `@cloudflare/kumo`、`kysely`、`github-slugger` | 只被 EmDash 或其 Portable Text 轉換使用 |
| `wrangler`、`@cloudflare/workers-types` | Worker 工具與型別 |
| `wrangler.jsonc`、`src/worker.ts`、`src/live.config.ts`、`src/middleware.ts` | Worker 進入點、D1／R2／Cron 綁定、EmDash live collection、`/_emdash` 回應標頭 |
| `src/lib/emdash/*`、`emdash-env.d.ts`、`seed/seed.json`、`.emdash/` | EmDash loader、API client、Portable Text、產生型別、schema seed 與 migration 紀錄 |
| `scripts/cms/*`、`tests/cms/*`、`tests/cms-plugin.test.ts` | EmDash 匯入、遠端抓取、bootstrap 檢查與本機 CMS 整合測試 |
| Astro manual i18n 設定 | 只是 EmDash 的 CMS locale；前台三語路由由 `src/i18n` 與 `[lang]` 自行處理 |
| `BXR_CONTENT_SOURCE` 的 `emdash`／`bootstrap`、`WORKERS_CI` | 程式只接受 `markdown`（正式）與 `fixtures`（測試） |
| `src/data/.cms-site.json` 覆寫 | 網站設定只讀 Git `src/data/site.json` |

### 保留的部分

Astro、`@astrojs/react` 與 React（Footer 圖示的 SSR 仍需要）、Sharp、字型、Markdown、Pagefind、Sveltia App／產生器／自訂欄位、Git 內容與媒體、三語規則、SEO／版型／無障礙／發布驗證。`scripts/lib/cms-content.mjs` 讀的是 Git Markdown，與 EmDash 無關。歷史文件（`docs/PHASE-2-PLAN.md`、`docs/spikes/emdash/`、`docs/audits/` 等）是當時的紀錄，不代表現行架構，保留不改。

### 建置的變更

- `astro.config.mjs` 改為 `output: "static"`，不使用 adapter。輸出位置由 `dist/client/` 改為 `dist/`（fixture 為 `dist-fixtures/`）；搜尋索引、QA 伺服器、Pages 封裝與 CI 的路徑已同步更新。
- 根目錄 `/` 由 Astro 產生 meta refresh 頁（原本是 Cloudflare 專用的 `_redirects`）；Pages 封裝照舊改寫為正式起始頁。建置不再產生 `_redirects`、`_headers`、`.assetsignore`。
- CSS 的瀏覽器目標固定為 Vite 的 baseline（Chrome／Edge 111、Firefox 114、Safari／iOS 16.4）。原本由 Cloudflare 的建置環境間接決定；不固定的話，`-webkit-backdrop-filter`、`-webkit-mask-*` 等 Safari 前綴會被省略。
- 圖片改由 Astro 內建的 Sharp 服務在建置時產生（原本經 Cloudflare 的 workerd 圖片服務）。寬度現在精確等於 srcset 宣告值（舊服務部分輸出少 1px，例如 320w 實際 319px）；畫面內容相同。
- og:image 不再放大小圖：來源寬度不足 1200px 時，輸出來源可容納的最大 1.91:1 裁切，`og:image:width/height` 寫實際尺寸。目前影響戰術快艇模擬器（810×425）與全尺寸警用訓練場（1024×538）兩頁的三語版本；舊建置把這兩張圖放大成 1200×630。
- 與移除前的 main 逐檔比對：294 個 HTML 頁面除上述 og 尺寸（6 頁）與 inline CSS 前綴外完全相同，content digest 相同。

## 二、外部退役步驟（需管理者在 Cloudflare 後台操作）

程式已不需要任何 Cloudflare 資源，但外部服務本身不會因為程式移除而消失。依序執行：

1. **停用自動建置（可立即執行，不影響資料）**：Cloudflare 後台 → Workers & Pages → `bigxreality-web` → Settings → Builds → 中斷 Git repository 連線。完成後 GitHub commit 不再出現失敗的 `Workers Builds: bigxreality-web` 檢查。
2. **確認 D1 與 R2 是否有唯一資料**：
   - D1 `bxr-cms`：檢查是否有內容；若有，先匯出備份，逐項比對 Git 中是否已有對應內容。
   - R2 `bxr-media`：列出物件；若有 Git 中沒有的原始媒體，先下載保存。
   - 不自動拿任一份資料覆寫 Git。
3. **確認沒有對外流量**：Worker 是否綁定自訂網域或路由、DNS 是否指向它。正式網域切換到 GitHub Pages 前，不要移除仍在服務的設定。
4. **清除舊憑證**：刪除 Cloudflare 上的 Deploy Hook、API token，以及 GitHub repository secrets／variables 中的 `EMDASH_*`、`CF_ACCESS_*`、`DEPLOY_HOOK_URL` 等（如果存在）。
5. **刪除資源（不可逆，最後執行）**：確認第 2、3 步後，再刪除 Worker、D1、R2。這一步需要業主另外核准。

## 回復

程式由 Git revert 回復；外部資料只能靠第 2 步的事前匯出與平台備份回復，Git revert 不能復原已刪的資料庫或 bucket。
