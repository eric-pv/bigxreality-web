# 媒體資料庫方案

## 保留的正式來源

原圖／影片仍在 Git；沿用 src/assets/images/news、products、clients、content 與 public/media/news、public/video/hero。共用新聞資料仍為 news-media.json，不增加一份獨立可編輯的 media database。

Asset view key 建議為既有 repo path＋blob SHA；搜尋索引為可再生投影（basename、尺寸、比例、bytes、型別、引用、三語狀態），不是新的正式真相。mediaId 是既有文章 registry key，不強迫將它改成全域 asset UUID。

## 介面與操作

1. 以圖片／影片、已上傳／待上傳、已核准／未核准、用途、缺 alt 等篩選。
2. 縮圖以真實素材與既有合法 poster 顯示；影片沒有 poster 時顯示型別，不抓影格、不下載外部影片冒充素材。
3. 選擇已存在素材可重複使用，不複製 binary；顯示實際尺寸、比例、檔案大小、Git path 於進階資訊。
4. 使用位置列邏輯文章＋語言＋role／block，區分「可被 glob 載入」與「已引用／符合核准可顯示」。動態字串或未知 HTML 找不到時顯示覆蓋範圍限制，不宣稱未使用可刪。
5. 三語 alt／caption 提供共用建議值，但使用情境可不同，允許 per-usage override，沿用現有 registry 的語言欄位。
6. 封面、正文、圖集、poster 要分開選。插入中段是正文位置引用，不自動把所有 gallery／videos 搬到文章裡。
7. 使用中的素材預設禁止移除／改名；本次完全不開發刪除功能，也不調整管理者正在上傳的任何檔案。

## 上傳與發布

- 先驗證副檔名、MIME／magic bytes、bytes、路徑、重複 hash；有同檔時建議重用，不自行覆蓋。
- 新檔使用新名稱；原檔永不壓縮、轉檔、裁切或刪除。本次沒有產生任何正式媒體。
- 依現有 helper 解析能力設型別上限：新聞目前 jpg/jpeg/png；不能僅在 uploader 接受 webp 就稱前台已支援。
- 目前 Sveltia max_file_size=20,000,000 bytes；這不是 GitHub／Pages 所有硬上限。正式版限制還須考慮 API request、Git blob、repository／Pages 配額及編輯者網路；大影片拒絕並提供原因，不能悄悄搬 R2 或新增付費儲存。
- binary／poster 先 staging 到同次草稿流程，成功後再 commit 三語與 registry 引用；失敗留明確 receipt，不發布缺檔文章。媒體多 commit、PR merge、Pages deploy 是不同邊界。
- 未到檔、未核准、alt 缺語、影片不合法等使用不同狀態；保留不公開，不用其他文章照片填空。

## 與新聞同步上傳共存

metadata／registry 編輯以 record／欄位為 patch 單位；讀取時記 base SHA，儲存前 CAS。另一位管理者新增 record 或照片時，重新載入並保留新資料，不把舊的整份 JSON 寫回去。無關欄位可重新套 patch，重疊欄位需使用者確認；刪除與檔案合併不能自動決定。

索引只依目前 Git tree 產生，更新 main 後可重建；規劃本身不加入 GitHub webhook、第二部署或持久伺服器。registry 語法與 public/media 規則若需擴充，由 Phase 4 獨立 PR 及既有前台 QA 驗證。

## Dashboard 的素材完成度

封面可用＝實際檔案＋支援格式＋核准＋三語 alt（或 frontmatter 已有可用 cover，依目前 renderer 優先順序）；gallery 與 video 各自判斷。不能用 cover.filename 有值就算完成，也不能把待上傳記錄從總數刪掉。

目前證據：46 個版本控管 binary、30 media records、0 個核准 registry cover、0 個新聞 frontmatter cover；ASSETS.csv 只讀 metadata／hash，ASSET-USAGE.csv 不會把動態未知使用視為未使用。本報告固定於基準 commit，後續新增素材留待下一次盤點，不能自動清理。
