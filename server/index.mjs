import express from "express";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createMatch,
  addEvent,
  updateEvent,
  deleteEvent,
  updateClock,
  normalizeMatch,
  updateMatch,
  savePlayer,
} from "./match.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataFile = resolve(
  process.env.MATCH_DATA_DIR || resolve(root, ".local"),
  "match.json",
);
await mkdir(dirname(dataFile), { recursive: true });
let match;
try {
  match = JSON.parse(await readFile(dataFile, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  match = createMatch();
}
normalizeMatch(match);
async function persist() {
  await writeFile(`${dataFile}.tmp`, JSON.stringify(match, null, 2));
  await rename(`${dataFile}.tmp`, dataFile);
}
await persist();
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
const clients = new Set();
const snapshot = () => ({ ...match, serverNow: Date.now() });
function broadcast() {
  const message = `data: ${JSON.stringify(snapshot())}\n\n`;
  for (const client of clients) client.write(message);
}
app.get("/api/match", (_req, res) => res.json(snapshot()));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api/live", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
  clients.add(res);
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 15000);
  req.on("close", () => {
    clients.delete(res);
    clearInterval(heartbeat);
  });
});
let queue = Promise.resolve();
function mutate(handler) {
  return (req, res) => {
    queue = queue.then(async () => {
      const before = structuredClone(match);
      try {
        const result = handler(req);
        await persist();
        broadcast();
        res.json(result ?? snapshot());
      } catch (error) {
        match = before;
        const storageError = Boolean(error.code);
        if (storageError) console.error("Could not save match:", error.code);
        res.status(storageError ? 500 : 400).json({
          error: storageError
            ? "Não foi possível guardar o jogo."
            : error.message,
        });
      }
    });
  };
}
app.post(
  "/api/events",
  mutate((req) => addEvent(match, req.body)),
);
app.delete(
  "/api/events/:id",
  mutate((req) => {
    deleteEvent(match, req.params.id);
  }),
);
app.patch(
  "/api/events/:id",
  mutate((req) => updateEvent(match, req.params.id, req.body)),
);
app.patch(
  "/api/match",
  mutate((req) => {
    updateMatch(match, req.body);
  }),
);
app.post(
  "/api/players/:team",
  mutate((req) => savePlayer(match, req.params.team, null, req.body)),
);
app.patch(
  "/api/players/:team/:id",
  mutate((req) => savePlayer(match, req.params.team, req.params.id, req.body)),
);
app.post(
  "/api/clock",
  mutate((req) => {
    updateClock(match, req.body);
  }),
);
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Endpoint não encontrado." }),
);
let vite;
if (process.env.NODE_ENV === "production") {
  app.use(express.static(resolve(root, "dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(resolve(root, "dist/index.html")),
  );
} else {
  const { createServer } = await import("vite");
  vite = await createServer({
    root,
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3000);
// Let Node bind both IPv6 and IPv4 where supported, including both localhost addresses.
const server = app.listen(port, (error) => {
  if (error) {
    console.error(`Linha could not start on port ${port}: ${error.code}`);
    process.exit(1);
  }
  console.log(`Linha server listening on port ${server.address().port}`);
});
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const client of clients) client.end();
  await queue;
  await vite?.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
