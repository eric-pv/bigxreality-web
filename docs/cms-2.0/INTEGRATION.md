# CMS 2.0 整合

2026-11-05。使用者要求在既有 Sveltia 架構完成三語合併編輯、正文任意位置的圖片／影片及技術頁全文後台化，集中一個整合分支，完成功能與驗證後才交付 PR。已合併 #94、#95 是前置改善，不是完整 CMS 2.0 的完成證明。

## 架構與資料

沿用 Sveltia 0.253.1、Git main／editorial workflow、Astro 靜態建置與 GitHub Pages。使用公開 i18n、editor component、preview template 及 string transformation API，不 fork、不 patch Sveltia、不新增後台服務。

原生 i18n 用資料夾代碼產生語言名稱，不能將 `tw` 映射成繁體中文、`jp` 映射成日文。正式內容改用 `zh-Hant`／`en`／`ja`；Astro loader 映射回既有 logical ID `tw`／`en`／`jp`，原網址、slug、ARTICLE_ID 與素材位置保持。148 份搬移檔案的 SHA-256 見 [路徑遷移](evidence/LOCALE-MIGRATION.json)。公開網站不產生 `/zh-Hant/` 或 `/ja/` 路由。歷史 fixtures 可保留舊代碼；正式 loader 與 CMS 檢查拒絕舊內容資料夾，避免兩份來源。

七項技術的 21 份全文與三份總覽改成 Git JSON，普通表單編輯，不要求管理員手寫 JSON。原 TS 文案模組已移除，保留型別與資料組合入口；關聯讀取繁中來源，notes 與各語文案獨立。遷移比對見 [逐檔證據](evidence/TECHNOLOGY-MIGRATION.json)。唯一文案格式調整是將既有繁中章節「AI 如何參與模擬訓練？」移除末尾問號，符合既有標題標點測試；其餘文案、FAQ、CTA、SEO 與關聯相同。

## 三語操作

1. 選一個集合、開啟同一篇內容，以原生切換器選繁體中文、English、日本語。切換時保留未存稿。
2. 繁體中文是日期、草稿、分類、排序、識別碼及關聯等結構欄位來源；這些欄位使用 duplicate。各語標題、摘要、正文、圖說、alt 與翻譯狀態獨立。實測 3,640 組結構值比對，沒有兩語都明確填值卻互相矛盾的欄位；缺省值不當成文案差異，見 [相容性](evidence/SHARED-FIELD-COMPATIBILITY.json)。
3. 新增時啟用三語，繁中預設 source，英日預設 pending。以繁中設定共用 slug，三語填完後一次 Save。TW `draft=true` 代表未公開，與 CMS Save Draft／Publish 狀態不同。
4. Save 將三語變更交給 Sveltia Git backend；不宣稱大型含素材 changeset 永遠是單一原子 commit。GitHub 權限、main 審核及 CI 保護持續有效。
5. Sveltia 會正規化 YAML 格式與部分 schema 預設值。驗收要求未編輯翻譯值與完整 Markdown 正文保持，不承諾 metadata 逐 byte 相同。

## 正文圖片與影片

- 在正文的目標段落按 Insert，選「正文圖片 / Inline Image」或「正文影片 / Inline Video」。填寫對話框後 Insert；點選區塊可 Update 或 Remove。區塊可用原生選取、剪下與貼上移位，也可用 Markdown 模式調整區塊位置。
- 圖片使用既有媒體選取器／上傳，必須填該語 alt，可加圖說。使用新檔名，不覆寫或刪除原圖。共用圖片在三語正文都要有對應區塊及各語 alt；全部核准後才公開。未核准區塊不輸出。
- 外部影片填 YouTube／Facebook 連結與各語標題；一般公開核准與嵌入核准分開。未核准嵌入時只顯示合法連結；核准播放器需點擊才載入，不自動播放、不下載第三方影片。
- 本地影片選 Local Video，使用上傳檔案欄位；不必在外部 URL 欄位填值。檔案存於 `public/media/news/`，維持 20 MB 上傳限制與新檔名。若超過限制須另外評估，不新增外部儲存服務。
- 儲存格式為 `<!-- bxr-image: {JSON} -->`／`<!-- bxr-video: {JSON} -->`，由公開 editor component API 往返，內文其他 Markdown 保持。前台只解析明確區塊，跳脫文字與屬性，圖片限於本地 `src/assets/images/`，影片使用既有 allowlist。
- News、Insights、Case Studies 與原有 Markdown 正文使用共用 ContentBody。產品／方案的 typed landing 表單仍控制原有固定版面，不把全站版型硬換成自由正文。技術頁每章可加 rich-text body，頁面可加補充正文。

## 技術頁

「核心技術全文」管理七個既有 ID，禁止任意新增／刪除。可修改 Hero 文案與圖片、引言、章節順序與內容、條列、FAQ、按鈕文案、產品／方案關聯、關聯說明、補充正文及 SEO。「核心技術總覽」管理總覽與七項摘要。未提供圖片時沿用現有核准圖片映射。

繁中 draft 控制所有語言；pending／draft 翻譯不產生詳細頁及 sitemap URL，總覽連結與 hreflang 同步。Hero 圖片、FAQ、產品／方案的雙向關聯與閱讀順序沿用現有元件。

## 切換與回復

部署前先保存未存稿，關閉舊後台分頁，部署後登出／刷新 `/admin/`，確認只有單一新聞集合及正確語言名稱。2026-11-05 透過 native Git 檢查遠端 `cms/*`，當時沒有草稿分支；不代表別人的瀏覽器沒有未存稿。若之後出現舊路徑草稿，先保留分支並逐檔遷移，不直接 Publish 或覆蓋 main。

整合變更可用 Git revert 回復；若切換後已有新稿，必須將標準語言資料夾內的新稿一併映射回舊路徑，不以整個舊分支覆蓋新內容。照片／影片未搬移或刪除。草稿未合併前不影響公開站。

## 驗證

- `npm run cms:sveltia:check`：schema、單一三語設定、既有內容、共用媒體三語核准、舊路徑拒絕及關聯檢查。
- `npm test`、`npm run check`。
- `CHROMIUM_PATH=/usr/bin/chromium npm run qa:sveltia`：真正固定版 Sveltia，全部操作在瀏覽器 OPFS 副本；含單篇三語、未存稿、共用值、圖片 CRUD、外部／本地影片上傳、技術頁與總覽 JSON 編輯、隔離刪除、手機登入。
- `CHROMIUM_PATH=/usr/bin/chromium npm run pages:build`；`npm run qa:technologies`。
- `npm run build:fixtures`；`npm run qa:inline-media`；既有 fixtures 功能／搜尋／無障礙測試。前台媒體檢查包含三語與手機、段落位置、核准 gate、click-to-load 與本地影片 metadata。
- `npm run qa:cms-publication`：獨立本地 clone 中測試草稿→發布→下架→刪除與重建，沒有 Git worktree、遠端寫入或正式內容修改。

本地／OPFS 驗證不等於真人 GitHub 登入、遠端 PR、Actions 或 Pages 發布驗收；未實際執行者不標成通過。整合分支的當次結果記錄於下方，完成後才交付同一個 PR。
