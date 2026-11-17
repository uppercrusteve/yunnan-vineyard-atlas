import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CSV = require("../src/csv.js");
export const L = require("../src/lib.js");

export function readCSV(name) {
  return CSV.parse(fs.readFileSync(path.join(root, "data", name + ".csv"), "utf8")).rows;
}

export function readText(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

export const bundle = JSON.parse(readText("data/bundle.json"));
