# 新聞匯入（已升級 V2）

目前唯一使用的來源為 `docs/sources/BXR_NEWS_TRILINGUAL_EXPANDED_V2_2026-10-27.txt`。
V2共30篇、TW／EN／JP共90份。原有13個ARTICLE_ID/slug保留並更新，不另建重複新聞。

完整上傳說明、30個候選封面檔名、圖集／影片格式及接入流程見 [NEWS-MEDIA-UPLOAD.md](NEWS-MEDIA-UPLOAD.md)。
媒體清單為根目錄 [NEWS-MEDIA-MANIFEST.csv](../NEWS-MEDIA-MANIFEST.csv)，取代舊單圖清單。
日期與授權待確認事項見 [NEWS-REVIEW-V2.md](NEWS-REVIEW-V2.md)。

媒體由 `src/data/news-media.json` 統一管理，每篇以mediaId/ARTICLE_ID共用cover、gallery、videos及sourceLinks；imageId與newsCover保留相容入口，沒有第二套新聞系統。
