# 示例输入

本项目的正式输入在 `data/`。这里给出两条替换行与一个临时脚本，用来演示“改一条记录 → 构建校验 → 预览 → 还原”的最小流程。示例行的内容来自仓库已有来源与数值，不是新增观测。

## 一键试跑

```bash
node examples/try-example.mjs
npm run serve
```

打开 <http://127.0.0.1:4173/>。第 03 节的明永村卡片与第 04 节的 S2 面积卡片会换成示例说明文案；四口径数量与七个村庄数量不变，`npm test` 仍可通过。

撤销并重新构建：

```bash
node examples/try-example.mjs --restore
```

脚本会把原始 `data/area.csv`、`data/villages.csv` 备份到系统临时目录，替换固定 ID 的行后调用 `npm run build`。构建失败时不会自动还原，修正后可再执行 `--restore`。

## 手改字段

| 文件 | 对应表 | 关键约束 |
|---|---|---|
| `area-row.csv` | `data/area.csv` | 单位只允许 `亩` / `万亩`；`source_id` 必须已登记 |
| `village-row.csv` | `data/villages.csv` | `1700 ≤ min ≤ representative ≤ max ≤ 3000`；`order` 保持递增 |

新增来源要先在 `data/sources.csv` 增加一行（`https://` URL、`accessed=YYYY-MM-DD`），再在数据行引用；构建会拒绝未知来源与从未引用的孤立来源。字段全集见 [README](../README.md#输入与输出)，口径规则见 [CONTRIBUTING](../CONTRIBUTING.md#数据口径)。
