# 云朵名片
lit.link 风格的个人介绍页。纯静态前端（GitHub Pages）+ Supabase（账号、数据库、头像存储）。
- 配置：`config.js`（SUPABASE_URL + anon/publishable key）。key 为空或网址带 `?demo=1` 时进入本地演示模式。
- 数据库：在 Supabase SQL Editor 运行 `supabase/schema.sql`。
- 页面地址：`#/u/<页面ID>` 或 `?u=<页面ID>`。
- 第三方：qrcode-generator (MIT, Kazuhiko Arase)，supabase-js (MIT)，Resource Han Rounded (SIL OFL)，Fredoka (SIL OFL)。
