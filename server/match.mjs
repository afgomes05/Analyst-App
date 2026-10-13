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
    clock: { seconds: 1938, running: false, startedAt: null, period: 1 },
    events: sample.map(([type, team, number, seconds, x, y], index) => ({
      id: `demo-${index}`,
      type,
      team,
      seconds,
      period: 1,
      x,
      y,
      player: players[team].find((p) => p.number === number),
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

export function addEvent(match, input) {
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
      : players[input.team].find((p) => p.number === input.playerNumber);
  if (input.playerNumber != null && !player)
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
    period: match.clock.period,
    player,
    x: input.x ?? null,
    y: input.y ?? null,
    outcome: input.type === "shot" ? (input.outcome ?? "on") : null,
    note: input.note?.trim() ?? "",
    createdAt: new Date().toISOString(),
  };
  match.events.push(event);
  return event;
}
