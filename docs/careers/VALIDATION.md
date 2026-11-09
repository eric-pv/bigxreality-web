# 徵才入口與 104 職缺同步驗證

## PR #101（Codex）：徵才入口與社群連結

- 三語公司頁在 320、390、768、1440px 檢查通過：徵才區塊、104 公司頁按鈕、新分頁安全屬性、三個社群連結、Organization.sameAs、無橫向溢出。

## 104 職缺同步（Claude）

- `npm test`：81 通過（含 `tests/careers-104.test.ts` 6 項）。
- `npx astro check`：0 errors。
- `qa:company`：正式建置與測試建置三語通過（見 [104-INTEGRATION.md](104-INTEGRATION.md#測試)）。
- 沒有憑證時執行同步：略過、結束碼 0、快照不變。
- **未驗證：** 真實 104 API 呼叫（尚無 client_id／client_secret）。不能把目前的 104 公司頁按鈕視為自動同步已完成。
