# CMS 與前台實際來源對照

規範入口：ARCHITECTURE.md。Sveltia 與網站共用 Git main；這不表示所有程式設定都已提供 CMS UI。

| 區域 | 前台實際來源 | CMS 可編輯方式 |
| --- | --- | --- |
| 首頁產品／方案／新聞卡片 | 對應內容 collection；首頁選項與獨立文案在 src/data/home.ts | collection 欄位可改；首頁 TS 文案與選項目前走程式 PR |
| 首頁主敘事、影片順序與焦點 | src/data/home.ts、hero-clips.ts | 尚無 CMS 編輯入口，不能用另一個固定頁欄位冒充 |
| 產品與解決方案詳細頁 | src/content/products／solutions/<lang>/<slug>.md，hero／landing／FAQ／SEO | 同篇切換三語、共用 slug；繁體中文控制結構 |
| 產品／方案總覽 | src/content/pages/<lang>/products.md、solutions.md，配合 UI JSON | 固定頁既有欄位；UI 全站文字仍走 Git PR |
| 新聞／技術文章／案例 | news／insights／case-studies collection | 同篇切換三語；新聞 ARTICLE_ID 固定，正文可插入圖片／影片 |
| 核心技術七項全文與總覽 | src/content/technologies／technology-overview/<zh-Hant\|en\|ja>/*.json | 原生三語集合；全文、章節、清單、FAQ、CTA、關聯、Hero 圖片、SEO 與草稿／翻譯狀態 |
| 公司與經營團隊 | pages/<lang>/company.md、team.md 等固定頁 | 固定頁 collection；不搬到首頁 |
| CSR | src/data/csr.json 理念、新聞 CSR 關聯欄位與既有新聞 | 新聞欄位控制案例；理念 JSON 目前走 Git PR |
| 新聞 cover／gallery／video | 文章明確 cover 優先；news-media.json 提供共用媒體 fallback／圖集 | 文章 cover、新聞共用媒體表；兩者有明確優先規則，非兩套 CMS |
| 產品照片 | 內容 image 欄位優先、primary-images.ts fallback | image 欄位／媒體上傳；不要將 src/assets 原始路徑當 public URL |
| Logo 與分類數字 | client-logos.json 與 clients 原圖 | 目前走 Git PR；不改既定 26 張分類 |
| 換行詞庫／標題分組 | typography.json | 多語文字換行集合 |
| 地址、電話、站點 URL | src/data/site.json | 目前走 Git PR；url 是唯一正式網址權威，不在別處新增第二個 base |

「無編輯入口」會如實列明，不提供一個儲存了卻不生效的替代欄位。本次沒有為了修同步而重做首頁或把所有 TS 文案改寫／搬移。

內部內容資料夾統一使用 `zh-Hant`／`en`／`ja`，UI JSON 與公開路由仍使用 `tw`／`en`／`jp`。遷移與操作見 [CMS 2.0 整合](cms-2.0/INTEGRATION.md)。
