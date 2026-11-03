# BXR CMS 2.0 — Phase 0

日期：2026-11-03（台北）。盤點基準 main：`6f5935c68a1e530dc40c37a49ba96b9dedcc4803`。本分支只包含此目錄的規劃、隔離 POC 與證據；正式 CMS、文章、三語目錄、網址、registry、圖片、影片、部署流程都未修改。**Phase 0 完成後停止，Phase 1–5 須管理者確認。**

## 結論

建議完整 CMS 2.0 採 **方案 B：單一靜態管理前端，沿用原 Git／Markdown／registry／PR**，以模組化 adapter 取代操作介面，並非新增第二個內容系統或伺服器。Sveltia 在切換驗收前持續為唯一正式 CMS；B 只在隔離路徑與測試資料驗證。Phase 1 可先獨立交付方案 A 的欄位雙語與搜尋式關聯改善，但不能宣稱已完成統一 Dashboard／完整三語標籤／區塊編輯。

理由不是「Sveltia 沒有三語功能」：實際固定版本 App 已證實單一 collection、切換語言保留修改、一次本地保存三份檔案。真正缺口是既有 `tw`／`jp` 與標準語言名稱、全部系統訊息雙語並列、跨模組 Dashboard、自訂媒體流程，以及嚴格原始碼保真。用 DOM／Intl monkey patch 或依賴未公開 API 來補會提高維護風險。

視覺編輯核心優先建議 **Milkdown 7.23.0（MIT）＋原始碼保真 adapter**。本次三個候選都不具備「任意既有 Markdown 嚴格保真」保證；完整自訂媒體區塊與 UX 仍是後續開發，不是已完成產品。

## 實測摘要

| 項目 | 結果與範圍 |
| --- | --- |
| 現況 | 27 個 CMS collections；186 份 Markdown／62 個跨語邏輯項目；7 項核心技術仍是 TS 資料 |
| 欄位 | 2,504 個欄位出現位置；1,227 個仍直接使用技術識別名稱；136 種欄位名稱已提出雙語方案 |
| 三語原生 App | 真實 Sveltia 0.253.1＋合成 OPFS：切換未儲存資料、一次本地保存三檔通過；TW 顯示 Akan，JP 顯示 jp，未呼叫 GitHub 寫入 |
| 共用值 | 272 組候選值中 29 組存在原值／缺省差異；不是 29 個內容錯誤，不能自動全部 duplicate 覆寫 |
| Tiptap | 真實 186 檔中 97 檔 bytes 不同、同 renderer HTML 差異 0；12 個合成案例中 7 個 HTML 不同 |
| Milkdown | 真實 186 檔中 97 檔 bytes 不同、HTML 差異 0；6 個合成案例 HTML 差異 0，但原始 HTML 為 opaque 內容，並非完整視覺媒體支援 |
| BlockNote | 真實 186 檔中 181 檔 bytes 不同、7 檔 HTML 不同；6 合成案例有 4 個 HTML 不同 |
| 保真策略 | 186 原文＋12 合成 no-op／raw append 保留原文通過；CST scalar patch 保留 BOM／CRLF／註解／未知欄位 |
| 原子性 | 合成 Git：同一 commit 三語、未發布物件不改 ref、stale-head CAS 拒絕通過；**不是遠端 GitHub 原子發布驗收** |
| 正式變更 | 無。真人 GitHub 權限、PR、API 失敗恢復及正式切換尚未驗證 |

## 文件導航

1. [現況盤點](01-current-state.md)
2. [Sveltia 功能與限制](02-sveltia.md)
3. [架構與 A／B 比較](03-architecture.md)
4. [三語與安全儲存流程](04-trilingual-save.md)
5. [編輯器、授權與 Markdown 驗證](05-editor-compatibility.md)
6. [媒體管理](06-media.md)
7. [畫面與流程](07-wireframes.md) · [可互動線框稿](wireframes.html)
8. [Phase 1–5 時程／成本](08-estimates.md)
9. [協作衝突與回復](09-collaboration.md)
10. [管理者決策](10-decisions.md)
11. [證據、限制與重現](VALIDATION.md) · [官方來源](REFERENCES.md) · [POC 操作](poc/README.md)

所有 CSV／JSON 見 [evidence](evidence/)。盤點數字只代表固定 commit 的資料，不把管理者後續上傳的素材視為遺漏或擅自清除。
