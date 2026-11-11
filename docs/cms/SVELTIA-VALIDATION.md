# 驗證與待驗收項目

本輪不是「已正式上線」宣告。所有內容寫入測試在瀏覽器 OPFS 隔離副本中執行，沒有透過 GitHub 發布測試文章，也沒有修改任何正式 Markdown／圖片／影片。

## 已通過

| 項目 | 結果與範圍 |
| --- | --- |
| 官方版本與設定驗證 | Sveltia 0.253.1 真實程式載入，原生 config validator 無錯誤或未知選項警告；不是仿製 CMS 畫面。 |
| CMS root／子路徑 | `/admin/` 與 `/bigxreality-web/admin/` 可載入相對 config 與自訂欄位，含固定版本／SRI。 |
| 登入入口 | Personal Access Token 輸入視窗正常；未送出真人憑證。 |
| 新增文章 | 真實 CMS 在隔離副本建立測試集合文章，另以三個正式新聞集合建立相同 slug 的 TW／EN／JP 草稿。 |
| 修改文章 | 真實 CMS 儲存修改後正文，原有三語文章修改 TW 不改動 EN／JP 檔案。 |
| 圖片上傳 | 將既有核准 Logo 的原始位元組用於隔離測試，上傳測試集合及新聞 cover；驗證檔案位元組相同、新聞 src 是正確相對路徑。沒有產生或下載新聞圖片。 |
| 未知日期 | 新聞草稿不填日期，儲存後不寫入今天／空字串／1970，通過原 Astro Zod schema。 |
| 媒體 JSON | 真實 CMS 編輯現有 30 個媒體記錄，增加隔離記錄後儲存，所有原記錄保留；輸出沒有多加 body 包裝；無效 JSON 顯示錯誤。 |
| Schema | 8 類 × 3 語集合（24）及媒體表、隔離測試集合共 26；檢查 1,470 個在地化 nested field 路徑、183 份既有內容及原型別，已移除／未使用集合不開放編輯。 |
| 手機後台 | 390px 登入畫面無水平溢出，1440px 管理介面實際截圖。 |
| Astro check／unit tests | 0 errors／0 warnings；原有 36 個單元測試通過。 |
| Astro Build | Markdown 正常建置；未改寫既有內容檔。 |
| 產品圖與 Hero 回歸 | 15 張原始檔維持不變，171 個三語頁面／寬度組合；324 個產品／解決方案 Hero 組合及 18 個首頁影片組合通過。 |
| 新聞與 SEO | 90 個三語原有新聞詳細頁對照目前 Git 文案；日期、列表、無舊站圖片請求通過；SEO 檢查 warnings/errors 空；197 個正常 Sitemap URL。 |
| UI 與 CSR 回歸 | 342 個三語模板／六種寬度組合，9 個 CSR 語言／寬度組合；完整動態文章列表、CSR 去重與雙向連結通過。 |
| 網站連結 | 無破損內部連結；admin 不加入官網導覽、搜尋或 Sitemap。 |
| GitHub Pages | preview build／rebase/check：全站 noindex、robots、空 preview Sitemap、三語、圖片、字體、搜尋、子路徑連結通過。 |

Footer 回歸通過（291 個 HTML 頁面）。`npm run qa:ui-language` **未通過：164 項**，主要為既有新聞活動縮寫、正式英文名稱及來源網址被英文介面字詞規則攔截（例如 DSA 2026、Taipei Education Expo、媒體來源 URL）。本輪未改寫這些正文或放寬其 allowlist；這不是 GitHub 授權測試結果，也不列為已通過。截圖輸出在 `.qa/sveltia/`（Git 忽略，沒有提交測試素材）。

## 尚未通過真人／遠端驗收（不能當成正式可用）

| 項目 | 原因與後續步驟 |
| --- | --- |
| 真人 GitHub 授權 | 環境對 GitHub API 回傳 HTTP 403，沒有可用的真人管理者登入。須由管理者依 GUIDE 用本人帳號與限倉庫 PAT 登入；不能把 Token 貼給 Codex。 |
| 兩位最高管理者、編輯者 Write | 尚未核實或設定 GitHub 帳號／組織角色。若為個人倉庫，需公司決定 Organization 治理方式才能提供兩位等權 Admin。 |
| GitHub editorial workflow | 本機模式的 Save 不證明 GitHub 草稿分支／PR／Publish 可用。須真人驗證建立草稿、更新、審查、合併到 feature 分支。 |
| 實際 Pages 發布 | 沒有自動修改／合併 main；待本 PR 合併、保護規則與真實內容 PR 驗收後確認 Actions deployment 與線上網址。 |
| OAuth／SSO | 未提供 OAuth App／broker，不設定假的登入端點、不部署服務或儲存 secret。 |
| Azure／AWS | 本輪未部署、未移除 Cloudflare／EmDash；靜態 build profile、根路由與多雲 release pipeline 待獨立工作驗證。 |

## 正式使用前的真人驗收清單

1. 兩位管理者用不同 GitHub 帳號各自登入，再由一位 Write 編輯者測試。
2. 在隔離測試集合新增／修改／上傳圖片；確認只寫到整合分支的 CMS workflow，不在正式新聞列表出現。
3. 新增真正內容前，先用草稿驗證相同 slug 的三語檔案、日期、SEO、圖片路徑，review 後清除測試草稿。
4. 檢查 main 保護規則與必要 CI，確認編輯者不能直接 push／自行繞過審查。
5. 用真實核准內容走 feature → main PR，合併後確認 GitHub Pages deployment 成功、三語網址與媒體載入。
6. 驗收完成前不要把後台標記為「已正式可用」。
