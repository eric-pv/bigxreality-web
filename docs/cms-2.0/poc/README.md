# Phase 0 隔離驗證

此目錄不是正式 CMS。不得複製到 public/admin、改正式 config 或把測試 Git ref 推到遠端。

```sh
# Repository 根目錄：既有依賴，用於唯讀 schema/媒體盤點及 Playwright
npm ci --ignore-scripts --cache /tmp/bxr-cms2-npm-cache
# 本目錄的獨立依賴，不修改根 package.json/package-lock.json
cd docs/cms-2.0/poc
npm ci --ignore-scripts --cache /tmp/bxr-cms2-npm-cache
node audit.mjs
node shared-fields.mjs
node editors.mjs
node compare-editors.mjs
node sizes.mjs
node --test roundtrip.test.mjs
CHROMIUM_PATH=/usr/bin/chromium node sveltia-i18n.mjs
```

`audit.mjs`、`labels.mjs` 只讀版本控管的來源，輸出到 ../evidence。`audit.mjs` 使用 repository 的 Sharp 讀取尺寸，不產生／壓縮圖片。`editors.mjs` 測試全部原文的實際轉換；其他 editor 亦用相同 corpus 及合成案例。`preserve.mjs` 是 no-op／CST scalar patch／原始段落 append 的保真策略原型，不是已完成的視覺編輯器。

`roundtrip.test.mjs` 只在 /tmp 建立合成 Git repository，驗證單 commit 三語與 CAS；沒有呼叫真實 GitHub mutation 或 PR API。`sveltia-i18n.mjs` 載入正式目前固定版本的 App，但資料在瀏覽器隔離 OPFS，沒有遠端 Git 寫入或私人 Token。

## 官方來源固定版本

第一次若要重新產生完整 UI 字串盤點，先在根目錄準備唯讀 upstream clone：

```sh
mkdir -p .qa/cms-2-research
git clone --depth 1 --filter=blob:none --sparse --branch v0.253.1 https://github.com/sveltia/sveltia-cms.git .qa/cms-2-research/sveltia
git -C .qa/cms-2-research/sveltia sparse-checkout set src/lib
node docs/cms-2.0/poc/labels.mjs
```

來源 commit 必須是 `2de6c09797b8f1947784a999c21ceb322c8b59bc`；不從最新 main 推斷目前上線版本功能。`OPTION-LABEL-PLAN.csv` 的建議詞彙是本次規劃稿，保留儲存值，尚未變更正式選項。

## 限制

- 視覺 editor 的 headless／jsdom 匯入匯出不能代替完整滑鼠／鍵盤與所有自訂媒體 NodeView 驗收。
- HTML 相等是以同一 marked renderer 去除標籤間空白比較，不是畫素或完整語意等價證明。
- 套件大小是指定基本編輯核心，不包含完整後台、工具列、CSS、上傳及 GitHub adapter。
- 所有證據固定於報告的 main SHA；管理者之後上傳的素材不在該快照內，不能因未出現就刪除。
