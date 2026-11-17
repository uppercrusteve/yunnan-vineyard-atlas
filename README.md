# 云岭之上 · 香格里拉高原葡萄园图集

一份关于云南德钦高海拔河谷葡萄园的数据叙事：把海拔剖面、面积口径分歧、品种、气候与公开来源放在同一张可核查的静态页面上。

[![CI](https://github.com/YilongXiao/yunnan-vineyard-atlas/actions/workflows/ci.yml/badge.svg)](https://github.com/YilongXiao/yunnan-vineyard-atlas/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-d9b36c.svg)](LICENSE)
[![Node 22](https://img.shields.io/badge/node-22.x-3c873a.svg)](package.json)
[![No framework](https://img.shields.io/badge/frontend-no%20framework-8a6f5c.svg)](package.json)

![云岭之上图集首屏：深色等高线背景上的标题、面积统计与来源徽章](docs/screenshots/hero-1440.png)

## 为什么做这个

德钦的葡萄面积在公开材料里有四种说法，同年两个数字相差约 6.5%；热量条件被不同来源写成互不重叠的区间；村庄海拔多为约值。产业报道常把这些差异压成一个顺滑的“权威数字”，读者却无从复核。

这个图集不替来源裁决，也不取平均：四种面积口径并排同屏，每条数字带年份和可点击的来源，冲突就留在页面上。它面向需要快速核对产区材料的研究者、编辑与政策读者，也是“记录 → 核查 → 传播”工作流中的公开记录环节。

![四种德钦面积口径并排，附散点图与冲突说明](docs/screenshots/area-conflict-1440.png)

## 安装

需要 Node.js 22+ 与 npm 10+。仓库已提交 `package-lock.json`，请使用 `npm ci` 而不是 `npm install`。

Windows PowerShell：

```powershell
git clone https://github.com/YilongXiao/yunnan-vineyard-atlas.git
Set-Location yunnan-vineyard-atlas
npm ci
```

macOS / Linux：

```bash
git clone https://github.com/YilongXiao/yunnan-vineyard-atlas.git
cd yunnan-vineyard-atlas
npm ci
```

## 快速开始

```bash
npm ci
npm test
npm run serve
```

打开 <http://127.0.0.1:4173/>。`npm run serve` 默认只监听 `127.0.0.1:4173`，可用 `npm run serve -- 8080` 或 `PORT=8080 npm run serve` 换端口。

其他命令：

```bash
npm run build       # 校验 data/*.csv，生成 data/bundle.json 与 src/data.js
npm run check       # build + test + 无头浏览器页面检查
npm run screenshot  # 用 Playwright 截取 1440 px 桌面与 390 px 移动端截图
```

首次截图前如本机没有 Playwright 浏览器，运行一次 `npx playwright install chromium`。页面也可直接以 `file://` 打开 `index.html`（读取构建后的离线 bundle）；通过 HTTP 访问时会额外从 CSV 回读数据。

## 输入与输出

输入是 `data/` 下的 UTF-8 CSV，第一行为字段名：

| 文件 | 内容 | 关键字段 |
|---|---|---|
| `data/area.csv` | 德钦县四种面积口径 + 迪庆州参照值 | `place,value,unit,year,source_id` |
| `data/yield.csv` | 分年产量（仅吨） | `place,value,unit,year,source_id` |
| `data/villages.csv` | 七个村庄的海拔范围、岸别与提及品种 | `order,elevation_min,elevation_max,source_id` |
| `data/varieties.csv` | 16 个公开报道品种 | `name,name_en,color,role,source_id` |
| `data/climate.csv` | 互相并列的气候区间 | `metric,value_min,value_max,unit,source_id` |
| `data/soils.csv` | 河谷土壤类型 | `type_zh,description,source_id` |
| `data/timeline.csv` | 2000–2025 公开事件 | `year,title,description,source_id` |
| `data/sources.csv` | 来源台账 | `id,title,publisher,date,url,accessed` |

`source_id` 必须能在 `data/sources.csv` 中解析；面积单位只允许 `亩` / `万亩`，产量只允许 `吨`，海拔必须按 `min ≤ representative ≤ max` 排列。构建脚本会拒绝重复 ID、孤立来源、越界年份和未知单位。

构建输出：

- `data/bundle.json`：页面离线读取的汇总包；
- `src/data.js`：同一份数据的脚本封装，供 `file://` 打开时使用。

页面本身是单页十个章节，不需要数据库或后端；部署产物就是仓库里的静态文件。`data/*.csv` 是唯一需要手改的输入，改完重跑 `npm run build` 与 `npm test`。可复制的行模板与一键替换示例见 [examples/README.md](examples/README.md)。

## 方法与局限

- **四种面积口径同屏**：2022 年 1.38 万亩、2024 年 6867 亩、2024 年 6418.66 亩、2025 年“近 7000 亩”并列展示；图表只把 `万亩` 换算成 `亩`，不平均、不合并、不选“权威值”。
- **地图是示意**：河谷、山脊与村庄点位不按经纬度投影，只保留上下游与左右岸的相对关系；等高线只是背景。
- **温度换算是示意**：`T(h) = 20 − 6.5 × (h − 2200) / 1000`，直减率取 6.5 °C/km，定义域钳制在 1600–3100 m；不是园区实测温度或预报。
- 温度换算是静力近似，未包含逆温、坡向、谷风与水体调节；面积口径缺少统一定义；村庄海拔来自公开材料的范围与代表值。

公式、假设、单位、冲突处理、出处与完整局限见 [docs/methods.md](docs/methods.md)。

## 数据来源与合成说明

页面使用七条公开来源（S1–S7），全部在 [data/sources.csv](data/sources.csv) 登记标题、发布者、日期、链接与检索日期 **2026-11-17**。来源表中的链接逐条可点，正文数字旁的来源徽章可打开详情；一条 2026-11 直链已返回 404 的旧稿也保留标题与检索日期，便于按标题回溯。

- **实测 / 公开数据**：面积、产量、气候区间、品种、土壤与时间线均来自政府答复、期刊综述、通讯社与行业报道，不是本仓库自采。
- **示意 / 编辑判断**：河谷地图、剖面、梯田插图是示意图形；早中晚熟带阈值是产业经验分段；村庄代表海拔取公开范围中值作图；品种“角色”是编辑标注，不是面积比例。
- 不把示意图形伪装成观测，也不把近似值写成定论。

## 测试

```bash
npm test
```

Vitest 共 5 个测试文件、58 个测试，覆盖：

- 递减率换算的基准值、每 100 m 变化、全定义域单调性与越界钳制；
- 面积单位换算、未知单位与非数值拒绝；
- CSV 引号、转义、BOM、空行、字段数与重复表头错误；
- 八个数据文件的 schema、唯一 ID、单位白名单、来源存在性与无孤立来源；
- 四口径数量、16 品种与唯一主栽、村庄海拔顺序、气候区间与时间线顺序；
- 品种搜索/筛选/排序的不变性，以及数字、HTML 转义；
- 页面十章节、滑块定义域、示意文案、本地脚本、无框架约束、methods 与 CI 存在性。

`npm run check` 额外在无头浏览器中渲染页面，检查关键区块和来源表确实生成、且无控制台错误。

## 引用

仓库附 [CITATION.cff](CITATION.cff)。GitHub 的“Cite this repository”可直接导出；手工引用：

```text
Yilong Xiao. (2026). 云岭之上：香格里拉高原葡萄园图集
(Above the Clouds: A Shangri-La Vineyard Atlas) (v0.1.0) [Computer software].
https://github.com/YilongXiao/yunnan-vineyard-atlas
```

## English summary

Above the Clouds is a static, framework-free data narrative about high-altitude vineyards in Deqin County, Yunnan. It keeps four conflicting published area figures side by side instead of averaging them, cites seven public sources with access dates, and labels every map and temperature conversion as schematic. Temperatures use a 6.5 °C/km environmental lapse rate from a 2200 m / 20 °C baseline, clamped to 1600–3100 m. The site ships as plain HTML/CSS/JS and deploys to GitHub Pages through the included CI workflow. Built with Node 22 and validated by 58 Vitest tests. Chinese is the primary language; all figures carry a year and a clickable source.

## License

[MIT](LICENSE) © 2026 Yilong Xiao
