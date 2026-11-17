#!/usr/bin/env node
/**
 * Validate the CSV/JSON sources and emit the offline data bundle.
 * The page works from file:// because it reads this bundle; when served over
 * HTTP it also refreshes from the CSVs, which remain the canonical record.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const CSV = require("../src/csv.js");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

const SCHEMAS = {
  area: { required: ["id", "place", "value", "unit", "year", "source_id", "note"], units: ["亩", "万亩"] },
  yield: { required: ["id", "place", "value", "unit", "year", "source_id", "note"], units: ["吨"] },
  villages: {
    required: ["id", "name", "name_en", "valley", "bank", "order", "elevation_min", "elevation_max", "elevation_representative", "varieties", "source_id", "note"],
    units: [],
  },
  varieties: {
    required: ["id", "name", "name_en", "color", "role", "note", "source_id"],
    units: [],
  },
  climate: {
    required: ["id", "metric", "label_zh", "label_en", "value_min", "value_max", "unit", "year", "source_id", "note"],
    units: ["mm", "h", "天", "m"],
  },
  soils: { required: ["id", "type_zh", "type_en", "description", "source_id"], units: [] },
  timeline: { required: ["id", "year", "title", "description", "source_id", "note"], units: [] },
  sources: { required: ["id", "title", "publisher", "date", "url", "accessed", "note"], units: [] },
};

function fail(message) {
  errors.push(message);
}

function readCSV(name) {
  const file = path.join(root, "data", name + ".csv");
  if (!fs.existsSync(file)) {
    fail("missing file: data/" + name + ".csv");
    return [];
  }
  let parsed;
  try {
    parsed = CSV.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail("cannot parse data/" + name + ".csv: " + error.message);
    return [];
  }
  return parsed.rows;
}

function schemaCheck(name, rows) {
  const schema = SCHEMAS[name];
  const ids = new Set();
  rows.forEach((row, index) => {
    const where = name + ".csv row " + (index + 2);
    schema.required.forEach((field) => {
      if (row[field] === undefined || String(row[field]).trim() === "") {
        fail(where + ": missing required field '" + field + "'");
      }
    });
    if (row.id) {
      if (ids.has(row.id)) fail(where + ": duplicate id '" + row.id + "'");
      ids.add(row.id);
    }
    if (schema.units.length && row.unit && !schema.units.includes(row.unit)) {
      fail(where + ": unsupported unit '" + row.unit + "'");
    }
    ["value", "year", "elevation_min", "elevation_max", "elevation_representative", "order", "value_min", "value_max"]
      .filter((field) => row[field] !== undefined)
      .forEach((field) => {
        if (!Number.isFinite(Number(row[field]))) fail(where + ": '" + field + "' is not numeric");
      });
  });
}

const data = {};
for (const name of Object.keys(SCHEMAS)) data[name] = readCSV(name);
for (const name of Object.keys(SCHEMAS)) schemaCheck(name, data[name]);

let meta = {};
try {
  meta = JSON.parse(fs.readFileSync(path.join(root, "data", "meta.json"), "utf8"));
} catch (error) {
  fail("cannot parse data/meta.json: " + error.message);
}

const sourceIds = new Set(data.sources.map((row) => row.id));
if (sourceIds.size !== data.sources.length) fail("duplicate source ids");
for (const source of data.sources) {
  if (!/^https:\/\//.test(source.url || "")) fail(source.id + ": source URL must be https");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.accessed || "")) fail(source.id + ": accessed must be YYYY-MM-DD");
}

const referenceFiles = ["area", "yield", "villages", "varieties", "climate", "soils", "timeline"];
const referenced = new Set();
for (const name of referenceFiles) {
  for (const [index, row] of data[name].entries()) {
    if (row.source_id && !sourceIds.has(row.source_id)) {
      fail(name + ".csv row " + (index + 2) + ": unknown source_id '" + row.source_id + "'");
    }
    if (row.source_id) referenced.add(row.source_id);
  }
}
for (const source of data.sources) {
  if (!referenced.has(source.id)) fail("orphan source: " + source.id + " is never cited");
}

const deqinArea = data.area.filter((row) => row.place === "德钦县");
if (deqinArea.length !== 4) fail("area.csv must keep exactly four Deqin area calibres, found " + deqinArea.length);
if (new Set(deqinArea.map((row) => row.source_id)).size !== 4) fail("the four area calibres must come from four sources");
if (!deqinArea.some((row) => row.unit === "万亩")) fail("area.csv must retain the 万亩 calibre unmodified");
if (data.yield.some((row) => row.unit !== "吨")) fail("yield.csv units must be tonnes");

for (const row of data.villages) {
  const min = Number(row.elevation_min);
  const max = Number(row.elevation_max);
  const rep = Number(row.elevation_representative);
  if (min > max) fail(row.id + ": elevation_min exceeds elevation_max");
  if (rep < min || rep > max) fail(row.id + ": representative elevation outside range");
  if (min < 1700 || max > 3000) fail(row.id + ": village elevation outside 1700–3000 m");
}
const elevations = data.climate.filter((row) => row.metric === "elevation");
const lowest = Math.min(...elevations.map((row) => Number(row.value_min)));
const highest = Math.max(...elevations.map((row) => Number(row.value_max)));
for (const row of data.villages) {
  if (Number(row.elevation_min) < lowest || Number(row.elevation_max) > highest) {
    fail(row.id + ": village outside the published regional elevation envelope");
  }
}
for (const row of data.climate) {
  if (Number(row.value_min) > Number(row.value_max)) fail(row.id + ": value_min exceeds value_max");
}
if (data.varieties.length !== 16) fail("varieties.csv must contain the published 16 varieties");
if (data.varieties.filter((row) => row.role === "主栽").length !== 1) fail("exactly one variety must be marked 主栽");
if (data.varieties.some((row) => !["红", "白"].includes(row.color))) fail("variety colour must be 红 or 白");
if (data.varieties.some((row) => !["主栽", "少量"].includes(row.role))) fail("variety role must be 主栽 or 少量");

for (const name of ["area", "yield", "climate", "timeline"]) {
  for (const row of data[name]) {
    const year = Number(row.year);
    if (year < 2000 || year > 2026) fail(name + ".csv " + row.id + ": year outside 2000–2026");
  }
}
for (let i = 1; i < data.timeline.length; i += 1) {
  if (Number(data.timeline[i].year) < Number(data.timeline[i - 1].year)) fail("timeline.csv is not chronological");
}
if (data.sources.length !== 7) fail("sources.csv should list the seven cited sources");
if (meta.accessibility_note === undefined) meta.accessibility_note = "示意换算，非模型预测";

if (errors.length) {
  console.error("Data validation failed (" + errors.length + "):");
  errors.forEach((error) => console.error(" - " + error));
  process.exit(1);
}

const payload = {
  meta,
  sources: data.sources,
  area: data.area,
  yield: data.yield,
  villages: data.villages,
  varieties: data.varieties,
  climate: data.climate,
  soils: data.soils,
  timeline: data.timeline,
};

fs.writeFileSync(path.join(root, "data", "bundle.json"), JSON.stringify(payload, null, 2) + "\n");
fs.writeFileSync(
  path.join(root, "src", "data.js"),
  "/* Generated by scripts/build-data.mjs from data/*.csv — do not edit by hand. */\n" +
    "window.ATLAS_DATA = " +
    JSON.stringify(payload, null, 2) +
    ";\n"
);

console.log(
  "Data OK: " + data.sources.length + " sources, " + data.area.length + " area rows, " +
    data.villages.length + " villages, " + data.varieties.length + " varieties."
);
