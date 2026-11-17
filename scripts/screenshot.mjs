#!/usr/bin/env node
/**
 * Capture real page screenshots with Playwright.
 * Starts the local server itself, waits for the data-driven sections to
 * render, then writes PNGs to docs/screenshots/.
 *
 * Usage: npm run screenshot [-- --port 4399]
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "screenshots");
const portIndex = process.argv.indexOf("--port");
const port = Number(portIndex > -1 ? process.argv[portIndex + 1] : process.env.SHOT_PORT || 4399);
const baseUrl = `http://127.0.0.1:${port}/`;

fs.mkdirSync(outDir, { recursive: true });

const server = spawn(process.execPath, [path.join(root, "scripts", "serve.mjs"), String(port)], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
});

const stopServer = () => {
  if (!server.killed) server.kill();
};
process.on("exit", stopServer);
process.on("SIGINT", () => {
  stopServer();
  process.exit(130);
});

async function waitForServer() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Server did not start on " + baseUrl);
}

await waitForServer();

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});

const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.waitForSelector("#source-body tr");
await page.waitForSelector("#area-cards .conflict-card");
await page.waitForSelector("#variety-body tr");
await page.waitForFunction(() => document.fonts.status === "loaded");
await page.waitForTimeout(400);

await page.screenshot({ path: path.join(outDir, "hero-1440.png"), animations: "disabled" });
await page.screenshot({ path: path.join(outDir, "full-page-1440.png"), fullPage: true, animations: "disabled" });

await page.locator("#area").scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, -72));
await page.waitForTimeout(250);
await page.addStyleTag({ content: ".site-header, .skip-link { display: none !important; }" });
await page.locator("#area").screenshot({ path: path.join(outDir, "area-conflict-1440.png"), animations: "disabled" });

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
});
await mobile.goto(baseUrl, { waitUntil: "networkidle" });
await mobile.waitForSelector("#area-cards .conflict-card");
await mobile.waitForFunction(() => document.fonts.status === "loaded");
await mobile.waitForTimeout(400);
const mobileOverflow = await mobile.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth
);
await mobile.screenshot({ path: path.join(outDir, "mobile-390.png"), fullPage: true, animations: "disabled" });

await browser.close();
stopServer();

if (mobileOverflow > 1) {
  console.error(`Horizontal overflow at 390 px: ${mobileOverflow}px`);
  process.exitCode = 1;
}

const outputs = [
  "hero-1440.png",
  "full-page-1440.png",
  "area-conflict-1440.png",
  "mobile-390.png",
].map((name) => path.join(outDir, name));
for (const file of outputs) {
  const { size } = fs.statSync(file);
  console.log(`${file} (${size} bytes)`);
}
if (consoleErrors.length) {
  console.error("Console errors:");
  for (const error of consoleErrors) console.error(" - " + error);
  process.exitCode = 1;
}
