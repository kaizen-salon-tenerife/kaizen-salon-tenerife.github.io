// Local Windows preview for the built Cloudflare Worker. Vinext's Node static
// cache currently uses Windows path separators for asset URLs.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, relative, extname, isAbsolute } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import worker from "../dist/server/index.js";

const clientRoot = resolve("dist/client");
const portIndex = process.argv.indexOf("--port");
const port = portIndex === -1 ? 3000 : Number(process.argv[portIndex + 1]);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid preview port");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".json": "application/json" };

async function asset(request) {
  const pathname = decodeURIComponent(new URL(request.url).pathname);
  const path = resolve(clientRoot, `.${pathname}`);
  const local = relative(clientRoot, path);
  if (!local || isAbsolute(local) || local.startsWith("..") || local.split(/[\\/]/).some((segment) => segment.startsWith("."))) return new Response(null, { status: 404 });
  try {
    const data = await readFile(path);
    return new Response(request.method === "HEAD" ? null : data, { headers: { "Content-Type": types[extname(path)] ?? "application/octet-stream", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if (["ENOENT", "EISDIR", "ENOTDIR"].includes(error.code)) return new Response(null, { status: 404 });
    throw error;
  }
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    const options = { method: req.method, headers: req.headers };
    if (!["GET", "HEAD"].includes(req.method)) Object.assign(options, { body: Readable.toWeb(req), duplex: "half" });
    const request = new Request(url, options);
    let response = ["GET", "HEAD"].includes(req.method) ? await asset(request) : null;
    // Explicit local QA mode can show synthetic snapshots from the test suite.
    // They live outside dist so they can never enter the deployable artifact.
    if (process.argv.includes("--qa") && ["/__qa/panel", "/__qa/admin"].includes(url.pathname) && req.method === "GET") {
      response = new Response(await readFile(url.pathname.endsWith("admin") ? "outputs/admin-preview.html" : "outputs/panel-preview.html"), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    if (!response || response.status === 404) response = await worker.fetch(request, { ASSETS: { fetch: asset } }, { waitUntil(promise) { promise.catch(() => {}); }, passThroughOnException() {} });
    res.statusCode = response.status;
    for (const [name, value] of response.headers) if (name !== "set-cookie") res.setHeader(name, value);
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader("Set-Cookie", cookies);
    if (response.body && req.method !== "HEAD") await pipeline(Readable.fromWeb(response.body), res);
    else res.end();
  } catch {
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Preview request failed");
  }
}).listen(port, "127.0.0.1", () => console.log(`MB Beauty preview: http://localhost:${port}`));
