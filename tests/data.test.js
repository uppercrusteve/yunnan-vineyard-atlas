import { describe, expect, it } from "vitest";
import { readCSV, bundle } from "./helpers.js";

const SCHEMA = {
  area: ["id", "place", "value", "unit", "year", "source_id", "note"],
  yield: ["id", "place", "value", "unit", "year", "source_id", "note"],
  villages: ["id", "name", "name_en", "valley", "bank", "order", "elevation_min", "elevation_max", "elevation_representative", "varieties", "source_id", "note"],
  varieties: ["id", "name", "name_en", "color", "role", "note", "source_id"],
  climate: ["id", "metric", "label_zh", "label_en", "value_min", "value_max", "unit", "year", "source_id", "note"],
  soils: ["id", "type_zh", "type_en", "description", "source_id"],
  timeline: ["id", "year", "title", "description", "source_id", "note"],
  sources: ["id", "title", "publisher", "date", "url", "accessed", "note"],
};

const sourceIds = new Set(readCSV("sources").map((row) => row.id));

describe("data schema", () => {
  for (const [name, fields] of Object.entries(SCHEMA)) {
    it(name + ".csv has every required field and a unique id", () => {
      const rows = readCSV(name);
      expect(rows.length).toBeGreaterThan(0);
      const ids = new Set();
      for (const row of rows) {
        for (const field of fields) {
          expect(row[field], name + " field " + field).toBeTruthy();
        }
        expect(ids.has(row.id), "duplicate id " + row.id).toBe(false);
        ids.add(row.id);
      }
    });
  }

  it("keeps exactly four Deqin area calibres from four sources", () => {
    const rows = readCSV("area").filter((row) => row.place === "德钦县");
    expect(rows).toHaveLength(4);
    expect(new Set(rows.map((row) => row.source_id)).size).toBe(4);
    expect(rows.some((row) => row.unit === "万亩")).toBe(true);
  });

  it("has the state-wide 2024 area only as context, not as a fifth Deqin calibre", () => {
    const state = readCSV("area").find((row) => row.place === "迪庆州");
    expect(state).toBeTruthy();
    expect(state.value).toBe("10557.96");
    expect(state.note).toContain("6418.66");
  });
});

describe("units and numeric ranges", () => {
  it("only uses 亩 or 万亩 for area and converts 1.38 万亩 to 13800 亩", () => {
    for (const row of readCSV("area")) {
      expect(["亩", "万亩"]).toContain(row.unit);
    }
    const row = readCSV("area").find((candidate) => candidate.unit === "万亩");
    expect(Number(row.value)).toBeCloseTo(1.38, 5);
    expect(row.value * 10000).toBeCloseTo(13800, 6);
  });

  it("only uses tonnes for yield", () => {
    const rows = readCSV("yield");
    expect(rows.length).toBe(3);
    for (const row of rows) expect(row.unit).toBe("吨");
  });

  it("keeps all village elevation ranges ordered and inside 1700–3000 m", () => {
    const rows = readCSV("villages");
    expect(rows).toHaveLength(7);
    for (const row of rows) {
      const min = Number(row.elevation_min);
      const max = Number(row.elevation_max);
      const rep = Number(row.elevation_representative);
      expect(min).toBeLessThanOrEqual(max);
      expect(rep).toBeGreaterThanOrEqual(min);
      expect(rep).toBeLessThanOrEqual(max);
      expect(min).toBeGreaterThanOrEqual(1700);
      expect(max).toBeLessThanOrEqual(3000);
    }
  });

  it("keeps every climate range ordered and every unit in the allow-list", () => {
    for (const row of readCSV("climate")) {
      expect(Number(row.value_min)).toBeLessThanOrEqual(Number(row.value_max));
      expect(["mm", "h", "天", "m"]).toContain(row.unit);
    }
  });

  it("lists the published 16 varieties with one dominant and valid colours", () => {
    const rows = readCSV("varieties");
    expect(rows).toHaveLength(16);
    expect(rows.filter((row) => row.role === "主栽")).toHaveLength(1);
    for (const row of rows) {
      expect(["红", "白"]).toContain(row.color);
      expect(["主栽", "少量"]).toContain(row.role);
    }
  });

  it("keeps years in 2000–2026 and the timeline chronological", () => {
    const years = [];
    for (const name of ["area", "yield", "climate", "timeline"]) {
      for (const row of readCSV(name)) {
        const year = Number(row.year);
        expect(year).toBeGreaterThanOrEqual(2000);
        expect(year).toBeLessThanOrEqual(2026);
        if (name === "timeline") years.push(year);
      }
    }
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });
});

describe("source integrity", () => {
  it("has seven unique, https, accessed sources", () => {
    const rows = readCSV("sources");
    expect(rows).toHaveLength(7);
    expect(new Set(rows.map((row) => row.id)).size).toBe(7);
    for (const row of rows) {
      expect(row.url.startsWith("https://")).toBe(true);
      expect(row.accessed).toBe("2026-11-17");
    }
  });

  it("resolves every source_id in every reference file", () => {
    for (const name of ["area", "yield", "villages", "varieties", "climate", "soils", "timeline"]) {
      for (const row of readCSV(name)) {
        expect(sourceIds.has(row.source_id), name + " row " + row.id).toBe(true);
      }
    }
  });

  it("has no orphan source", () => {
    const referenced = new Set();
    for (const name of ["area", "yield", "villages", "varieties", "climate", "soils", "timeline"]) {
      for (const row of readCSV(name)) referenced.add(row.source_id);
    }
    for (const id of sourceIds) expect(referenced.has(id), "orphan " + id).toBe(true);
  });

  it("ships a bundle whose source references match the CSVs", () => {
    expect(bundle.sources).toHaveLength(7);
    expect(bundle.area).toHaveLength(5);
    expect(bundle.villages).toHaveLength(7);
  });
});
