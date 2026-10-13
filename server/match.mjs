import { randomUUID } from "node:crypto";

export const eventTypes = [
  "goal",
  "shot",
  "won",
  "lost",
  "yellow",
  "red",
  "corner",
  "foul",
  "substitution",
];
export const players = {
  home: [
    { number: 1, name: "Diogo Silva" },
    { number: 2, name: "Rui Costa" },
    { number: 3, name: "Tomás Reis" },
    { number: 4, name: "Miguel Santos" },
    { number: 5, name: "André Gomes" },
    { number: 6, name: "João Neves" },
    { number: 7, name: "Pedro Marques" },
    { number: 8, name: "Tiago Lopes" },
    { number: 9, name: "Francisco Alves" },
    { number: 10, name: "Afonso Ferreira" },
    { number: 11, name: "Gonçalo Martins" },
  ],
  away: [
    { number: 1, name: "Bruno Almeida" },
    { number: 2, name: "David Rocha" },
    { number: 3, name: "Nuno Pereira" },
    { number: 4, name: "Luís Mendes" },
    { number: 5, name: "Daniel Sousa" },
    { number: 6, name: "Ricardo Pinto" },
    { number: 7, name: "Hugo Teixeira" },
    { number: 8, name: "Vasco Moreira" },
    { number: 9, name: "Rodrigo Dias" },
    { number: 10, name: "Martim Correia" },
    { number: 11, name: "Diogo Fernandes" },
  ],
};

export function createMatch() {
  const sample = [
    ["won", "home", 6, 162, 35, 40],
    ["shot", "away", 9, 309, 20, 65],
    ["corner", "home", 10, 467, 95, 5],
    ["shot", "home", 9, 481, 84, 42],
    ["goal", "home", 9, 735, 88, 50],
    ["won", "home", 8, 891, 48, 60],
    ["lost", "home", 6, 1050, 54, 35],
    ["shot", "away", 7, 1156, 15, 32],
    ["yellow", "away", 4, 1294, 64, 42],
    ["foul", "home", 3, 1340, 30, 55],
    ["goal", "away", 9, 1552, 12, 48],
    ["won", "away", 6, 1683, 44, 55],
    ["shot", "home", 10, 1756, 81, 65],
    ["corner", "home", 7, 1810, 95, 95],
    ["won", "home", 8, 1894, 57, 42],
    ["shot", "home", 9, 1911, 87, 38],
  ];
  return {
    id: "demo-match",
    demo: true,
    home: "Sporting CP",
    away: "FC Porto",
    competition: "Liga Portugal",
    venue: "Estádio José Alvalade",
    round: "Jornada 12",
    players: initialPlayers(),
    clubs: {
      home: { shortName: "SCP", color: "#3c8160" },
      away: { shortName: "FCP", color: "#7497cc" },
    },
    clock: { seconds: 1938, running: false, startedAt: null, period: 1 },
    events: sample.map(([type, team, number, seconds, x, y], index) => ({
      id: `demo-${index}`,
      type,
      team,
      seconds,
      period: 1,
      x,
      y,
      player: initialPlayers()[team].find((p) => p.number === number),
      outcome: type === "shot" ? (index % 2 === 0 ? "on" : "off") : null,
      note: "",
      createdAt: new Date().toISOString(),
    })),
  };
}

export function clockSeconds(clock, now = Date.now()) {
  return (
    clock.seconds +
    (clock.running
      ? Math.max(0, Math.floor((now - clock.startedAt) / 1000))
      : 0)
  );
}

export function updateClock(match, input, now = Date.now()) {
  if (!["resume", "pause", "set", "period"].includes(input.action))
    throw new Error("Ação de cronómetro inválida.");
  const seconds = clockSeconds(match.clock, now);
  if (
    input.action === "set" &&
    (!Number.isInteger(input.seconds) ||
      input.seconds < 0 ||
      input.seconds > 9000)
  )
    throw new Error("O tempo deve estar entre 00:00 e 150:00.");
  if (input.action === "period" && ![1, 2].includes(input.period))
    throw new Error("Parte inválida.");
  match.clock = {
    seconds:
      input.action === "set"
        ? input.seconds
        : input.action === "period"
          ? input.period === 2
            ? 2700
            : 0
          : seconds,
    running:
      input.action === "resume"
        ? true
        : input.action === "pause" || input.action === "period"
          ? false
          : match.clock.running,
    period: input.action === "period" ? input.period : match.clock.period,
    startedAt: now,
  };
  return match.clock;
}

