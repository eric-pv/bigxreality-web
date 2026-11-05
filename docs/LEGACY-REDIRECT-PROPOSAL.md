# 舊站網址轉址方案提案

日期：2026-11-02（台北）。狀態：**提案，尚未實作任何轉址**。選定方案後另開任務實作。

前提：

- 依 [ARCHITECTURE.md](ARCHITECTURE.md) §6，正式網址由 `src/data/site.json` 的 `url` 推導 base。切到 `https://www.bigxreality.com` 後 base 是 `/`，Pages artifact 根目錄會有 `CNAME`、`robots.txt`、`sitemap.xml`（PR #58 已合併）。
- GitHub Pages 只提供靜態檔案：不讀 `_redirects`／`_headers`，不能自訂狀態碼或回應標頭，不能依查詢字串（`?` 之後）分流。不存在的路徑一律回傳 base 下的 `404.html`，狀態碼 404。
- 對照表見 [legacy-redirect-map.csv](legacy-redirect-map.csv)。

## 0. 資料完整度（先處理）

**本次任務的附件沒有收到**（訊息只有「【附上檔案】」占位字）。CSV 只收錄 repo 內有書面依據的舊網址：

| 類型 | 筆數 | 已確認 | 待確認 |
|---|---|---|---|
| 固定路徑 | 7 | 3（`/tw/home`、`/tw/solutions`、`/en/solutions`） | 4（`/`、`/en/home`、`/jp/home`、`/tw/packages`） |
| 參數型新聞 `news_content?param=／uuid=／id=` | 3 種模式 | 0 | 3（沒有任何一筆參數值） |
| 舊站新聞圖片 `/upload/news/*` | 11 | 0 | 11（舊網址取自 `docs/sources/BXR_NEWS_TRILINGUAL_EXPANDED_V2_2026-10-27.txt`） |

選方案前仍須補齊：

1. 舊站網址清單（附件、舊站 sitemap.xml、Search Console「網頁」報表或伺服器 log）。
2. 每則舊新聞的參數值 → 新 slug 對照（例如 `param=123` → `news-01-ds-2025`）。src/content/news 共 30 篇，slug 以實際檔名為準。
3. `news_content` 的確切路徑：有沒有語言前綴、有沒有副檔名（`.php`、`.aspx` 等），還有三種參數是不是同一路徑。這會決定方案 (a) 能不能做（見 §1）。
4. 根網址 `/` 的導向目標：需求文件寫 `/en/`，`scripts/pages/package.mjs` 現在產生的是 `/tw/`。
5. `/tw/packages` 的舊頁內容，用來決定導向產品還是解決方案。

`/tw/solutions` 這類只差結尾斜線的網址不需要轉址頁：GitHub Pages 遇到有同名目錄的路徑會自己回 301 補斜線，只需在切換當天抽樣驗證。

## 1. 方案比較

### (a) GitHub Pages 靜態轉址 HTML（meta refresh＋canonical；參數型用單頁 JS）

做法：

- 固定路徑：在 artifact 的舊路徑放 `index.html`，例如 `tw/home/index.html`，內容是 `<meta http-equiv="refresh" content="0;url=…">`、`<link rel="canonical" href="新網址絕對 URL">` 和可點連結。格式比照封裝程式現有根目錄 `index.html` 的 `redirect()`。
- 參數型：在舊路徑放一個頁面（例如 `news_content.html`；GitHub Pages 會用它回應 `/news_content`）。頁內 inline script 讀 `location.search`，查內嵌的對照表後執行 `location.replace(新網址)`。查不到就顯示新聞列表連結，不導向首頁。沒有 JS 時顯示三語新聞列表連結。
- 對照表從 CSV 產生成資料檔，由 `scripts/pages/package.mjs`（唯一封裝入口）寫入 artifact，並由 `pages:check` 驗證：每個目標都存在、canonical 是絕對 URL、轉址頁不進 sitemap。

SEO：

- 狀態碼是 200，不是 301。Google 把 0 秒 meta refresh 當作永久轉址處理，canonical 也指向新網址，所以固定路徑通常能轉移排名訊號，但比 301 慢，也較不保證。Bing 等其他搜尋引擎和社群預覽的支援較弱。
- 參數型只靠 JS：Google 需要渲染才看得到轉址，訊號比 meta refresh 更弱，也更慢。同一頁不能對不同參數輸出不同的 canonical（canonical 只能在 JS 執行後改寫），爬蟲可能把所有 `news_content?…` 視為同一頁。
- 轉址頁應**不加** `noindex`，避免和 canonical 及轉址訊號衝突。也不列入 sitemap。
- 舊圖片 `/upload/news/*` 無法轉址，圖片搜尋流量會失效。
- 限制：舊路徑如果帶 `.php`、`.aspx` 之類副檔名，GitHub Pages 會依副檔名決定 Content-Type，瀏覽器可能直接下載檔案而不是渲染 HTML，方案 (a) 對該路徑就不可行。須先確認 §0 第 3 項。

