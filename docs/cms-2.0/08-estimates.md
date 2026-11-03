# Phase 1–5 時程、成本與驗收

以下為單一負責工程師搭配 AI 產碼／測試的初估，**一個 focused day＝約 6 小時有效開發＋驗證投入**，不是傳統人工作業的人月換算，也不是保證連續日曆天交付。Google／GitHub 權限確認、管理者審閱、等待稿件等外部等待不灌進開發時間。Phase 0 完成後先停止。

完整方案 B 約 **8.5–13 focused days（51–78 小時）**；範圍變動、重大相容性缺口再依證據重估。短期 A 的雙語欄位／relation 改善可先交付約 0.5–1 day，不表示完成所有目標，也不重複計入 B 的總工時。

| Phase | 範圍與成果 | AI 輔助投入 | 套件／風險 | 驗收門檻 | 正式網站影響 |
| --- | --- | --- | --- | --- | --- |
| 1 分類與雙語 | 核准標籤、九類導航、搜尋關聯、進階欄位、人類化錯誤；A 可獨立小 PR，B 建 readonly shell／adapters | 1–1.5 day | 沿用既有 React／TS；Sveltia core chrome 不可只靠 config 全雙語 | 136 種欄位與實際出現位置無 raw fallback；enum 值不變；relation 儲存 bare slug；未遷移 Technologies 明確只讀 | 後台顯示變更；前台、資料路徑與文字不動 |
| 2 三語整合 | buffers、共用值 ownership、CST patch、三語批次、Git CAS、PR、衝突與失敗 receipt | 2–3 day | yaml CST、GitHub GraphQL／REST 模組；權限及 timeout 風險 | 真實隔離 repo 成功、stale、401/403/429、部分資產、response lost、PR 建立失敗均測；三語非三次 PUT 假原子；未編輯值 bytes 不變 | POC 不影響正式；只在批准試點後開放 |
| 3 視覺區塊 | Milkdown typed blocks、增刪排序、IME／undo、預覽、圖片／影片／CTA、raw fallback、最小 body renderer adapter | 2.5–3.5 day | Milkdown MIT、sanitizer 待評估；自訂 NodeView／Markdown 最大風險 | 全 corpus 原文／未知語法保留；所有要求的 block 在正文任意位置；三語／安全／本地資產／前台版型測試；unsupported 不靜默改寫 | **需要有限前台 renderer 能力**，不可隱瞞；不批次改文章 |
| 4 媒體與 Dashboard | 可再生索引、搜尋篩選、使用位置、尺寸／大小、三語 alt、上傳 staging、完成度／PR／部署狀態 | 1.5–2.5 day | 既有 registry／Git；上傳大小、配額、動態引用不完整 | 原檔不覆寫；同素材重用；缺 alt／approval／檔案可分辨；main／草稿／已部署三軸；不會把 unknown 當 0 | 不搬媒體、無第二 database；所有新能力先隔離 |
| 5 整合與切換 | 編輯者走查、桌面／手機、鍵盤／無障礙、完整 CI、部署追蹤、單一入口切換與 rollback drill | 1.5–2.5 day | 無新服務；main protection／實際權限需管理者參與 | 行銷／業務能完成三語圖文發布；PR／Actions／Pages 真實隔離驗收；data/media diff=0（除明確測試內容）；回復不丟新稿 | 唯一一次已核准切換；不自行合併／部署 |

## 成本

- 目前建議開源核心沒有新增訂閱／伺服器費用；Tiptap Pro、雲端協作、付費上傳服務均不納入。既有 GitHub／Pages 額度照實際方案核對，不能保證永無配額成本。
- 開發估算為 `51–78 × 公司核定每小時成本`；未提供費率，不捏造報價。管理者驗收約 2–4 小時，分階段進行；需要的內部授權檢查另列，不把等待當工程工時。
- 穩定後初估每月 1–3 小時檢視安全／相依性與回歸；涉及 major editor upgrade 的月份另排 4–8 小時，依實際 release 而非固定強迫升級。
- 第一個內部可操作版本可先交付分類／三語文字流程；完整媒體 block、權限與正式發布不是「畫面可點」就完成。

## 超出此估算的項目

Technologies TS 全文後台化（需等值遷移評估）、完整首頁／影片配置後台化、付費多人即時協作、任意第三方 Markdown plugin、角色／欄位伺服器授權、超大型影片外部儲存、新 OAuth broker、客戶詢問 GAS。任何新增服務或資料模型需另行確認，不偷偷納入。
