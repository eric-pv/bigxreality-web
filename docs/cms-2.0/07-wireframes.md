# 畫面線框稿與操作流程

[開啟可互動 HTML](wireframes.html)。用本機靜態 server 開啟即可，不是 /admin 正式介面；沒有登入、Token、Git 寫入、上傳或發布能力。合成文章／素材不來自正式新聞。

| 畫面 | 重點 | 操作 |
| --- | --- | --- |
| Dashboard | Git 快照數量、完成度、待審、缺素材、部署 SHA | unknown 遠端狀態顯示「尚未查證」，不是 0／成功 |
| 統一列表 | 一篇一列、TW／EN／JP 標記、搜尋／篩選 | 搜尋名稱，進入一次編輯；顯示資料來源與日期待確認 |
| 三語 Editor | 語言 tabs、共享設定側欄、SEO、進階 ID | 範例切語可保留輸入；不會改 source 檔或真實三語內容 |
| 圖片／影片 blocks | 正文順序、媒體庫、三語 alt | 可對合成項目新增／上移／下移／移除；未知語法保留原始模式 |
| Media Library | 檔案型別、尺寸／大小、核准、使用位置 | 缺素材與未核准分開；圖片格只是線框，不是假產品照片 |
| Readiness／Publish | 編集、已存、待審、合併、部署五階段 | 明確指出哪層失敗；不能把一個 Save 當公開成功 |

流程：Dashboard 選待辦 → 統一列表 → 三語 buffer → 共用值 diff → 插入／重用媒體 → schema／語言／核准檢查 → 草稿 commit → review PR → CI／main → 部署核對。完整頁面流程對應 04-trilingual-save。

後續正式 UI 驗收須涵蓋 IME、focus、鍵盤排序、screen reader、錯誤摘要與離開提示；線框稿 native buttons 可鍵盤操作，但不是最終無障礙認證。手機採單欄編輯、設定面板移至正文下方；內容長時只在必要區域捲動。

## Dashboard 計算定義

- 內容總數按 collection＋slug 去重，不把三份檔算三篇；Tech TS 模組獨立顯示，不假裝已遷移。
- 翻譯完成度為 declared translationStatus＋存在性＋必填欄位，不能自動判斷翻譯品質。
- 草稿／可公開依 TW、日期、approval 與固定頁 route 例外；PR 狀態依 GitHub；正式已部署依 build-info／Actions。
- 缺圖按實際 resolver 的檔案／核准／alt 條件，不按 filename 是否有值。
- SEO 缺漏按該 schema／前台使用欄位檢查，日期未知保持未知。
- 最近修改依真正 commit history；wireframe 活動列表只是範例，不冒充真人紀錄。