維護成本：低。對照表和網站在同一個 Git 版本，也走同一個 CI 和部署；新增一列 CSV 即可。缺點是每次封裝都要驗證轉址頁，`pages:check` 也要多一組測試。

### (b) 在 Pages 前加一層只處理轉址和標頭的 CDN

做法：DNS 指向 CDN（例如 Cloudflare 或 Fastly）。CDN 依路徑和查詢字串回 301，並可加安全標頭；其餘請求原樣轉給 GitHub Pages。CDN 不存內容，也不建置網站。

SEO：最佳。真正的 301 加精確 `Location`，參數型逐筆 301，舊圖片也可以 301 到新圖片網址（須維護圖片對照）。還能補上 GitHub Pages 做不到的 HSTS、CSP 等標頭。

維護成本：中到高。

- 多一個平台帳號、權限與費用，DNS 也改由 CDN 管理。轉址規則存在 CDN 設定裡，不在 Git `main` 中；若要讓 Git 成為唯一來源，就得另寫同步流程（又一套部署）。
- GitHub Pages 的 custom domain 和 HTTPS 憑證在 CDN 代理下需要特別設定，否則憑證簽發或續約可能失敗，或出現重新導向迴圈。
- 規則測試要另外建立，不能沿用 `pages:check`。

### (c) 其他可行方式

1. **（c-1）把參數型轉址放進現有 404.html**：不在舊路徑建頁面，改由 `src/pages/404.astro` 的 inline script 在偵測到舊路徑和參數時查表轉址。優點是不用知道確切副檔名，`.php`、`.aspx` 也會落到 404.html，能避開 (a) 的 Content-Type 問題。缺點是回應狀態碼是 404，Google 通常直接把舊網址當作已移除，不會跟著 JS 轉址，SEO 效果最差，只是保住真人訪客。適合當成 (a) 無法覆蓋的路徑的補強。
2. **（c-2）只做固定路徑，參數型不轉址**：參數型交給 404.html 的三語返回連結，並靠新 sitemap 讓搜尋引擎重新收錄。維護成本最低，但會流失舊新聞的外部連結權重。適合舊新聞外部連結很少的情況（看 Search Console「連結」報表判斷）。
3. **（c-3）換其他支援轉址的靜態主機**（例如 Netlify、Vercel，或 Cloudflare Pages 的 `_redirects`）：屬於更換正式託管，變更幅度比 (b) 大，不建議。

### 比較表

| | (a) 靜態轉址 HTML | (b) 前置 CDN | (c-1) 404.html JS | (c-2) 不轉參數型 |
|---|---|---|---|---|
| 固定路徑 SEO | 中（meta refresh＋canonical） | 佳（301） | 差（404） | 同 (a) |
| 參數型 SEO | 弱（JS） | 佳（301） | 很弱 | 無 |
| 舊圖片 | 無法處理 | 可 301 | 無法處理 | 無法處理 |
| 安全標頭 | 不能 | 可以 | 不能 | 不能 |
| 規則存放 | Git main | CDN 設定（Git 外） | Git main | Git main |
| 維護成本 | 低 | 中～高 | 低 | 最低 |
| 是否變更架構 | 否 | **是** | 小幅（改 404 規格） | 否 |

**建議**：先採 (a) 處理固定路徑與能確認副檔名的參數型路徑；確認不了的路徑以 (c-1) 補強。如果 Search Console 顯示舊新聞有相當的外部連結或流量，或公司另外需要安全標頭，再提 (b) 的架構變更申請。最終決定在 §0 資料補齊後做。

## 2. 與 ARCHITECTURE.md 的衝突點與核准

| 方案 | 相關條文 | 衝突／注意 | 需要誰核准 |
|---|---|---|---|
| (a) | §6「需要的轉址只能用靜態 HTML（如根目錄 index.html 的 meta refresh）」 | **相容**，是規範明示的做法。必須在 `scripts/pages/package.mjs` 內產生（§6「唯一封裝入口」「不得再加一套重複 prefix 的 URL 改寫流程」），並使用推導出的 base，不能寫死。 | PR 審查者（repo 管理者）。對照表每一列的新網址由業主或內容負責人確認（§5「精確對應，不把全部舊網址導向首頁」）。 |
| (a) | §6「不可依賴它們實作安全標頭或 301」 | 文件與 PR 不得把 (a) 描述為 301。 | 同上 |
| (a) | §3「既有 URL 不重命名」、§9「不任意改 URL」 | 轉址頁只能新增在舊路徑，不得佔用或覆蓋新站已存在的路由（例如 `/tw/solutions/`）。`pages:check` 應檢查不衝突。 | 同上 |
| (b) | §1「正式託管：GitHub Pages」；「不得擅自新增……Cloudflare 部署」；文件開頭「架構變更須經公司確認」 | **衝突**：新增一個正式網路層，需要修改 ARCHITECTURE.md §1 責任表與 §6。規則若不在 Git，也違反「main 是唯一正式版本」的精神。 | **公司**（架構決策者）書面核准，加上 DNS／網域管理者與費用核准；核准後先更新 ARCHITECTURE.md，再另開實作 PR。 |
| (c-1) | §6 對 404.html 行為的描述（依語言前綴切換、noindex、不列入 sitemap） | 小幅擴充 404 的既定行為，須同步更新 §6 文字；不涉及新服務。 | PR 審查者，加上 ARCHITECTURE.md 維護者同意修改條文。 |
| (c-2) | §5「刪除已公開 URL 須由審查者確認影響」 | 等於讓舊新聞網址失效，須明確接受流量損失。 | 業主或行銷負責人確認可接受。 |
| (c-3) | §1 正式託管 | 更換託管平台，屬於重大架構變更。 | 公司核准；不建議。 |

