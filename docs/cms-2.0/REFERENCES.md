# 來源與版本證據

查核日期：2026-11-03（台北）。官方文件網站（sveltiacms.app、docs.github.com、blocknotejs.org）HTTP 403，沙箱外重試仍相同；**沒有假稱已讀取這些網站的最新頁面**。可讀的官方 Git source、registry metadata 與實際安裝套件是本次主要證據。

## 專案來源

所有現況與數量固定於 main `6f5935c68a1e530dc40c37a49ba96b9dedcc4803`。重要程式：src/content.config.ts、scripts/sveltia/generate.mjs／schema.mjs／check.mjs／qa-browser.mjs、public/admin/index.html／bootstrap.js／value-tools.js、src/lib/content.ts／news-media.ts／news-video.ts、src/components/ArticleDetail.astro／Prose.astro／NewsGallery.astro／NewsVideos.astro、.github/workflows/ci.yml。

## Sveltia 固定版官方原始碼

研究 clone tag v0.253.1，commit `2de6c09797b8f1947784a999c21ceb322c8b59bc`。不是對正式 CMS 做 fork 或升級。

- [i18n 設定型別](https://github.com/sveltia/sveltia-cms/blob/2de6c09797b8f1947784a999c21ceb322c8b59bc/src/lib/types/public.js)：I18nOptions、multiple_folders、locales、field types。
- [語言名稱](https://github.com/sveltia/sveltia-cms/blob/2de6c09797b8f1947784a999c21ceb322c8b59bc/src/lib/services/contents/i18n/index.js)：getCanonicalLocale／getLocaleLabel 使用 Intl。
- [切語 UI](https://github.com/sveltia/sveltia-cms/blob/2de6c09797b8f1947784a999c21ceb322c8b59bc/src/lib/components/contents/details/locale-switcher.svelte)：draft state、pending updates、pane locale。
- [GitHub commit](https://github.com/sveltia/sveltia-cms/blob/2de6c09797b8f1947784a999c21ceb322c8b59bc/src/lib/services/backends/git/github/commits.js)：createCommitOnBranch、expectedHeadOid、large changeset queue／重試／部分成功。
- [公開 API](https://github.com/sveltia/sveltia-cms/blob/2de6c09797b8f1947784a999c21ceb322c8b59bc/src/lib/services/api/index.js)、[不支援清單](https://github.com/sveltia/sveltia-cms/blob/2de6c09797b8f1947784a999c21ceb322c8b59bc/src/lib/services/api/compatibility.js)。
- [自訂編輯元件](https://github.com/sveltia/sveltia-cms/blob/2de6c09797b8f1947784a999c21ceb322c8b59bc/src/lib/services/api/methods/register-editor-component.js)。
- 英文／TW 字串來源：相同 commit 的 src/lib/locales/en-US.yaml、zh-TW.yaml。

原生三語 POC 直接載入專案 index 固定 CDN／SRI 的 App，並非用自己寫的 tabs 冒充 Sveltia。

## 編輯器與授權

- Tiptap：官方 npm @tiptap/markdown、core、starter-kit、extension-image 3.32.2；MIT。原始碼：[ueberdosis/tiptap](https://github.com/ueberdosis/tiptap)。測試實際使用 MarkdownManager.parse／serialize。
- Milkdown：官方 npm @milkdown/kit 7.23.0；MIT。[Milkdown/milkdown](https://github.com/Milkdown/milkdown)。測試 Core／CommonMark parserCtx／serializerCtx。
- BlockNote：官方 npm @blocknote/core 0.57.0；MPL-2.0。[TypeCellOS/BlockNote](https://github.com/TypeCellOS/BlockNote)。已讀安裝包型別／API：tryParseMarkdownToBlocks、blocksToMarkdownLossy。
- registry 當日 latest Sveltia 為 0.257.0，與專案固定版不同；只記錄，未測試升級。
- [PACKAGE-SOURCES.json](evidence/PACKAGE-SOURCES.json) 保存 registry URL、版本、license、unpacked bytes、integrity 與 repository；POC package-lock 固定實測依賴。npm root lock／正式依賴沒有改動。

## 尚未取得的外部證據

GitHub 真人登入、角色與分支保護、真實 GraphQL atomic commit／網路未知結果、待審 PR、最新遠端 Actions／Pages 部署、公司素材授權新增狀態，不以本地 POC 或 clone 推定。後續正式開發需逐項驗收。
