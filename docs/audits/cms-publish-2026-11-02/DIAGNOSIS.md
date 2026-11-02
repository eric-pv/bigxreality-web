# CMS 已發布但官網未更新：診斷（2026-11-02）

依 ARCHITECTURE.md §6「版本與失敗追查」，以遠端 GitHub 紀錄為準。

## 結論

CMS → GitHub main 這段**正常**；**卡在 main → Pages**。2026-10-30 之後，main 的每一次 CI 都失敗或被取消，`deploy-pages` 一直沒有執行，所以 GitHub Pages 停在最後一次成功部署的版本。

| 項目 | 證據 |
| --- | --- |
| CMS 寫入目標 | 已部署版本 `1426d63` 的 `public/admin/config.yml`：`backend.branch: main`、`publish_mode: editorial_workflow` |
| CMS 發布已進 main | PR #55 `cms/products-tw/police-box` → main（10/30 07:11 UTC）；PR #63 `cms/typography/rules` → main（11/02 11:14 UTC） |
| 最後成功部署 | CI run #122（41015361986），`1426d63`，build-and-test 與 deploy-pages 均成功（10/30 07:03 UTC） |
| 之後的 main | run #124、#126、#128、#130、#136、#138、#140、#142 失敗；#132、#134 被下一次推送取消。deploy-pages 一律 skipped |
| 必要檢查 | #55、#63 都在自己的 PR CI 完成前合併，代表 main 目前沒有強制 build-and-test |

## 各次失敗

| main SHA | 失敗 step | 錯誤 | 類型 |
| --- | --- | --- | --- |
| 5496a22、71c445a、d3a7d34、3ca17aa、b4397ef | Sveltia real-browser isolated editing | `qa-browser.mjs:102` 等待封面「替代文字」欄位 30 秒逾時 | 測試不穩定：Sveltia 延遲掛載畫面外欄位 |
| 658e596 | qa:behaviour | `FAIL police-box: CTA goes to the contact page with the product code` | QA 寫死舊文案；管理員在 CMS 將 hero.name 改為「攜帶式警勤訓練器Police BOX」後必定失敗 |
| 1e6bcd1、e6f42c5 | Sveltia real-browser isolated editing | 固定頁 `draft` 欄位：「The `required` option is not defined…」 | PR #60 產生的 `widget: hidden` + `required` 設定不被 Sveltia 0.253.1 接受 |
| e6f42c5（被上一項遮蔽） | Type check | `src/lib/typography.ts`：Property 'headings' does not exist（共 4 個錯誤，本機重現） | CMS 儲存時依 `omit_empty_optional_fields` 省略空的 `headings: []`，JSON 推導型別隨資料改變 |

## 修正（PR #64）

- Sveltia 設定：privacy 以外的固定頁不提供 `draft`（三語 Git 檔都沒有這個值）。`check.mjs` 改為逐檔檢查欄位覆蓋，並要求省略 draft 的頁面三語檔確實沒有 draft 值，以免 CMS 儲存時丟失資料。
- CMS 編輯的 JSON（typography、news-media）在 TS 中以宣告型別讀取。
- qa-behaviour：數量、文案、關聯與 CTA 改由目前 Git 內容推導（TW 為結構來源），規則與頁面相同。
- qa-browser：逐步捲動讓延遲掛載的欄位出現後再操作；失敗時保存截圖到 `.qa/sveltia/failure.png`。

沒有關閉、移除或無條件略過任何檢查。也沒有改動任何內容、圖片、URL 或設計。

## 使用者內容保全

- `feature/sveltia-cms` 比 main 落後 57 個提交，沒有任何 main 缺少的提交。
- 沒有殘留的 `cms/*` 分支，也沒有待審 PR（11/02 查核）。
- police-box 的 CMS 修改：欄位只是重新排序（relatedProducts／relatedSolutions 仍保留）；實際修改是 hero.name。typography 的 CMS 修改：JP 新增「打造」，空的 headings 被省略。兩者都完整保留在 main，本修正沒有碰觸。

## 未納入本次（剩餘範圍）

- 首頁主敘事（`src/data/home.ts`、`hero-clips.ts`）與核心技術全文（`src/data/technologies-*.ts`）仍然沒有 CMS 入口，見 CMS-FIELD-MAP.md。目前 CMS 開放的固定頁都有路由實際讀取，沒有「存了卻不生效」的欄位。
- 其他 QA 腳本中仍有以現有文案為基準的檢查（例如 SUT 的區塊順序、版面）。本次只修正已實際阻擋發布的項目。
