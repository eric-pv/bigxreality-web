# BXR 正式部署

唯一架構規範：[ARCHITECTURE.md](ARCHITECTURE.md)。正式站由 GitHub Pages 託管，Sveltia 與建置共用 Git main。

- PR 執行 CI，不部署；main 的 build-and-test 全通過後，同一 workflow 將 dist-pages artifact 發布到 github-pages environment。
- 本機：`npm ci`、`npm run pages:build`。正式 workflow：`.github/workflows/ci.yml`。
- 查 `build-info.json` 的 commit、contentDigest 與 runUrl，核對成功部署，不把 CMS Save Draft 當成已上線。
- Pages Settings 應使用 GitHub Actions；main 保護規則、環境審核及真人授權仍須管理者驗收。
- 建置是 Astro 純靜態輸出（`dist/`），程式不含 Cloudflare、Worker 或遠端 CMS；外部 Cloudflare 資源的退役步驟見 [LEGACY-REMOVAL-PLAN.md](LEGACY-REMOVAL-PLAN.md)。

先前本檔的 Cloudflare 操作步驟只保留在 Git 歷史，不能當現行部署指令。
