import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  CornerUpRight,
  Download,
  Flag,
  Focus,
  Grid2X2,
  Keyboard,
  ListFilter,
  ListOrdered,
  LoaderCircle,
  MapPin,
  Pause,
  Play,
  Plus,
  Radio,
  Shield,
  SlidersHorizontal,
  Target,
  Trash2,
  Trophy,
  Undo2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { EventType, Match, MatchEvent, Team } from "./types";

const actions: {
  type: EventType;
  label: string;
  short: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { type: "goal", label: "Golo", short: "Golo", icon: Trophy, color: "green" },
  {
    type: "shot",
    label: "Remate",
    short: "Remate",
    icon: Target,
    color: "blue",
  },
  {
    type: "won",
    label: "Bola ganha",
    short: "Bola ganha",
    icon: ArrowDownLeft,
    color: "teal",
  },
  {
    type: "lost",
    label: "Bola perdida",
    short: "Bola perdida",
    icon: ArrowUpRight,
    color: "rose",
  },
  {
    type: "yellow",
    label: "Cartão amarelo",
    short: "Amarelo",
    icon: Flag,
    color: "amber",
  },
  {
    type: "red",
    label: "Cartão vermelho",
    short: "Vermelho",
    icon: Flag,
    color: "red",
  },
  {
    type: "corner",
    label: "Canto",
    short: "Canto",
    icon: CornerUpRight,
    color: "violet",
  },
  { type: "foul", label: "Falta", short: "Falta", icon: Shield, color: "gray" },
];
const byType = Object.fromEntries(
  actions.map((action) => [action.type, action]),
) as Record<EventType, (typeof actions)[number]>;
const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

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

function Crest({
  away = false,
  small = false,
}: {
  away?: boolean;
  small?: boolean;
}) {
  return (
    <span
      className={`crest ${away ? "away" : ""} ${small ? "small" : ""}`}
      aria-label={away ? "FC Porto, demonstração" : "Sporting CP, demonstração"}
    >
      <svg viewBox="0 0 48 52" fill="none" aria-hidden="true">
        <path
          d="M7 5h34v23c0 10-9 17-17 21C16 45 7 38 7 28V5Z"
          fill="currentColor"
          fillOpacity=".08"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M15 12v19m9-19v24m9-24v19"
          stroke="currentColor"
          strokeWidth="3"
          opacity=".45"
        />
        <path d="m17 24 7-6 7 6-7 8-7-8Z" fill="currentColor" />
        <path d="M20 24h8" stroke="white" strokeWidth="1.5" />
      </svg>
    </span>
  );
}

