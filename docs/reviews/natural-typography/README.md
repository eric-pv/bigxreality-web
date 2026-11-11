# 三語自然斷句與文案檢查

本次以正常閱讀與語意為優先，不新增手動換行、不縮小既有字級、不用空白湊行。

- 中文：以 `Intl.Segmenter('zh-Hant')` 補上自然詞界，保留編輯詞庫的專有詞。不再用 `inline-block` 排成一串盒子；以行內詞彙保護避免把「累積」「真實」拆開。
- 日文：保留嚴格標點禁則，支援的瀏覽器採 `word-break: auto-phrase`；不支援時保留標準日文換行。精簡長標題與冗長說明。
- 英文：依單字換行，只有超出容器的長網址等字串採緊急折行。修正新聞正文及新聞卡片的最小內容寬度，避免撐出手機畫面。
- 三語首頁：精簡長標題，保留原意與內文說明。新聞、產品、技術與解決方案的文案調整保留日期、數字、產品範圍及限制。
- 隱私告知：保留資料處理、同意與權利等條款文字，僅在完整句意之間分段。日文影片播放器載入說明另精簡為兩句，保留核准影片、點擊後才載入及 YouTube 隱私網域等全部條件。
- 完成 123 個英文、97 個日文共用介面欄位的待翻譯文字，並補上固定頁標題翻譯。保留原有日期、網址及內容語言狀態。

## 驗收方式

`CHROMIUM_PATH=/usr/bin/chromium npm run qa:typography` 檢查全部三語公開頁面，涵蓋 320、375、390、430、768、1024、1440px。每頁等待字型載入，開啟 FAQ 檢查答案；排除螢幕閱讀器專用文字及卡片截斷後不可見的文字。量測會合併同一行不同字型的微小高度差，避免把行內程式碼誤判成另一行。

檢查項目：一至二字的中日文末行（不把引號或括號算成字數）、行首禁則標點、可容納卻被切開的英文字，以及橫向頁面溢出。錯誤會讓命令失敗，不再只產生人工提醒。`RESULTS.json` 與 `ISSUES.json` 記錄最新完成的驗收；完整視覺工作流程也會保存這些產物。

`screenshots/*-after.png` 為三語首頁在手機與桌機的實際畫面；`*-before-rules.png` 使用相同修正文案套用舊 CSS，僅供換行規則對照，並非修改前整站的存檔。文字正確性仍須配合人工閱讀，不能只憑沒有溢出或孤字判定。新聞卡片、產品與技術頁另有三語手機畫面。

共用頁尾另測三語、七種寬度，共 21 組頁面尺寸、651 個文字區塊，均通過；見 `FOOTER-RESULTS.json`。

## 另外發現的待提供內容

`check:i18n` 仍列出英日文各 7 個 `translationStatus: pending` 固定頁（案例、公司、沿革、技術文章、投資人、搜尋、標籤）。本次補齊可確定的標題與介面翻譯，但不擅自改為可索引的完整頁面；原有待提供的正式內容、CTA 或資料仍保留原狀。這些不是 CMS 編輯器功能的缺漏，也不應透過編造企業資訊來清除狀態。

## 畫面檢視

| 語言 | 舊 CSS 對照（同份文案） | 修正後首頁 | 新聞 | 技術頁 | 產品頁 |
| --- | --- | --- | --- | --- | --- |
| 繁中 | [390px](screenshots/tw-390-before-rules.png) | [390px](screenshots/tw-390-after.png) | [卡片](screenshots/tw-news-390.png) | [正文](screenshots/tw-technology-390.png) | [正文](screenshots/tw-product-390.png) |
| 英文 | [390px](screenshots/en-390-before-rules.png) | [390px](screenshots/en-390-after.png) | [卡片](screenshots/en-news-390.png) | [正文](screenshots/en-technology-390.png) | [正文](screenshots/en-product-390.png) |
| 日文 | [390px](screenshots/jp-390-before-rules.png) | [390px](screenshots/jp-390-after.png) | [卡片](screenshots/jp-news-390.png) | [正文](screenshots/jp-technology-390.png) | [正文](screenshots/jp-product-390.png) |

## 完成驗證

- 全站 219 頁 × 7 種寬度，共 1,533 組、67,822 個文字區塊：孤字、拆詞、行首禁則標點、頁面溢出及 JavaScript 錯誤均為 0。FAQ 在停用驗收頁面上的收合控制器後全部展開，再等待字型載入；正式網站的手風琴行為不變。
- Node 22 正式建置、75 項單元測試、864 項技術頁全文／版面檢查、英日文產品與解決方案回歸、CMS 871 欄位／210 檔案往返、全站連結及 Pages 封裝檢查通過。
- Astro check：0 errors、0 warnings；保留原有 38 hints。驗證摘要見 [VALIDATION.json](VALIDATION.json)，最終量測與建置指紋見 [RESULTS.json](RESULTS.json)。
