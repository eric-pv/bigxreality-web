# 等業主處理的事項

每次業主檢查進度時，先列出本清單中尚未完成的項目。完成後刪除該列並註明日期。

| 項目 | 誰處理 | 完成後 |
| --- | --- | --- |
| 104 人力銀行 Open API（scope `c_job`）的 client_id／client_secret，並確認資格、費用、使用條款 | 公司人資 | 業主交給 Claude：設定 GitHub Secrets `BXR_104_CLIENT_ID`／`BXR_104_CLIENT_SECRET`，手動執行 CI 完成第一次同步（[說明](careers/104-INTEGRATION.md)） |
| 產品、解決方案、新聞照片 | 業主 | 依 `docs/*-IMAGE-REQUIREMENTS.md` 放上網站 |
| `[待提供]` 資料：公司英日文名稱、型錄／展示洽詢連結（site.json）、SUT 核心能力說明 | 業主 | 填入網站 |
| 改用正式網域 www.bigxreality.com 的通知 | 業主 | Claude 改網址設定；IT 設定 DNS CNAME 指向 `eric-pv.github.io` |
| 公司防火牆放行本站 | IT | — |
| GitHub 移除舊的「Workers Builds」整合 | 業主 | — |
| 舊 Cloudflare Worker／D1／R2 退役 | 業主（Claude 協助確認資料） | 見 [舊架構移除計畫](LEGACY-REMOVAL-PLAN.md) |
