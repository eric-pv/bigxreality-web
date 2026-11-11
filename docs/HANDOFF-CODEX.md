# 交接清單：Claude → ChatGPT Codex（2026-11-11）

業主決定由 Codex 接手以下未完成工作。開始前依序讀：`AGENTS.md`、`docs/ARCHITECTURE.md`（唯一正式架構）、`docs/LAYOUT-RULES.md`（版面與換行，所有頁面必須遵守）、`docs/OWNER-PENDING.md`（等業主的事項，每次回報進度時先列出）。

## 0. 工作規則（業主已確認）

- **流程：** 從最新 `origin/main` 開分支 → PR 到 `main` → CI（`build-and-test`）全綠、自行複查後端邏輯（建置、資料、表單、CMS、部署設定）無誤後可自行合併 → 確認 main 部署成功（線上 `build-info.json` 的 commit 等於 main）→ 列出前端可見變更請業主驗證。CI 未過或有疑慮時不合併，改為回報。
- **不准：** 新增雲端服務、CMS、資料庫、GA4；force push；刪除或放寬測試以求通過；覆蓋原始圖片；改既有 URL、歷史新聞事實、三語對應。
- **CMS：** 只用 Sveltia（業主 2026-11-05 決定不自建後台）。`public/admin/config.yml` 由 `npm run cms:sveltia:generate` 產生，不可手改。
- **Code.gs（詢問表單）：** 修改時一律給業主完整檔案；業主流程是整份替換 → 儲存 →（需要時執行 setupInquiry）→ 管理部署作業 → 鉛筆 → 新版本 → 部署。網站端要求的欄位改變時，先上線網站，再更新 Code.gs。
- **回覆業主：** 用最簡單的繁體中文，不寫無關內容。
- **省成本：** 業主要求白天以製作為主，完整 QA 交給每晚排程與 PR 的 CI。

## 1. 現況摘要

| 區塊 | 狀態 |
| --- | --- |
| 架構、CI、Pages 部署 | 正常。正式網址暫為 `https://eric-pv.github.io/bigxreality-web/` |
| CMS（Sveltia） | 三語同篇編輯、中英欄位、內文插圖片／影片已上線；業主已實際登入並發布過 |
| 詢問表單（GAS → 試算表） | 已上線實測 |
| 文字內容 | 產品 12、解決方案 6、新聞 30、公司介紹、成功案例頁三語完成 |
| 徵才（104） | 程式完成、未啟用（等憑證），見第 3 節 |
| 照片 | **最大缺口**，見第 2 節 |

## 2. 補照片（最優先，等業主提供照片）

### 目前缺口（三語共用同一張照片，只要放一次再同步到 en／ja）

| 頁面 | 已有／圖片位置 |
| --- | --- |
| 產品：滅火器 1/15、SUT 1/11；全尺寸警察訓練 0/11、悍馬 0/10、機槍 0/10、迫砲觀測 0/10、Police BOX 0/11、狙擊 0/10、戰術快艇 0/10、UAV 0/11、USV 0/9、兵棋圖台 0/8 | 2/126 |
| 解決方案：軍事 6/7、警察 8/9、智慧城市 7/8 | 幾乎完成 |
| 解決方案：消防救災 0/14、NOVA 0/7、有人無人協同（mum-t）0/5 | 0 |
| 新聞封面 | 0/30 |

`src/assets/images/products/` 現有 32 張全部已在使用中；`news/`、`content/` 沒有照片。產品卡片與頁首目前靠既有照片，不會整頁無圖。

### 怎麼補

1. 業主會用 Google 雲端硬碟、Sveltia 媒體庫或直接給檔。照片用途以檔名／資料夾判斷；不確定用途就問，不要猜。
2. 每項產品需要的畫面已寫在 `docs/*-IMAGE-REQUIREMENTS.md`（產品各一份，另有 `SOLUTIONS-IMAGE-REQUIREMENTS.md`）。
3. 產品／解決方案照片放 `src/assets/images/products/`，**新檔名**（英小寫連字號），原檔不壓縮、不裁切、不覆蓋。
4. 在 `src/content/<products|solutions>/zh-Hant/<slug>.md` 對應位置的 `image`（Hero 是 `heroImage`）加 `src` 與三語各自的 `alt`；`need` 保留即可（有圖後不顯示）。需要時加 `kind: illustration`、`status: withheld`、`substitute`。
5. 同一張照片同步到 `en/`、`ja/` 相同位置，補英日文 alt／圖說，其他翻譯文案不動。
6. 圖片比例：解決方案與產品落地頁的內容圖統一 16:9（LAYOUT-RULES §3）。
7. 新聞封面：照片放 `src/assets/images/news/`（只支援 jpg／jpeg／png），在 `src/data/news-media.json` 該新聞的 `cover` 填 `filename`、三語 `alt`、`approved: true`。三語 alt 不齊或未核准就不會顯示。

## 3. 104 職缺同步（等公司人資取得 API 憑證）

