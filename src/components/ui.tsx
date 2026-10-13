import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Clock3, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Match, MatchEvent, Team } from "../types";
import { actionFor, eventDescription, formatTime } from "../match-utils";

export function Crest({
  match,
  team,
  small = false,
}: {
  match: Match;
  team: Team;
  small?: boolean;
}) {
  return (
    <span
      className={`crest ${small ? "small" : ""}`}
      style={{ color: match.clubs[team].color }}
      aria-label={`Emblema de ${match[team]}`}
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
export function Brand() {
  return (
    <span className="brand">
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
    </span>
  );
}

export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = ref.current!;
    node.querySelector<HTMLElement>("input,select,button")?.focus();
    function handler(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const elements = Array.from(
          node.querySelectorAll<HTMLElement>(
            'button,input,select,textarea,[tabindex="0"]',
          ),
        ).filter((element) => !element.hasAttribute("disabled"));
        const first = elements[0],
          last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = overflow;
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
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <div className="modal-heading">
          <div>
            <h2 id={id}>{title}</h2>
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

export function Pitch({
  match,
  events = [],
  selectedTeam = "all",
  point,
  onPoint,
}: {
  match: Match;
  events?: MatchEvent[];
  selectedTeam?: Team | "all";
  point?: { x: number; y: number } | null;
  onPoint?: (point: { x: number; y: number }) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null),
    id = useId().replaceAll(":", "");
  const [detail, setDetail] = useState<{
    event: MatchEvent;
    rect: DOMRect;
  } | null>(null);
  const visible = events.filter(
    (event) =>
      event.x != null &&
      (selectedTeam === "all" || event.team === selectedTeam),
  );
  const selected =
    detail && visible.find((event) => event.id === detail.event.id);
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
            id={id}
            width="100"
            height="340"
            patternUnits="userSpaceOnUse"
          >
            <rect width="50" height="340" fill="white" opacity=".025" />
          </pattern>
        </defs>
        <rect width="600" height="340" fill={`url(#${id})`} />
        <g fill="none" stroke="currentColor" strokeWidth="1.3">
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
      {visible.map((event) => (
        <button
          key={event.id}
          type="button"
          className={`pitch-point ${event.type === "goal" ? "goal" : ""}`}
          style={{
            left: `${4 + event.x! * 0.92}%`,
            top: `${6 + event.y! * 0.88}%`,
            color: match.clubs[event.team].color,
          }}
          aria-label={`${formatTime(event.seconds)} ${actionFor(event.type).label} ${eventDescription(event, match)}`}
          aria-describedby={selected?.id === event.id ? `tip-${id}` : undefined}
          onMouseEnter={(e) =>
            setDetail({ event, rect: e.currentTarget.getBoundingClientRect() })
          }
          onMouseLeave={() => setDetail(null)}
          onFocus={(e) =>
            setDetail({ event, rect: e.currentTarget.getBoundingClientRect() })
          }
          onBlur={() => setDetail(null)}
          onClick={(e) =>
            setDetail({ event, rect: e.currentTarget.getBoundingClientRect() })
          }
        >
          <i />
        </button>
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
  return (
    <>
      <div className="pitch-wrap">
        {onPoint ? (
          <button
            ref={ref}
            type="button"
            className="pitch interactive"
            aria-label="Selecionar zona do campo"
            onClick={(event) => {
              const box = ref.current!.getBoundingClientRect();
              onPoint({
                x: Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round(((event.clientX - box.left) / box.width) * 100),
                  ),
                ),
                y: Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round(((event.clientY - box.top) / box.height) * 100),
                  ),
                ),
              });
            }}
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
          <div className="pitch">{content}</div>
        )}
      </div>
      {detail &&
        selected &&
        createPortal(
          <div
            id={`tip-${id}`}
            className="pitch-tooltip"
            role="tooltip"
            style={{
              left: Math.max(
                12,
                Math.min(window.innerWidth - 252, detail.rect.left - 110),
              ),
              top:
                detail.rect.top > 180
                  ? detail.rect.top - 10
                  : detail.rect.bottom + 10,
              transform:
                detail.rect.top > 180 ? "translateY(-100%)" : undefined,
            }}
          >
            <div>
              <strong>{actionFor(selected.type).label}</strong>
              <span>
                <Clock3 size={12} />
                {formatTime(selected.seconds)}
              </span>
            </div>
            <p>
              {match[selected.team]} · {selected.period}.ª parte
            </p>
            <b>{eventDescription(selected, match)}</b>
            {selected.type === "shot" && (
              <p>
                {selected.outcome === "on" ? "À baliza" : "Fora / bloqueado"}
              </p>
            )}
            {selected.note && <p className="tooltip-note">{selected.note}</p>}
          </div>,
          document.body,
        )}
    </>
  );
}

export function FieldLegend({ match }: { match: Match }) {
  return (
    <div className="pitch-legend">
      <span>
        <i className="team-dot home" />
        {match.clubs.home.shortName}
      </span>
      <span>
        <i className="team-dot away" />
        {match.clubs.away.shortName}
      </span>
      <span>
        Ataque casa
        <ArrowRight size={13} />
      </span>
    </div>
  );
}
export function EventRow({
  event,
  match,
  onEdit,
  onDelete,
}: {
  event: MatchEvent;
  match: Match;
  onEdit?: (event: MatchEvent) => void;
  onDelete?: (event: MatchEvent) => void;
}) {
  const action = actionFor(event.type),
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
        <span title={eventDescription(event, match)}>
          {eventDescription(event, match)}
        </span>
        {event.note && <span className="event-note">{event.note}</span>}
      </div>
      <span className={`team-dot ${event.team}`} title={match[event.team]} />
      {onEdit && (
        <button
          className="icon-button"
          aria-label={`Editar ${action.label} aos ${formatTime(event.seconds)}`}
          onClick={() => onEdit(event)}
        >
          <Pencil size={15} />
        </button>
      )}
      {onDelete && (
        <button
          className="icon-button danger-icon"
          aria-label={`Eliminar ${action.label} aos ${formatTime(event.seconds)}`}
          onClick={() => onDelete(event)}
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
