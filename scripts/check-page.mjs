#!/usr/bin/env node
/**
 * Headless smoke check: the built page must render every data-driven block,
 * keep sources clickable and the slider converting, with no console errors.
 * Complements the unit tests, which cannot see rendered output.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.CHECK_PORT || 4401);
const baseUrl = `http://127.0.0.1:${port}/`;
const server = spawn(process.execPath, [path.join(root, "scripts", "serve.mjs"), String(port)], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
});
const stop = () => {
  if (!server.killed) server.kill();
};
process.on("exit", stop);

async function waitForServer() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(baseUrl)).ok) return;
    } catch {
      /* retry */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("server did not start");
}

await waitForServer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const errors = [];
page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
page.on("pageerror", (error) => errors.push(error.message));

let failures = 0;
async function check(name, run) {
  try {
    await run();
    console.log("ok   " + name);
  } catch (error) {
    failures += 1;
    console.error("FAIL " + name + ": " + error.message);
  }
}

await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.waitForSelector("#source-body tr");

await check("ten sections present", async () => {
  assert.equal(await page.locator("[data-section]").count(), 10);
});

await check("four area calibres rendered side by side", async () => {
  assert.equal(await page.locator("#area-cards .conflict-card").count(), 4);
});

await check("seven source rows with external links", async () => {
  assert.equal(await page.locator("#source-body tr").count(), 7);
  assert.ok((await page.locator('#source-body a[href^="https://"]').count()) >= 7);
});

await check("sixteen variety rows and one dominant role", async () => {
  assert.equal(await page.locator("#variety-body tr").count(), 16);
  assert.equal(await page.locator("#variety-body tr").filter({ hasText: "主栽" }).count(), 1);
});

await check("profile and map SVGs are drawn", async () => {
  assert.ok((await page.locator("#profile-svg *").count()) > 50);
  assert.equal(await page.locator("#map-svg .map-village").count(), 7);
});

await check("slider converts 3000 m to 14.8 °C", async () => {
  await page.locator("#elevation-slider").fill("3000");
  assert.equal((await page.locator("#temp-value").textContent()).trim(), "14.8");
  assert.equal((await page.locator("#band-chip").textContent()).trim(), "晚熟带");
});

await check("variety search narrows to Syrah", async () => {
  await page.locator("#variety-search").fill("西拉");
  assert.equal(await page.locator("#variety-body tr").count(), 1);
});

await check("source badge opens the popover", async () => {
  await page.locator("#variety-search").fill("");
  await page.locator("#area-cards").scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.locator("#area-cards .source-link").first().click();
  assert.equal(await page.locator("#source-popover").isVisible(), true);
});

await check("no console errors", async () => {
  assert.deepEqual(errors, []);
});

await browser.close();
stop();

console.log(failures ? `${failures} check(s) failed.` : "All page checks passed.");
process.exitCode = failures ? 1 : 0;
