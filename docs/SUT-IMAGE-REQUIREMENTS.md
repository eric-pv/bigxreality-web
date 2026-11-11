# SUT 產品頁圖片配置與待補素材

2026-11-11：依業主確認，SUT 先介紹操作熟悉度、CQB 與多人協同，再呈現訓練模組、各射擊單元、訓後檢討與跨產品搭配。

網址：`/tw/products/sut/`。本次 ZIP 有 13 張圖片，各靶型與情境各一張。選用 12 張，不把不同靶型當成重複素材。原始圖片不裁切、不壓縮、不覆蓋；頁面依 [全站版面原則](LAYOUT-RULES.md) 使用 16:9 顯示。

## 本次配置

| 原檔 | 對應位置 | 匯入檔名 |
| --- | --- | --- |
| SUT 巷戰 GOOD.png | 業主指定封面；三語設 `kind: illustration` 並附示意圖圖說；產品卡片同步 | sut-cqb-context-illustration.png |
| close quarters combat.png | CQB 與多人協同區，室內戰鬥俯視畫面 | sut-cqb-room-layout.png |
| assault on crimainal hideout.png | CQB 區，犯罪據點攻堅俯視畫面 | sut-criminal-hideout-simulation.png |
| battlefield simulation.png | 戰場模擬模組；沙包為虛擬場景 | sut-battlefield-sandbag-simulation.png |
| stationary shooting.png | 定點射擊獨立卡片 | sut-stationary-shooting.png |
| multiple.png | 多重目標獨立卡片 | sut-multiple-target-shooting.png |
| covering fire.jpg | 障礙板後方射擊獨立卡片 | sut-barrier-shooting.jpg |
| circular targets.jpg | 環形靶獨立卡片 | sut-circular-target.jpg |
| human targets.jpg | 移動人形靶獨立卡片 | sut-moving-human-target.jpg |
| rotating targets.jpg | 旋轉靶獨立卡片 | sut-rotating-target.jpg |
| 無人機操作.png | 跨產品搭配後的訓練畫面區 | sut-uav-operation-training.png |
| 反制無人機.png | 同上，反制訓練視角 | sut-counter-drone-training.png |
| SUT case 設備清單.jpg | 保留備用：直式設備清單，不當成武器轉換的操作畫面 | 未加入網站 |

`desktop.ini` 是系統檔，不作媒體匯入。封面依業主指示採巷戰情境示意圖。

## 排版及來源

- 六個射擊單元使用既有 `landing.scenarios` 圖文卡片：桌機每排三張、平板兩張、手機一張，手機文字在上、圖片在下。
- 訓後檢討移至射擊單元之後，以既有 `landing.blocks` 的四張檢核卡呈現；再接 UAV／USV 搭配說明與兩張無人機訓練畫面。
- 封面使用新原檔，舊實拍 `sut-squad-vr-tactical-training.webp` 保留。封面裁切焦點位於畫面中下部的人物區域，不重製原圖。
- 三語共用圖片來源，替代文字各自翻譯。示意圖不當作實機功能證據。
- 無人機畫面呈現訓練內容，系統連線仍依任務與實際介面說明，不據圖片推定所有產品互通。

## 仍可補充

- 訓練／測驗模式及長短槍轉換的實際畫面。
- 教官多視角介面、彈著／命中資訊與訓後報告畫面。
- 新的多人實際操作照片與完整設備橫式照片。

素材建議 JPG／PNG、寬度至少 1600 px。重要人物、設備與介面文字保留裁切餘裕；優先提供未經 flyer 拼版的原圖。

新增素材存放 `src/assets/images/products/`，以新檔名匯入，再於三語 `src/content/products/<zh-Hant|en|ja>/sut.md` 對應欄位設定同一 `src` 與各語 `alt`。Sveltia 使用既有產品落地頁欄位，不手改產生的 CMS 設定檔。
