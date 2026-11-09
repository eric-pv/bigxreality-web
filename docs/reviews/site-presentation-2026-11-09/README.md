# 全站標註、頁尾與首次進站隱私權選擇

依業主 2026-11-09 指示實作；基準 main：`ff326c0`。已確認 PR #103 與 #105 均在主線，英日公司介紹與核准稿一致。此環境存取 Pages 回覆 403，因此未將主線合併視為已驗證線上部署。

## 前台變更

- 全站三語不再輸出標題上方的裝飾小字，包括首頁、PageHero、SectionHead 與落地頁自訂段落。移除圖片「概念視覺／情境示意圖」角標；後台圖片分類、核准狀態、alt、圖說及主標題仍保留。
- 頁尾將總覽頁連結放在欄位標題，子清單不再重複該連結。手機保留展開子選單的操作，標題文字本身可直接前往總覽。
- 隱私權政策移至版權列右側；窄螢幕空間不足時自然換行。
- 首次進站顯示非阻擋式隱私權提示，提供政策全文連結與「同意／不同意」兩個按鈕。鍵盤焦點先移到選擇按鈕，完成選擇後回到主要內容。不同意仍可瀏覽公開內容；詢問表單仍須另行同意才送出。
- 瀏覽器 localStorage 的 `bxr-privacy-choice` 只記錄 choice 與 version，不送出個資。三語頁面共用選擇；政策內容更新後重新詢問，政策頁可改選。儲存不可用時，當頁仍可關閉提示；下頁可能再次詢問。不啟用追蹤或新後端。
- 三語政策補充上述儲存方式，表單政策版本更新為 `2026-11-09`。
- 產品／解決方案內容圖統一 16:9，舊內容 ratio 不再覆蓋全站規則。45 份內容只修正圖片比例及素材需求提示，原圖、媒體位置、其他正文不變。

## 驗證

- Node 22 正式建置、Astro check 通過（0 errors、0 warnings，38 項既有 hints）。
- 全站 294 個三語頁面的 HTML 無 eyebrow／asset-kind／badge 裝飾標註。另完成 294 頁在手機、桌機共 588 組標註與溢出量測，無殘留標註或橫向溢出。
- 產品／解決方案實際顯示的內容圖片比例通過量測；技術正文圖片維持原有呈現，不以產品圖片規則重裁。
- `qa:footer`：全部 294 頁通過；另實際點擊 18 次三語手機／桌機欄位標題、6 次政策連結，確認桌機政策位於版權右側。
- `qa:seo` 通過；公司頁檢查通過，英日全文與索引狀態正常。
- 修改後的公司頁與政策頁三語七種寬度共 42 組、1617 文字區塊換行檢查通過。原全站換行量測發現新增政策段落的末行孤字後停止，精簡文句並針對受影響頁面重驗；不宣稱本批完成 1533 組全站換行重測。
- `qa:motion`：9 組語言／尺寸檢查通過。
- `QA_HOME_ENTRANCE_ONLY=1 node scripts/qa-home-motion.mjs`：三語手機／桌機共 6 組首頁入場檢查通過，涵蓋無／失敗／延遲 JS、減少動態、標題動畫、重複綁定、離開視窗暫停與縮放。此次沒有將相簿、統計等未重跑情境列為通過項目。
- 新增 `npm run qa:privacy`，涵蓋首次進站、兩種選擇、記憶、跨語言、改選、舊政策、損毀／停用儲存、無 JS 瀏覽及不送出 POST。發布前亦須執行此項檢查。
- `qa:privacy` 最終版通過 12 組三語／尺寸情境，含鍵盤選擇及完成後焦點返回主要內容。
- `qa:inquiry-production` 以模擬模式通過 18 組三語／尺寸情境：進站選擇不同意後，表單仍須另行同意才送出。未寫入 Google。
- 未修改 `public/admin/`、`scripts/pages/`、`.github/`、`integrations/`；未改動原始媒體。

## 畫面

- [首頁說明](screenshots/home-value.png)
- [首頁核心技術](screenshots/home-tech.png)
- [桌機頁尾](screenshots/footer-tw-desktop.png)
- [手機隱私權提示](screenshots/privacy-tw-mobile.png)

## Claude Code 發布交接

分支：`codex/site-presentation-and-privacy`。請先讀 AGENTS.md、ARCHITECTURE.md、LAYOUT-RULES.md，核對最新 main，保留其他進行中的修改。對 main 建立一個整合 PR，標題建議「Simplify site labels and footer navigation; add privacy choices」。

必要 CI 與 `npm run qa:privacy` 通過、檢查差異後，依業主既有授權合併；確認同一主線提交的 Pages 部署成功，實測三語首次進站的兩種選擇、頁尾標題連結及政策位置，回報 PR 與部署結果。此環境 GitHub API 遭 Forbidden，Codex 未建立或合併 PR，分支推送不等於上線。
