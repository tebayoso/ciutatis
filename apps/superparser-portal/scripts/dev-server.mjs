import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = new URL("../src", import.meta.url).pathname;
const port = Number(process.env.SUPERPARSER_PORTAL_PORT || 4174);
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
]);

createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const file = normalize(join(root, pathname));
  if (!file.startsWith(root) || !existsSync(file)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": types.get(extname(file)) || "application/octet-stream" });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`Superparser portal: http://localhost:${port}`);
});
