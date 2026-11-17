#!/usr/bin/env node
/**
 * Zero-dependency static server for the atlas.
 * The page also works from file://; this server is for local preview and
 * for the screenshot script, where the CSV refresh path needs real HTTP.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || process.argv[2] || 4173);
const host = process.env.HOST || "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function resolveSafe(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const file = path.resolve(root, relative);
  return file.startsWith(root) ? file : null;
}

const server = http.createServer((request, response) => {
  const file = resolveSafe(request.url || "/");
  if (!file) {
    response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    response.end("403 Forbidden");
    return;
  }
  fs.stat(file, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("404 Not Found: " + request.url);
      return;
    }
    const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, {
      "content-type": type,
      "cache-control": "no-cache",
      "x-content-type-options": "nosniff",
    });
    fs.createReadStream(file).pipe(response);
  });
});

server.listen(port, host, () => {
  console.log(`Serving ${root}`);
  console.log(`Open http://${host}:${port}/`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
