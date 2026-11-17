import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readText, root } from "./helpers.js";

const html = readText("index.html");
const css = readText("styles.css");
const app = readText("src/app.js");

describe("page structure", () => {
  it("implements all ten sections", () => {
    const sections = html.match(/data-section="\d{2}"/g) || [];
    expect(sections).toHaveLength(10);
    for (const id of ["hero", "elevation", "map", "area", "varieties", "climate", "erosion", "timeline", "sources", "colophon"]) {
      expect(html).toContain('id="' + id + '"');
    }
  });

  it("has the required slider domain and base", () => {
    expect(html).toContain('min="1600"');
    expect(html).toContain('max="3100"');
    expect(html).toContain('step="10"');
    expect(html).toContain('value="2200"');
    expect(html).toContain("6.5 × (h − 2200)");
  });

  it("marks maps and profiles as schematic in visible copy", () => {
    expect(html).toContain("示意图，非精确边界");
    expect(html).toContain("示意换算");
    expect(html).toContain("不是一张精确地图");
  });

  it("ships the source popover and clickable source table body", () => {
    expect(html).toContain('id="source-popover"');
    expect(html).toContain('id="source-body"');
    expect(html).toContain('id="area-cards"');
  });

  it("provides a skip link and viewport metadata", () => {
    expect(html).toContain('class="skip-link"');
    expect(html).toContain('name="viewport"');
  });
});

describe("offline and no-framework constraints", () => {
  it("loads only local scripts", () => {
    const scripts = Array.from(html.matchAll(/<script[^>]+src="([^"]+)"/g)).map((match) => match[1]);
    expect(scripts.length).toBeGreaterThan(0);
    for (const src of scripts) {
      expect(src.startsWith("http")).toBe(false);
      expect(fs.existsSync(path.join(root, src))).toBe(true);
    }
  });

  it("does not import remote CSS or fonts", () => {
    expect(css).not.toMatch(/@import\s+url\(\s*["']?https?:/);
    expect(html).not.toMatch(/<link[^>]+href="https?:/);
  });

  it("does not use a front-end framework runtime", () => {
    for (const framework of ["react", "vue", "svelte", "jquery", "d3"]) {
      expect(app.toLowerCase()).not.toContain(framework + ".");
    }
  });

  it("checks reduced motion and mobile breakpoints", () => {
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("@media (max-width: 390px)") || expect(css).toContain("@media (max-width: 480px)");
  });
});

describe("documentation and CI", () => {
  it("documents methods, sources and limitations", () => {
    const methods = readText("docs/methods.md");
    expect(methods).toContain("6.5");
    expect(methods).toContain("冲突");
    expect(methods).toContain("示意");
    expect(methods).toContain("局限");
  });

  it("has a real CI workflow that runs tests", () => {
    const ci = readText(".github/workflows/ci.yml");
    expect(ci).toContain("npm test");
    expect(ci).toContain("node-version: 22");
  });
});
