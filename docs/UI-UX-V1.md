# BXR UI／UX 第一版

後續 Hero 已依最新指示統一為 SUT 背景構圖；最新規則見 `HERO-SCENE-UPDATE.md`，下列保留第一版交付記錄。

獨立分支：`codex/ui-ux-v1`。修改前基準：`6ce4590`（main，包含 PR #38）。不變更 CIS 色彩與字體家族，不改新聞、產品、解決方案正文來源檔及原始圖片。

## 首頁與共用排版

- 內容寬 1200px；閱讀欄寬 780px；H1／區塊／卡片／正文／輔助字建立共用層級，標題以 balance 自然斷行。
- 首頁八段順序：Hero、訓練價值、精選產品、核心技術、解決方案、合作夥伴、最新消息、聯絡。
- 依使用者最後修正：首頁完全不放客戶／合作夥伴 Logo。`HomePartners` 提供靠左標題、查看合作夥伴入口及 11／3／9／3 數字。原圖只在既有合作夥伴內頁展示。公司已確認 26 張均可公開，資料及 CSV 已更新，不再要求授權確認。正式外語名稱未確認者仍保留原名。
- 精選產品維持一大三小，產品名稱為主、價值句為輔；共用卡片統一標題、內距、摘要截行及操作位置。
- 缺圖共用 `ImagePlaceholder` 改為 BXR 品牌預設視覺，不顯示素材需求、封面圖片或虛線框；沒有新增或虛構照片。
- 桌面 Footer 為展開多欄，手機保留手動收合；連結仍由同一 Navigation Config 產生。外部文字連結以 ↗、站內閱讀入口以 → 區分。
- 未設定外部表單的資料／展示按鈕導向既有聯絡頁 Email 流程，不再顯示「待提供」或無法操作的假連結。

## 新聞

沿用同一 news collection、ARTICLE_ID、文章路由、封面／圖集／影片資料。總頁為一則 60:40 焦點新聞及每頁約十則橫式列表；手機直向排列。摘要以 CSS 截行，正文未刪減。

人工指定：TW 新聞 frontmatter 設 `featured: true`、`featuredPriority: 10`；數字較大優先，同分保留發布排序。沒有指定時使用現有最新文章。焦點從同一個 archive 的後續列表及分頁排除，避免重複。EmDash 使用 `featured`、`featured_priority`，seed、匯入及 loader 已同步；沒有連線修改現有 CMS。

分類 ID 完全保留，只有列表的在地化名稱調整。年份依確認的發布日期，無日期文章保留「日期待確認」，不猜測年份。篩選為真正靜態 HTML 連結，無額外前端套件：

- `/{lang}/news/`、既有 `/{lang}/news/page/2/` 等路由保持。
- `/{lang}/news/filter/event/all/`：活動。
- `/{lang}/news/filter/all/2025/`：年份。
- `/{lang}/news/filter/event/2025/`：組合。
- 有足夠文章時在篩選路徑後加入 `/page/2/`。

只產生有內容的篩選組合。篩選頁 noindex、自指 canonical、不加入 sitemap，避免重複索引；既有總頁及分頁保留正確 canonical／hreflang。語言切換只指向存在的對應頁，否則回到新聞總頁。空集合有正式空狀態。CollectionPage／ItemList schema 隨實際呈現文章更新，Article／NewsArticle 與媒體 schema 不改。

## Hero 與其他模板

`PageHero` 共用 split／scene／equipment／interface 四種變體，`hero-presentation.ts` 明確選擇，沒有逐產品重寫。

