# 尚未寫入網站的改善草稿

以下 CSR 與 alt 改善仍為審閱草稿，尚未寫入網站。本分支另依業主指示調整 27 頁 VR／XR 搜尋用詞，並修正六個不符圖片的 alt；已實作範圍見 VR-XR-REVISION.md 與 README.md。

## CSR 的獨立 SEO 描述

來源：`src/data/csr.json` 既有理念、四類主題與活動文章。建議新增獨立 SEO 描述，不改動頁面 lead。

- 繁中：認識全球動力科技 Big x Reality 的企業社會責任理念，了解 XR 情境學習在全民國防、防災教育、科技教育與社會參與的應用，以及相關推廣活動。
- 英文：Explore Big x Reality's corporate social responsibility through XR learning, disaster preparedness, technology education and community engagement.
- 日文：Big x Reality の企業の社会的責任（CSR）をご紹介します。XR を活用した防災教育、技術教育、社会参加などの取り組みと、関連する活動記事をご覧ください。

## 籠統 alt 的具體化示例

已實看原圖，僅描述看得到的畫面，不堆疊產品關鍵字、不宣稱不可見的性能。

### UAV 圖

`src/assets/images/products/uav-drone-training-operator-simulation.webp`

- 繁中：反制無人機模擬畫面，以第一人稱視角持步槍朝空中目標射擊
- 英文：First-person counter-drone simulation showing a rifle firing toward airborne targets
- 日文：小銃で空中の目標に向けて射撃する、一人称視点の対ドローン訓練シミュレーション画面

### VR 滅火器圖

`src/assets/images/products/vr-fire-extinguisher-training-trainee.webp`

- 繁中：配戴 VR 頭盔的人員手持控制器與滅火器，左側搭配火焰合成畫面
- 英文：A person wearing a VR headset holds controllers and a fire extinguisher beside a composite image of flames
- 日文：VRヘッドセットを装着し、コントローラーと消火器を持つ人物に、炎の画像を組み合わせた画面

這些圖片在多處共用，反映時應核對來源優先順序，保留適合各位置的語境。不是把所有同產品圖片都換成同一句 alt。
