import { useState, type FormEvent } from "react";
import { Check, Keyboard, LoaderCircle, RotateCcw } from "lucide-react";
import { Modal, Pitch } from "./ui";
import {
  actions,
  defaultShortcuts,
  keyLabel,
  lineupAt,
  parseTime,
  formatTime,
  shortcutError,
  type Shortcuts,
} from "../match-utils";
import type { EventType, Match, MatchEvent, Player, Team } from "../types";

export type EventDraft = Partial<MatchEvent> & {
  type: EventType;
  team: Team;
  seconds: number;
  period: number;
};
export function EventEditor({
  match,
  initial,
  onSave,
  onClose,
}: {
  match: Match;
  initial: EventDraft;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const [type, setType] = useState(initial.type),
    [team, setTeam] = useState(initial.team),
    [time, setTime] = useState(formatTime(initial.seconds)),
    [period, setPeriod] = useState(initial.period);
  const [playerId, setPlayerId] = useState(initial.player?.id ?? ""),
    [playerInId, setPlayerInId] = useState(initial.playerIn?.id ?? ""),
    [point, setPoint] = useState(
      initial.x != null ? { x: initial.x, y: initial.y! } : null,
    );
  const [outcome, setOutcome] = useState(initial.outcome ?? "on"),
    [note, setNote] = useState(initial.note ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  let selectedSeconds = initial.seconds;
  try {
    selectedSeconds = parseTime(time);
  } catch {}
  const active = lineupAt(match, team, selectedSeconds, initial.id),
    activeIds = new Set(active.map((player) => player.id));
  const unavailable = new Set(
    match.events
      .filter(
        (event) =>
          event.team === team &&
          event.seconds <= selectedSeconds &&
          event.id !== initial.id &&
          ["substitution", "red"].includes(event.type),
      )
      .map((event) => event.player?.id),
  );
  const bench = match.players[team].filter(
    (player) => !activeIds.has(player.id) && !unavailable.has(player.id),
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onSave({
        type,
        team,
        seconds: parseTime(time),
        period,
        playerId: type === "substitution" ? null : playerId || null,
        playerOutId: playerId,
        playerInId,
        x: point?.x ?? null,
        y: point?.y ?? null,
        outcome: type === "shot" ? outcome : null,
        note,
      });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Não foi possível guardar.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={initial.id ? "Editar evento" : "Adicionar evento"}
      subtitle={
        initial.id
          ? "Corrige o registo. As estatísticas são recalculadas."
          : "O instante foi capturado. Acrescenta o contexto."
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="form-fields">
          <div className="form-row">
            <label>
              Tipo de evento
              <select
                aria-label="Tipo de evento"
                value={type}
                onChange={(event) => {
                  setType(event.target.value as EventType);
                  setPlayerId("");
                  setPlayerInId("");
                }}
              >
                {actions.map((action) => (
                  <option key={action.type} value={action.type}>
                    {action.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Equipa
              <select
                aria-label="Equipa"
                value={team}
                onChange={(event) => {
                  setTeam(event.target.value as Team);
                  setPlayerId("");
                  setPlayerInId("");
                }}
              >
                {(["home", "away"] as const).map((side) => (
                  <option key={side} value={side}>
                    {match[side]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Minuto : segundo
              <input
                aria-label="Tempo do evento"
                required
                pattern="[0-9]{1,3}:[0-5][0-9]"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </label>
            <label>
              Parte
              <select
                aria-label="Parte"
                value={period}
                onChange={(event) => setPeriod(Number(event.target.value))}
              >
                <option value={1}>1.ª parte</option>
                <option value={2}>2.ª parte</option>
              </select>
            </label>
          </div>
          {type === "substitution" ? (
            <>
              <div className="form-row">
                <label>
                  Jogador que sai
                  <select
                    aria-label="Jogador que sai"
                    required
                    value={playerId}
                    onChange={(event) => setPlayerId(event.target.value)}
                  >
                    <option value="">Escolher jogador</option>
                    {active.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.number} · {player.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Jogador que entra
                  <select
                    aria-label="Jogador que entra"
                    required
                    value={playerInId}
                    onChange={(event) => setPlayerInId(event.target.value)}
                  >
                    <option value="">Escolher suplente</option>
                    {bench.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.number} · {player.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="form-hint">
                As opções respeitam quem estava em campo neste instante. Uma
                correção pode afetar substituições posteriores.
              </p>
            </>
          ) : (
            <label>
              Jogador <span className="optional">opcional</span>
              <select
                aria-label="Jogador"
                value={playerId}
                onChange={(event) => setPlayerId(event.target.value)}
              >
                <option value="">Ação da equipa</option>
                {match.players[team].map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.number} · {player.name}
                    {activeIds.has(player.id) ? "" : " · fora de campo"}
                  </option>
                ))}
              </select>
            </label>
          )}
          {type === "shot" && (
            <fieldset className="outcome-field">
              <legend>Resultado do remate</legend>
              <label>
                <input
                  type="radio"
                  checked={outcome === "on"}
                  onChange={() => setOutcome("on")}
                />
                À baliza
              </label>
              <label>
                <input
                  type="radio"
                  checked={outcome === "off"}
                  onChange={() => setOutcome("off")}
                />
                Fora / bloqueado
              </label>
            </fieldset>
          )}
          {type !== "substitution" && (
            <>
              <div className="field-label">
                <span>
                  Zona do campo <span className="optional">opcional</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPoint(null)}
                  disabled={!point}
                >
                  Limpar zona
                </button>
              </div>
              <Pitch match={match} point={point} onPoint={setPoint} />
              <p className="form-hint">
                Clica no local da ação ou usa as setas. A equipa da casa ataca
                para a direita.
              </p>
            </>
          )}
          <label>
            Nota <span className="optional">opcional</span>
            <input
              maxLength={300}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="O detalhe que os números não contam…"
            />
          </label>
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="primary-button" disabled={busy} type="submit">
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Check size={16} />
            )}
            Guardar evento
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function PlayerEditor({
  match,
  team,
  player,
  onSave,
  onClose,
}: {
  match: Match;
  team: Team;
  player?: Player;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(player?.name ?? ""),
    [number, setNumber] = useState(String(player?.number ?? "")),
    [position, setPosition] = useState(player?.position ?? ""),
    [starter, setStarter] = useState(player?.starter ?? false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title={player ? "Editar jogador" : "Adicionar jogador"}
      subtitle={match[team]}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setBusy(true);
          try {
            await onSave({ name, number: Number(number), position, starter });
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "Erro ao guardar.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset className="form-fields" disabled={busy}>
          <label>
            Nome do jogador
            <input
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className="form-row">
            <label>
              Número
              <input
                required
                type="number"
                min={1}
                max={99}
                value={number}
                onChange={(event) => setNumber(event.target.value)}
              />
            </label>
            <label>
              Posição
              <select
                aria-label="Posição"
                value={position}
                onChange={(event) => setPosition(event.target.value)}
              >
                <option value="">Não definida</option>
                {[
                  "GR",
                  "DC",
                  "LD",
                  "LE",
                  "MD",
                  "MC",
                  "MO",
                  "ED",
                  "EE",
                  "PL",
                ].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Escalação inicial
            <select
              aria-label="Escalação inicial"
              value={starter ? "starter" : "bench"}
              onChange={(event) => setStarter(event.target.value === "starter")}
            >
              <option value="starter">Titular</option>
              <option value="bench">Banco de suplentes</option>
            </select>
          </label>
          <p className="form-hint">
            O número deve ser único na equipa. Se já há substituições, a
            escalação inicial tem de continuar compatível com o registo do jogo.
          </p>
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button className="primary-button" type="submit" disabled={busy}>
            <Check size={16} />
            Guardar jogador
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function GameEditor({
  match,
  onSave,
  onClose,
}: {
  match: Match;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
      home: match.home,
      away: match.away,
      competition: match.competition,
      venue: match.venue,
      round: match.round,
      clubs: structuredClone(match.clubs),
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title="Editar jogo e clubes"
      subtitle="Os nomes e as cores atualizam-se em todos os painéis."
      wide
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            await onSave(values);
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "Erro ao guardar.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset className="form-fields" disabled={busy}>
          <div className="club-editor-grid">
            {(["home", "away"] as const).map((team) => (
              <section className="club-editor" key={team}>
                <h3>{team === "home" ? "Clube da casa" : "Clube visitante"}</h3>
                <label>
                  Nome do clube
                  <input
                    aria-label={`Nome do clube ${team === "home" ? "da casa" : "visitante"}`}
                    required
                    maxLength={100}
                    value={values[team]}
                    onChange={(event) =>
                      setValues({ ...values, [team]: event.target.value })
                    }
                  />
                </label>
                <div className="form-row">
                  <label>
                    Abreviatura
                    <input
                      aria-label={`Abreviatura ${team}`}
                      required
                      maxLength={5}
                      value={values.clubs[team].shortName}
                      onChange={(event) =>
                        setValues({
                          ...values,
                          clubs: {
                            ...values.clubs,
                            [team]: {
                              ...values.clubs[team],
                              shortName: event.target.value,
                            },
                          },
                        })
                      }
                    />
                  </label>
                  <label className="color-label">
                    Cor
                    <input
                      aria-label={`Cor ${team}`}
                      type="color"
                      value={values.clubs[team].color}
                      onChange={(event) =>
                        setValues({
                          ...values,
                          clubs: {
                            ...values.clubs,
                            [team]: {
                              ...values.clubs[team],
                              color: event.target.value,
                            },
                          },
                        })
                      }
                    />
                  </label>
                </div>
              </section>
            ))}
          </div>
          {(
            [
              { key: "competition", label: "Competição" },
              { key: "round", label: "Jornada / fase" },
              { key: "venue", label: "Estádio" },
            ] as const
          ).map((field) => (
            <label key={field.key}>
              {field.label}
              <input
                required
                maxLength={100}
                value={values[field.key]}
                onChange={(event) =>
                  setValues({ ...values, [field.key]: event.target.value })
                }
              />
            </label>
          ))}
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button className="primary-button" type="submit" disabled={busy}>
            <Check size={16} />
            Guardar jogo
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ShortcutEditor({
  current,
  onSave,
  onClose,
}: {
  current: Shortcuts;
  onSave: (keys: Shortcuts) => void;
  onClose: () => void;
}) {
  const [keys, setKeys] = useState({ ...current });
  const error = shortcutError(keys);
  return (
    <Modal
      title="Os teus atalhos"
      subtitle="Escolhe uma letra ou um número por ação. Deixa vazio para desativar."
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!error) onSave(keys);
        }}
      >
        <div className="shortcut-editor">
          {actions.map((action) => (
            <label key={action.type}>
              <span>
                <action.icon size={17} />
                {action.label}
              </span>
              <input
                aria-label={`Atalho para ${action.label}`}
                type="text"
                maxLength={1}
                value={keys[action.type].toUpperCase()}
                onChange={(event) =>
                  setKeys({
                    ...keys,
                    [action.type]: event.target.value.toLowerCase(),
                  })
                }
                placeholder="—"
                autoComplete="off"
              />
            </label>
          ))}
          <label>
            <span>
              <Keyboard size={17} />
              Cronómetro
            </span>
            <select
              aria-label="Atalho para cronómetro"
              value={keys.clock}
              onChange={(event) =>
                setKeys({ ...keys, clock: event.target.value })
              }
            >
              <option value="">Sem atalho</option>
              <option value="Space">Espaço</option>
              {"0123456789abcdefghijklmnopqrstuvwxyz".split("").map((key) => (
                <option key={key} value={key}>
                  {keyLabel(key)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setKeys({ ...defaultShortcuts })}
          >
            <RotateCcw size={15} />
            Repor padrão
          </button>
          <button className="primary-button" disabled={!!error} type="submit">
            <Check size={16} />
            Guardar atalhos
          </button>
        </div>
      </form>
    </Modal>
  );
}
