# 與其他工作協作、衝突及回復

## 本次保護

分支從 main 6f5935c 建立，完稿時同步到 eed1fbb，保留他人已合併的 #73 視覺與 #72 靜態建置；本 PR 相對 main 只新增 docs/cms-2.0。沒有修改 AGENTS、正式 config／generator／schema、root package／lock、Actions、src/content、registry 或媒體，也沒有將本地試驗 ref 推遠端。

所有盤點綁定 SHA。管理者同步上傳的新聞照片／影片、Claude 的子頁視覺改版仍可繼續；不能因快照未列素材就重命名、補寫、覆蓋或刪除。提出文件 PR 前再確認 remote main 動態，但不為了數字追新而將他人檔案複製回舊版。

## 後續衝突熱點

| 工作 | 可能共享檔案 | 協作方法 |
| --- | --- | --- |
| Claude 子頁／Hero／文章視覺 | ArticleDetail、Prose、NewsGallery、NewsVideos、產品頁及 CSS | Phase 3 renderer adapter 先約定最小責任；拿最新 main 做小 PR，保留其 DOM／class／焦點，不重建頁面 |
| 新聞／媒體同步 | src/content/news、news-media.json、images/news、public/media/news | 不鎖整個資料夾；儲存用 SHA／record patch；人員仍上傳時不整份 registry 覆寫 |
| CMS 修復 | generate、config、bootstrap、value-tools、schema、Sveltia check／QA | 此 Phase 0 不碰；Phase 1 由單一負責人連同產生器及測試更新，不能手改 config |
| 發布／Pages 優化 | ci.yml、scripts/pages、public-url、ARCHITECTURE | 保留唯一現有 pipeline、base 支援、CNAME／404／asset closure 規則，不新增 CMS2 專用正式部署 |
| 詢問 GAS | integrations、tools、contact／cta | 獨立任務，不混入後台重寫／表單服務，也不因名稱相似重新加雲端 backend |

## 演進與切換

1. Phase 1–4 每個小 PR 直接以最新 main 為 base；無關 PR 不以另一個工作分支當 base。
2. 新 shell 只測隔離資料／repo；Sveltia 持續唯一正式寫入入口。
3. 切換前比較 main、cms/*、待審 PR 與編輯者尚未存的內容；保留各版，不 reset／整枝覆蓋。必要的短暫編輯／發布暫停由管理者安排，不在本階段擅自凍結。
4. 先確認 renderer 能向後相容，再切唯一 admin 入口。前台 routes、slug、canonical／hreflang／sitemap 保持；原始文件不批次重寫。
5. 管理者實際驗收後才合併／部署；開發者不以本機綠燈自行發布。

## 回復

- 保留 Sveltia 固定版本、SRI、上一版 admin config／bootstrap 與可部署 artifact／Git tag。
- 只回復 admin 程式與必要相容 renderer，**不回復整個 repository 到舊 commit**，避免丟失切換後的新稿／媒體。
- 若新 block 已被使用，回到 Sveltia 後至少需可安全 raw-edit；若無法往返則暫時該型別只讀，保留能顯示新 block 的 renderer，不能回退到會丟內容的 serializer。
- 部署失敗保留最後成功站點；先看 PR、Actions、build-info，不 force push 或停用 CI。
- rollback drill 必須證明新上傳媒體、新增文章、三語與 registry 沒被回退；不刪外部資源，本方案也沒有新資料庫可供「清空重來」。
