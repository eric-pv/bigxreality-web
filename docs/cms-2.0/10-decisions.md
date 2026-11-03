# 最終建議與管理者決策

## 建議

完整需求選 B：一個客製靜態管理前端，原 Git／Markdown／registry／GitHub 權限與 PR 不變；編輯核心先選 Milkdown＋原始碼保真 adapter。短期欄位雙語／relation 先用 A 可獨立改善。不要把 dashboard 外掛、Intl monkey patch 或三次 API PUT 包裝成完整 CMS 2.0。

Sveltia 不是立即移除：直到整合、真人隔離發布、編輯者走查與回復演練通過，才由管理者批准切換唯一入口。本次不進行任何正式開發。

## 需要決定的事項

| 決策 | 建議選擇 | 替代／影響 |
| --- | --- | --- |
| 目標範圍 | B 完整改造；A 改善可先行 | 若只做 A，接受 Dashboard／雙語系統 chrome／locale label 等明確缺口，不能當完整需求已交付 |
| 編輯核心 | Milkdown MIT＋strict source guard | Tiptap 生態較大，但未知 HTML 需 fallback；BlockNote MPL＋lossy Markdown 需額外模型／授權評估 |
| 共用欄位策略 | TW authority、保留未編輯各語原值、明確 diff 後同步 | 不選「每次 Save 自動 duplicate 全部欄位」；29 組原值／缺省差異先人工核對 |
| 第一批 block 範圍 | News／Insights／Case Studies body；產品／方案保持 typed landing forms | 不把所有頁面硬轉成 Markdown；Technologies TS 全文遷移另案 |
| 未存修改政策 | session buffers＋離開提示；不預設在 localStorage 放 Token 或完整稿件 | 若需要跨瀏覽器崩潰復原，另確認本機加密／資料保留政策，不自動加 server database |
| 角色與審核 | 個人 GitHub 身分、main 保護、review／CODEOWNERS | 前端按鈕不等於伺服器 field 級 RBAC；若必須細粒度強制權限，需重新評估限制，不能聲稱純 static 已具備 |
| 媒體 | 原檔、原路徑、registry；先有明確大小／核准 gate | 大影片超額時拒絕並說明，不自行新增 R2、轉檔或下載影片 |
| 時程與切換人員 | 8.5–13 focused days，指定一位行銷／業務驗收者與 GitHub 管理者 | 外部等待不算開發工時；每 Phase 驗收後再擴展 |

## Phase 0 停止點

這份 PR 只供審核。未取得管理者決定前，不改 /admin、不更換依賴、不搬資料、不實作 renderer、不建立第二 CMS 或新部署，也不自行合併。實際 GitHub 登入、mutation／PR、角色及部署的驗證仍列為後續 gate。