## 3. 切換網域當天檢查清單

前一天以前：

- [ ] 選定方案已實作、合併，並在 github.io 預覽環境驗證過轉址（固定路徑與參數型各抽樣）。
- [ ] `site.json` 的 `url` 改成 `https://www.bigxreality.com` 的 PR 已準備，但尚未合併；同一個 PR 同步 Sveltia 產生器的 `site_url`／`display_url`（§6）。
- [ ] 在 GitHub 帳號或組織設定驗證 `bigxreality.com` 網域（Verified domains，防止網域被他人接管）。
- [ ] 把 DNS TTL 預先降到 300 秒。保存舊站的 DNS 記錄、舊站 sitemap 和 Search Console 匯出，作為回復依據。
- [ ] 確認 Search Console 已有 `bigxreality.com` 的網域資源（DNS TXT 驗證），切換後不會失去權限。

當天：

1. **合併 url 變更 PR**：CI 通過後部署，確認 artifact 根目錄有 `CNAME`（內容 `www.bigxreality.com`）、`robots.txt`、`sitemap.xml`，`build-info.json` 的 commit 正確。
2. **DNS**：
   - [ ] `www` 設 CNAME 指向 `eric-pv.github.io`。
   - [ ] apex `bigxreality.com` 設 A 記錄 185.199.108.153、185.199.109.153、185.199.110.153、185.199.111.153，AAAA 記錄 2606:50c0:8000::153、2606:50c0:8001::153、2606:50c0:8002::153、2606:50c0:8003::153。GitHub Pages 會把 apex 轉到 www。若選方案 (b)，改依 CDN 指示設定。
   - [ ] 移除舊站殘留的 A、AAAA 記錄，避免兩邊同時解析；不要使用 `*` 萬用記錄。
   - [ ] 執行 `dig www.bigxreality.com +short`、`dig bigxreality.com +short` 確認結果。
3. **GitHub Pages custom domain**：
   - [ ] Settings → Pages → Custom domain 顯示 `www.bigxreality.com`，DNS check 通過。使用 Actions 部署時以這裡的設定為準，artifact 的 `CNAME` 只是對照。
   - [ ] 等憑證簽發完成後勾選 **Enforce HTTPS**。
4. **HTTPS**：
   - [ ] `https://www.bigxreality.com/` 憑證有效。
   - [ ] `http://` 會轉到 `https://`，`https://bigxreality.com/` 會轉到 `https://www.bigxreality.com/`。
   - [ ] 頁面沒有混合內容警告。
5. **網站本身**：
   - [ ] 根網址的導向符合 §0 第 4 項決議。
   - [ ] `/tw/`、`/en/`、`/jp/` 首頁正常；任一頁的 canonical、hreflang、JSON-LD 都是 `https://www.bigxreality.com/...`，不含 `/bigxreality-web/`。
   - [ ] `/admin/` 可登入，且保持 noindex。
   - [ ] 不存在的路徑會回 404.html，語言切換正確。
   - [ ] 舊的 `eric-pv.github.io/bigxreality-web/` 會被 GitHub 轉到新網域。
6. **轉址抽樣**（依 CSV）：
   - [ ] 每類至少抽 3 筆：固定路徑（`/tw/home`）、結尾斜線（`/tw/solutions` 應回 301 到 `/tw/solutions/`）、參數型（每種參數各 1 筆）、查不到的參數（應顯示新聞列表連結，不導向首頁）。
   - [ ] 用 `curl -sI` 檢查狀態碼；用瀏覽器檢查最後落點與 canonical。
   - [ ] 用 Search Console「網址審查」測試 2～3 筆舊網址。
7. **Search Console**：
   - [ ] 在 `bigxreality.com` 資源提交 `https://www.bigxreality.com/sitemap.xml`，確認讀取成功、網址數量合理。
   - [ ] **變更網址（Change of Address）工具**：只適用於「網域變更」。如果正式網域維持 `www.bigxreality.com`，只是改了主機和路徑，**這次不適用，不要提交**。只有在決定改用其他網域時才使用，並且須在舊網域資源執行。
   - [ ] 用網址審查要求重新索引首頁和主要產品頁。
8. **觀察與回復**：
   - [ ] 切換後 1～2 週每天看 Search Console 的「網頁」（404 數量）與「轉址」報表，把新出現的舊網址補進 CSV。
   - [ ] 回復方式：把 DNS 改回舊記錄，並 revert url 變更 PR。不以 force push 處理。
