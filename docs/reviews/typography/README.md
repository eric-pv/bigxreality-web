# 全站多語文字換行改善

基準：main `45ced0a`；分支：`codex/multilingual-line-wrapping`，直接對 main 提交，不自行合併。

## 盤點與共用方案

原有 H1–H4 共用 `text-wrap: balance`，平衡行長時仍會在中文任意字元間斷行；共用 Text 沒有語意詞組保護。實際 320px 狙擊產品頁將「環境判讀」拆成「環／境判讀」，另有「完整」被拆開。區塊標題固定半欄寬度造成桌面過早換行；桌面按鈕原本 nowrap，手機另設規則。技術、新聞、CSR 等部分標題原先直接輸出字串，沒有經過共用文字元件。

方案已實作：

1. 全域依 zh／en／ja 區分 word-break、line-break、hyphens，保留長字串的 overflow-wrap 安全退路；段落使用 pretty、標題使用 balance，支援不足的瀏覽器依正常排版退回。
2. 共用 Text、Prose 與產品 Markdown 使用 SSR 語意詞組；詞庫在 `src/data/typography.json`，最長詞組優先。開頭／結尾標點與相鄰詞組黏合，避免逗號被推到下一行。沒有新增 JavaScript 初始化或第三方套件。
3. 保留原始字元、空格與標點；meta／alt／SEO 的 plain text 不經 markup。程式碼、HTML 屬性及註解保持原樣。
4. 將原先直接輸出的共用標題／摘要接入 Text，保留 H1–H4、連結、原文與三語來源。沒有改動 src/content、slug、圖片或影片。
5. 共用 SectionHead 使用可伸縮寬度；手機解除橫向 flex basis，避免產生直向空白。窄螢幕 H1 適度縮放；按鈕各寬度均可安全換行。

沒有全站 nowrap、強制 br 或逐頁複製 CSS。語意片段平常整組換行；片段本身超過容器時可安全折行，優先避免溢出。

## CMS 維護

Sveltia 新增「多語文字換行 → 關鍵詞與標題分組」，同一份 `src/data/typography.json` 控制三語，不修改內容欄位或圖片管理。

- `terms`：短詞組，例如「環境判讀」，避免加入整段文字。
- `headings`：選用。`text` 填完整原標題；`groups` 填期望一起呈現的語意片段。
- 所有 groups 串接必須與 text 完全相同，包含空格和標點；不符合時忽略分組，沿用詞庫，避免改寫內容。
- 分組是軟性排版單位，不保證固定行數。窄螢幕較長分組內仍能依詞組換行。
- 目前沒有為所有標題強制指定分組，既有標題原文保持不變。

資料範例（只是說明，不會發布為新聞或正文）：

```json
{"text":"XR training for teams","groups":["XR training"," for teams"]}
```

## 截圖與驗收範圍

[修改前](before/)／[修改後](after/)：TW／EN／JP 的首頁、狙擊產品與新聞頁，1440／390px，同尺寸對照；另有狙擊產品區塊標題 320／390／1440px 的近照。`BEFORE.json`／`AFTER.json` 保留 27 組實際標題逐行量測，並比對原文相同。

`RESULTS.json` 與 `MANUAL-REVIEW.json` 是瀏覽器實際測量，不是單純編譯結果。320／1440px 涵蓋全部 216 個非篩選路由；375／390／430／768／1024px 各檢查 33 個三語代表路由，共 597 組。檢查 H1–H4、摘要、按鈕、水平／文字溢出、詞組拆行與標題容器過大空白。

CSS 與詞庫不等同完整中文／日文語意辨識。自動檢查可找出單字殘行、標點行首和已知詞組拆分，無法替代所有長標題的人工語意判斷；長新聞正式名稱的人工複核候選另列 `MANUAL-TITLES.csv`。不以「自動候選為零」宣稱全站語意百分之百正確。

本機 Chromium 截圖與 viewport 測試已執行；手機屬模擬，實機 Safari／Android 仍待人工確認。Sveltia 測試使用 OPFS 隔離副本，正式 GitHub 帳號登入及發布未測試。

最終檢查結果見 `VALIDATION.json`。回復時 revert 本 PR 即可，沒有原始文字或素材需要搬回。

最終結果：597 組換行檢查、9,453 次標題測量、45,325 次詞組檢查通過，沒有自動偵測到的單字殘行／標點行首候選。43 個單元測試、Astro Build／TypeScript、342 組既有版型檢查、技術／新聞／團隊回歸、SEO／連結、動態生命週期及無障礙均通過。GitHub Pages 子路徑檢查通過 293 個 HTML、23,758 個站內引用與 42 個頁面。

[320px 重點前後對照](COMPARISON-320.jpg)；[人工複核長標題](MANUAL-TITLES.csv)；[修改檔案](CHANGED-FILES.txt)；[測試紀錄](TEST-RESULTS.txt)。
