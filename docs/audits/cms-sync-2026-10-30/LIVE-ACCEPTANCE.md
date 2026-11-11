# 合併後真人隔離驗收（尚未執行）

這份清單不是已通過的測試紀錄。沒有為測試推送正式文章或外部素材，也沒有合併 main。

1. 管理者先保存尚未儲存的後台工作；比對 feature/sveltia-cms、cms/*、待審 PR 是否出現新內容。確認本 PR 的逐檔保留策略仍有效後，才合併修正。
2. GitHub Repository Settings → Pages 的來源為 GitHub Actions。確認 main 的 PR／必要 CI／review 保護與至少兩名個人管理者權限；不共用 Token。
3. main Actions 的 build-and-test 與 deploy-pages 均成功後，讀取 /bigxreality-web/build-info.json：commit 應等於該次部署 main SHA，source=git-markdown、cmsBranch=main、dirty=false；保留 Actions URL 與內容 digest 作紀錄。
4. 登出、刷新 /admin/，確認實際取得的 config.yml backend.branch=main，並以個人限倉庫 GitHub PAT 登入。不以本機顯示登入表單視為授權已驗證。
5. 在「隔離測試文章（不會顯示於官網）」集合新增唯一測試記錄，上傳到隔離媒體資料夾；保存草稿，確認 GitHub 產生對應 cms/*／審核 PR，main 與官網文章列表尚未更新。
6. 以另一名具備權限人員審核；遵守必要 CI 後發布，確認 main 實際保存相同文字與圖片位元組，Actions 正確觸發，Pages build-info 更新至新 main SHA。這個集合不會產生公開新聞，不能用它宣稱「正式新聞路由」已實測。
7. 修改、再次保存／審核／發布同一隔離記錄；檢查 Git diff 沒有碰到正式文章與媒體。測試三語新聞的本機公開／下架／刪除已另由 qa:cms-publication 驗證。若要驗收真實公開新聞 URL，另用明確測試環境，或取得測試上線安排後執行，不擅自將測試新聞放入正式網站。
8. 刪除隔離文字測試記錄也應經 review／CI；測試上傳媒體先保留，避免自動刪除資產。驗收桌面／手機現有三語產品、方案、新聞、圖片、語言切換、canonical／hreflang／sitemap。

只有以上真實流程完成並記錄部署證據後，才能將真人 GitHub 授權、editorial 草稿／審核／發布、Actions 觸發及線上 Pages 同步標為通過。若失敗，保存 PR／Actions URL、失敗 step 與 build-info；不得以舊分支覆蓋 main。
