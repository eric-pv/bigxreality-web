# 三語介面文字規範

介面文字（導覽、區塊眉標、按鈕、卡片標籤、表單、空狀態、佔位文字）統一放在 `src/content/ui/{tw,en,jp}.json`；
首頁區塊眉標在 `src/data/home.ts`，核心技術頁在 `src/data/technologies-*.ts`，列表頁 Hero 眉標在 `src/content/pages/*/*.md`。
正文、產品規格與 SEO 文案不放進 UI 字典。

## 規則

1. **TW／JP 介面使用該語言。** 可保留英文的只有：品牌（Big x Reality、BXR）、產品名稱與代號（SUT、UAV、USV、MUM-T、NOVA、Police BOX、On-sited）、業界縮寫（XR、VR、AR、MR、AI、CQB）、品牌標語（Turn Every Drill into Real）。新增例外請加入 `scripts/qa-ui-language.mjs` 的 `ALLOW`。
2. **一個概念只出現一次。** 眉標／副標若與旁邊的標題相同或只是同義重複，`SectionHead`、`PageHero` 會自動略過（`src/lib/eyebrow.ts`）；區塊標題已說明時，字典中的眉標可留空字串。
3. **卡片只有一個名稱。** 解決方案卡片以左側 3px CIS 分類色邊框表示類別（`--sector-color`），不再顯示英文類別代碼、色塊與英文副名；產品卡片的分類標籤一律使用 `productDomains`（軍事訓練／警勤訓練／消防防災）。
4. **同一概念三語用語一致**：導覽名稱（`nav`）即頁面眉標用語；JP 沿用既有術語（コア技術、製品情報、導入事例、活用分野）。

## 檢查

`npm run build && npm run qa:ui-language`：三語字典鍵一致、無空值／`undefined`／`null`、TW／JP 字典與建置後頁面介面文字無非例外英文、眉標不重複標題、卡片無第二名稱或分類代碼、產品分類標籤每語言單一用語。正文不在檢查範圍內，仍需人工檢視。
