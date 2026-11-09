# 公司介紹英日文發布

業主已於 2026-11-09 確認對照稿並指示發布。本分支將確認稿的各三段反映到英文、日文公司頁，並將兩語的 `translationStatus` 設為 `translated`，使頁面可被索引並列入 sitemap。繁中、SEO 文案、標題、URL 及徵才區塊未變更。

## 驗證

- Node 22 正式建置成功。
- Astro check：0 errors、0 warnings，38 項既有 hints。
- `qa:company` 通過。
- `qa:seo` 通過：無錯誤、警告或重複標題／描述。
- 使用既有 `qa:typography` 量測邏輯，限本次三語公司頁在 320、375、390、430、768、1024、1440px 檢查，共 21 組、252 個文字區塊，0 問題、0 瀏覽器錯誤。沒有將局部檢查宣稱為全站重測。
- `git diff --check` 通過。

## 給 Claude Code 的發布交接

Codex 可推送 Git 分支，但此環境的 GitHub API 請求遭 Forbidden，無法建立／合併 PR 或確認 Actions。請接續完成發布：

1. 讀取 AGENTS.md、docs/ARCHITECTURE.md、docs/LAYOUT-RULES.md。
2. 取得 `codex/company-translation-drafts` 最新版本，檢查與最新 main 的差異；保留你工作區尚未提交的內容，不直接覆蓋或重設。
3. 若此分支尚無 PR，對 main 建立 PR，標題「Publish approved English and Japanese company introductions」。描述可使用以下兩段：

   公司介紹英日文原本只有佔位說明且標記待翻譯。本次依業主確認的三段對照稿補齊全文，改為 translated，解除待翻譯頁面的索引限制。繁中與其他頁面內容保持原值。

   驗證：Node 22 build、Astro check、qa:company、qa:seo 通過；三語公司頁七種寬度共 21 組換行檢查，0 問題。審稿與驗證記錄見 docs/content-review/。

4. 等待該 PR 必要 CI 通過，檢查實際差異後依業主既有授權合併；不得略過檢查或直接 push main。
5. 確認 main 同一提交的 Pages 部署成功，並在正式站 `/en/company/`、`/jp/company/` 核對三段全文、手機版、索引狀態及語言切換。以 build-info.json 核對部署提交。
6. 回報實際 PR 網址及部署結果；若有失敗先修正，不把分支推送視為已上線。
