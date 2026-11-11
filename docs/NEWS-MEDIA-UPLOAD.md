# 新聞多媒體上傳說明 V2

本次以 V2 TXT 為唯一新聞來源，共30篇、90份三語內容。原有ARTICLE_ID/slug不變，舊13篇已更新；news-14不是獨立文章，沒有新增。圖片與影片均未下載或生成。

## A. GitHub 資料夾

先合併 PR，再上傳至 [新聞圖片資料夾](https://github.com/eric-pv/bigxreality-web/tree/main/src/assets/images/news)：`src/assets/images/news/`。
本地影片上傳至 [新聞影片資料夾](https://github.com/eric-pv/bigxreality-web/tree/main/public/media/news)：`public/media/news/`。
如需在合併前查看，請切換到 `codex/import-historical-news` 分支的相同目錄。

## B. 30篇候選封面檔名

以下只是候選命名，不宣稱已存在相應畫面。原本可辨識的來源延用網址副檔名；其餘暫建議.jpg。實際為JPEG/PNG時請保留真實副檔名，由下一次Codex同步清單及映射，不能偽裝格式或強制轉WebP。

| ARTICLE_ID | 候選封面檔名 |
|---|---|
| news-01-ds-2025 | `2025-defense-security-xr-tactical-training.png` |
| news-02-gbp-cover | `2025-gbp-daily-news-cover.jpeg` |
| news-03-leadership-uncertainty | `2025-leadership-ai-industry-interview.jpeg` |
| news-04-seecat-2025 | `2025-seecat-sut-box-training.jpeg` |
| news-05-tadte-2025 | `2025-tadte-ai-xr-training.jpeg` |
| news-06-military-forum-2025 | `2025-military-simulation-forum-lvc-training.jpeg` |
| news-07-indo-defence | `2025-indo-defence-cqb-training.jpeg` |
| news-08-fire-agency-2025 | `2025-fire-agency-xr-disaster-response.jpeg` |
| news-09-seecat-earlier | `2025-seecat-police-box-training.jpeg` |
| news-10-xr-shooting-sports | `2024-xr-clay-target-shooting.jpg` |
| news-11-sushi-tech-2024 | `2024-sushi-tech-tokyo-taiwan-pavilion.jpeg` |
| news-12-asia-xr-awards-2023 | `2023-asia-xr-golden-star-awards.jpg` |
| news-13-future-combat | `2025-future-combat-lvc-training.jpeg` |
| news-15-media-visit-2026 | `2026-media-visit-ai-xr-training.jpg` |
| news-16-seecat-2026 | `2026-seecat-mr-cqb-training.jpg` |
| news-17-defense-education-2026 | `2026-xr-defense-education.jpg` |
| news-18-decision-training-2026 | `2026-xr-scenario-decision-training.jpg` |
| news-19-cna-simulation-2026 | `2026-cna-xr-simulation-report.jpg` |
| news-20-taipei-education-expo-2026 | `2026-taipei-education-expo-xr-learning.jpg` |
| news-21-forum-22-2026 | `2026-military-simulation-forum-usv-nova-xr.jpg` |
| news-22-dsa-2026 | `2026-dsa-sut-mum-t-training.jpg` |
| news-23-songshan-school-2025 | `2025-songshan-school-xr-education.jpg` |
| news-24-new-office-2025 | `2025-taipei-office-xr-technology.jpg` |
| news-25-defense-expo-preview-2025 | `2025-tadte-ai-xr-exhibition-preview.jpg` |
| news-26-disaster-resilience-2025 | `2025-disaster-education-community-resilience.jpg` |
| news-27-military-simulation-overview-2025 | `2025-military-xr-simulation-training.jpg` |
| news-28-fire-extinguisher-launch-2025 | `2025-xr-fire-extinguisher-training.jpg` |
| news-29-xr-defense-platform-2025 | `2025-ai-xr-defense-simulation-platform.jpg` |
| news-30-baseball-csr-2025 | `2025-chiayi-baseball-community-education.jpg` |
| news-31-trap-shooting-championship-2024 | `2024-chung-cheng-cup-xr-trap-shooting.jpg` |

完整三語標題、日期、來源及授權備註見根目錄 [NEWS-MEDIA-MANIFEST.csv](../NEWS-MEDIA-MANIFEST.csv)。目前30列候選封面、2列TXT已提供的外部影片；沒有預先捏造gallery照片或其他影片。每篇的圖集／影片實際數量待使用者確認。

## C. 多張照片與圖集

照片仍上傳至新聞圖片資料夾；依**實際畫面**使用 `yyyy-event-actual-scene.ext` 命名，勿僅命名news-01或photo-final。不同畫面各有描述性檔名，原圖、比例及副檔名保留。
上傳後請Codex把實際照片加入 `src/data/news-media.json` 該ARTICLE_ID的 `gallery` 陣列。每張記錄 `filename`、三語 `alt`、可選三語 `caption`，確認授權後設 `approved:true`。封面獨立存於 `cover`，三語共用一張，不複製三份檔案。
圖集支援任意張數、原始比例、桌面雙欄／手機單欄及鍵盤可操作的放大檢視。尚未提供的照片不會顯示破圖或假照片。

## D. 影片位置、命名與連結

- **YouTube**：在該篇 `videos` 增加 `type:"youtube"` 與實際 `url`；可提供三語 `title`。TXT目前僅明確提供news-07的 `https://youtu.be/GUrKtH_TKjU`。
- **Facebook**：使用 `type:"facebook"`；TXT目前提供news-29的 `https://www.facebook.com/gpttcom/videos/1741246489814363/`。不得由Codex下載影片。
- 以上兩個已知影片目前僅顯示一般連結，`embedApproved:false`。確認授權及實際可公開嵌入後才能改為true；播放器須點擊載入、不自動播放，並保留一般連結作為備援。對嵌入權限、地區或平台限制未確認時維持連結，不能強塞失效iframe。
- **本地影片**：原檔上傳至 `public/media/news/`，建議 `yyyy-event-actual-topic.mp4` 或真實.webm。記錄 `type:"local"`、`url:"/media/news/實際檔名.mp4"`、三語標題及 `approved:true`；檔案不存在就不渲染。此處是格式示例，未建立不存在的影片條目。
- 可選 `poster` 為新聞圖片資料夾內的實際圖片檔名。大影片可使用已授權影片平台連結；不用放進src/assets/images。所有影片數量均無一部限制。

## E. 素材授權

全部素材都要確認原始拍攝者／提供者的使用權及必要署名。尤其：news-02 GBP封面、news-03媒體專訪、news-12獎項活動照片、news-15媒體來賓肖像、news-17/18的DVIDS素材、news-19中央社報導照片、news-24齊柏林基金會影像／肖像／轉載媒體。公開網址不等於可重製或嵌入。
這些僅是確認清單，並不代表本次取得或確認了任何第三方授權。

## F. 上傳後再請Codex接入

請提供實際檔名及可使用的來源／授權說明。Codex需核對內容與真實格式、更新CSV，並依實際照片撰寫三語Alt／說明，加入cover、gallery或videos後啟用核准旗標。需再驗證原圖比例、手機／桌面、放大檢視、影片可用性、GitHub Pages子路徑、SEO及Build。
目前 `gallery:[]` 不預設張數；所有候選封面未填Alt且未核准。未提供或未核對的素材維持佔位／不顯示，不會借用產品或其他新聞圖片。

## G. 三語、日期與待確認

90份正文與標題逐字沿用V2，SEO使用原標題與完整首段；編輯備註只存資料與報告，不混入正文。三語共用媒體與ARTICLE_ID，沿用原Astro列表／詳細頁與SEO元件。

- news-01依V2新增2025-11-24日期。
- news-03、news-06依TXT明確「採FB日期」更新為2025-10-29、2025-08-26，保留舊站差異記錄。
- news-07的2025-09-04與舊站2025-06-20未有一致結論，僅保存候選日期、不輸出已確認日期；活動年份另待確認。
- news-11沒有明確發布日；news-15的2026年份是來源編輯推定。兩篇不補造發布日期，候選／活動資訊仍保留。
- news-13展期、news-09活動年份等問題，以及DVIDS、效益數字及產品規格注意事項，見 [NEWS-REVIEW-V2.md](NEWS-REVIEW-V2.md)。未證實的成本節省不會被改寫為確定成效。

本次沒有改動產品原始圖片、產品版型或其他已核准設計。照片／影片尚未提供前，無法宣稱真實影片解碼與播放已驗證；目前先驗證元件互動、連結備援與不自動播放機制。

## 本次驗證結果

- Astro Build、型別檢查、34項單元測試通過。
- 90份三語文章與V2逐字比對通過；9個列表／分頁及桌機／390px手機檢查通過。
- 圖集／影片控制在TW、EN、JP的1440／768／390px共9組測試通過：放大、Esc／關閉、焦點返回、點擊載入、不自動播放與pagehide重置。測試僅用既有favicon作暫時DOM測試，沒有寫入新聞資料或產生媒體；遠端播放器請求被攔截，不下載影片。
- 全站216個URL的SEO檢查通過，三語各72個；188個可索引頁精確對應Sitemap，重複Title／Description及失效連結為0。
- GitHub Pages `/bigxreality-web/`：90篇路徑、6,540個本地引用及36組桌機／手機頁面通過。
- 新聞圖片與影片資料夾均只有上傳說明README；沒有新增、下載或轉換任何媒體二進位檔，也沒有修改產品圖片或版型。

可重跑：`npm run qa:news-import`、`npm run qa:news-media`、`npm run qa:news-preview`、`npm run qa:seo`。