function buildEvent(match, input) {
  if (
    !eventTypes.includes(input.type) ||
    !["home", "away"].includes(input.team)
  )
    throw new Error("Evento ou equipa inválidos.");
  if (
    !Number.isInteger(input.seconds) ||
    input.seconds < 0 ||
    input.seconds > 9000
  )
    throw new Error("Tempo do evento inválido.");
  if (!["on", "off", null, undefined].includes(input.outcome))
    throw new Error("Resultado do remate inválido.");
  const player =
    input.playerNumber == null
      ? null
      : match.players[input.team].find((p) => p.number === input.playerNumber);
  const chosenPlayer = input.playerId
    ? match.players[input.team].find((p) => p.id === input.playerId)
    : player;
  if ((input.playerNumber != null || input.playerId) && !chosenPlayer)
    throw new Error("Jogador inválido.");
  for (const axis of ["x", "y"])
    if (
      input[axis] != null &&
      (typeof input[axis] !== "number" ||
        !Number.isFinite(input[axis]) ||
        input[axis] < 0 ||
        input[axis] > 100)
    )
      throw new Error("Localização inválida.");
  if ((input.x == null) !== (input.y == null))
    throw new Error("Localização incompleta.");
  if (
    input.note != null &&
    (typeof input.note !== "string" || input.note.length > 300)
  )
    throw new Error("Nota demasiado longa.");
  const event = {
    id: randomUUID(),
    type: input.type,
    team: input.team,
    seconds: input.seconds,
    period: input.period ?? match.clock.period,
    player: chosenPlayer ? { ...chosenPlayer } : null,
    x: input.x ?? null,
    y: input.y ?? null,
    outcome: input.type === "shot" ? (input.outcome ?? "on") : null,
    note: input.note?.trim() ?? "",
    createdAt: new Date().toISOString(),
  };
  if (![1, 2].includes(event.period)) throw new Error("Parte inválida.");
  if (input.type === "substitution") {
    const outgoing = match.players[input.team].find(
      (p) => p.id === input.playerOutId,
    );
    const incoming = match.players[input.team].find(
      (p) => p.id === input.playerInId,
    );
    if (!outgoing || !incoming || outgoing.id === incoming.id)
      throw new Error("Escolhe dois jogadores diferentes para a substituição.");
    event.player = { ...outgoing };
    event.playerIn = { ...incoming };
  }
  return event;
}

function initialPlayers() {
  const benches = {
    home: [
      "Manuel Faria",
      "Salvador Melo",
      "Duarte Lima",
      "José Matos",
      "Henrique Nunes",
      "Simão Carvalho",
      "Rafael Freitas",
    ],
    away: [
      "Alexandre Castro",
      "Gabriel Azevedo",
      "Bernardo Leal",
      "Ivo Ribeiro",
      "Paulo Tavares",
      "Leonardo Cruz",
      "Eduardo Monteiro",
    ],
  };
  return Object.fromEntries(
    ["home", "away"].map((team) => [
      team,
      [
        ...players[team].map((p) => ({
          ...p,
          id: `${team}-${p.number}`,
          starter: true,
          position: p.number === 1 ? "GR" : "",
        })),
        ...benches[team].map((name, index) => ({
          id: `${team}-${12 + index}`,
          number: 12 + index,
          name,
          starter: false,
          position: index === 0 ? "GR" : "",
        })),
      ],
    ]),
  );
}

export function normalizeMatch(match) {
  const defaults = initialPlayers();
  match.players ??= defaults;
  match.clubs ??= {
    home: { shortName: "SCP", color: "#3c8160" },
    away: { shortName: "FCP", color: "#7497cc" },
  };
  for (const team of ["home", "away"]) {
    match.players[team] ??= defaults[team];
    for (const player of match.players[team]) {
      player.id ??= `${team}-${player.number}`;
      player.starter ??= player.number <= 11;
      player.position ??= "";
    }
    for (const event of match.events.filter((e) => e.team === team)) {
      for (const key of ["player", "playerIn"]) {
        if (event[key])
          event[key].id ??= match.players[team].find(
            (p) => p.number === event[key].number,
          )?.id;
      }
    }
  }
  return match;
}

export function lineupAt(
  match,
  team,
  seconds = clockSeconds(match.clock),
  excludeId = null,
) {
  const active = new Set(
    match.players[team].filter((p) => p.starter).map((p) => p.id),
  );
  const changes = match.events
    .filter(
      (e) =>
        e.team === team &&
        ["substitution", "red"].includes(e.type) &&
        e.seconds <= seconds &&
        e.id !== excludeId,
    )
    .slice()
    .sort(
      (a, b) => a.seconds - b.seconds || a.createdAt.localeCompare(b.createdAt),
    );
  for (const event of changes) {
    if (event.player) active.delete(event.player.id);
    if (event.type === "substitution") active.add(event.playerIn.id);
  }
  return match.players[team].filter((p) => active.has(p.id));
}

