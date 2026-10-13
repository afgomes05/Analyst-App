import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const index = await readFile(resolve(dist, "index.html"), "utf8");
const scriptPath = index.match(/<script[^>]*src="([^"]+)"/)?.[1];
const stylePath = index.match(/<link[^>]*href="([^"]+\.css)"/)?.[1];
if (!scriptPath || !stylePath)
  throw new Error("Run npm run build before exporting the demonstration.");
const appScript = await readFile(resolve(dist, scriptPath.slice(1)), "utf8");
let css = await readFile(resolve(dist, stylePath.slice(1)), "utf8");
const assets = [
  ...new Set(
    [...css.matchAll(/url\(([^)]+)\)/g)].map((match) =>
      match[1].replace(/^['"]|['"]$/g, ""),
    ),
  ),
];
for (const asset of assets) {
  if (!asset.startsWith("/assets/"))
    throw new Error(`Unsupported external stylesheet asset: ${asset}`);
  const data = await readFile(resolve(dist, asset.slice(1)));
  const mime = extname(asset) === ".woff2" ? "font/woff2" : "font/woff";
  css = css.split(asset).join(`data:${mime};base64,${data.toString("base64")}`);
}
const domain = (await readFile(resolve(root, "server/match.mjs"), "utf8"))
  .replace(
    'import { randomUUID } from "node:crypto";',
    "const randomUUID = () => globalThis.crypto.randomUUID();",
  )
  .replace(/^export /gm, "");
if (/^import\s/m.test(domain))
  throw new Error("The match module has an unsupported browser dependency.");
const runtime = await readFile(
  resolve(root, "scripts/demo-runtime.js"),
  "utf8",
);
const safeScript = (value) => value.replace(/<\/script/gi, "<\\/script");
const favicon = await readFile(resolve(root, "public/favicon.svg"));
const html = `<!doctype html>
<html lang="pt-PT"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="theme-color" content="#f7f8fa"><title>Linha · Demonstração local</title><link rel="icon" href="data:image/svg+xml;base64,${favicon.toString("base64")}"><style>${css}</style></head>
<body><div id="root"></div><script>(() => {${safeScript(domain)}\n${safeScript(runtime)}})();</script><script type="module">${safeScript(appScript)}</script></body></html>`;
await mkdir(resolve(root, "docs"), { recursive: true });
await writeFile(resolve(root, "docs/linha-demo.html"), html);
console.log(
  `Standalone demonstration exported to docs/linha-demo.html (${Math.round(Buffer.byteLength(html) / 1024)} KiB). No server or network access required.`,
);
