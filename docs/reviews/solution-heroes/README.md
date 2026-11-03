# 解決方案 Hero 一致化

頁面：`/tw|en|jp/solutions/{military,police,fire-rescue,smart-city}/`（同一元件也套用於 MUM-T、NOVA）。
程式：`src/components/PageHero.astro`（新增 `uniformMedia`、手機置中）、`src/components/SolutionLanding.astro`（啟用 `uniformMedia`）。

## 問題

四張 Hero 原圖比例不同：軍事 1.56、警勤 1.73、智慧城市 1.75、消防 1.78。原本 Hero 以每張圖自身的比例決定可見框，造成：

- 各頁圖片寬度、左緣、高度都不同：1440px 時寬度介於 824～939px；1024px 時高度介於 403～459px；390px 時寬度介於 307～350px。
- 手機版（單欄）沿用桌面「靠右」的焦點，比例較窄的圖片會偏向一側。例如軍事圖在 390px 時偏右約 21px。
- 文字欄垂直置中，導覽列與 H1 的高度會隨段落行數移動。EN／JP 文字較長時 Hero 變高，圖片框也跟著變大。

## 修正（依公司決定，Hero 改為裁切填滿）

- 所有解決方案 Hero 使用同一個 16:9 圖片框，各頁、各寬度的位置、尺寸、HUD 角標都相同。
- 圖片改為 `cover` 填滿圖片框，不再有黑邊或偏移。
  - 裁切焦點：水平固定置中（50%）；垂直沿用 `primary-images` 已核准的焦點（軍事 28%、警勤 35%、消防與智慧城市 50%）。
  - 軍事圖約裁掉上下 12%，人物的頭與腳都完整保留。
- 手機／平板（<1024px）：所有 Hero 圖片在框內一律置中。此項也套用於產品頁，避免桌面靠右的設定影響單欄版面。
- 桌面版：文字欄改為頂端對齊；圖片框高度固定 528px，EN／JP 文字較長時不會改變圖片大小。
- 未修改：原圖、alt、文案、URL、SEO、CTA。產品頁在桌面版的 Hero 維持原本的 `contain`。

## 回歸檢查

`npm run qa:solution-heroes`（已加入 CI）的範圍是三語 × 390／768／1024／1280／1440px，涵蓋全部解決方案頁。檢查項目：

- 圖片以 `cover` 填滿 16:9 圖片框，水平置中，且已正常解碼。
- 各頁圖片框的尺寸與水平位置相同；≥1024px 時垂直位置也相同。手機為上下堆疊，圖片的垂直位置會隨文字長度變動。
- 手機／平板寬度時，圖片框在畫面中置中。
- 文字起始高度相同，且沒有水平捲動。

結果：修正前 `FAIL`，修正後 `PASS 96 checks`。

`qa:hero-framing`、`qa:media-composition` 已同步調整規則：解決方案 Hero 預期為 `cover`，產品 Hero 仍為 `contain`。

全站手機檢查：216 個頁面在 390／768px 下，所有照片與 Hero 圖都置中。

## 截圖

- 四頁並列對照：`compare-before-*.jpg`／`compare-after-*.jpg`（1440／768／390px）。
- 各頁截圖：`before-<slug>-<width>.jpg`／`after-<slug>-<width>.jpg`，為 TW 版 390／768／1024／1280／1440px。
