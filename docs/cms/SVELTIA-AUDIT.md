# Sveltia 整合審查與實作計畫（2026-10-28）

## 審查結果

- 基準：main `076ddcb`。工作分支 `feature/sveltia-cms`；不修改或合併 main。
- Astro 7.3.8 + Cloudflare adapter，頁面靜態輸出，EmDash 管理 API 仍在 Worker。GitHub Pages workflow 以 Markdown 建置，再將所有站內路徑加 `/bigxreality-web/`；main push 自動部署。
- 全部 11 集合：products、solutions、pages、tags、insights、news、case-studies、milestones、team、partners、investor-items。實際 Markdown：36 產品、18 解決方案、90 新聞、39 固定頁；其他集合目前無正式文章。ui JSON 不屬 Content Collection。
- 三語使用 `<collection>/{tw,en,jp}/<slug>.md`，以同 slug 關聯。TW 擁有 draft/date/order/relations 等結構欄位，其他語言擁有在地化文案。不可重新翻譯或更名舊 slug。
- Schema 包含深層 landing、可選物件、巢狀陣列、enum、date、數字或待提供字串、personnel 物件或字串。簡單平面 CMS 設定會遺漏資料。
- 圖片是 `src/assets/` 的 Astro 匯入；frontmatter 圖片用相對路徑，產品另有 primary-images 映射。新聞多媒體位於 `src/data/news-media.json`，媒體檔名、審核與三語 alt 為必需，影片在 `public/media/news/`。不能以 `/src/assets/` 公開路徑替代。
- 現有 `/admin` 只支援 `/cms-test-content`，沒有正式 schema、i18n、SEO、圖片策略；JS CDN 未固定版本。測試文章確實不在 Astro loaders 範圍。
- EmDash 依賴、DB/R2、Worker、source guard 均保留。Cloudflare Workers Builds 目前只接受 emdash/bootstrap；Sveltia 更動 Git Markdown 不會更新 EmDash DB。這是另一項部署遷移工作，不能假稱已支援雙系統同步。
- 官方上游審查：`sveltia/sveltia-cms`，version 0.253.1；確認 GitHub token、editorial_workflow、multiple_folders i18n、嵌套 object/list 等支援。官方網站在本環境回傳 403，因此改查官方 Git 原始碼與設定型別。

## 實作計畫（先完成本審查再改程式）

1. 固定 CMS 版本，讓 `/admin/` 的相對 config URL 在 root 與 GitHub Pages 子路徑均正確，保留 noindex。
2. 從現有 Astro Zod schema 產生可重複使用的欄位設定，保留所有 nested fields。複合 union 用 JSON code widget 完整保留，不簡化 schema。產生器遇到未支援類型必須失敗。
3. 正式集合沿用三語 folder；舊 slug 不變。固定頁限制 create/delete，已移除歷程與舊個人 team 集合不公開為可新增頁面。提供獨立安全測試集合。
4. 圖片寫入 src/assets 對應資料夾，用相對值回存；新增新聞媒體設定沿用現有 JSON，不重建一套。影片來源使用既有 URL／public 路徑。原始素材不修改、不覆蓋。
5. 個人 GitHub fine-grained PAT 作為無額外伺服器的可執行登入方案；OAuth 為可選、需另外配置 confidential-client token exchange。至少兩名 Admin、編輯者 Write、main PR/review/ruleset 保護由 GitHub 控管。CMS UI 不是安全權限邊界。
6. 內容提交目標先固定 feature/sveltia-cms，main 僅由 PR 合併。沿用既有 CI 與 Pages main 部署；提供可重複執行離線新增／修改／上傳模擬及瀏覽器 CMS 載入測試，測試素材不進入正式 src/content。
7. 執行 build、i18n/schema、現有 SEO/連結回歸、子路徑及手機載入測試。真實 GitHub 使用者授權／repo 寫入若缺憑證，明列未驗證，不以 mock 通過代替。

## 不相容與範圍決策

不移除 EmDash、不改成新的後端、不修改既有 layout/正文。Azure/AWS 可消費同一份靜態 Astro artifact，但現有 Cloudflare 混合輸出不可直接宣稱是無伺服器相依的跨雲產品；後續需獨立驗證純靜態 adapter/build profile。

## 實際驗證後的計畫修正

- 真實 CMS 驗證顯示 tw 會被 Intl 語言標籤顯示為 Akan，jp 非標準代碼。最終設定改為由同一產生器建立明確 TW／EN／JP 集合，沿用原資料夾與 slug，不使用錯誤的原生標籤，不搬移檔案。
- 複合型別使用 CMS 官方 registerFieldType API 與它內建的 React；JSON 媒體表用官方 registerCustomFormat，保留原本 root mediaId map，沒有增加 body 包裝。
- 原映射會覆蓋編輯者設定的產品／解決方案圖，因此只調整明確圖片的來源優先權；現有資料沒有 override 時仍沿用原有主圖、卡片、Hero 版型。
- 原新聞 QA 固定要求 30 篇與 TXT 文案、SEO QA 比對舊快照，會阻擋正常編輯。改為仍驗證原歷史 ARTICLE_ID 與正文呈現，但比對目前 Git 內容，列表數目動態計算，SEO 對照當前明確設定；原始 TXT 和既有語意／URL／hreflang 測試保留。
- /admin 是獨立 noindex App，網站文章 SEO、Footer、UI 語言 QA 排除 admin，由專用真實 CMS 瀏覽器 QA 覆蓋，不要求 CMS 有官網正文 Schema／Footer。

- 原單元測試與 UI／CSR 回歸亦移除固定 30 篇、固定兩個 CSR 案例、固定初始媒體檔名／網址的限制，改驗證目前 Git 資料、完整列表、唯一 ID、原歷史 slug 與來源檔完整性，讓後台新增文章／圖集能走既有 CI。
