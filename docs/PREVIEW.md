# 歷史預覽流程已取代

GitHub Pages 現為指定的唯一正式網站，不再是全站 noindex 的預覽站。

唯一規範：[ARCHITECTURE.md](ARCHITECTURE.md)；操作：[DEPLOY.md](DEPLOY.md)。原獨立 preview workflow 已整合至 CI 驗證後發布；封裝與檢查改在 scripts/pages/，輸出 dist-pages/。保留的 qa:news-preview／qa:ui-v1-preview 名稱是既有 QA 相容指令，測試的是同一正式子路徑產物，不是另一個部署。
