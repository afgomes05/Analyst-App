import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Activity,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Focus,
  Grid2X2,
  Keyboard,
  ListOrdered,
  LoaderCircle,
  Moon,
  Pause,
  Pencil,
  Play,
  Plus,
  Radio,
  Settings2,
  Shield,
  SlidersHorizontal,
  Sun,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { EventType, Match, MatchEvent, Player, Team } from "./types";
import {
  actions,
  defaultShortcuts,
  eventDescription,
  formatTime,
  getStats,
  keyLabel,
  parseTime,
  shortcutError,
  type Shortcuts,
} from "./match-utils";
import { Brand, Crest, EventRow, Modal } from "./components/ui";
import {
  EventEditor,
  GameEditor,
  PlayerEditor,
  ShortcutEditor,
  type EventDraft,
} from "./components/editors";
import {
  ActionPanel,
  Bench,
  Feed,
  FieldPanel,
  Rhythm,
  Squad,
} from "./components/panels";

async function request(path: string, body?: unknown, method = "POST") {
  const response = await fetch(`/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Não foi possível concluir a ação.");
  return result;
}
function readPreference(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}
function savePreference(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function savedShortcuts() {
  const saved = readPreference("linha-shortcuts-v1");
  const keys = Object.fromEntries(
    Object.entries(defaultShortcuts).map(([key, value]) => [
      key,
      typeof saved?.[key] === "string" ? saved[key] : value,
    ]),
  ) as Shortcuts;
  return shortcutError(keys) ? { ...defaultShortcuts } : keys;
}

export default function App() {
  const [match, setMatch] = useState<Match | null>(null),
    [connected, setConnected] = useState(false),
    [now, setNow] = useState(Date.now());
  const offset = useRef(0);
  const [view, setView] = useState<"analyst" | "bench">(
    new URLSearchParams(location.search).get("view") === "bench"
      ? "bench"
      : "analyst",
  );
  const [page, setPage] = useState<"match" | "events" | "squad">("match"),
    [team, setTeam] = useState<Team>("home"),
    [filter, setFilter] = useState<Team | "all">("all");
  const [draft, setDraft] = useState<EventDraft | null>(null),
    [dialog, setDialog] = useState<
      "clock" | "help" | "game" | "shortcuts" | "squad" | null
    >(null),
    [playerEditor, setPlayerEditor] = useState<{
      team: Team;
      player?: Player;
    } | null>(null);
  const [shortcuts, setShortcuts] = useState<Shortcuts>(savedShortcuts);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const value = readPreference("linha-theme-v1");
    return value === "dark" || value === "light"
      ? value
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  });
  const [clockInput, setClockInput] = useState(""),
    [busy, setBusy] = useState(false),
    [lastOwn, setLastOwn] = useState<string | null>(null),
    [deleteEvent, setDeleteEvent] = useState<MatchEvent | null>(null),
    [toast, setToast] = useState<{ message: string; error?: boolean } | null>(
      null,
    );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    savePreference("linha-theme-v1", theme);
  }, [theme]);
  useEffect(() => {
    const stream = new EventSource("/api/live");
    stream.onmessage = (event) => {
      const data = JSON.parse(event.data) as Match;
      offset.current = data.serverNow - Date.now();
      setMatch(data);
      setConnected(true);
      setNow(Date.now());
    };
    stream.onerror = () => setConnected(false);
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => {
      stream.close();
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.error ? 7000 : 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  const seconds = match
    ? match.clock.seconds +
      (match.clock.running
        ? Math.max(
            0,
            Math.floor((now + offset.current - match.clock.startedAt!) / 1000),
          )
        : 0)
    : 0;
  function beginEvent(type: EventType = "goal") {
    if (!match) return;
    setDraft({ type, team, seconds, period: match.clock.period });
  }
  async function perform(fn: () => Promise<unknown>, message?: string) {
    if (busy || !connected) return;
    setBusy(true);
    try {
      await fn();
      if (message) setToast({ message });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Ocorreu um erro.",
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        !match ||
        draft ||
        dialog ||
        playerEditor ||
        deleteEvent ||
        view === "bench" ||
        busy ||
        !connected ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.repeat
      )
        return;
      const target = event.target as HTMLElement;
      if (target.closest('input,textarea,select,[contenteditable="true"]'))
        return;
      const key = event.code === "Space" ? "Space" : event.key.toLowerCase();
      if (key === "Space" && target.closest("button")) return;
      const type = Object.entries(shortcuts).find(
        ([, value]) => value && value === key,
      )?.[0];
      if (!type) return;
      event.preventDefault();
      if (type === "clock")
        void perform(() =>
          request("clock", {
            action: match.clock.running ? "pause" : "resume",
          }),
        );
      else beginEvent(type as EventType);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  function changeView(next: "analyst" | "bench") {
    setView(next);
    setPage("match");
    const url = new URL(location.href);
    url.searchParams.set("view", next);
    try {
      history.replaceState(null, "", url);
    } catch {
      /* Sandboxed standalone previews can still switch views. */
    }
  }
  function exportEvents() {
    if (!match) return;
    const rows = [
      [
        "Tempo",
        "Parte",
        "Equipa",
        "Evento",
        "Número",
        "Jogador",
        "Entra",
        "X",
        "Y",
        "Resultado",
        "Nota",
      ],
      ...match.events
        .slice()
        .sort((a, b) => a.seconds - b.seconds)
        .map((event) => [
          formatTime(event.seconds),
          event.period,
          match[event.team],
          actions.find((action) => action.type === event.type)!.label,
          event.player?.number ?? "",
          event.player?.name ?? "",
          event.playerIn
            ? `${event.playerIn.number} ${event.playerIn.name}`
            : "",
          event.x ?? "",
          event.y ?? "",
          event.outcome === "on"
            ? "À baliza"
            : event.outcome === "off"
              ? "Fora"
              : "",
          event.note,
        ]),
    ];
    const cell = (value: unknown) => {
      let text = String(value);
      if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const blob = new Blob(
      ["\uFEFF" + rows.map((row) => row.map(cell).join(";")).join("\r\n")],
      { type: "text/csv;charset=utf-8;" },
    );
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = "linha-eventos.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast({ message: "Registo do jogo exportado." });
  }
  if (!match)
    return (
      <div className="loading-screen">
        <Brand />
        <LoaderCircle size={24} className="spin" />
        <p>A ligar ao jogo…</p>
        <small>Confirma que o servidor está em execução.</small>
      </div>
    );
  const stats = getStats(match),
    events = match.events
      .filter((event) => filter === "all" || event.team === filter)
      .slice()
      .sort(
        (a, b) =>
          b.seconds - a.seconds || b.createdAt.localeCompare(a.createdAt),
      );
  const editEvent = (event: MatchEvent) => setDraft({ ...event });
  const themeButton = (
    <button
      className="icon-button theme-button"
      aria-label={
        theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"
      }
      title={theme === "light" ? "Modo escuro" : "Modo claro"}
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
  const viewSwitch = (
    <div className="view-switch" aria-label="Vista do painel">
      <button
        className={view === "analyst" ? "selected" : ""}
        onClick={() => changeView("analyst")}
      >
        <Focus size={15} />
        Analista
      </button>
      <button
        className={view === "bench" ? "selected" : ""}
        onClick={() => changeView("bench")}
      >
        <Radio size={15} />
        Banco
      </button>
    </div>
  );
  return (
    <div
      className={`app-shell ${view === "bench" ? "is-bench" : ""}`}
      style={
        {
          "--home": match.clubs.home.color,
          "--away": match.clubs.away.color,
        } as CSSProperties
      }
    >
      {view === "analyst" && (
        <aside className="sidebar">
          <button
            className="brand-home"
            onClick={() => setPage("match")}
            aria-label="Linha, início"
          >
            <Brand />
          </button>
          <span className="workspace-label">ESPAÇO DE TRABALHO</span>
          <div className="workspace-team">
            <Crest match={match} team="home" small />
            <div>
              <strong>{match.home}</strong>
              <span>Equipa de análise</span>
            </div>
          </div>
          <span className="nav-label">ANÁLISE</span>
          <nav>
            {(
              [
                { id: "match", label: "Dia de jogo", icon: Grid2X2 },
                {
                  id: "events",
                  label: "Registo de eventos",
                  icon: ListOrdered,
                },
                { id: "squad", label: "Plantel", icon: Users },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? "active" : ""}`}
                onClick={() => setPage(item.id)}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-match">
            <span className="eyebrow">JOGO EM ANÁLISE</span>
            <div>
              <span>{match.clubs.home.shortName}</span>
              <strong>
                {stats.count("goal", "home")} : {stats.count("goal", "away")}
              </strong>
              <span>{match.clubs.away.shortName}</span>
            </div>
            <p>
              {match.clock.period}.ª parte · {formatTime(seconds)}
            </p>
          </div>
          <div className="sidebar-bottom">
            <button className="nav-item" onClick={() => setDialog("game")}>
              <Settings2 size={18} />
              <span>Jogo e clubes</span>
            </button>
            <button className="nav-item" onClick={() => setDialog("help")}>
              <CircleHelp size={18} />
              <span>Guia e atalhos</span>
            </button>
            <div className="profile">
              <span className="profile-avatar">A</span>
              <div>
                <strong>Área do analista</strong>
                <span>
                  {match.localDemo ? "Demonstração local" : "Sessão de análise"}
                </span>
              </div>
            </div>
          </div>
        </aside>
      )}
      <main className={`main ${view === "bench" ? "bench-view" : ""}`}>
        <header className="topbar">
          {view === "analyst" ? (
            <div className="breadcrumbs">
              Análise
              <ChevronRight size={13} />
              <span>
                {page === "match"
                  ? "Dia de jogo"
                  : page === "events"
                    ? "Registo de eventos"
                    : "Plantel"}
              </span>
            </div>
          ) : (
            <Brand />
          )}
          <div className="topbar-tools">
            <span
              className={`connection ${connected ? "" : "offline"}`}
              role="status"
            >
              <i />
              {connected
                ? match.localDemo
                  ? "Demonstração local"
                  : "Ligação em direto"
                : "A reconectar…"}
            </span>
            {view === "bench" && viewSwitch}
            {themeButton}
            {view === "bench" && (
              <button
                className="icon-button"
                aria-label="Exportar eventos em CSV"
                onClick={exportEvents}
              >
                <Download size={17} />
              </button>
            )}
          </div>
        </header>
        {view === "bench" ? (
          <Bench
            match={match}
            seconds={seconds}
            filter={filter}
            onFilter={setFilter}
            onSquad={() => setDialog("squad")}
          />
        ) : (
          <div className="page-content">
            <div className="page-heading">
              <div>
                <span className="eyebrow">CADA DETALHE CONTA</span>
                <h1>
                  {page === "match"
                    ? "O jogo, ao segundo."
                    : page === "events"
                      ? "A história do jogo."
                      : "Quem está em campo."}
                </h1>
                <p>
                  {page === "match"
                    ? "Observa. Regista. Dá contexto ao jogo."
                    : page === "events"
                      ? "Revê, completa ou corrige cada acontecimento."
                      : "Titulares, suplentes e mudanças durante o jogo."}
                </p>
              </div>
              <div className="page-tools">
                {viewSwitch}
                <button
                  className="icon-button export-button"
                  aria-label="Exportar eventos em CSV"
                  onClick={exportEvents}
                >
                  <Download size={18} />
                </button>
              </div>
            </div>
            {match.localDemo && (
              <div className="demo-info">
                <Shield size={16} />
                <span>
                  Demonstração local · eventos apenas neste navegador.
                </span>
              </div>
            )}
            <section className="match-banner" aria-label="Resultado do jogo">
              <div className="match-meta">
                <span className="eyebrow">
                  {match.demo ? "DEMONSTRAÇÃO" : "DIA DE JOGO"}
                </span>
                <strong>{match.competition}</strong>
                <small>{match.round}</small>
              </div>
              <div className="scoreboard">
                <div className="score-team home-team">
                  <div>
                    <strong>{match.home}</strong>
                    <span>Casa</span>
                  </div>
                  <Crest match={match} team="home" />
                </div>
                <div className="score">
                  <div>
                    {stats.count("goal", "home")}
                    <span>:</span>
                    {stats.count("goal", "away")}
                  </div>
                  <span className="period-badge">
                    {match.clock.period}.ª PARTE
                  </span>
                </div>
                <div className="score-team">
                  <Crest match={match} team="away" />
                  <div>
                    <strong>{match.away}</strong>
                    <span>Fora</span>
                  </div>
                </div>
              </div>
              <button
                className="icon-button"
                aria-label="Editar jogo e clubes"
                onClick={() => setDialog("game")}
              >
                <Pencil size={17} />
              </button>
            </section>
            {page === "match" && (
              <>
                <div className="summary-grid">
                  <section className="clock-card">
                    <div>
                      <span className="eyebrow">
                        <i
                          className={`clock-dot ${match.clock.running ? "running" : ""}`}
                        />
                        {match.clock.running
                          ? "JOGO EM CURSO"
                          : "CRONÓMETRO EM PAUSA"}
                      </span>
                      <div className="clock-digits">
                        {formatTime(seconds)}
                        <span>{match.clock.period}.ª parte</span>
                      </div>
                    </div>
                    <div className="clock-controls">
                      <button
                        className="clock-play"
                        aria-label={
                          match.clock.running
                            ? "Pausar cronómetro"
                            : "Iniciar cronómetro"
                        }
                        disabled={busy || !connected}
                        onClick={() =>
                          void perform(() =>
                            request("clock", {
                              action: match.clock.running ? "pause" : "resume",
                            }),
                          )
                        }
                      >
                        {match.clock.running ? (
                          <Pause size={17} fill="currentColor" />
                        ) : (
                          <Play size={17} fill="currentColor" />
                        )}
                      </button>
                      <button
                        className="clock-adjust"
                        aria-label="Ajustar tempo e parte"
                        onClick={() => {
                          setClockInput(formatTime(seconds));
                          setDialog("clock");
                        }}
                      >
                        <SlidersHorizontal size={17} />
                      </button>
                    </div>
                  </section>
                  {[
                    {
                      label: "Remates",
                      value: `${stats.shots("home")} — ${stats.shots("away")}`,
                      icon: Target,
                      footer: `${stats.on("home")} — ${stats.on("away")} à baliza`,
                    },
                    {
                      label: "Bolas ganhas",
                      value: `${stats.count("won", "home")} — ${stats.count("won", "away")}`,
                      icon: Activity,
                      footer: "Recuperações registadas",
                    },
                    {
                      label: "Eventos",
                      value: String(match.events.length).padStart(2, "0"),
                      icon: ListOrdered,
                      footer: "O jogo em detalhe",
                    },
                  ].map((stat) => (
                    <section className="stat-card" key={stat.label}>
                      <div>
                        <span>{stat.label}</span>
                        <stat.icon size={18} />
                      </div>
                      <strong>{stat.value}</strong>
                      <small>{stat.footer}</small>
                    </section>
                  ))}
                </div>
                <div className="workspace-grid">
                  <div className="left-column">
                    <ActionPanel
                      match={match}
                      team={team}
                      onTeam={setTeam}
                      onEvent={beginEvent}
                      shortcuts={shortcuts}
                      onShortcuts={() => setDialog("shortcuts")}
                      disabled={!connected || busy}
                      canUndo={
                        !!lastOwn &&
                        match.events.some((event) => event.id === lastOwn)
                      }
                      onUndo={() =>
                        void perform(async () => {
                          await request(
                            `events/${lastOwn}`,
                            undefined,
                            "DELETE",
                          );
                          setLastOwn(null);
                        }, "Último evento anulado.")
                      }
                    />
                    <FieldPanel match={match} filter={filter} />
                  </div>
                  <div className="right-column">
                    <Feed
                      match={match}
                      filter={filter}
                      onFilter={setFilter}
                      onAll={() => setPage("events")}
                      onEdit={editEvent}
                    />
                    <Rhythm match={match} seconds={seconds} />
                  </div>
                </div>
              </>
            )}
            {page === "events" && (
              <section className="panel full-history">
                <div className="panel-header">
                  <div>
                    <h2>
                      Registo de eventos{" "}
                      <span className="count-badge">{events.length}</span>
                    </h2>
                    <p>Adiciona um acontecimento ou corrige o registo.</p>
                  </div>
                  <div className="history-tools">
                    <button className="secondary-button" onClick={exportEvents}>
                      <Download size={15} />
                      CSV
                    </button>
                    <button
                      className="primary-button"
                      disabled={!connected}
                      onClick={() => beginEvent()}
                    >
                      <Plus size={16} />
                      Adicionar evento
                    </button>
                  </div>
                </div>
                <div className="feed-filter">
                  {(["all", "home", "away"] as const).map((side) => (
                    <button
                      key={side}
                      className={filter === side ? "active" : ""}
                      onClick={() => setFilter(side)}
                    >
                      {side === "all" ? "Todas as ações" : match[side]}
                    </button>
                  ))}
                </div>
                {events.length ? (
                  events.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      match={match}
                      onEdit={editEvent}
                      onDelete={setDeleteEvent}
                    />
                  ))
                ) : (
                  <div className="empty-state">
                    <p>Adiciona o primeiro evento do jogo.</p>
                  </div>
                )}
              </section>
            )}
            {page === "squad" && (
              <Squad
                match={match}
                seconds={seconds}
                onEdit={(team, player) => setPlayerEditor({ team, player })}
                onAdd={(team) => setPlayerEditor({ team })}
              />
            )}
            <footer className="page-footer">
              <span>
                <i className={`save-dot ${connected ? "" : "offline"}`} />
                {connected
                  ? match.localDemo
                    ? "Eventos apenas neste navegador"
                    : "Eventos guardados neste servidor"
                  : "Sem ligação — registo indisponível"}
              </span>
              <span>Feito para quem vê mais jogo.</span>
            </footer>
          </div>
        )}
      </main>
      {draft && (
        <EventEditor
          key={draft.id ?? `${draft.type}-${draft.seconds}`}
          match={match}
          initial={draft}
          onClose={() => setDraft(null)}
          onSave={async (body) => {
            if (!connected) throw new Error("Sem ligação ao jogo.");
            const result = await request(
              draft.id ? `events/${draft.id}` : "events",
              body,
              draft.id ? "PATCH" : "POST",
            );
            if (!draft.id) setLastOwn(result.id);
            setDraft(null);
            setToast({
              message: draft.id ? "Evento atualizado." : "Evento registado.",
            });
          }}
        />
      )}
      {playerEditor && (
        <PlayerEditor
          key={playerEditor.player?.id ?? playerEditor.team}
          match={match}
          team={playerEditor.team}
          player={playerEditor.player}
          onClose={() => setPlayerEditor(null)}
          onSave={async (body) => {
            if (!connected) throw new Error("Sem ligação ao jogo.");
            await request(
              `players/${playerEditor.team}${playerEditor.player ? `/${playerEditor.player.id}` : ""}`,
              body,
              playerEditor.player ? "PATCH" : "POST",
            );
            setPlayerEditor(null);
            setToast({ message: "Jogador guardado." });
          }}
        />
      )}
      {dialog === "game" && (
        <GameEditor
          match={match}
          onClose={() => setDialog(null)}
          onSave={async (body) => {
            if (!connected) throw new Error("Sem ligação ao jogo.");
            await request("match", body, "PATCH");
            setDialog(null);
            setToast({ message: "Jogo e clubes atualizados." });
          }}
        />
      )}
      {dialog === "shortcuts" && (
        <ShortcutEditor
          current={shortcuts}
          onClose={() => setDialog(null)}
          onSave={(keys) => {
            setShortcuts(keys);
            savePreference("linha-shortcuts-v1", keys);
            setDialog(null);
            setToast({ message: "Atalhos personalizados guardados." });
          }}
        />
      )}
      {dialog === "squad" && (
        <Modal
          title="Plantéis e banco de suplentes"
          subtitle="Escalação no instante atual do jogo."
          wide
          onClose={() => setDialog(null)}
        >
          <Squad match={match} seconds={seconds} />
        </Modal>
      )}
      {dialog === "clock" && (
        <Modal
          title="O tempo do jogo"
          subtitle="Acerta o cronómetro com o tempo oficial da partida."
          onClose={() => {
            if (!busy) setDialog(null);
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void perform(async () => {
                await request("clock", {
                  action: "set",
                  seconds: parseTime(clockInput),
                });
                setDialog(null);
              }, "Cronómetro ajustado.");
            }}
          >
            <label>
              Minuto : segundo
              <input
                value={clockInput}
                pattern="[0-9]{1,3}:[0-5][0-9]"
                required
                onChange={(event) => setClockInput(event.target.value)}
              />
            </label>
            <p className="form-hint">
              Mudar de parte preserva o registo. A segunda parte começa em pausa
              aos 45:00.
            </p>
            <div className="period-buttons">
              {[1, 2].map((period) => (
                <button
                  type="button"
                  key={period}
                  className="secondary-button"
                  disabled={match.clock.period === period || busy || !connected}
                  onClick={() =>
                    void perform(async () => {
                      await request("clock", { action: "period", period });
                      setDialog(null);
                    }, "Parte atualizada.")
                  }
                >
                  {period}.ª parte · {period === 1 ? "00:00" : "45:00"}
                </button>
              ))}
            </div>
            <div className="modal-footer">
              <span>
                <Keyboard size={14} />
                {keyLabel(shortcuts.clock)}
              </span>
              <button
                className="primary-button"
                type="submit"
                disabled={busy || !connected}
              >
                <Check size={16} />
                Guardar tempo
              </button>
            </div>
          </form>
        </Modal>
      )}
      {dialog === "help" && (
        <Modal
          title="Menos cliques. Mais jogo."
          subtitle="Os teus atalhos atuais."
          onClose={() => setDialog(null)}
        >
          <div className="help-content">
            <p>
              Escolhe a equipa e a ação. O instante fica capturado. Depois,
              acrescenta o jogador e a zona. No histórico podes adicionar,
              editar ou eliminar eventos.
            </p>
            <div className="shortcut-list">
              {actions.map((action) => (
                <div key={action.type}>
                  <span>{action.label}</span>
                  <kbd>{keyLabel(shortcuts[action.type])}</kbd>
                </div>
              ))}
              <div>
                <span>Cronómetro</span>
                <kbd>{keyLabel(shortcuts.clock)}</kbd>
              </div>
            </div>
            <button
              className="secondary-button"
              onClick={() => setDialog("shortcuts")}
            >
              <Keyboard size={16} />
              Personalizar atalhos
            </button>
            <p>
              Os atalhos ficam desativados enquanto escreves, quando há uma
              janela aberta ou na vista do banco. Os pontos do campo mostram o
              detalhe por rato, toque ou foco do teclado.
            </p>
            <div className="demo-notice">
              <Shield size={18} />
              <p>
                {match.localDemo
                  ? "Esta demonstração guarda os eventos neste navegador. A partilha entre dispositivos requer o servidor da aplicação."
                  : "Esta versão ainda não inclui autenticação nem permissões na API. A vista Banco é de leitura na interface."}
              </p>
            </div>
          </div>
        </Modal>
      )}
      {deleteEvent && (
        <Modal
          title="Eliminar este evento?"
          subtitle={`${formatTime(deleteEvent.seconds)} · ${eventDescription(deleteEvent, match)}. As estatísticas serão recalculadas.`}
          onClose={() => {
            if (!busy) setDeleteEvent(null);
          }}
        >
          <div className="modal-footer">
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => setDeleteEvent(null)}
            >
              Manter evento
            </button>
            <button
              className="danger-button"
              disabled={busy || !connected}
              onClick={() =>
                void perform(async () => {
                  await request(
                    `events/${deleteEvent.id}`,
                    undefined,
                    "DELETE",
                  );
                  setDeleteEvent(null);
                }, "Evento eliminado.")
              }
            >
              <Trash2 size={16} />
              Eliminar evento
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <CircleHelp size={18} /> : <Check size={18} />}
          <span>{toast.message}</span>
          <button
            aria-label="Fechar notificação"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
