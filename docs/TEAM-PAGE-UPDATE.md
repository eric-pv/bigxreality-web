# 經營團隊重整與發展歷程移除

- 經營團隊原有／修改後路由相同：`/{tw,en,jp}/company/team/`。
- 三語文案沿用 `src/content/pages/{lang}/team.md`，介紹與能力說明由原頁讀取。`src/data/team-labels.ts` 僅保存架構示意的在地化標籤。
- 經營團隊改為能力介紹，不讀取個人姓名、履歷或照片。舊 team collection 資料保留，不公開於此頁。
- 發展歷程移除原路由與共用 Navigation Config 入口，並排除 Sitemap。原網址不再產生靜態頁，交由主機回傳 404，無轉址。GitHub Pages 不支援個別路由的 410，因此採真實 404；不導向首頁或公司簡介。
- 原發展歷程元件備份於 `docs/archive/history-page.astro.txt`，原三語頁首與 milestones 資料保留但不渲染、不移到其他頁面。
- 經營團隊更新三語 Title／Description，保留原 canonical／hreflang 機制，現在有完整內容，因此正常納入 Sitemap。
- 未修改首頁、公司簡介、產品、解決方案、資源中心或合作夥伴內容與版型。
- 回復方式：對本 PR 的提交執行 `git revert <commit>`。

驗證：`npm run build`、`npm run check`、`node scripts/qa-team-page.mjs`、`npm run qa:company`、`npm run qa:header`、`npm run qa:seo`。

版面修正：移除公開的「示意」標註與灰色大外框；能力架構採連接線與三欄領域，下方三項能力於桌面並列、平板及手機直列，英文副標另行呈現。
