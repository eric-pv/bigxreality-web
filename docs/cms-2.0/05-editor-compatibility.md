# 區塊編輯器、授權、大小與保真

實際安裝在本目錄的獨立 POC package，根 package／lock 不變；版本和測量可重現，不用行銷頁的「輕量」字樣代替測量。

## 候選比較

| 候選 | 授權／服務 | 基本核心 JS min／gzip | Astro、維護與限制 |
| --- | --- | --- | --- |
| Tiptap 3.32.2（Core＋StarterKit＋Image＋Markdown） | 核心 MIT；不使用付費 Pro／Cloud | 466,576／146,848 bytes | 可在 client-only 管理島載入；擴充生態成熟。Markdown parser／extensions 要成套保養，基本包不含 table／雙欄／影片自訂節點 |
| Milkdown Kit 7.23.0（Core＋CommonMark） | MIT；不需伺服器 | 368,810／112,680 bytes | Markdown-first／Remark＋ProseMirror，適合現有 body；需自製工具列、拖曳／排序、媒體 NodeViews 與安全預覽 |
| BlockNote Core 0.57.0 | **MPL-2.0**；不能寫成 MIT；不含任何商業服務承諾 | 611,976／191,334 bytes | 有 block 資料模型，但官方方法本身命名 blocksToMarkdownLossy。需要 React／UI 層及格式橋接；有 MPL 檔案層級來源／通知義務，採用前確認公司合規要求，不推論整個專案皆需開源 |

測量 esbuild 0.25.12、ES2022/browser/ESM、minify＋gzip，沒有 toolbar／CSS／App Shell／GitHub／i18n／安全清洗器，不是完整 CMS bundle 或同等功能 UI 的比較。unpacked 大小與 registry integrity 見 PACKAGE-SOURCES。不要因 core gzip 較小就宣稱整個後台只有這些 bytes。

## 實際匯入匯出

| 測試 | Tiptap | Milkdown | BlockNote |
| --- | --- | --- | --- |
| 真實 186 份 MD：bytes 不同 | 97 | 97 | 181 |
| 真實 186 份 MD：同一 marked renderer HTML 不同 | 0 | 0 | 7 |
| 合成 fixture | 12 例，7 例 HTML 不同 | 6 例，0 例 HTML 不同 | 6 例，4 例 HTML 不同 |

三者的 fixture 集合並非全等，不能將數字當直接排名。Tiptap 12 例包含單圖、雙欄 HTML、gallery directive、YouTube iframe、本地 video/source/track、分隔線、CTA、未知 HTML、table、script。另兩者共同 6 例為基本文、雙圖、iframe、video、table、comment。

- Tiptap 基本包缺 table extension 的失敗不是「Tiptap 永遠不支援 table」；是**目前選定擴充組合不保真**，增加任何 extension 都須重跑。
- Milkdown 可保留 opaque HTML 不代表可視覺操作其中所有影片／圖集；未知 HTML 要顯示原始區塊或唯讀提示，不假裝已具備完整 NodeView。
- HTML equality 去除標籤間空白，不是畫素比對、無障礙等價或 source equality。
- script 被 parser 丟掉可能是安全行為，仍不能靜默覆寫原稿；預覽要拒絕執行，保存／發布需明確 review。

## 建議核心與原始模式

完整 B 優先 Milkdown＋保真 adapter。底層仍 Markdown，不先建立第二個 JSON document 作正式來源。相容性依已核准的 subset 分級：

1. 可視覺編輯：已測試可往返的段落、H2／H3、清單、引言、連結、分隔線。
2. 可辨識自訂媒體：經驗證的單圖／雙圖／圖集／影片／CTA 節點，保留原 path／mediaId，只有編輯該區塊才重新序列化。
3. 不認識／無法證明保真：保留 opaque 原始 span，進階原始模式或唯讀，不提供一鍵「修復格式」。

正文為原 source＋AST/CST view。no-op 必須逐 byte 相同；已編輯 span 以外不得改字詞、註解、日期、未知欄位、換行、quote style 或縮排。frontmatter 使用保留 tokens 的 YAML CST，不能把 entire object parse/stringify 再宣稱格式不變。

本次 preserve.mjs 及測試證明 198 份 no-op／append 原文前綴不變、scalar patch 保留 BOM／CRLF／註解／未知欄位；這只是保真策略原型，**不是完整視覺編輯器任意修改的驗收**。Phase 3 必須測 selection、inline marks、IME、undo/redo、拖曳、切語、圖片說明與不支援語法，在實際瀏覽器中比對改動範圍。

## 全部區塊的設計與前台需求

| 區塊 | 儲存／預覽設計（待核准，不在本次套用） |
| --- | --- |
| 段落、H2/H3、清單、引言、分隔線、連結 | 既有 CommonMark，禁止任意增加 H1 破壞文章語意 |
| 單張圖片 | 原 path＋alt／caption；本地資產需要 build-time resolver，不把 src/assets 當公開 URL |
| 雙欄／多圖集 | 可辨識的 versioned block markup＋registry asset refs；未知舊 HTML 原樣保留。schema／標記語法先經管理者確認 |
| YouTube | 正確來源 allowlist、embedApproved、lazy／click-to-load，拒絕任意 iframe HTML |
| 本地影片 | 原 /media/news URL、核准、poster、controls、無有聲 autoplay，codec／檔案存在檢查 |
| CTA | 站內 URL、品牌樣式 variant、文字；不允許任意 JS／危險 protocol |

**中段媒體會需要前台 renderer 的小範圍變更**：目前 historical marked 與 Astro rendered 兩條管線需共用 resolver／sanitizer／media components，不能只改後台。只針對新增且已辨識的媒體 block 加能力，既有文章不批次轉換；registry 後方照片／影片保留，新的位置引用需避免同一素材重複顯示，語意規則先核准。

預覽依現有品牌 components 建立安全呈現，不直接把正文以 innerHTML 注入具有 Token 的 admin origin。原始模式也不是繞過 script／URL 安全檢查的入口。新檔案格式、付費 extension、AI 文案服務都不在本次批准範圍。