function Pitch({
  events = [],
  point,
  onPoint,
  selectedTeam,
  large = false,
}: {
  events?: MatchEvent[];
  point?: { x: number; y: number } | null;
  onPoint?: (point: { x: number; y: number }) => void;
  selectedTeam?: Team | "all";
  large?: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  function select(clientX: number, clientY: number) {
    const box = buttonRef.current!.getBoundingClientRect();
    onPoint?.({
      x: Math.max(
        0,
        Math.min(100, Math.round(((clientX - box.left) / box.width) * 100)),
      ),
      y: Math.max(
        0,
        Math.min(100, Math.round(((clientY - box.top) / box.height) * 100)),
      ),
    });
  }
  const content = (
    <>
      <svg
        className="pitch-lines"
        viewBox="0 0 600 340"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="stripes"
            width="100"
            height="340"
            patternUnits="userSpaceOnUse"
          >
            <rect width="50" height="340" fill="white" opacity=".025" />
          </pattern>
        </defs>
        <rect width="600" height="340" fill="url(#stripes)" />
        <g fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="22" y="20" width="556" height="300" rx="1" />
          <path d="M300 20v300" />
          <circle cx="300" cy="170" r="48" />
          <circle cx="300" cy="170" r="2" fill="currentColor" />
          <path d="M22 86h90v168H22m556-168h-90v168h90M22 129h33v82H22m556-82h-33v82h33" />
          <path d="M112 132a48 48 0 0 1 0 76m376-76a48 48 0 0 0 0 76" />
          <circle cx="84" cy="170" r="2" fill="currentColor" />
          <circle cx="516" cy="170" r="2" fill="currentColor" />
        </g>
      </svg>
      {events
        .filter(
          (event) =>
            event.x != null &&
            (selectedTeam === "all" ||
              !selectedTeam ||
              event.team === selectedTeam),
        )
        .map((event) => (
          <span
            key={event.id}
            className={`pitch-dot ${event.team} ${event.type === "goal" ? "goal" : ""}`}
            style={{
              left: `${4 + event.x! * 0.92}%`,
              top: `${6 + event.y! * 0.88}%`,
            }}
            title={`${formatTime(event.seconds)} · ${byType[event.type].label} · ${event.player?.name ?? "Equipa"}`}
          />
        ))}
      {point && (
        <span
          className="pitch-selection"
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        >
          <Plus size={18} />
        </span>
      )}
    </>
  );
  return onPoint ? (
    <button
      ref={buttonRef}
      type="button"
      className={`pitch interactive ${large ? "large" : ""}`}
      aria-label="Selecionar zona do campo. Use as setas para ajustar e Enter para selecionar o centro."
      onClick={(event) => select(event.clientX, event.clientY)}
      onKeyDown={(event) => {
        const moves: Record<string, [number, number]> = {
          ArrowLeft: [-5, 0],
          ArrowRight: [5, 0],
          ArrowUp: [0, -5],
          ArrowDown: [0, 5],
          Enter: [0, 0],
        };
        if (moves[event.key]) {
          event.preventDefault();
          const [x, y] = moves[event.key];
          onPoint({
            x: Math.max(0, Math.min(100, (point?.x ?? 50) + x)),
            y: Math.max(0, Math.min(100, (point?.y ?? 50) + y)),
          });
        }
      }}
    >
      {content}
    </button>
  ) : (
    <div className={`pitch ${large ? "large" : ""}`}>{content}</div>
  );
}

function Modal({
  children,
  title,
  subtitle,
  onClose,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const node = ref.current!;
    const first = node.querySelector<HTMLElement>("input, select, button");
    first?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const focusable = Array.from(
          node.querySelectorAll<HTMLElement>(
            'button, input, select, textarea, [tabindex="0"]',
          ),
        ).filter((element) => !element.hasAttribute("disabled"));
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-heading">
          <div>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [match, setMatch] = useState<Match | null>(null);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(Date.now());
  const serverOffset = useRef(0);
  const [view, setView] = useState<"analyst" | "bench">(
    new URLSearchParams(location.search).get("view") === "bench"
      ? "bench"
      : "analyst",
  );
  const [page, setPage] = useState<"match" | "events" | "squad">("match");
  const [team, setTeam] = useState<Team>("home");
  const [filter, setFilter] = useState<Team | "all">("all");
  const [draft, setDraft] = useState<{
    type: EventType;
    seconds: number;
    team: Team;
  } | null>(null);
  const [playerNumber, setPlayerNumber] = useState("");
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [outcome, setOutcome] = useState<"on" | "off">("on");
  const [note, setNote] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [dialog, setDialog] = useState<"clock" | "help" | null>(null);
  const [clockInput, setClockInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    error?: boolean;
  } | null>(null);
  const [lastOwn, setLastOwn] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  useEffect(() => {
    const stream = new EventSource("/api/live");
    stream.onmessage = (event) => {
      const data = JSON.parse(event.data) as Match;
      serverOffset.current = data.serverNow - Date.now();
      setMatch(data);
      setConnected(true);
      setNow(Date.now());
    };
    stream.onerror = () => setConnected(false);
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => {
      stream.close();
      clearInterval(timer);
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
            Math.floor(
              (now + serverOffset.current - match.clock.startedAt!) / 1000,
            ),
          )
        : 0)
    : 0;
  function beginEvent(type: EventType) {
    setDraft({ type, seconds, team });
    setEventTime(formatTime(seconds));
    setPlayerNumber("");
    setPoint(null);
    setNote("");
    setOutcome("on");
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
    const onKey = (event: KeyboardEvent) => {
      if (
        !match ||
        draft ||
        dialog ||
        deleteId ||
        view === "bench" ||
        busy ||
        !connected ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.repeat ||
        ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(
          (event.target as HTMLElement).tagName,
        )
      )
        return;
      if (event.key >= "1" && event.key <= "8") {
        event.preventDefault();
        beginEvent(actions[Number(event.key) - 1].type);
      }
      if (event.code === "Space") {
        event.preventDefault();
        void perform(() =>
          request("clock", {
            action: match.clock.running ? "pause" : "resume",
          }),
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  function changeView(next: "analyst" | "bench") {
    setView(next);
    setPage("match");
    const url = new URL(location.href);
    url.searchParams.set("view", next);
    history.replaceState(null, "", url);
  }
  function parseTime(value: string) {
    if (!/^\d{1,3}:[0-5]\d$/.test(value))
      throw new Error("Usa o formato minutos:segundos, por exemplo 32:18.");
    const [minutes, secs] = value.split(":").map(Number);
    const result = minutes * 60 + secs;
    if (result > 9000) throw new Error("O tempo máximo é 150:00.");
    return result;
  }
  function saveEvent(event: FormEvent) {
    event.preventDefault();
    void perform(
      async () => {
        const result = await request("events", {
          ...draft,
          seconds: parseTime(eventTime),
          playerNumber: playerNumber ? Number(playerNumber) : null,
          x: point?.x ?? null,
          y: point?.y ?? null,
          outcome,
          note,
        });
        setLastOwn(result.id);
        setDraft(null);
      },
      match?.localDemo
        ? "Evento registado nesta demonstração."
        : "Evento registado. O banco já está atualizado.",
    );
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
          byType[event.type].label,
          event.player?.number ?? "",
          event.player?.name ?? "",
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
    const escapeCell = (cell: unknown) => {
      let value = String(cell);
      if (/^[=+\-@\t\r]/.test(value)) value = `'${value}`;
      return `"${value.replaceAll('"', '""')}"`;
    };
    const blob = new Blob(
      [
        "\uFEFF" +
          rows.map((row) => row.map(escapeCell).join(";")).join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8;" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "linha-sporting-porto.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast({ message: "Registo do jogo exportado em CSV." });
  }
  if (!match)
    return (
      <div className="loading-screen">
        <span className="brand-symbol">L</span>
        <h1>Linha</h1>
        <LoaderCircle className="spin" size={22} />
        <p>
          {connected ? "A preparar o teu espaço de jogo…" : "A ligar ao jogo…"}
        </p>
        <small>
          Se a ligação falhar, confirma que o servidor está em execução.
        </small>
      </div>
    );
  const count = (type: EventType, side: Team) =>
    match.events.filter((event) => event.type === type && event.team === side)
      .length;
  const shotsOn = (side: Team) =>
    match.events.filter(
      (event) =>
        event.team === side &&
        (event.type === "goal" ||
          (event.type === "shot" && event.outcome === "on")),
    ).length;
  const shots = (side: Team) => count("shot", side) + count("goal", side);
  const events = match.events
    .filter((event) => filter === "all" || event.team === filter)
    .slice()
    .sort(
      (a, b) => b.seconds - a.seconds || b.createdAt.localeCompare(a.createdAt),
    );
  const ownLastExists =
    lastOwn && match.events.some((event) => event.id === lastOwn);
  const recent = match.events.filter(
    (event) => event.seconds > seconds - 600 && event.seconds <= seconds,
  );
  const statRows: { label: string; home: number; away: number }[] = [
    { label: "Remates", home: shots("home"), away: shots("away") },
    { label: "À baliza", home: shotsOn("home"), away: shotsOn("away") },
    {
      label: "Bolas ganhas",
      home: count("won", "home"),
      away: count("won", "away"),
    },
    {
      label: "Bolas perdidas",
      home: count("lost", "home"),
      away: count("lost", "away"),
    },
    {
      label: "Cantos",
      home: count("corner", "home"),
      away: count("corner", "away"),
    },
    {
      label: "Faltas",
      home: count("foul", "home"),
      away: count("foul", "away"),
    },
    {
      label: "Amarelos",
      home: count("yellow", "home"),
      away: count("yellow", "away"),
    },
    {
      label: "Vermelhos",
      home: count("red", "home"),
      away: count("red", "away"),
    },
  ];
  function EventRow({
    event,
    removable = false,
  }: {
    event: MatchEvent;
    removable?: boolean;
  }) {
    if (!match) return null;
    const action = byType[event.type],
      Icon = action.icon;
    return (
      <div className="event-row">
        <span className="event-time">
          {formatTime(event.seconds)}
          <small>{event.period}.ª P</small>
        </span>
        <span className={`event-icon ${action.color}`}>
          <Icon size={17} />
        </span>
        <div className="event-description">
          <strong>
            {action.label}
            {event.type === "shot" && (
              <span className="event-outcome">
                {" "}
                · {event.outcome === "on" ? "à baliza" : "fora"}
              </span>
            )}
          </strong>
          <span>
            {event.player
              ? `${event.player.number} · ${event.player.name}`
              : match[event.team]}
            {event.note && <span className="event-note"> · {event.note}</span>}
          </span>
        </div>
        <span className={`team-dot ${event.team}`} title={match[event.team]} />
        {removable && (
          <button
            className="icon-button delete-button"
            aria-label={`Eliminar ${action.label} aos ${formatTime(event.seconds)}`}
            onClick={() => setDeleteId(event.id)}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    );
  }
  const compare = (
    <div className="comparison">
      {statRows.map((stat) => (
        <div className="compare-row" key={stat.label}>
          <div className="compare-label">
            <strong>{stat.home}</strong>
            <span>{stat.label}</span>
            <strong>{stat.away}</strong>
          </div>
          <div className="compare-bars">
            <span
              style={{
                width: `${stat.home + stat.away ? (stat.home / (stat.home + stat.away)) * 100 : 50}%`,
              }}
            />
            <span
              style={{
                width: `${stat.home + stat.away ? (stat.away / (stat.home + stat.away)) * 100 : 50}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href={match.localDemo ? location.pathname : "/"}
          aria-label="Linha, início"
        >
          <span className="brand-symbol">
            <svg width="21" height="23" viewBox="0 0 24 26" fill="none">
              <path
                d="M4 3v20h17M11 3v13h10"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>
            linha<span className="brand-period">.</span>
          </span>
        </a>
        <span className="workspace-label">ESPAÇO DE TRABALHO</span>
        <div className="workspace-team">
          <Crest small />
          <div>
            <strong>Sporting CP</strong>
            <span>Equipa principal · Demo</span>
          </div>
        </div>
        <span className="nav-label">ANÁLISE</span>
        <nav>
          {(
            [
              { id: "match", label: "Dia de jogo", icon: Grid2X2 },
              { id: "events", label: "Registo de eventos", icon: ListOrdered },
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
              {item.id === "match" && <span className="nav-live-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-match">
          <span className="eyebrow">JOGO EM ANÁLISE</span>
          <div>
            <span>SCP</span>
            <strong>
              {count("goal", "home")} : {count("goal", "away")}
            </strong>
            <span>FCP</span>
          </div>
          <p>
            {match.clock.period}.ª parte <span>·</span> {formatTime(seconds)}
          </p>
        </div>
        <div className="sidebar-bottom">
          <button
            className="nav-item help-button"
            onClick={() => setDialog("help")}
          >
            <CircleHelp size={18} />
            <span>Guia e atalhos</span>
            <Keyboard size={15} />
          </button>
          <div className="profile">
            <div className="profile-avatar">A</div>
            <div>
              <strong>Área do analista</strong>
              <span>Ambiente de demonstração</span>
            </div>
          </div>
        </div>
      </aside>
      <main className={`main ${view === "bench" ? "bench-view" : ""}`}>
        <header className="topbar">
          <div className="breadcrumbs">
            Análise <ChevronRight size={13} />
            <span>
              {page === "match"
                ? "Dia de jogo"
                : page === "events"
                  ? "Registo de eventos"
                  : "Plantel"}
            </span>
          </div>
          <div
            className={`connection ${connected ? "" : "offline"}`}
            role="status"
          >
            <span />
            {connected
              ? match.localDemo
                ? "Demonstração local"
                : "Ligação em direto"
              : "A reconectar…"}
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">CADA DETALHE CONTA</div>
              <h1>
                {page === "match"
                  ? view === "analyst"
                    ? "O jogo, ao segundo."
                    : "O jogo, numa visão."
                  : page === "events"
                    ? "A história do jogo."
                    : "Quem está em campo."}
              </h1>
              <p>
                {page === "match"
                  ? view === "analyst"
                    ? "Observa. Regista. Dá contexto ao jogo."
                    : "Informação clara para decidir no momento certo."
                  : page === "events"
                    ? "Todos os acontecimentos, com o contexto que importa."
                    : "Jogadores de demonstração para testar o fluxo de análise."}
              </p>
            </div>
            <div className="page-tools">
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
              <button
                className="icon-button export-button"
                title="Exportar eventos em CSV"
                aria-label="Exportar eventos em CSV"
                onClick={exportEvents}
              >
                <Download size={18} />
              </button>
            </div>
          </div>
          {match.localDemo && (
            <div className="demo-info" role="note">
              <Shield size={16} />
              <span>
                Demonstração sem servidor. Os eventos ficam apenas neste
                navegador; não são partilhados com outro dispositivo.
              </span>
            </div>
          )}
          <section className="match-banner" aria-label="Resultado do jogo">
            <div className="match-meta">
              <span>
                <span className="demo-dot" />
                DEMONSTRAÇÃO
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
                <Crest />
              </div>
              <div className="score">
                <div>
                  {count("goal", "home")}
                  <span>:</span>
                  {count("goal", "away")}
                </div>
                <span className="period-badge">
                  {match.clock.period}.ª PARTE
                </span>
              </div>
              <div className="score-team">
                <Crest away />
                <div>
                  <strong>{match.away}</strong>
                  <span>Fora</span>
                </div>
              </div>
            </div>
            <div className="venue">
              <MapPin size={14} />
              <span>{match.venue}</span>
            </div>
          </section>
          {page === "match" && (
            <>
              <div className="summary-grid">
                <section className="clock-card">
                  <div className="clock-info">
                    <span className="eyebrow">
                      <span
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
                  {view === "analyst" ? (
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
                        title="Ajustar tempo e parte"
                        aria-label="Ajustar tempo e parte"
                        onClick={() => {
                          setClockInput(formatTime(seconds));
                          setDialog("clock");
                        }}
                      >
                        <SlidersHorizontal size={17} />
                      </button>
                    </div>
                  ) : (
                    <Radio className="bench-clock-icon" size={24} />
                  )}
                </section>
                {[
                  {
                    label: "Remates",
                    value: `${shots("home")} — ${shots("away")}`,
                    icon: Target,
                    footer: `${shotsOn("home")} — ${shotsOn("away")} à baliza`,
                  },
                  {
                    label: "Bolas ganhas",
                    value: `${count("won", "home")} — ${count("won", "away")}`,
                    icon: ArrowDownLeft,
                    footer: "Recuperações registadas",
                  },
                  {
                    label: "Eventos",
                    value: match.events.length.toString().padStart(2, "0"),
                    icon: Activity,
                    footer: "O jogo em detalhe",
                  },
                ].map((stat) => (
                  <section className="stat-card" key={stat.label}>
                    <div>
                      <span>{stat.label}</span>
                      <stat.icon size={17} />
                    </div>
                    <strong>{stat.value}</strong>
                    <small>{stat.footer}</small>
                  </section>
                ))}
              </div>
              <div className="workspace-grid">
                <div className="left-column">
                  {view === "analyst" ? (
                    <section className="panel actions-panel">
                      <div className="panel-header">
                        <div>
                          <h2>Registar evento</h2>
                          <p>Uma ação. Um instante. Todo o contexto.</p>
                        </div>
                        <span className="subtle-icon">
                          <Plus size={18} />
                        </span>
                      </div>
                      <div className="team-select">
                        <button
                          className={team === "home" ? "selected" : ""}
                          onClick={() => setTeam("home")}
                        >
                          <span className="team-dot home" />
                          Sporting CP{team === "home" && <Check size={14} />}
                        </button>
                        <button
                          className={team === "away" ? "selected" : ""}
                          onClick={() => setTeam("away")}
                        >
                          <span className="team-dot away" />
                          FC Porto{team === "away" && <Check size={14} />}
                        </button>
                      </div>
                      <div className="action-grid">
                        {actions.map((action, index) => (
                          <button
                            key={action.type}
                            className={`action-button ${action.color}`}
                            disabled={!connected || busy}
                            onClick={() => beginEvent(action.type)}
                          >
                            <span className="action-symbol">
                              <action.icon size={23} strokeWidth={1.6} />
                            </span>
                            <span>{action.label}</span>
                            <kbd>{index + 1}</kbd>
                          </button>
                        ))}
                      </div>
                      <div className="actions-footer">
                        <span>
                          <Keyboard size={14} />
                          Teclas 1–8 para registar
                        </span>
                        <button
                          disabled={!ownLastExists || busy || !connected}
                          onClick={() =>
                            void perform(async () => {
                              await request(
                                `events/${lastOwn}`,
                                undefined,
                                "DELETE",
                              );
                              setLastOwn(null);
                            }, "Último evento anulado.")
                          }
                        >
                          <Undo2 size={14} />
                          Anular último
                        </button>
                      </div>
                    </section>
                  ) : (
                    <section className="panel bench-comparison">
                      <div className="panel-header">
                        <div>
                          <h2>As duas equipas, lado a lado</h2>
                          <p>Estatísticas dos eventos registados.</p>
                        </div>
                        <SlidersHorizontal size={18} />
                      </div>
                      <div className="comparison-teams">
                        <span>
                          <span className="team-dot home" />
                          Sporting CP
                        </span>
                        <span>
                          FC Porto
                          <span className="team-dot away" />
                        </span>
                      </div>
                      {compare}
                    </section>
                  )}
                  <section className="panel field-panel">
                    <div className="panel-header">
                      <div>
                        <h2>Onde o jogo acontece</h2>
                        <p>Localização dos eventos registados.</p>
                      </div>
                      <span className="field-count">
                        {
                          match.events.filter(
                            (event) =>
                              event.x != null &&
                              (filter === "all" || event.team === filter),
                          ).length
                        }{" "}
                        ações
                      </span>
                    </div>
                    <Pitch events={match.events} selectedTeam={filter} />
                    <div className="pitch-legend">
                      <span>
                        <i className="team-dot home" />
                        Sporting CP
                      </span>
                      <span>
                        <i className="team-dot away" />
                        FC Porto
                      </span>
                      <span className="attack-direction">
                        Ataque SCP
                        <ArrowRight size={14} />
                      </span>
                    </div>
                  </section>
                </div>
                <div className="right-column">
                  <section className="panel feed-panel">
                    <div className="panel-header">
                      <div>
                        <h2>
                          O jogo em direto{" "}
                          <span className="live-pill">
                            <span />
                            {match.localDemo ? "DEMO" : "LIVE"}
                          </span>
                        </h2>
                        <p>Cada ação, à medida que acontece.</p>
                      </div>
                      <button
                        className="icon-button"
                        aria-label="Ver todos os eventos"
                        onClick={() => setPage("events")}
                      >
                        <ListFilter size={18} />
                      </button>
                    </div>
                    <div className="feed-filter">
                      {(["all", "home", "away"] as const).map((side) => (
                        <button
                          key={side}
                          className={filter === side ? "active" : ""}
                          onClick={() => setFilter(side)}
                        >
                          {side === "all"
                            ? "Todas as ações"
                            : side === "home"
                              ? "Sporting CP"
                              : "FC Porto"}
                        </button>
                      ))}
                    </div>
                    <div className="event-list">
                      {events.length ? (
                        events
                          .slice(0, 6)
                          .map((event) => (
                            <EventRow key={event.id} event={event} />
                          ))
                      ) : (
                        <div className="empty-state">
                          <Activity size={23} />
                          <p>Ainda sem eventos para esta equipa.</p>
                        </div>
                      )}
                    </div>
                    <button
                      className="all-events"
                      onClick={() => setPage("events")}
                    >
                      Ver os {events.length} eventos
                      <ArrowRight size={14} />
                    </button>
                  </section>
                  <section className="panel rhythm-panel">
                    <div className="panel-header">
                      <div>
                        <h2>Ritmo do jogo</h2>
                        <p>Eventos por intervalos de 5 minutos.</p>
                      </div>
                      <Activity size={17} />
                    </div>
                    <div
                      className="rhythm-chart"
                      aria-label="Número de eventos por equipa em intervalos de cinco minutos"
                    >
                      {Array.from(
                        {
                          length: Math.min(
                            18,
                            Math.max(7, Math.ceil((seconds + 1) / 300)),
                          ),
                        },
                        (_, index) => {
                          const bucket = match.events.filter(
                            (event) =>
                              event.seconds >= index * 300 &&
                              event.seconds < (index + 1) * 300,
                          );
                          return (
                            <div
                              className="rhythm-bucket"
                              key={index}
                              title={`${index * 5}–${(index + 1) * 5} min: ${bucket.filter((e) => e.team === "home").length} SCP, ${bucket.filter((e) => e.team === "away").length} FCP`}
                            >
                              <div className="rhythm-half">
                                <span
                                  style={{
                                    height: `${Math.min(100, bucket.filter((e) => e.team === "home").length * 22)}%`,
                                  }}
                                />
                              </div>
                              <div className="rhythm-half away">
                                <span
                                  style={{
                                    height: `${Math.min(100, bucket.filter((e) => e.team === "away").length * 22)}%`,
                                  }}
                                />
                              </div>
                              <small>{index * 5}′</small>
                            </div>
                          );
                        },
                      )}
                    </div>
                    <div className="rhythm-footer">
                      <span>
                        <span className="team-dot home" />
                        SCP
                      </span>
                      <span>
                        <span className="team-dot away" />
                        FCP
                      </span>
                      <span>Volume de ações registadas</span>
                    </div>
                  </section>
                  {view === "bench" && (
                    <section className="panel quick-insight">
                      <span className="eyebrow">ÚLTIMOS 10 MINUTOS</span>
                      <h2>{recent.length} ações registadas</h2>
                      <p>
                        {
                          recent.filter(
                            (e) =>
                              e.team === "home" &&
                              (e.type === "shot" || e.type === "goal"),
                          ).length
                        }{" "}
                        remates do Sporting CP ·{" "}
                        {
                          recent.filter(
                            (e) =>
                              e.team === "away" &&
                              (e.type === "shot" || e.type === "goal"),
                          ).length
                        }{" "}
                        do FC Porto.
                      </p>
                    </section>
                  )}
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
                  <p>
                    {view === "analyst"
                      ? "Revê o registo ou elimina um evento incorreto."
                      : "Registo partilhado com a equipa de análise."}
                  </p>
                </div>
                <button className="secondary-button" onClick={exportEvents}>
                  <Download size={15} />
                  Exportar CSV
                </button>
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
                    removable={view === "analyst"}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <ListOrdered size={26} />
                  <p>Os teus próximos eventos aparecem aqui.</p>
                </div>
              )}
            </section>
          )}
          {page === "squad" && (
            <div className="squad-grid">
              {(["home", "away"] as const).map((side) => (
                <section className="panel" key={side}>
                  <div className="panel-header">
                    <div className="squad-team-heading">
                      <Crest small away={side === "away"} />
                      <div>
                        <h2>{match[side]}</h2>
                        <p>Onze inicial · Demonstração</p>
                      </div>
                    </div>
                    <span className="count-badge">11</span>
                  </div>
                  <div className="roster-header">
                    <span>JOGADOR</span>
                    <span>EVENTOS</span>
                  </div>
                  {match.players[side].map((player) => (
                    <div className="roster-row" key={player.number}>
                      <span className="player-number">{player.number}</span>
                      <strong>{player.name}</strong>
                      <span>
                        {
                          match.events.filter(
                            (event) =>
                              event.team === side &&
                              event.player?.number === player.number,
                          ).length
                        }
                      </span>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          )}
          <footer className="page-footer">
            <span>
              <span className={`save-dot ${connected ? "" : "offline"}`} />
              {connected
                ? match.localDemo
                  ? "Eventos apenas neste navegador"
                  : "Eventos guardados neste servidor"
                : "Sem ligação — registo indisponível"}
            </span>
            <span>
              Feito para quem vê mais jogo.
              <span className="footer-line" />
            </span>
          </footer>
        </div>
      </main>
      {draft && (
        <Modal
          title={`Registar ${byType[draft.type].label.toLowerCase()}`}
          subtitle="O instante já foi capturado. Agora, acrescenta contexto."
          onClose={() => {
            if (!busy) setDraft(null);
          }}
        >
          <form onSubmit={saveEvent}>
            <div className="form-row">
              <label>
                Equipa
                <select
                  value={draft.team}
                  onChange={(event) => {
                    setDraft({ ...draft, team: event.target.value as Team });
                    setPlayerNumber("");
                  }}
                >
                  <option value="home">Sporting CP</option>
                  <option value="away">FC Porto</option>
                </select>
              </label>
              <label className="time-label">
                Minuto : segundo
                <input
                  required
                  aria-label="Tempo do evento"
                  pattern="[0-9]{1,3}:[0-5][0-9]"
                  value={eventTime}
                  onChange={(event) => setEventTime(event.target.value)}
                  placeholder="32:18"
                />
              </label>
            </div>
            <label>
              Jogador <span className="optional">opcional</span>
              <select
                value={playerNumber}
                onChange={(event) => setPlayerNumber(event.target.value)}
              >
                <option value="">Ação da equipa</option>
                {match.players[draft.team].map((player) => (
                  <option value={player.number} key={player.number}>
                    {player.number} · {player.name}
                  </option>
                ))}
              </select>
            </label>
            {draft.type === "shot" && (
              <fieldset className="outcome-field">
                <legend>Resultado do remate</legend>
                <label>
                  <input
                    type="radio"
                    name="outcome"
                    checked={outcome === "on"}
                    onChange={() => setOutcome("on")}
                  />
                  À baliza
                </label>
                <label>
                  <input
                    type="radio"
                    name="outcome"
                    checked={outcome === "off"}
                    onChange={() => setOutcome("off")}
                  />
                  Fora / bloqueado
                </label>
              </fieldset>
            )}
            <div className="field-label">
              <span>
                Zona do campo <span className="optional">opcional</span>
              </span>
              {point ? (
                <button type="button" onClick={() => setPoint(null)}>
                  Limpar zona
                </button>
              ) : (
                <span>Clica no local da ação</span>
              )}
            </div>
            <Pitch point={point} onPoint={setPoint} />
            <div className="form-pitch-caption">
              <span>{draft.team === "home" ? "Sporting CP" : "FC Porto"}</span>
              <span>
                Ataque{" "}
                <ArrowRight
                  size={13}
                  style={{
                    transform:
                      draft.team === "away" ? "rotate(180deg)" : undefined,
                  }}
                />
              </span>
            </div>
            <label>
              Nota <span className="optional">opcional</span>
              <input
                value={note}
                maxLength={300}
                onChange={(event) => setNote(event.target.value)}
                placeholder="O detalhe que os números não contam…"
              />
            </label>
            <div className="modal-footer">
              <span>
                <Clock3 size={14} />
                {eventTime} · {match.clock.period}.ª parte
              </span>
              <button
                className="primary-button"
                type="submit"
                disabled={busy || !connected}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Check size={17} />
                )}
                Guardar evento
              </button>
            </div>
          </form>
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
              Ajustar o tempo mantém os eventos existentes. O início da segunda
              parte coloca o cronómetro em 45:00, em pausa.
            </p>
            <div className="period-buttons">
              <button
                type="button"
                className="secondary-button"
                disabled={match.clock.period === 1 || busy || !connected}
                onClick={() =>
                  void perform(async () => {
                    await request("clock", { action: "period", period: 1 });
                    setDialog(null);
                  }, "Primeira parte selecionada.")
                }
              >
                1.ª parte · 00:00
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={match.clock.period === 2 || busy || !connected}
                onClick={() =>
                  void perform(async () => {
                    await request("clock", { action: "period", period: 2 });
                    setDialog(null);
                  }, "Segunda parte pronta.")
                }
              >
                2.ª parte · 45:00
              </button>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDialog(null)}
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                disabled={busy || !connected}
                type="submit"
              >
                Guardar tempo
                <Check size={16} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {dialog === "help" && (
        <Modal
          title="Menos cliques. Mais jogo."
          subtitle="O teu guia rápido para o painel de dia de jogo."
          onClose={() => setDialog(null)}
        >
          <div className="help-content">
            <p>
              Escolhe a equipa e carrega na ação. O tempo fica imediatamente
              capturado. Depois, podes escolher o jogador e marcar a zona no
              campo.
            </p>
            <div className="shortcut-list">
              {actions.map((action, index) => (
                <div key={action.type}>
                  <span>{action.label}</span>
                  <kbd>{index + 1}</kbd>
                </div>
              ))}
              <div>
                <span>Iniciar / pausar cronómetro</span>
                <kbd>Espaço</kbd>
              </div>
              <div>
                <span>Fechar janela</span>
                <kbd>Esc</kbd>
              </div>
            </div>
            <p>
              A vista <strong>Banco</strong> recebe os eventos do mesmo servidor
              em direto. Os atalhos funcionam quando não tens um campo ou botão
              selecionado.
            </p>
            <div className="demo-notice">
              <Shield size={18} />
              <p>
                Este é um protótipo com dados de demonstração, sem autenticação.
                Equipas, plantéis e direções de ataque são exemplos. Para
                utilização real por vários clubes, precisamos de sessões de
                jogo, permissões e acesso seguro.
              </p>
            </div>
          </div>
        </Modal>
      )}
      {deleteId && (
        <Modal
          title="Eliminar este evento?"
          subtitle="O resultado e as estatísticas serão recalculados nas duas vistas."
          onClose={() => {
            if (!busy) setDeleteId(null);
          }}
        >
          <div className="modal-footer">
            <button
              className="secondary-button"
              onClick={() => setDeleteId(null)}
              disabled={busy}
            >
              Manter evento
            </button>
            <button
              className="danger-button"
              disabled={busy || !connected}
              onClick={() =>
                void perform(async () => {
                  await request(`events/${deleteId}`, undefined, "DELETE");
                  setDeleteId(null);
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
