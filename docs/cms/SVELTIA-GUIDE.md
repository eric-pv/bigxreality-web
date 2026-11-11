# Sveltia CMS 操作

唯一規範：[ARCHITECTURE](../ARCHITECTURE.md)。正式後台：https://eric-pv.github.io/bigxreality-web/admin/ 。本修正合併並成功部署後，backend.branch 應為 main；刷新並核對 config，勿用舊快取或舊表單覆蓋新內容。

## 管理者登入與權限

### 無額外服務的已設定方式：個人 Fine-grained PAT

1. 每位管理者／編輯者各用自己的 GitHub 帳號，不共用密碼或最高權限 Token。
2. Repository owner 在 Settings → Collaborators／Organization teams 授權。若是 Organization repository，指定至少兩位獨立使用者為 Admin（需要帳戶治理時再由兩位組織 Owner 管理）；一般編輯者使用 Write，審查者由團隊規則分配。
3. **若目前是個人帳號 repository**，GitHub 的最高管理權限只有 owner，無法只靠 Sveltia 增加第二位等權 Admin。要滿足兩位最高管理者，必須由公司建立／移轉至 Organization，或使用公司已有的組織；本次沒有擅自移轉。環境對 GitHub API 回傳 403，尚未核實 owner.type 與成員設定。
4. 各自開 GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token。選正確 Resource owner、**Only select repositories** → 本倉庫；Contents: Read and write、Pull requests: Read and write；Metadata: Read（GitHub 自動提供）。不要授予 Administration、Workflows、全部倉庫或 Organization owner 權限。設定短期有效日與輪替；若組織要求核准，等待核准後再登入。
若編輯者是他人個人倉庫的 outside collaborator，Fine-grained PAT 的 Resource owner／存取資格可能受 GitHub 限制；不可假設登入一定可用。公司應優先用 Organization 成員與組織核准 Token，或另行完成 OAuth 驗收。不得為了登入改成共用 owner Token。

5. 開 `/admin/` → **Sign In Using Access Token**，只在自己的受信任瀏覽器輸入本人 Token。CMS 可能在瀏覽器持久化登入資訊；使用後登出，共用電腦不可留下登入狀態。Token 不貼到 Issue、PR、config、環境公開變數或本文件。
6. Repository Settings → Rules／Branches：main 要求 PR、必要 CI、至少一位其他人 review、適用管理員、禁止 force push／刪除。不再將 `feature/sveltia-cms` 當正式編輯分支；Sveltia 的 `cms/*` 草稿分支需要可建立及寫入。

Sveltia 沒有可取代 GitHub 的完整伺服器端 RBAC。隱藏選單／delete:false／draft 不是安全權限隔離；Write 帳號仍可能透過 GitHub 直接改其他檔案。fine-grained PAT 的 Contents 權限也不是資料夾白名單。正式權限、審查、audit log 與禁止自我核准應由 GitHub 控制。公開 repository 可使用 GitHub 提供的免費分支保護能力；不要為本整合另購 CMS 角色功能。

### 可選的企業 OAuth

目前 config 只開 token，沒有虛構可用的 OAuth URL，也沒有把 client secret 放入靜態站。未部署／未驗證 OAuth。

未來可部署官方 [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) 的 serverless OAuth broker，或在既有受管 Azure Functions／AWS Lambda 實作符合 Sveltia 協定的 token exchange。需 GitHub OAuth App、精確 callback URL、state 與 origin allowlist、伺服端 secret storage。驗證成功後才加入 backend.base_url/auth_endpoint 及 auth_methods: [oauth, token]。GitHub 後端不可假設支援純靜態 PKCE 登入；Sveltia 明確不支援 GitHub PKCE。OAuth 登入仍受同一套 GitHub repository 權限與分支規則約束。


## 編輯與發布

- backend main，editorial_workflow 保留：Save Draft 不更新 main；Publish 經 GitHub 審核／必要 CI 合併 main，成功建置後才上線。main 的保護規則適用管理者，禁止以 owner Token 繞過。
- TW 的 draft 是前台公開開關，不同於 CMS 草稿狀態；先保存三語同 slug，EN／JP translated 後再公開 TW。沒有日期保持空值。
- 新聞 ARTICLE_ID／mediaId 保持一致；schema、關聯與媒體檢查通過後才發布。
- 固定頁禁止刪除；文章可經審核刪除，建議先 TW draft=true 下架，再刪三語檔並處理引用；保留媒體和 Git 歷史。
- 圖片上傳到既有 src/assets/images 分類，使用新檔名，不覆蓋或連帶刪除舊素材。
- 欄位名稱為「中文 / English」並列。每篇內容是一個項目，在編輯器上方切換繁中／英文／日文，一次儲存三語。關聯產品、解決方案、新聞、標籤等欄位直接輸入名稱搜尋選取，檔案中仍只存 slug；結構欄位（草稿、日期、分類、排序、關聯）在繁體中文設定，自動同步到英日文。
- 正文可插入「正文圖片」與「正文影片」區塊；未核准或缺三語 alt 的素材不會顯示。
- ARTICLE_ID、mediaId、imageId、產品代號是既有識別碼，既有內容請勿修改。
- 實際可編輯欄位見 [CMS-FIELD-MAP](../CMS-FIELD-MAP.md)。核心技術七項全文可在「核心技術全文」與「核心技術總覽」集合編輯；首頁 TS 文案仍走 Git PR。
- 查網站 build-info.json 與 Actions runUrl 核對部署 SHA。Publish 不成功先看 GitHub PR review/status；CI 失敗不會更新 Pages。

## 驗收限制

真實 CMS App 的隔離副本可驗證讀取、編輯、新增、上傳、草稿及刪除；真人 Token、GitHub 草稿 PR／合併與正式線上 Pages 更新，必須另有實測紀錄，不能以 Local Repository 模式代替。尚未取得的真人驗收一律標記尚未驗證。
