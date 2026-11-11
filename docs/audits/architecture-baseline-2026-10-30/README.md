# 修正前架構盤點快照

基準：main 7c9602bcf147a7c256f169956510905582417497。這是本 PR 修改前的檔案與 dependency graph 盤點，不是另一份正式架構規範。唯一正式規範是 ../../ARCHITECTURE.md。

- FILES.csv：1,047 個版本控管檔案、分類、程式／設定依據與處理建議。
- PACKAGES.csv：26 個直接套件，17 項保留、9 項歷史依賴候選。
- LOCK-PACKAGES.csv：893 個 lock entries，依正式根依賴可達性分組。共享依賴保留；候選不代表可手動刪除或已卸載，須交由 npm 重算 lock。
- SUMMARY.json：數量與方法。

例如快照將 preview.yml 列為當時必要的 Pages 部署流程；本 PR 將它的責任移入同一次驗證的 CI 工作流程。不得將快照當成重新啟用 preview 部署或 EmDash 的指令。歷史遺留分類也不表示可以立即卸載：Astro 舊 integration／loader 仍有 build 耦合，必須依 LEGACY-REMOVAL-PLAN.md 的先決條件拆除。

遠端 Worker、資料庫、bucket、GitHub 權限與部署狀態無法由檔案存在推定，仍列為需外部驗證。
