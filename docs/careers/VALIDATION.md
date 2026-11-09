# 徵才入口與社群設定驗證

- Node 22 正式建置通過。
- Astro check：0 errors、0 warnings，保留既有 38 hints。
- 三語公司頁在 320、390、768、1440px 共 12 組檢查通過：徵才區塊位於公司頁、按鈕連到業主提供的 104 公司頁、新分頁連結安全屬性、三個社群連結、Organization.sameAs 與頁面無橫向溢出。
- `qa:company`、`qa:seo`、`qa:footer` 通過；頁尾檢查涵蓋 294 頁。
- 沒有修改 `public/admin/`、`scripts/pages/`、`.github/`、`integrations/`。
- 104 API 文件與月更尚未實測或實作，不能將上述網站驗證視為職缺同步已完成。接續條件見 [104-INTEGRATION.md](104-INTEGRATION.md)。

390px 實際畫面：[繁中](screenshots/tw.png)、[英文](screenshots/en.png)、[日文](screenshots/jp.png)。