- 已完成：`src/lib/careers-104.ts`（驗證規則）、`scripts/careers/sync-104.mjs`（呼叫官方「人力銀行 Open API」`GET https://apis.104api.com.tw/jobs/1.0/jobs?custNo=1a2x6bjhcz`，OAuth2 client credentials，scope `c_job`）、`ci.yml` 每月 1 日 10:17（台北）排程、`src/components/Careers.astro` 職缺卡片、測試。詳見 `docs/careers/104-INTEGRATION.md`；給人資的申請說明是 `docs/careers/HR-104-API-GUIDE.md`。
- 憑證到了之後：
  1. 業主在 GitHub → Settings → Secrets and variables → Actions 新增 `BXR_104_CLIENT_ID`、`BXR_104_CLIENT_SECRET`（憑證不可寫入版本庫、文件或對話）。
  2. Actions → CI → Run workflow（main）手動執行一次，確認 `careers-sync` 成功並 commit `src/data/careers-104.json`。若實際回應格式與文件不同，驗證會失敗並保留原網站；依實際格式修 `parsePages()` 與測試。
  3. **業主要求：職缺改成「關於 BXR」底下的獨立一頁**，例如 `/[lang]/company/careers/`（三語）。「關於 BXR」頁保留徵才區塊的簡短入口連到該頁；職缺卡片、零職缺文字與同步日期移到新頁。同步更新 `scripts/qa-company.mjs` 的徵才檢查、sitemap 與麵包屑，並遵守 LAYOUT-RULES 的排數規則（共用 class `balanced`）。
- 零職缺規則不可改弱：網站已有職缺時，排程收到 0 筆不自動清空，須手動執行並勾選 `careers_allow_empty`。

## 4. 等業主提供的文字資料（拿到後填入）

| 項目 | 位置 |
| --- | --- |
| 公司英文／日文正式名稱 | `src/data/site.json` → `companyName.en`、`companyName.jp`（目前 `[待提供]`） |
| 型錄與展示洽詢連結 | `src/data/site.json` 中 `url`／`productEntry` 為 `[待提供]` 的項目 |
| SUT 核心能力說明 | `src/content/products/zh-Hant/sut.md` 的 `capabilities` 等 `[待提供]` 欄位，再翻譯到 en／ja |
| 列表頁說明 | `src/content/pages/zh-Hant/{search,insights,tags}.md` 的 `hero.description`、insights 的 `cta`，再翻譯到 en／ja |

注意：`/en/search/` 目前是唯一仍標「待翻譯」的頁面，`scripts/qa-behaviour.mjs` 用它檢查「待翻譯頁 noindex、有提示橫幅、不進 sitemap」。搜尋頁翻譯完成後，請把該檢查改成用測試資料（fixtures）製造一個待翻譯頁，不要直接刪掉檢查。

## 5. 正式上線：改用 www.bigxreality.com（等業主通知才做）

1. `src/data/site.json` 的 `url` 改為 `https://www.bigxreality.com`。base 由 url 自動推導為根目錄，`scripts/pages/package.mjs` 會自動產生 `CNAME`，不要另加 URL 改寫。
2. `scripts/sveltia/generate.mjs` 的 `site_url`／`display_url` 改新網址，執行 `npm run cms:sveltia:generate`。
3. 更新 `tests/public-url.test.ts` 及寫死網址的測試／文件（`grep -rn "eric-pv.github.io"`，歷史驗收紀錄除外）。
4. IT 在 DNS 設 `www` CNAME 指向 `eric-pv.github.io`；業主在 GitHub → Settings → Pages 設自訂網域並啟用 Enforce HTTPS。
5. 舊網址轉址參考 `docs/LEGACY-REDIRECT-PROPOSAL.md` 與 `docs/legacy-redirect-map.csv`（GitHub Pages 只能用靜態 HTML 轉址）。
6. 業主曾表示上線後 repository 會改為不公開，屆時再處理分支保護。

## 6. 其他待辦

| 項目 | 誰 | 說明 |
| --- | --- | --- |
| 公司防火牆封鎖本站（依內容分類：軍事／武器字眼） | IT | 請 IT 放行，或依封鎖頁上的廠商申請重新分類；改帳號名稱無效 |
| GitHub 舊整合「Workers Builds: bigxreality-web」 | 業主 | 舊 Cloudflare 整合，失敗可忽略；到 GitHub 整合設定移除 |
| 舊 Cloudflare Worker／D1／R2 退役 | 業主（工程協助確認資料） | 見 `docs/LEGACY-REMOVAL-PLAN.md`；未確認資料與備份前不刪 |
| CMS 刪除文章流程 | 工程＋業主 | 尚未用真人帳號實測（`/admin/` 刪除 → 審核 PR → 合併） |

## 7. 每晚完整檢查（Full QA）

- `.github/workflows/qa-full.yml` 每晚 00:00（台北）在 main 執行，不部署、不擋 PR。Claude 的每晚自動修復排程已停用，**請 Codex 接手查看每晚結果並修正失敗**。
- GitHub 有時會略過整點啟動的排程（2026-11-09 曾漏跑）。建議把 cron 從 `0 16 * * *` 改成非整點，例如 `17 16 * * *`。
- 失敗時下載 artifact `visual-copy-review` 看 `natural-typography/ISSUES.json` 等報告。可用不需登入的方式下載：`curl -L https://api.github.com/repos/eric-pv/bigxreality-web/actions/artifacts/<id>/zip`。
- 已知陷阱：
  - CI 用 Playwright 的 chrome-headless-shell，本機用完整 Chromium 可能看不到同樣問題；重現時用 `CHROMIUM_PATH` 指向 headless shell。
  - QA 會擋圖片載入：圖片載入失敗時會顯示長的替代文字，格線欄位要用 `minmax(0, …)`，才不會把頁面撐寬（2026-11-09 修過 `CapabilityShowcase`）。
  - 中日文末行孤字：依 LAYOUT-RULES §4 精簡或分段，**不可**把一般詞加進 `typography.json` 讓它不換行（2026-11-09 隱私權頁已改用分段處理）。
