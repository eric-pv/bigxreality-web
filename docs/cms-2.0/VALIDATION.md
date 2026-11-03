# Phase 0 驗證紀錄與界線

日期／baseline 見 README。這是技術可行性／規劃驗證，不是 CMS 2.0 正式上線認證。

| 驗證 | 結果 | 證據 |
| --- | --- | --- |
| 真實程式／資料盤點 | 186 MD、62 邏輯項目、27 CMS collections、46 媒體 | INVENTORY.json、CONTENTS／FIELDS／COMPLETION／ASSETS.csv |
| 欄位雙語盤點 | 2,504 個位置、136 名稱皆有規劃；options 儲存值不改 | FIELD-LABEL-PLAN／OPTION-LABEL-PLAN／APP-MESSAGES／CUSTOM-MESSAGES |
| 現有三語共用值差異 | 272 組候選，29 組不同／缺省，未修資料 | SHARED-FIELDS.csv |
| 原生 Sveltia 0.253.1 UI | 單一 collection、切語保留未存修改、一次本地存三檔通過；tw→Akan、jp→jp 缺口重現 | SVELTIA-I18N.json、sveltia-i18n.png |
| Tiptap 真實＋合成 corpus | 198 個案例實際 parse／serialize，結果含明確格式／結構差異，不宣稱全保真 | MARKDOWN-ROUNDTRIP.json |
| Milkdown／BlockNote | 各 192 個實際匯入匯出案例，結果有區分原文／合成與 bytes／HTML | OTHER-EDITORS.json |
| 保真 adapter 原型 | 198 份 no-op／append 保留；CST scalar 的 BOM／CRLF／註解／未知欄位通過 | preserve.mjs、roundtrip.test.mjs |
| Git 儲存原型 | 合成 Git 三語單 commit、prepared object 不發布、stale-head CAS 拒絕通過 | GIT-CAS.json |
| 套件大小 | 三種真實瀏覽器 bundle min／gzip，不包含完整 UI／CSS | BUNDLE-SIZES.json |
| 線框稿 | 六個桌面畫面、兩個手機畫面、示例切語保留輸入、無外部請求 | WIREFRAMES.json 與 wireframe-*.png |

另以未安裝 POC 獨立依賴的狀態模擬一般 CI，執行正式 `npm run check`：246 files、0 errors、0 warnings、37 hints。這只確認文件／POC 未破壞既有型別檢查，不代表 CMS 2.0 正式 UI 已實作。

## 重現

依 [POC README](poc/README.md)；node --test poc/roundtrip.test.mjs 為 3 個測試通過。需要 repo 根依賴與獨立 POC npm ci，不能只安裝正式套件就假稱所有編輯器已可用。首次 root npm ci 的預設 home cache 不可寫，改用 /tmp cache 後成功；沒有停用 integrity 或改 root lock。

Native app 初輪因 POC 設定／測試 selector 未完成而失敗，修正為合法 global public_folder、正確處理 config cache query 與 locale radio 的 pane 後通過；這些變動只在此 POC，不是對正式 CMS 的修正。被隔離攔截的外部更新檢查可能出現 net::ERR_FAILED console 訊息，沒有影響已驗證的本地保存；不是宣稱網路服務全面健康。

## 不能擴大的結論

- 原生 Sveltia 的 OPFS 保存不證明 GitHub API、PR、review 或 main 部署。
- 合成 Git CAS 不證明真實 GitHub 大檔案／權限／timeout；必須 Phase 2 隔離 repo 實測。
- HTML equality 不證明 source bytes、畫素、可存取性或所有 plugin 的語意不變。
- source-preserving helper 的 no-op／append／scalar 不等於整套視覺 NodeView 編輯已完成。
- Media 的 literal references 不證明所有動態使用位置完整；快照無新聞照片不代表管理者後續沒有上傳。
- wireframes 的合成狀態不是實際已發布、待審或可收件；工具不呼叫遠端寫入。

## 未進行

沒有更換 /admin、設定或依賴；沒有修改正文、路徑、registry、binary、前台設計、schema、SEO 或 Actions；沒有合併 PR／部署；沒有新 server、CMS、資料庫或付費服務。根 build／TypeScript／全站 QA 不作為本次新 CMS 的能力證明：正式程式未變，Phase 0 使用針對性的隔離測試。後續切換必須執行完整既有 QA 與真人驗收。

官方網站文件 403，改以可讀官方固定版 source／registry／套件 API 驗證，詳 REFERENCES。Phase 0 交付後停止正式 CMS 開發，待管理者確認。

完稿期間 main 已合併 #73 與 #72；同步到 eed1fbb 後重跑只讀盤點，Markdown／媒體數量與原始 bytes 不變。最新 main 的獨立驗證 Build、219 files 型別檢查與 46 個單元測試亦通過；不將此與 CMS2 未開發的 UI 混為一談。