function validateLineups(match) {
  for (const team of ["home", "away"]) {
    const active = new Set(
      match.players[team].filter((p) => p.starter).map((p) => p.id),
    );
    const unavailable = new Set();
    if (active.size > 11)
      throw new Error("Cada equipa pode ter no máximo onze titulares.");
    const changes = match.events
      .filter(
        (e) => e.team === team && ["substitution", "red"].includes(e.type),
      )
      .slice()
      .sort(
        (a, b) =>
          a.seconds - b.seconds || a.createdAt.localeCompare(b.createdAt),
      );
    for (const event of changes) {
      if (event.type === "red") {
        if (event.player) {
          active.delete(event.player.id);
          unavailable.add(event.player.id);
        }
        continue;
      }
      if (
        !active.has(event.player.id) ||
        active.has(event.playerIn.id) ||
        unavailable.has(event.playerIn.id)
      )
        throw new Error(
          "A substituição é incompatível com o plantel nesse instante. Revê quem sai e quem entra.",
        );
      active.delete(event.player.id);
      unavailable.add(event.player.id);
      active.add(event.playerIn.id);
    }
  }
}

export function addEvent(match, input) {
  normalizeMatch(match);
  const event = buildEvent(match, input);
  const candidate = { ...match, events: [...match.events, event] };
  validateLineups(candidate);
  match.events.push(event);
  return event;
}

export function updateEvent(match, id, input) {
  normalizeMatch(match);
  const index = match.events.findIndex((e) => e.id === id);
  if (index < 0) throw new Error("Evento não encontrado.");
  const original = match.events[index];
  const replacement = {
    ...buildEvent(match, input),
    id: original.id,
    createdAt: original.createdAt,
    updatedAt: new Date().toISOString(),
  };
  const events = match.events.map((e, i) => (i === index ? replacement : e));
  validateLineups({ ...match, events });
  match.events = events;
  return replacement;
}

export function deleteEvent(match, id) {
  if (!match.events.some((e) => e.id === id))
    throw new Error("Evento não encontrado.");
  const events = match.events.filter((e) => e.id !== id);
  validateLineups({ ...match, events });
  match.events = events;
}

function text(value, label, max = 80) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new Error(`${label} inválido.`);
  return value.trim();
}

export function updateMatch(match, input) {
  const replacement = structuredClone(match);
  for (const key of ["home", "away", "competition", "venue", "round"])
    if (key in input) replacement[key] = text(input[key], "Nome", 100);
  if (input.clubs)
    for (const team of ["home", "away"]) {
      const club = input.clubs[team];
      if (!club) continue;
      if (!/^#[a-fA-F0-9]{6}$/.test(club.color))
        throw new Error("Cor do clube inválida.");
      replacement.clubs[team] = {
        shortName: text(club.shortName, "Abreviatura", 5).toUpperCase(),
        color: club.color,
      };
    }
  Object.assign(match, replacement);
  return match;
}

export function savePlayer(match, team, id, input) {
  if (!["home", "away"].includes(team)) throw new Error("Equipa inválida.");
  normalizeMatch(match);
  if (id && !match.players[team].some((p) => p.id === id))
    throw new Error("Jogador não encontrado.");
  if (!Number.isInteger(input.number) || input.number < 1 || input.number > 99)
    throw new Error("O número deve estar entre 1 e 99.");
  if (match.players[team].some((p) => p.number === input.number && p.id !== id))
    throw new Error("Esse número já pertence a outro jogador da equipa.");
  if (typeof input.starter !== "boolean")
    throw new Error("Indica se o jogador é titular.");
  const player = {
    id: id ?? randomUUID(),
    name: text(input.name, "Nome do jogador"),
    number: input.number,
    starter: input.starter,
    position:
      typeof input.position === "string"
        ? input.position.trim().slice(0, 20)
        : "",
  };
  const roster = id
    ? match.players[team].map((p) => (p.id === id ? player : p))
    : [...match.players[team], player];
  if (roster.length > 40)
    throw new Error("O plantel pode ter até 40 jogadores.");
  validateLineups({ ...match, players: { ...match.players, [team]: roster } });
  match.players[team] = roster;
  for (const event of match.events.filter((e) => e.team === team))
    for (const key of ["player", "playerIn"])
      if (event[key]?.id === player.id) event[key] = { ...player };
  return player;
}
