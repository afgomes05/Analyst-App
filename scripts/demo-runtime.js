// Included only in the downloadable demonstration, never in the server-backed app.
const storageKey = "linha-file-demo-v1";
let localMatch = createMatch();
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved?.id === "demo-match" && saved.clock && Array.isArray(saved.events))
    localMatch = saved;
} catch {
  /* A sandboxed file can still run with in-memory state. */
}
const subscribers = new Set();
const localSnapshot = () => ({
  ...localMatch,
  players,
  serverNow: Date.now(),
  localDemo: true,
});
function saveAndNotify() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(localMatch));
  } catch {
    /* Storage can be unavailable for local files. */
  }
  for (const subscriber of subscribers) subscriber.send();
}
const realFetch = window.fetch.bind(window);
window.fetch = async (input, options = {}) => {
  const url = new URL(
    input instanceof Request ? input.url : input,
    location.href,
  );
  if (!url.pathname.startsWith("/api/")) return realFetch(input, options);
  const method = options.method || "GET";
  try {
    const body = options.body ? JSON.parse(options.body) : {};
    let result;
    if (url.pathname === "/api/health" && method === "GET")
      result = { status: "ok" };
    else if (url.pathname === "/api/match" && method === "GET")
      result = localSnapshot();
    else if (url.pathname === "/api/events" && method === "POST") {
      result = addEvent(localMatch, body);
      saveAndNotify();
    } else if (url.pathname === "/api/clock" && method === "POST") {
      updateClock(localMatch, body);
      saveAndNotify();
      result = localSnapshot();
    } else if (url.pathname.startsWith("/api/events/") && method === "DELETE") {
      const index = localMatch.events.findIndex(
        (event) => event.id === url.pathname.split("/").at(-1),
      );
      if (index < 0) throw new Error("Evento não encontrado.");
      localMatch.events.splice(index, 1);
      saveAndNotify();
      result = localSnapshot();
    } else
      return Response.json(
        { error: "Endpoint não encontrado." },
        { status: 404 },
      );
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
};
const realEventSource = window.EventSource;
window.EventSource = class extends EventTarget {
  onmessage = null;
  onerror = null;
  readyState = 1;
  constructor(url) {
    super();
    if (url !== "/api/live") return new realEventSource(url);
    subscribers.add(this);
    queueMicrotask(() => this.send());
  }
  send() {
    if (this.readyState !== 1) return;
    const message = new MessageEvent("message", {
      data: JSON.stringify(localSnapshot()),
    });
    this.onmessage?.(message);
    this.dispatchEvent(message);
  }
  close() {
    this.readyState = 2;
    subscribers.delete(this);
  }
};
