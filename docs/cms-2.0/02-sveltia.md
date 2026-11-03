# Sveltia：已證實能力與缺口

正式 index 固定 `@sveltia/cms@0.253.1`，SRI 不變。研究 source tag v0.253.1 commit `2de6c09797b8f1947784a999c21ceb322c8b59bc`；registry 查詢 latest 為 0.257.0，**沒有自動升級**，也不將最新版功能當目前版本已有。

| 需求 | 判定 | 依據與限制 |
| --- | --- | --- |
| 同類一個 collection | 原生可行 | i18n multiple_folders 對應 collection/<locale>/<slug>.md；不是必須維持三個選單 |
| 同篇切換語言、不丟未存資料 | 原生可行，POC 通過 | 真實 App 合成 OPFS；一個 collection、一個 entry，三語切換後回 TW 仍為修改值 |
| 同一次 Save 三檔 | 本地 POC 通過 | 讀回三個檔的標題均正確；不等於 GitHub 原子交易 |
| 正確 TW／EN／JP 名稱且不搬目錄 | 有缺口 | tw 被 Intl 當 Akan／Twi，jp 顯示原代碼。LocaleCode[] 與固定 switcher 不提供已驗證的 locale→既有資料夾別名設定 |
| 共用欄位一次設定 | 原生 duplicate 具基礎 | 不能直接套所有欄位；272 組候選中 29 組有 absent／原值差異，需先分欄位 ownership，保留未編輯資料 |
| 欄位名稱、選項、hint 雙語 | 設定層可做 | label／option label 保留原 value；generator 應為唯一產生入口 |
| 系統按鈕與所有錯誤雙語並列 | 不可宣稱純 config 可完整達成 | app locale 是單一語言；registerLocale 未支援。自訂欄位可改，自有核心 chrome／驗證文字需要 upstream 支援、fork 或客製介面 |
| 搜尋式關聯多選 | 原生 relation 可做 | value_field 保留 slug，搜尋／顯示 hero.name、title 等；Phase 1 先指向 products-tw 等 canonical 集合，避免三語重複候選 |
| 自訂 rich-text 媒體區塊 | registerEditorComponent 有入口 | 可定義 from/toBlock、HTML、preview；不是不需開發就支援所有嵌入。須 round-trip 與 XSS／本地資產 renderer 驗證 |
| 自訂型別／JSON | 現況已用 | registerFieldType（registerWidget alias）、registerCustomFormat；目前 union／media map 對一般編輯者仍是進階 JSON |
| Dashboard／完成度／跨類別導航 | 需要自訂工作 | 不能把 collection filter 視為完整管理總覽；沒有已驗證的公開自訂全頁 router API |
| 專屬媒體資料庫 | 原生資產功能可改善 | 有搜尋／素材入口；使用位置、registry approval、三語 alt、Inline 媒體與大型影片流程仍需 adapter |
| 權限 | GitHub 為正式邊界 | 藏欄位或按鈕不是 field/path 級 RBAC |

## GitHub 儲存真相

upstream `services/backends/git/github/commits.js` 的 createCommitOnBranch 使用 expectedHeadOid，通常一批變更同一 commit；大型 changeset 則有明確 queue、重試與多次 commit。不能把三個 Contents API PUT 或大型含媒體儲存說成「保證全成或全敗」。正式審核發布還取決於 PR／分支保護／Actions／Pages。

## 不採用的捷徑

- 不改 tw／jp 目錄成 BCP-47 以迎合 UI；URL 與既有資料不搬。
- 不 monkey-patch 全域 Intl、不以 DOM 文字替換維護選單、不抓 Sveltia 內部 store 當穩定外掛 API。
- 不呼叫相容性清單中未支援的 getBackend／registerBackend／registerMediaLibrary／registerLocale 做核心架構。
- 不另加一個可寫入正式內容的 Dashboard，再讓兩套後台同時獨立儲存。

## 路徑 A 的合理範圍

先交付 generator 雙語詞庫、relation widgets、進階欄位分組、清楚的公開／審核／部署提示；既有每語 collection 可先保持。若管理者接受 locale 標籤缺口，可另做原生 i18n pilot，但本次 POC 不能直接移植成正式設定。若所有 CMS 2.0 目標都是必要條件，請採方案 B，不以小改 config 的估算承諾完整交付。
