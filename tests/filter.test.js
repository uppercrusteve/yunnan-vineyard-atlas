import { describe, expect, it } from "vitest";
import { readCSV, L } from "./helpers.js";

const varieties = readCSV("varieties");

describe("variety filtering", () => {
  it("returns all 16 rows with neutral filters", () => {
    expect(L.filterVarieties(varieties, { query: "", color: "all", role: "all" })).toHaveLength(16);
  });

  it("filters by colour without mutating the source array", () => {
    expect(L.filterVarieties(varieties, { color: "红" })).toHaveLength(11);
    expect(L.filterVarieties(varieties, { color: "白" })).toHaveLength(5);
    expect(varieties).toHaveLength(16);
  });

  it("filters the single dominant variety", () => {
    const result = L.filterVarieties(varieties, { role: "主栽" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("赤霞珠");
  });

  it("searches Chinese and English names case-insensitively", () => {
    expect(L.filterVarieties(varieties, { query: "西拉" }).map((row) => row.name)).toEqual(["西拉"]);
    expect(L.filterVarieties(varieties, { query: "syrah" }).map((row) => row.name)).toEqual(["西拉"]);
    expect(L.filterVarieties(varieties, { query: "RIESLING" }).length).toBeGreaterThan(0);
  });

  it("combines query and colour and returns zero for an unmatched query", () => {
    expect(L.filterVarieties(varieties, { query: "霞多丽", color: "红" })).toHaveLength(0);
    expect(L.filterVarieties(varieties, { query: "不存在的品种" })).toHaveLength(0);
  });
});

describe("variety sorting", () => {
  it("sorts by English name ascending and descending without mutating", () => {
    const asc = L.sortVarieties(varieties, "name_en", "asc").map((row) => row.name_en);
    const desc = L.sortVarieties(varieties, "name_en", "desc").map((row) => row.name_en);
    expect(asc[0]).toBe("Cabernet Franc");
    expect(desc[0]).toBe("Yan 73");
    expect(varieties[0].name).toBe("赤霞珠");
  });

  it("puts 主栽 before 少量 in ascending role order", () => {
    const sorted = L.sortVarieties(varieties, "role", "asc");
    expect(sorted[0].role).toBe("主栽");
  });

  it("falls back to a copy for an unknown sort key", () => {
    const sorted = L.sortVarieties(varieties, "unknown", "asc");
    expect(sorted).toHaveLength(16);
    expect(sorted).not.toBe(varieties);
  });
});

describe("source display helpers", () => {
  it("resolves a known source and reports a missing one", () => {
    const sources = readCSV("sources");
    expect(L.sourceById(sources, "S6").publisher).toBe("World of Fine Wine");
    expect(L.sourceById(sources, "S99")).toBeNull();
  });

  it("formats numbers with Chinese thousands separators", () => {
    expect(L.formatNumber(13800)).toBe("13,800");
    expect(L.formatNumber(6418.66)).toBe("6,418.66");
  });

  it("escapes HTML-sensitive data", () => {
    expect(L.escapeHTML('<a href="x">&\'')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });
});
