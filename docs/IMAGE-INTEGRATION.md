# 已上傳圖片接入報告

已接入 **15 張**：指定 12 張加最新 main 新增的 SUT、迫擊砲、VR 滅火器。未修改、改名、轉檔、壓縮或裁切來源檔。未找到 `IMAGE-INVENTORY.csv` / `IMAGE-SLOT-MAP.csv`；用途依既有 `docs/*-IMAGE-REQUIREMENTS.md` 的 Hero #1 / 主圖與卡片欄位。

## 圖片與頁面

以下路由均涵蓋 TW／EN／JP；詳細的所有實際使用頁面列於 [IMAGE-USAGE.csv](IMAGE-USAGE.csv)。

| 原始檔名 | 主要詳細頁 | 尺寸 | 呈現 |
|---|---|---|---|
| sut-squad-vr-tactical-training.jpg | /{lang}/products/sut/ | 7008×4672 | contain |
| uav-drone-training-operator-simulation.jpg | /{lang}/products/uav/ | 1920×1080 | cover |
| usv-vr-training-operation.png | /{lang}/products/usv/ | 1672×941 | cover |
| wargaming-table-team-planning-discussion.jpeg | /{lang}/products/wargaming-table/ | 1620×1080 | cover |
| mortar-observation-xr-training.jpeg | /{lang}/products/mortar-observation/ | 1620×1080 | cover |
| sniper-simulator-trainee-operation.jpeg | /{lang}/products/sniper-simulator/ | 1620×1080 | cover |
| machine-gun-simulator-indoor-training-illustration.jpeg | /{lang}/products/machine-gun-simulator/ | 1620×1080 | cover |
| humvee-driving-simulator-instructor-illustration.jpeg | /{lang}/products/hmmwv-simulator/ | 1620×1080 | contain |
| speedboat-simulator-sea-training-illustration.jpeg | /{lang}/products/tactical-boat-simulator/ | 810×1080 | contain |
| full-scale-police-training-vr-facility.png | /{lang}/products/full-scale-police-training/ | 1024×768 | contain |
| police-box-portable-training-unit-trainee.jpeg | /{lang}/products/police-box/ | 1620×911 | cover |
| vr-fire-extinguisher-training-trainee.png | /{lang}/products/fire-extinguisher-simulator/ | 1920×1080 | cover |
| military-simulation-training.jpg | /{lang}/solutions/military/ | 1686×1080 | contain |
| police-simulation-training.jpeg | /{lang}/solutions/police/ | 1872×1080 | cover |
| smart-city-3d-digital-twin.jpeg | /{lang}/solutions/smart-city/ | 1792×1024 | cover |

12 項產品圖同時用於產品總覽及所有引用該產品的關聯卡片。SUT、Police BOX、UAV、VR 滅火器亦用於既有首頁精選產品；軍事、警勤、智慧城市代表圖用於方案總覽、詳細頁、首頁既有四卡排列及相關方案卡片。主圖未挪用到流程、能力或其他情境圖片位置。

## 修改位置

- `src/data/primary-images.ts`：以既有產品／方案 slug 建立單一來源映射、三語保守 Alt 及顯示焦點。
- `ProductImage.astro`：Astro 本地匯入 URL、原始格式與原始檔案位元組；保留寬高、lazy/eager 及 Hero 優先載入。
- `PageHero`、`CardProduct`、`CardSolution`、兩個 Landing 與首頁：共用映射及圖片顯示；原 Grid、容器及內容不變。
- 三語 `products/*/sut.md`：修正已不存在的 `sut-hero.jpg` 為現有正式檔名；正文及 SEO 未改。
- 更新圖片驗證及過去只允許佔位的回歸檢查。

## 缺漏與後續 Claude Code 清單

- 12 項產品主圖均已齊全。消防防災、MUM-T、NOVA 方案尚無獨立正式主圖；各產品流程、能力、應用情境與技術頁專屬素材仍保留原佔位。
- **UAV 檔案內容需確認**：`uav-drone-training-operator-simulation.jpg` 的畫面主要是槍械／模擬場景，未見明確無人機操作。依業主指定對應接入，Alt 僅描述用途；請後續確認是否需更換正確素材。
- `speedboat-simulator-sea-training-illustration.jpeg` 為 810×1080 直式構圖，保留完整設備以 contain 顯示；不可強裁成 16:9。
- `full-scale-police-training-vr-facility.png`（4:3）、`humvee-driving-simulator-instructor-illustration.jpeg`、`sut-squad-vr-tactical-training.jpg`、`military-simulation-training.jpg` 優先保留完整人員／設備，以 contain 顯示。
- SUT 為 7008×4672 大圖；後續優先處理解析度與傳輸體積。
- 上表 **15 個原始檔**全數交由 Claude Code 統一評估格式、壓縮、解析度及必要裁切；本 PR 不執行這些工作。

## 驗證結果

- Astro Build 與型別檢查通過。
- TW／EN／JP，1440／768／390px，共 162 組頁面／尺寸檢查：主圖位置、12 項產品總覽卡片、首頁三個方案圖片、圖片解碼、Alt、object-fit 及橫向溢出檢查通過，無圖片 404。
- 15 張圖片三語均引用同一輸出 URL；來源 Git blob 保持不變，輸出原圖亦與來源逐位元組相同。
- GitHub Pages `/bigxreality-web/` 子路徑：582 個圖片引用解析成功，三語 12 個實際頁面載入／解碼通過，無 JavaScript 錯誤。
- 實際檢視桌面與手機截圖，包括首頁、SUT、全配式警勤、HMMWV、戰術艇、兵棋圖台、迫擊砲、狙擊與機槍主圖；人物、設備主要構圖保留。
- SEO、既有行為與核心技術 888 項回歸檢查通過。既有 OG 引用仍可載入，未改寫 SEO Title／Description。
- 交付前再次同步確認 main；圖片清單仍為這 15 張，沒有漏接新增的主圖。
