import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT || 5173);
const ROOT = process.cwd();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8"
};

createServer((req, res) => {
  const urlPath = new URL(req.url || "/", "http://127.0.0.1").pathname;
  const safePath = normalize(urlPath).replace(/^\/+/g, "");
  let filePath = join(ROOT, safePath || "index.html");

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  if (!existsSync(filePath)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = extname(filePath);
  res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
  createReadStream(filePath).pipe(res);
}).listen(PORT, "127.0.0.1", () => {
  console.log(`[dev-server] http://127.0.0.1:${PORT}`);
});
