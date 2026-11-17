#!/usr/bin/env node
/**
 * One-click example: replace two data rows with the example versions,
 * rebuild, and optionally restore the originals.
 *
 *   node examples/try-example.mjs            # apply + build
 *   node examples/try-example.mjs --restore  # restore + build
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const backupDir = path.join(os.tmpdir(), "yunnan-vineyard-atlas-example");
const pairs = [
  { data: "area.csv", example: "area-row.csv", id: "area_deqin_2024_xinhua" },
  { data: "villages.csv", example: "village-row.csv", id: "v_mingyong" },
];

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
function build() {
  const result = spawnSync(npm, ["run", "build"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status || 1);
}

fs.mkdirSync(backupDir, { recursive: true });

if (process.argv.includes("--restore")) {
  for (const pair of pairs) {
    const backup = path.join(backupDir, pair.data);
    if (!fs.existsSync(backup)) {
      console.error("No backup for " + pair.data + "; run the example first.");
      process.exit(1);
    }
    fs.copyFileSync(backup, path.join(root, "data", pair.data));
  }
  build();
  console.log("Restored the original rows and rebuilt.");
  process.exit(0);
}

for (const pair of pairs) {
  const dataPath = path.join(root, "data", pair.data);
  fs.copyFileSync(dataPath, path.join(backupDir, pair.data));
  const replacement = fs.readFileSync(path.join(here, pair.example), "utf8").trim();
  const rows = fs.readFileSync(dataPath, "utf8").split(/\r?\n/);
  let replaced = 0;
  const next = rows.map((row) => {
    if (row.startsWith(pair.id + ",")) {
      replaced += 1;
      return replacement;
    }
    return row;
  });
  if (replaced !== 1) {
    console.error("Expected exactly one row starting with '" + pair.id + "', found " + replaced + ".");
    process.exit(1);
  }
  fs.writeFileSync(dataPath, next.join("\n"));
}

build();
console.log("Example rows applied and data rebuilt.");
console.log("Preview with: npm run serve");
console.log("Undo with:   node examples/try-example.mjs --restore");
