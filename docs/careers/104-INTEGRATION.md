# 關於 BXR：104 職缺同步

業主需求（2026-11-09）：徵才資訊放在「關於 BXR」頁。人資只維護 104；官網每月自動更新公開職缺，每張卡片的應徵按鈕連到該職缺的 104 職務頁。不讀取、不保存履歷或應徵者資料。

## 現況（2026-11-09）

| 項目 | 狀態 |
| --- | --- |
| 社群連結、三語徵才區塊、104 公司頁按鈕（PR #101，Codex） | 已上線 |
| 職缺同步程式、每月排程、職缺卡片、測試（本次） | 已完成，**尚未啟用**：缺 104 發給的 API 憑證 |
| 實際向 104 取得職缺 | **未驗證**：沒有憑證，無法呼叫 API |

在第一次成功同步前，網站只顯示原本的「查看 104 職缺」按鈕，不顯示任何職缺卡片或「已同步」字樣。

## 查證結果：使用 104 官方「人力銀行 Open API」

104 開發者文件（developers.104.com.tw/swagger-ui）列出的 API：

| 文件 | 用途 | 適用？ |
| --- | --- | --- |
| Ehrweb Resume API（業主原連結 `urls.primaryName=9`）、ATS Resume API | 履歷查詢 | 否，涉及應徵者資料 |
| Job API v1.1（scope `job`） | 公司自己刊登／修改職缺 | 可讀但含寫入權限，超出需求 |
| **人力銀行 Open API**（scope `c_job`） | 「取得 104 相關公開資訊：Job Search API 可查詢刊登職務」 | **是** |

採用 `GET https://apis.104api.com.tw/jobs/1.0/jobs`：

- `custNo=1a2x6bjhcz`：公司代碼（base36），即 104 公司頁網址中的代碼。
- 回應含 `jobNo`、`jobName`、地區、經歷、學歷、需求人數、薪資描述、曝光日期，以及 `link.job`（官方職務頁，例如 `//www.104.com.tw/job/4u46a`）。
- `data.totalCount` 可區分「合法的零職缺」與錯誤回應。
- 認證：OAuth2 client credentials。以 `client_id`／`client_secret` 向 `https://apis.104api.com.tw/oauth2/token` 換取 token，scope `c_job`。

**沒有使用網頁內部端點或爬蟲。** 104 網站（www.104.com.tw）對自動化請求回應 Cloudflare 403，爬取也不在核准範圍。

### 授權、資格與費用：文件未公開，需業主向 104 確認

104 的 Swagger 與 104 人資學院開發者文件都沒有寫 Open API 的申請資格、費用或使用條款。已公開的資訊只有：憑證由 104 以信件寄發（client_id、client_secret），以及合作夥伴申請表（https://104ha.com/3D5RB）。

## 業主需要處理

1. 向 104 業務窗口或客服申請「人力銀行 Open API（scope `c_job`）」的 client_id／client_secret，並確認：
   - 本公司（統編、104 公司代碼 `1a2x6bjhcz`）是否符合資格；
   - 是否收費；
   - 使用條款是否允許在自家官網顯示職缺清單並連回 104 職務頁。
2. 取得後，在 GitHub repository → Settings → Secrets and variables → Actions 新增兩個 Secret：
   - `BXR_104_CLIENT_ID`
   - `BXR_104_CLIENT_SECRET`
3. 到 Actions → CI → Run workflow（main）手動執行一次，確認第一次同步。之後每月 1 日 10:17（台北）自動執行。

憑證只放 GitHub Secrets，不寫入版本庫、文件或 Issue。

## 運作方式

```
ci.yml（每月排程或手動）
  careers-sync：token → 分頁取得職缺 → 驗證 → 有變動才 commit src/data/careers-104.json 到 main
  build-and-test：測試並建置剛剛那個 commit
  deploy-pages：部署同一份 artifact
```

- 程式：`src/lib/careers-104.ts`（驗證規則）、`scripts/careers/sync-104.mjs`（呼叫 API）、`src/components/Careers.astro`（關於 BXR 的卡片）。
- 只請求公開欄位；應徵人數、座標、Logo 不請求，履歷相關 API 完全不呼叫。
- 驗證不過就整次放棄並讓執行失敗（GitHub 會寄失敗通知），保留上一份快照與目前網站：
  - 逾時、HTTP 錯誤、授權失敗、非 JSON；
  - 任何一筆的 `custNo` 不是本公司（防止篩選失效時顯示別家職缺）；
  - `link.job` 不是 `https://www.104.com.tw/job/{同一個 jobNo}`；
  - 職缺名稱缺漏、重複職缺、實際筆數與 `totalCount` 不符。
- 「最後同步日期」只在職缺內容有變動且驗證成功時更新，排程執行本身不會改日期。
- 沒有設定 Secret 時，同步步驟略過且不算失敗，網站維持原樣。

### 零職缺

- 第一次同步就是 0 筆：發布，頁面顯示「目前沒有公開職缺」並保留 104 公司頁按鈕。
- 網站已有職缺、排程收到合法的 0 筆：**不自動清空**。執行標示失敗並保留原職缺，因為可能是帳號或 API 異常。
- 確認公司真的沒有職缺：手動執行 CI 並勾選 `careers_allow_empty`，才會發布 0 筆。

### 語言

職缺內容沿用 104 原文（繁體中文）。英文、日文頁的按鈕與標籤已翻譯，並註明職缺內容以 104 原文顯示；地點在英日文頁使用 104 提供的英文地名。

## 測試

- `tests/careers-104.test.ts`：欄位取捨、官方網址、11 種錯誤回應、多頁合併、零職缺三種情況、快照格式。
- `qa:company`：正式建置（未啟用：無卡片、無同步日期）與測試建置（2 筆合成職缺：卡片順序、每顆按鈕連到自己的 104 職務頁、新分頁、同步日期），三語皆檢查。
- 真實 104 API 回應尚未驗證，取得憑證後第一次手動執行即為實測；若實際格式與文件不同，驗證會失敗並保留原網站，不會顯示錯誤資料。
