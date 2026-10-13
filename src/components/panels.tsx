import {
  Activity,
  ArrowRight,
  ArrowRightLeft,
  Keyboard,
  Pencil,
  Plus,
  Undo2,
  Users,
} from "lucide-react";
import type { EventType, Match, MatchEvent, Player, Team } from "../types";
import {
  actions,
  formatTime,
  getStats,
  keyLabel,
  lineupAt,
  type Shortcuts,
} from "../match-utils";
import { Crest, EventRow, FieldLegend, Pitch } from "./ui";

export function ActionPanel({
  match,
  team,
  onTeam,
  onEvent,
  shortcuts,
  onShortcuts,
  onUndo,
  canUndo,
  disabled,
}: {
  match: Match;
  team: Team;
  onTeam: (team: Team) => void;
  onEvent: (type: EventType) => void;
  shortcuts: Shortcuts;
  onShortcuts: () => void;
  onUndo: () => void;
  canUndo: boolean;
  disabled: boolean;
}) {
  return (
    <section className="panel actions-panel">
      <div className="panel-header">
        <div>
          <h2>Registar evento</h2>
          <p>Uma ação. Um instante. Todo o contexto.</p>
        </div>
        <button className="shortcut-settings" onClick={onShortcuts}>
          <Keyboard size={16} />
          Editar atalhos
        </button>
      </div>
      <div className="team-select">
        {(["home", "away"] as const).map((side) => (
          <button
            key={side}
            className={team === side ? "selected" : ""}
            onClick={() => onTeam(side)}
          >
            <span className={`team-dot ${side}`} />
            {match[side]}
          </button>
        ))}
      </div>
      <div className="action-grid">
        {actions.map((action) => (
          <button
            key={action.type}
            className={`action-button ${action.color} ${action.type === "substitution" ? "substitution-action" : ""}`}
            disabled={disabled}
            onClick={() => onEvent(action.type)}
            aria-label={`Registar ${action.label}`}
          >
            <span className="action-symbol">
              <action.icon size={24} strokeWidth={1.6} />
            </span>
            <span>{action.label}</span>
            <kbd>{keyLabel(shortcuts[action.type])}</kbd>
          </button>
        ))}
      </div>
      <div className="actions-footer">
        <span>
          <Keyboard size={15} />
          Os teus atalhos, sempre à mão.
        </span>
        <button disabled={!canUndo || disabled} onClick={onUndo}>
          <Undo2 size={14} />
          Anular último
        </button>
      </div>
    </section>
  );
}
export function Comparison({ match }: { match: Match }) {
  const { rows } = getStats(match);
  return (
    <div className="comparison">
      <div className="comparison-teams">
        <span>
          <i className="team-dot home" />
          {match.clubs.home.shortName}
        </span>
        <span>
          {match.clubs.away.shortName}
          <i className="team-dot away" />
        </span>
      </div>
      {rows.map((row) => (
        <div className="compare-row" key={row.label}>
          <div className="compare-label">
            <strong>{row.home}</strong>
            <span>{row.label}</span>
            <strong>{row.away}</strong>
          </div>
          <div className="compare-bars">
            <span
              style={{
                width: `${row.home + row.away ? (row.home / (row.home + row.away)) * 100 : 50}%`,
              }}
            />
            <span
              style={{
                width: `${row.home + row.away ? (row.away / (row.home + row.away)) * 100 : 50}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
export function FieldPanel({
  match,
  filter = "all",
}: {
  match: Match;
  filter?: Team | "all";
}) {
  return (
    <section className="panel field-panel">
      <div className="panel-header">
        <div>
          <h2>Onde o jogo acontece</h2>
          <p>Passa sobre uma ação para ver o detalhe.</p>
        </div>
        <span className="count-badge">
          {
            match.events.filter(
              (event) =>
                event.x != null && (filter === "all" || event.team === filter),
            ).length
          }
        </span>
      </div>
      <Pitch match={match} events={match.events} selectedTeam={filter} />
      <FieldLegend match={match} />
    </section>
  );
}
export function Rhythm({ match, seconds }: { match: Match; seconds: number }) {
  return (
    <section className="panel rhythm-panel">
      <div className="panel-header">
        <div>
          <h2>Ritmo do jogo</h2>
          <p>Ações por intervalos de 5 minutos.</p>
        </div>
        <Activity size={18} />
      </div>
      <div
        className="rhythm-chart"
        aria-label="Ações registadas por equipa em blocos de cinco minutos"
      >
        {Array.from(
          { length: Math.min(30, Math.max(7, Math.ceil((seconds + 1) / 300))) },
          (_, index) => {
            const events = match.events.filter(
              (event) =>
                event.seconds >= index * 300 &&
                event.seconds < (index + 1) * 300,
            );
            return (
              <div
                className="rhythm-bucket"
                key={index}
                title={`${index * 5}–${(index + 1) * 5} min: ${events.filter((event) => event.team === "home").length} casa, ${events.filter((event) => event.team === "away").length} fora`}
              >
                <div className="rhythm-half">
                  <span
                    style={{
                      height: `${Math.min(100, events.filter((event) => event.team === "home").length * 22)}%`,
                    }}
                  />
                </div>
                <div className="rhythm-half away">
                  <span
                    style={{
                      height: `${Math.min(100, events.filter((event) => event.team === "away").length * 22)}%`,
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
          <i className="team-dot home" />
          {match.clubs.home.shortName}
        </span>
        <span>
          <i className="team-dot away" />
          {match.clubs.away.shortName}
        </span>
        <span>Volume de registos</span>
      </div>
    </section>
  );
}
export function Feed({
  match,
  filter,
  onFilter,
  onAll,
  onEdit,
}: {
  match: Match;
  filter: Team | "all";
  onFilter: (filter: Team | "all") => void;
  onAll?: () => void;
  onEdit?: (event: MatchEvent) => void;
}) {
  const events = match.events
    .filter((event) => filter === "all" || event.team === filter)
    .slice()
    .sort(
      (a, b) => b.seconds - a.seconds || b.createdAt.localeCompare(a.createdAt),
    );
  return (
    <section className="panel feed-panel">
      <div className="panel-header">
        <div>
          <h2>
            O jogo em direto{" "}
            <span className="live-pill">
              {match.localDemo ? "DEMO" : "LIVE"}
            </span>
          </h2>
          <p>O contexto da última ação.</p>
        </div>
        <Activity size={18} />
      </div>
      <div className="feed-filter">
        {(["all", "home", "away"] as const).map((side) => (
          <button
            key={side}
            className={filter === side ? "active" : ""}
            onClick={() => onFilter(side)}
          >
            {side === "all" ? "Todas" : match.clubs[side].shortName}
          </button>
        ))}
      </div>
      <div className="event-list">
        {events.length ? (
          events
            .slice(0, 6)
            .map((event) => (
              <EventRow
                key={event.id}
                event={event}
                match={match}
                onEdit={onEdit}
              />
            ))
        ) : (
          <div className="empty-state">
            <Activity size={24} />
            <p>Ainda sem eventos.</p>
          </div>
        )}
      </div>
      {onAll && (
        <button className="all-events" onClick={onAll}>
          Ver os {events.length} eventos
          <ArrowRight size={14} />
        </button>
      )}
    </section>
  );
}
export function Squad({
  match,
  seconds,
  onEdit,
  onAdd,
}: {
  match: Match;
  seconds: number;
  onEdit?: (team: Team, player: Player) => void;
  onAdd?: (team: Team) => void;
}) {
  return (
    <div className="squad-grid">
      {(["home", "away"] as const).map((team) => {
        const active = lineupAt(match, team, seconds),
          activeIds = new Set(active.map((player) => player.id));
        const unavailable = new Set(
          match.events
            .filter(
              (event) =>
                event.team === team &&
                event.seconds <= seconds &&
                ["substitution", "red"].includes(event.type),
            )
            .map((event) => event.player?.id),
        );
        const groups = [
          { label: "Em campo", players: active },
          {
            label: "Banco de suplentes",
            players: match.players[team].filter(
              (player) =>
                !activeIds.has(player.id) && !unavailable.has(player.id),
            ),
          },
          {
            label: "Saíram / expulsos",
            players: match.players[team].filter(
              (player) =>
                !activeIds.has(player.id) && unavailable.has(player.id),
            ),
          },
        ];
        return (
          <section className="panel squad-panel" key={team}>
            <div className="panel-header">
              <div className="squad-team-heading">
                <Crest match={match} team={team} small />
                <div>
                  <h2>{match[team]}</h2>
                  <p>
                    {match.players[team].length} jogadores · {active.length} em
                    campo
                  </p>
                </div>
              </div>
              {onAdd && (
                <button
                  className="icon-button"
                  aria-label={`Adicionar jogador ${match[team]}`}
                  onClick={() => onAdd(team)}
                >
                  <Plus size={18} />
                </button>
              )}
            </div>
            {groups
              .filter((group) => group.players.length)
              .map((group) => (
                <div className="roster-group" key={group.label}>
                  <h3>
                    {group.label}
                    <span>{group.players.length}</span>
                  </h3>
                  {group.players.map((player) => (
                    <div className="roster-row" key={player.id}>
                      <span className="player-number">{player.number}</span>
                      <div>
                        <strong>{player.name}</strong>
                        <small>
                          {player.position || "Posição por definir"}
                        </small>
                      </div>
                      <span className="player-event-count">
                        {
                          match.events.filter(
                            (event) =>
                              event.team === team &&
                              (event.player?.id === player.id ||
                                event.playerIn?.id === player.id),
                          ).length
                        }{" "}
                        ações
                      </span>
                      {onEdit && (
                        <button
                          className="icon-button"
                          aria-label={`Editar jogador ${player.name}`}
                          onClick={() => onEdit(team, player)}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
          </section>
        );
      })}
    </div>
  );
}
export function Bench({
  match,
  seconds,
  filter,
  onFilter,
  onSquad,
}: {
  match: Match;
  seconds: number;
  filter: Team | "all";
  onFilter: (team: Team | "all") => void;
  onSquad: () => void;
}) {
  const stats = getStats(match),
    recent = match.events.filter(
      (event) => event.seconds > seconds - 600 && event.seconds <= seconds,
    );
  const substitutions = match.events
    .filter((event) => event.type === "substitution")
    .slice()
    .sort((a, b) => b.seconds - a.seconds);
  return (
    <div className="bench-dashboard">
      <h1 className="sr-only">O jogo, numa visão.</h1>
      <div className="bench-match-header">
        <div className="bench-competition">
          <span className="eyebrow">{match.competition}</span>
          <span>{match.round}</span>
        </div>
        <div className="bench-scoreboard">
          <div className="bench-club">
            <Crest match={match} team="home" small />
            <strong title={match.home}>{match.home}</strong>
          </div>
          <div className="bench-score">
            {stats.count("goal", "home")}
            <span>:</span>
            {stats.count("goal", "away")}
          </div>
          <div className="bench-club away">
            <Crest match={match} team="away" small />
            <strong title={match.away}>{match.away}</strong>
          </div>
        </div>
        <div className="bench-time">
          <strong>{formatTime(seconds)}</strong>
          <span>
            {match.clock.period}.ª parte ·{" "}
            {match.clock.running ? "a decorrer" : "em pausa"}
          </span>
        </div>
      </div>
      <div className="bench-grid">
        <section className="panel bench-comparison-panel">
          <div className="panel-header">
            <div>
              <h2>O jogo em números</h2>
              <p>Eventos registados pela análise.</p>
            </div>
          </div>
          <Comparison match={match} />
          <div className="bench-quick-info">
            <span className="eyebrow">ÚLTIMOS 10 MINUTOS</span>
            <strong>{recent.length} ações registadas</strong>
            <p>
              {
                recent.filter(
                  (event) =>
                    event.team === "home" &&
                    ["shot", "goal"].includes(event.type),
                ).length
              }{" "}
              remates {match.clubs.home.shortName} ·{" "}
              {
                recent.filter(
                  (event) =>
                    event.team === "away" &&
                    ["shot", "goal"].includes(event.type),
                ).length
              }{" "}
              {match.clubs.away.shortName}
            </p>
          </div>
          <button className="bench-roster-button" onClick={onSquad}>
            <Users size={16} />
            Plantéis e banco de suplentes
            <ArrowRight size={14} />
          </button>
        </section>
        <div className="bench-center">
          <FieldPanel match={match} filter={filter} />
          <Rhythm match={match} seconds={seconds} />
          <section className="panel bench-substitutions">
            <div className="panel-header">
              <h2>Substituições</h2>
              <ArrowRightLeft size={17} />
            </div>
            {substitutions.length ? (
              substitutions
                .slice(0, 3)
                .map((event) => (
                  <EventRow key={event.id} event={event} match={match} />
                ))
            ) : (
              <div className="empty-state">
                <p>Ainda sem substituições.</p>
              </div>
            )}
          </section>
        </div>
        <div className="bench-right">
          <Feed match={match} filter={filter} onFilter={onFilter} />
          <div className="bench-lineup">
            <span>
              <i className="team-dot home" />
              {lineupAt(match, "home", seconds).length} em campo
            </span>
            <span>
              <i className="team-dot away" />
              {lineupAt(match, "away", seconds).length} em campo
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
