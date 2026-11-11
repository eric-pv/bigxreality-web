# BXR CMS 同步診斷（實作前）

基準 main：7c9602bcf147a7c256f169956510905582417497；CMS backend 分支：589ecd1d3256669538c061958d211ec334bcc64d。日期：2026-10-30（台北）。

## 已證實

- feature/sveltia-cms 是 main 的祖先：main 多 21 個提交，feature 沒有獨有提交。
- 比較 263 個內容／資料／媒體檔，60 檔不同，397 個可解析欄位差異。所有差異保留 main 的已合併版本；不把任一分支覆蓋另一分支。
- 90 份歷史三語新聞檔與媒體位元組兩分支相同；沒有媒體差異或 feature-only 待救援提交。
- 產品總覽 Hero 在 CMS 舊分支仍是點雲，main 已換成訓練圖；狙擊產品 challenge.title 仍是舊文案；首頁 TS 文案亦有差異。最新 typography.json 在舊分支不存在。
- backend.branch=feature/sveltia-cms，editorial_workflow 的 Publish 目標也是該分支；目前 Pages workflow 只看 main。CMS「已發布」不等於正式網站已更新。
- CMS workflow 草稿狀態與 TW frontmatter draft 是兩層：合併到發布分支後，若 TW draft=true、未到日期、未核准或翻譯未完成，仍可能不公開。
- 沒有取得 refs/heads/cms/* 草稿分支。這不能證明瀏覽器沒有未儲存內容，也不能替代 GitHub PR／CMS 狀態查詢。
- Pages workflow 目前強制 BXR_PREVIEW=1，全站 noindex；canonical 的基準仍是 www.bigxreality.com。這與指定的 Pages 正式網址不符。

## 修正前設定所形成的分流

此圖是程式與設定可證實的流程；不是遠端部署成功紀錄。

```mermaid
flowchart LR
  CMS[Sveltia 編輯與 Publish] --> Old[feature/sveltia-cms]
  Old --> Stop[沒有 Pages 觸發器]
  Main[Git main] --> Workflow[preview.yml：BXR_PREVIEW=1]
  Workflow --> Pages[GitHub Pages artifact：noindex]
  Main --> GitData[前台使用 Git Markdown]
  Legacy[EmDash／Cloudflare integration] -.-> Build[仍耦合 Astro build；移除需拆依賴]
```

## 無法驗證

GitHub Pages、admin、robots、sitemap 的 HTTPS CONNECT 被執行環境 proxy 403 阻擋；環境外重試仍相同。這不是確認網站回傳 403。GitHub Pages／Actions API 同樣 Forbidden。因此尚未核實目前線上部署 SHA、真人登入、實際 Publish 與遠端 CI 狀態，不會宣稱它們通過。

## 最小修正方案

1. 保留 main／feature 全部既有檔案與歷史；在獨立修正分支只把 CMS backend 指向 main，保留 editorial_workflow。任何新出現 feature-only 提交／cms 草稿都先逐檔核對，不直接同步整個分支。
2. 將 CI 與 Pages 發布接成同一個受檢查的版本：PR 只驗證，main 的驗證成功後才發布同一次建置的 artifact。移除舊的獨立 preview 部署觸發，避免 CI 失敗仍發布。固定正式來源為 Git Markdown，阻擋 EmDash／fixtures 進入正式 artifact。
3. Pages 改成正式輸出：站點網址與 URL helper 統一處理專案子路徑；保留原 slug、三語與正文，修正 canonical／hreflang／sitemap 的基準，不把全站 noindex 當正式設定。附 build-info.json 供核對 SHA／內容 digest 與 Actions run。
4. 建立唯一 ARCHITECTURE，改正部署／CMS 操作文件。EmDash／Cloudflare 程式依賴先列歷史耦合與移除計畫；未取得外部資料與發布驗收前，不刪 Worker／D1／R2，也不將仍依賴的套件直接卸載。
5. 用隔離 CMS 副本與隔離文章驗證可讀、編輯、新增、上傳、草稿／下架／刪除的路徑；正式 GitHub 授權→PR→Actions→Pages 若不能實測，逐項標記尚未驗證。

## CMS 編輯範圍的邊界

目前 CMS 提供新聞／技術文章／產品／解決方案／案例／固定頁／標籤／投資人、媒體表及換行詞庫。首頁主敘事與七項技術全文仍在 src/data/*.ts，未提供 CMS 編輯入口；不會假稱它們能透過固定頁集合編輯。這些檔案仍受同一 Git main 版本管理。擴大全站後台編輯範圍須等值資料遷移與獨立驗收，本次不重寫正常網站元件或擅改其文案。

完整逐檔、最後修改紀錄、前台資格及保留建議：CONTENT-COMPARISON.csv。逐欄前後值：FIELD-DIFF.csv。完整補丁：BRANCH-CONTENT-DIFF.patch。前台資格不是已確認的線上發布狀態。
