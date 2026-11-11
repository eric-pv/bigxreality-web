# 產品／解決方案 Hero 背景統一

後續人物／設備安全取景、影片順序及手機遮罩修正見 `HERO-FRAMING.md`；此處保留原版構圖更新紀錄。

依使用者最新指示，12 個產品與 6 個解決方案均使用 SUT 同款 scene Hero：左側文字、漸層遮罩及右側情境背景。平板與手機沿用完整上下圖文，避免裁切主要人物與設備。

- 共用選擇：`src/lib/hero-presentation.ts`。
- 共用構圖：`src/components/PageHero.astro`。
- 產品／解決方案套用：`ProductLanding.astro`、`SolutionLanding.astro`。
- SUT、軍事與警勤維持既有 cover 構圖；其他新套用的設備／介面圖保留整張圖，融入同款背景，避免強制裁掉設備或操作資訊。
- 消防防災 Hero 明確使用 `vr-fire-extinguisher-training-trainee.png`（既有 VR 滅火器產品圖）。僅修改 Hero，不擴散到其他圖位。
- MUM-T、NOVA 沿用所屬軍事解決方案的代表情境圖，alt 保持「軍事模擬訓練」，不宣稱為各系統專用照片。

三語共用圖片來源及構圖。原始圖片、正文、產品名稱、SEO metadata、路由與首頁均不修改。前版 UI-V1 素材清單保留歷史需求，消防／軍事子方案 Hero 現已依本次指定來源呈現。

驗證：Astro Build 通過，型別 0 errors／0 warnings；18 種 Hero × TW／EN／JP × 1440／768／390px 共 162 組通過（scene 模式、消防來源、圖片載入、手機完整圖像、無水平溢出）；SEO 無 errors／warnings；Header 三語回歸通過；GitHub Pages 42 組頁面與 24,318 個本地引用通過。原圖與正文無變更。
