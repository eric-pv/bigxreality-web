# 核心技術總覽：縮圖遮字修正（P2）

頁面：`src/pages/[lang]/technologies/index.astro`（`/tw|en|jp/technologies/`）。

## 問題

≥ 1280px 時，Hover 或鍵盤 Focus 會淡入的裝飾縮圖以 `position: absolute; right: 180px` 疊在列上，沒有自己的版面空間，
因此會蓋住描述段落尾端（EN 長標題列也會蓋住標題）。TW／EN／JP 皆可重現。

## 修正

- ≥ 1280px：共用 Grid 由 `64px 1fr auto` 改為 `64px minmax(0, 1fr) 200px auto`，縮圖固定在第 3 欄、垂直置中，
  操作連結在第 4 欄。文字、縮圖、連結各有獨立欄位，縮圖顯示與否都不會覆蓋文字。
- < 1280px：沒有足夠空間給縮圖欄，縮圖維持隱藏（原有行為），只保留文字與連結。
- 文案、字級、URL、SEO、Hover／Focus 觸發、紅線與箭頭動效、`prefers-reduced-motion` 皆未改動。

## 回歸檢查

`npm run qa:technologies-overview-layout`（`scripts/qa-technologies-overview-layout.mjs`，已加入 CI）：

- 三語 × 390／768／1024／1280／1440px，逐列以 Hover 與鍵盤 Focus 觸發。
- 縮圖顯示時，以文字實際行框（Range client rects）檢查不得與編號、標題、描述、操作連結重疊，且不得超出該列。
- 描述與連結須可見、不被裁切、字級 ≥ 14px；≥ 1280px 每列 Hover／Focus 都須顯示縮圖；無水平捲動。
- reduced-motion 下縮圖不得有轉場。

修正前：`FAIL: 9/63`（1280／1440px 三語、含 reduced-motion 全部重疊）。修正後：`PASS: 63 checks`。

## 截圖

`before-<lang>-<width>.jpg`／`after-<lang>-<width>.jpg`：第 03 列（數位場景與模擬建構，EN 標題最長）Hover 狀態。
重新產生：`QA_SHOTS=docs/reviews/technologies-overview QA_SHOTS_PREFIX=after npm run qa:technologies-overview-layout`。
1024px 以下縮圖本來就隱藏，修正前後畫面相同。
