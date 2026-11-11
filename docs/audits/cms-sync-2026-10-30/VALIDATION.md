# CMS 同步修正驗收

範圍：本機隔離測試。修正尚未合併 main；這不是線上發布成功紀錄。最終命令結果另見 VALIDATION.json。

## 已驗證

- main 與舊 CMS 分支比較：263 檔、60 檔差異、397 欄位差異；main ahead 21、feature ahead 0。再次讀取 remote refs 未發現新的 feature-only 或 cms/* 分支。未取得 GitHub PR 狀態或瀏覽器未儲存草稿，不能據此斷言不存在。
- 正式內容、文章及原始媒體相對 main 沒有變更；僅修改全站站點 URL 的正式網址設定及引用方式。
- Astro 正常建置；TypeScript 0 errors、0 warnings；44 個單元測試通過。Sveltia 檢查 1,470 個巢狀欄位、183 個現有內容檔的 schema／round-trip 相容性。
- 實際固定版本 Sveltia App：根路徑與 Pages 子路徑載入、Token 表單、隔離 OPFS 本地副本新增／修改／PNG 位元組上傳、三語草稿、既有新聞編輯、媒體 JSON、換行資料與隔離刪除、390px 後台登入畫面均通過。未提供真人 Token，未呼叫 GitHub 寫入。
- qa:cms-publication 在未推送的 detached Git 工作區建置四次：三語草稿不產生路由；修改並公開後三語路由／文字／canonical／sitemap 正確；TW 下架使三語路由與 sitemap 消失；刪除三語測試檔後亦無殘留路由。既有 SUT 與新聞路由每階段仍存在。結果見 ISOLATED-PUBLICATION.json；其中提交只存在本地，不是已發布的 GitHub 提交。
- Pages artifact：正式 robots／sitemap、main CMS 目標、三語 canonical／hreflang／OG 的專案子路徑、內部連結、字型、圖片、語言切換與搜尋通過；管理後台維持 noindex，正式頁面不再全站 noindex。build-info.json 具有 Git SHA、內容 digest、來源與 dirty=false。
- 三語新聞：90 篇詳細頁與目前 Git 原文對照；Pages 子路徑另驗證 6,555 個引用及 36 組桌面／手機新聞頁。
- 圖片：15 張原始素材位元組不變、171 組頁面／尺寸載入、Alt、fit 與無 404 檢查通過。
- 換行：七種寬度（320／375／390／430／768／1024／1440px）、597 組頁面／尺寸、9,453 個標題檢查通過，新增人工審查候選為 0。既有產品／解決方案 Hero 構圖與首頁影片測試通過。
- 全站媒體：1,062 組頁面／尺寸、4,767 次圖片解碼與 21 組影片情境通過，涵蓋七種寬度；原始影片保持不變。
- 隔離 fixtures 的技術頁、phase 2、公司頁、搜尋與 12 組桌面／手機 axe 掃描通過，critical／serious／moderate／minor 均為 0。fixtures 沒有上傳或部署。

共 39 組本機命令／測試設定的最終 exit code 均為 0，詳見 VALIDATION.json。完整媒體、共用元件、合作夥伴與密度／導覽回歸均通過；這不代表遠端 CI 已執行或發布成功。

## 已修正的初輪驗收問題

新增 dist-pages 後，TypeScript 原本會掃描已打包的第三方 JS，造成記憶體不足；已將產物加入 exclude，重跑 0 errors／0 warnings。英文與日文回歸原本寫死舊 www 網域，已改用正式 URL helper，兩語重跑通過。隔離 CMS 刪除測試已改用實際 alertdialog 與直接檔案不存在檢查，完整瀏覽器測試通過。

## 尚未驗證

| 項目 | 原因與後續 |
| --- | --- |
| 真實 GitHub 登入與兩名管理者權限 | 沒有提供真人認證；本地 Token 表單不是登入成功證據 |
| 遠端 editorial 草稿／review／Publish | 本機 OPFS 模式不是 GitHub editorial workflow，不能宣稱已通過 |
| 發布後 main 寫入及 Actions 觸發 | 沒有合併 main，也沒有推送測試文章；API Forbidden |
| GitHub Pages 線上更新、部署 SHA 與遠端 SEO | HTTPS CONNECT 被執行環境 proxy 403 阻擋；不是網站來源回傳 403 的證據 |
| 外部 Worker／D1／R2、DNS 與設定 | 無帳戶讀取證據；沒有刪除或停用任何線上服務 |
| 自動建立 PR | gh pr create 的一般及沙箱外重試都回覆 GraphQL Forbidden；分支已成功推送，需透過 compare/main...fix/cms-main-publication 建立 PR |

依 LIVE-ACCEPTANCE.md 完成真人隔離驗收後才更新遠端狀態。首頁主敘事及七項技術 TS 全文尚無 CMS 編輯入口，範圍明列 CMS-FIELD-MAP.md；本 PR 不以另一個無效欄位冒充已管理它們。

## 回復與舊架構

以本 PR 的 Git revert 回復程式／設定；不重設 main 或舊 CMS 分支。移除舊 preview workflow 是將同一個 Pages 發布責任併入 CI，沒有新增部署平台。EmDash／Cloudflare 的程式耦合尚未卸載，依 LEGACY-REMOVAL-PLAN.md 在真實同步驗收穩定、外部資料確認與人工確認後另開清理 PR。Git revert 無法復原被刪資料庫，因此本次完全沒有刪外部資料。
