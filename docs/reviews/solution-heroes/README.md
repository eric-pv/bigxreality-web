# 解決方案 Hero 一致化

頁面：`/tw|en|jp/solutions/{military,police,fire-rescue,smart-city}/`（同一元件也套用到 MUM-T、NOVA）。
程式：`src/components/PageHero.astro`（新增 `uniformMedia`）、`src/components/SolutionLanding.astro`（啟用）。

## 問題

四張 Hero 原圖比例不同（軍事 1.56、警勤 1.73、智慧城市 1.75、消防 1.78）。Hero 會依每張圖自身比例決定可見框，
所以每頁圖片寬度、左緣與高度都不同（1440px 寬度 824～939px；1024px 高度 403～459px；390px 寬度 307～350px）。
另外文字欄垂直置中，導覽列、H1 高度也會隨段落行數上下移動；EN／JP 文字較長時 Hero 變高，圖片框又跟著變大。

## 修正

- 所有解決方案 Hero 使用同一個 16:9 圖片框：位置、尺寸、HUD 角標在各頁、各寬度都相同。
- **不裁切**：依既有規範（`qa:hero-framing`、`qa:media-composition`），圖片維持 `contain`，主體完整。
  比例較窄的軍事圖在桌面靠右、手機置中，並沿用原本的柔邊遮罩與同圖模糊背景，不出現硬邊。
- 桌面文字欄改為頂端對齊，各頁導覽列與 H1 起始高度一致；圖片框高度固定 528px，EN／JP 文字較長時也不會改變大小。
- 原圖、alt、文案、URL、SEO、CTA 都沒有改動；產品頁 Hero 沒有套用此設定，維持原樣。

## 回歸檢查

`npm run qa:solution-heroes`（已加入 CI）：三語 × 390／768／1024／1280／1440px，檢查每一個解決方案 Hero：

- 圖片框為 16:9、圖片 `contain` 完整顯示且已解碼。
- 各頁圖片框尺寸與水平位置相同；≥1024px 時垂直位置也相同（手機為上下堆疊，圖片位置跟隨文字長度）。
- 文字欄起始高度相同；沒有水平捲動。

修正前：`FAIL: 52/90`；修正後：`PASS: 90 checks`。

## 截圖

- `compare-before-1440.jpg`／`compare-after-1440.jpg`、`compare-before-390.jpg`／`compare-after-390.jpg`：四頁並列對照。
- `before-<slug>-<width>.jpg`／`after-<slug>-<width>.jpg`：TW 各頁 390／768／1024／1280／1440px。
