# BXR 全站視覺與三語文案審核

基準：`origin/main` 的 `29019fe`；分批交付：首頁影片 `codex/home-hero-video`（使用者已合併 PR #47）、圖片 `codex/image-composition`、三語文案及此報告 `codex/copy-review-main`（原 #49 僅合併工作分支）。後兩批等待人工審核，不自行合併正式站。

## 主要調整

- 首頁兩支原始影片依 `src/data/hero-clips.ts` 順序播放，真正播放完畢才切換並循環。下一段成功播放後再切畫面，保留前段畫面及背景延伸。影片保留原始完整畫格；桌面左右分配文案與場景，平板及手機使用 16:9 畫面上、文字下。沒有右下角可見暫停按鈕；鍵盤 Tab 會顯示播放控制，減少動態效果預設使用靜態海報。
- `ProductImage` 統一圖片比例、逐圖焦點與同源模糊背景延伸。設備及介面保留完整輪廓；情境卡片採已檢視的輕度裁切。Hero 由 `hero-presentation.ts` 控制場景、設備、介面變體；完整主圖與半透明漸層背景融合。
- 產品總覽使用現有軍事訓練實景；消防 Hero 與整合做法使用現有 VR 滅火器素材。六項能力維持內容，缺少實際 UI 的項目使用一致文字卡，不拿訓練照片冒充不同功能畫面。
- 新聞缺少照片時使用標題、分類及年份構成的正式文字封面，取代重複 BXR 圖。現有封面及 CMS 圖片仍優先，圖集、影片及完整正文保留。
- 核心技術使用對應應用領域素材；AI 專屬介面缺圖時使用文字 Hero。既有 illustration 標記以「概念視覺」區分。首頁合作夥伴保持統計數字，沒有加入 Logo。
- 正式頁面中直接人稱、部分負面／轉折敘述改為企業第三人稱、正向句式。維持產品名稱、數字、日期及必要功能限制；歷史新聞原文不改寫。

## 頁面與檔案

共用元件影響 TW／EN／JP 的首頁、產品總覽及詳細頁、解決方案總覽及詳細頁、核心技術、新聞列表／詳細頁及採用共用卡片的 CSR、一般內容頁。導覽文字變更會套用全站；沒有新增或更改路由。

詳細檔案：`CHANGED-FILES.txt`。建置出的主要檢查頁：`CHECKED-ROUTES.txt`。

核心位置：

- `src/components/home/HomeHero.astro`、`src/data/hero-clips.ts`
- `src/components/PageHero.astro`、`ProductImage.astro`、`EditorialCover.astro`
- `src/data/primary-images.ts`、`src/lib/hero-presentation.ts`、`technology-media.ts`
- `NewsCard`、`CardArticle`、`ArticleDetail`、`LandingSections`、`CapabilityShowcase`、`ScenarioCards`、`FlowSteps`
- 三語 `src/content/products/`、`solutions/`、`pages/`、`ui/`；首頁／CSR／技術文案資料。

## 圖片、影片及文案證據

- [完整原始素材盤點](MEDIA-INVENTORY.json)：167 個受版控圖片／影片的尺寸、影片長度、SHA256 及來源一致性。原始檔全部保留，沒有下載、產生或壓縮產品／新聞素材。
- [圖片使用及替換](IMAGE-CHANGES.csv)；[待補素材](MISSING-MATERIALS.csv)。
- [逐欄修改前後對照](COPY-CHANGES.csv)；[逐欄待人工確認](COPY-REVIEW-EXCEPTIONS.csv)；[統計](COPY-AUDIT.json)。檢查是文字欄位盤點及實際改寫，不以執行期關鍵字替換。尚有歷史原文、限制及技術敘述審核例外，不能宣稱全站已完全消除人稱與否定句。
- [修改前截圖](screenshots/before/) 與 [修改後截圖](screenshots/after/)：13 種 TW 頁面在 1440／390px 的同尺寸對照，以及兩支實際播放影片的桌面／手機畫面。另附所有產品／解決方案 Hero 接觸表。[原始影片影格接觸表](VIDEO-SOURCE-FRAMES.jpg)：第一列 clip 1、第二列 clip 2；各列依 0.3／1.2／2.5 秒排列。

素材不足：30 篇新聞封面仍待上傳；滅火器火災類型、器材介紹、教學操作、成果、控制器特寫與各場景缺少正式對應圖片；AI 技術介面待提供。兵棋圖台現有素材的拍攝／合成／AI 來源仍請公司確認。全部細項列於 CSV。

## 驗證範圍與限制

驗證數據及命令結果見 `VALIDATION.json`、`BROWSER-RESULTS.json`。

Playwright 檢查 320／375／390／430／768／1024／1440px。320 與 1440px 涵蓋所有 216 個非篩選頁路由；中間五種寬度檢查各模板及三語共 126 個路由，並非每篇同模板新聞重複檢查。檢查圖片實際 decode、alt、水平溢出、16:9 縮圖、Hero 主圖呈現、控制與減少動態效果。兩支影片在 1440／390px 以實際 ended 事件完成切換及回到第一段，沒有用假 ended 事件代替構圖錄取。

視覺審閱使用本機 Chromium 實際截圖、原圖接觸表及每支影片三個時間點的原始影格；產品／解決方案 Hero 接觸表逐格檢視。手機驗證為瀏覽器模擬，仍需實機 Safari／Android 人工複核。沒有使用人體偵測模型，亦未宣稱自動辨識身高。

Sveltia schema／媒體欄位及本機真實 CMS 隔離編輯流程驗證；沒有使用正式帳號執行 GitHub 登入或正式發布。需要授權的真實 GitHub 端到端發布仍待公司管理者操作。沒有變更 CMS 設定、原始媒體或新聞 90 份三語來源正文。

SEO：保留既有 slug、canonical／hreflang／schema 產生方式。部分頁面 SEO 文案配合正向企業語氣更新，完整 before／after 位於 COPY-CHANGES；EN／JP 聯絡頁翻譯狀態改為已翻譯，交由既有 SEO 規則產生對應索引。沒有手動建立重複網址。

效能：沒有新增套件；CSS opacity／transform 交接，圖片同源背景在原圖載入後設定以保留 lazy loading。預載下一支既有短片；離開頁面及背景分頁暫停，頁面切換清理監聽，減少動態效果預設不載入影片。

回復：合併前直接關閉 PR 即可；合併後可 revert 本 PR 的合併提交，原始媒體無須還原。

### 最終本機結果

已列出的本機檢查全部通過，詳見 VALIDATION.json 與 TEST-RESULTS.txt。包含 Build、TypeScript、單元測試、SEO／sitemap／內部連結、圖片、新聞匯入／圖集影片、互動、密度導覽、三語、Header／Footer／公司／團隊／CSR、Sveltia 及 fixture 搜尋／無障礙。GitHub Pages 子路徑檢查通過 293 個 HTML、23,758 個站內引用與 42 個三語桌面／手機頁面。

沒有取得遠端 GitHub CI 狀態，沒有執行真實管理者登入發布、手機實機或 Lighthouse 評分。文案清單仍有 79 處歷史原文及 283 處技術／功能條件待人工確認；這些保留項目明列在 CSV，不視為已完成改寫。