- SUT、軍事、警勤：已檢視現有情境圖，桌面約 520px，左文右圖與漸層；平板／手機改成上下圖文，避免人物設備裁切。
- 其餘有主圖的產品：完整圖像展示；兵棋圖台與智慧城市使用清晰介面／大圖變體，不以暗色文字覆蓋重要資訊。
- 消防防災、MUM-T、NOVA：缺少適合的正式 Hero 圖，保留原圖文版型並顯示品牌預設視覺，不強制放大無關圖片。沒有純設備去背圖的 BOX／滅火器保留完整原情境照片，不假裝成獨立設備素材。
- 原 Hero 宣傳主句與完整介紹保留到下方閱讀欄，不刪正文。產品 H1 改為完整產品名稱，解決方案 H1 改為方案名稱；原 SEO Title／Description、產品 Schema、slug 不改。
- 文章標題／摘要／正文同為 780px 閱讀軸，大封面仍可寬版。CSR 案例僅在第一個主題展示一次，所有主題標籤及返回關聯保留。
- 技術專欄為雙欄卡片；成功案例共用網格為雙欄大圖，沒有資料時維持誠實空狀態。
- 關於與聯絡的未完成外語頁首使用既有在地化 SEO 摘要作顯示備援，補齊聯絡操作／空狀態文字；既有 pending/noindex 狀態保留，不宣稱完整正文已完成翻譯。

## 素材

原始產品照片及客戶 PNG 未變更。新聞圖片資料夾目前只有 README，30 篇封面仍未上傳，沿用 NEWS-MEDIA-MANIFEST.csv 準備素材。`UI-V1-MEDIA-REVIEW.csv` 直接整理現有內容的 156 個素材需求欄位，含三個未提供的解決方案 Hero 與既有次要流程／情境圖位；不是新編造的素材數量要求。

## 驗證與預覽

執行 `npm run build`、`npm run check`、`npm test`、`npm run qa:ui-v1` 及既有 SEO、連結、圖片、新聞原文／多媒體、Footer、產品與三語模板回歸。測試資料另驗證案例版型、空集合、語言切換及無障礙。

`qa:ui-v1` 實際用 Chromium 檢查 TW／EN／JP 的 19 種路徑 × 1366／1440／1920／768／390／430px，共 342 組；截圖存於 `/tmp/bxr-ui-v1/`。使用 `npm run qa:ui-v1-preview` 產生並驗證 GitHub Pages 子路徑預覽，合併部署前以截圖及本地預覽為準，不宣稱正式網址已更新。

## 回復

合併前可切回 `6ce4590` 建立比較用分支：`git switch -c review/ui-before 6ce4590`。正式回復以 GitHub PR 的 Revert 建立反向 PR（若以 merge commit 合併則 `git revert -m 1 <merge-commit>`；squash 則 `git revert <commit>`），保留後續提交與稽核紀錄，不需重設或覆寫 main。

## 本次驗證結果

- Astro Build 通過；型別檢查 0 errors／0 warnings；36 個單元測試通過。
- 342 組主要頁面／語言／寬度檢查通過；首頁無客戶 Logo，數字與分類正確；30 篇新聞在三頁間不重複，CSR 兩篇各出現一次。
- GitHub Pages：295 份 rebased HTML、24,309 個本地引用與 42 組三語桌機／手機頁面通過，包含篩選重新整理及 Logo 路徑。
- SEO：276 個實際頁面檢查、194 個可索引 URL 與 sitemap 一致，warnings／errors／重複 Title／Description 皆為空；25,392 個內部連結／素材引用無破損。
- 90 份新聞三語正文逐字驗證通過；圖集、影片鍵盤與播放控制通過；15 張產品／解決方案原圖的實際回傳 bytes 不變。
- Footer 共用導覽、三語產品／解決方案、888 項技術頁檢查、返回頂部、歷史返回／重整、減少動態與無 JS 備援回歸通過。
- 測試資料建置、phase2、公司頁與無障礙回歸通過（0 serious／critical）；案例仍由核准資料控制，不新增虛構案例。

檔案清單：`UI-V1-FILES.txt`。本工作階段的桌機／手機截圖：`/tmp/bxr-ui-v1/`，包括首頁、合作數字、新聞、SUT／BOX／兵棋圖台、軍事情境、CSR、文章與 Footer。遠端 CI 狀態以 PR 為準，不將本地通過冒稱為正式部署。
