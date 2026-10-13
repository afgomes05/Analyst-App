import test from "node:test";
import assert from "node:assert/strict";
import {
  addEvent,
  createMatch,
  deleteEvent,
  lineupAt,
  normalizeMatch,
  savePlayer,
  updateEvent,
  updateMatch,
} from "../server/match.mjs";

test("editing an event preserves its identity and can correct type, time, team, player and location", () => {
  const match = createMatch(),
    original = match.events.find(
      (event) => event.type === "goal" && event.team === "home",
    );
  const corrected = updateEvent(match, original.id, {
    type: "shot",
    team: "away",
    seconds: 800,
    period: 2,
    playerId: "away-7",
    outcome: "off",
    x: 22,
    y: 43,
    note: "Correção",
  });
  assert.equal(corrected.id, original.id);
  assert.equal(corrected.createdAt, original.createdAt);
  assert.equal(corrected.player.name, "Hugo Teixeira");
  assert.equal(corrected.period, 2);
  assert.equal(corrected.x, 22);
  assert.equal(
    match.events.filter(
      (event) => event.type === "goal" && event.team === "home",
    ).length,
    0,
  );
});

test("a substitution updates the lineup at its timestamp and undo restores the original lineup", () => {
  const match = createMatch();
  const event = addEvent(match, {
    type: "substitution",
    team: "home",
    seconds: 2000,
    playerOutId: "home-9",
    playerInId: "home-12",
  });
  assert.ok(
    lineupAt(match, "home", 1999).some((player) => player.id === "home-9"),
  );
  assert.ok(
    !lineupAt(match, "home", 2000).some((player) => player.id === "home-9"),
  );
  assert.ok(
    lineupAt(match, "home", 2000).some((player) => player.id === "home-12"),
  );
  updateEvent(match, event.id, {
    type: "substitution",
    team: "home",
    seconds: 2000,
    playerOutId: "home-9",
    playerInId: "home-13",
  });
  assert.ok(
    lineupAt(match, "home", 2000).some((player) => player.id === "home-13"),
  );
  assert.ok(
    !lineupAt(match, "home", 2000).some((player) => player.id === "home-12"),
  );
  deleteEvent(match, event.id);
  assert.equal(lineupAt(match, "home", 2000).length, 11);
  assert.ok(
    lineupAt(match, "home", 2000).some((player) => player.id === "home-9"),
  );
});

test("invalid substitutions and edits that break subsequent changes are rejected atomically", () => {
  const match = createMatch(),
    initial = JSON.stringify(match.events);
  assert.throws(() =>
    addEvent(match, {
      type: "substitution",
      team: "home",
      seconds: 2000,
      playerOutId: "home-12",
      playerInId: "home-13",
    }),
  );
  assert.equal(JSON.stringify(match.events), initial);
  const first = addEvent(match, {
    type: "substitution",
    team: "home",
    seconds: 2000,
    playerOutId: "home-9",
    playerInId: "home-12",
  });
  addEvent(match, {
    type: "substitution",
    team: "home",
    seconds: 2100,
    playerOutId: "home-12",
    playerInId: "home-13",
  });
  const before = JSON.stringify(match.events);
  assert.throws(() => deleteEvent(match, first.id));
  assert.throws(() =>
    updateEvent(match, first.id, {
      type: "substitution",
      team: "home",
      seconds: 2200,
      playerOutId: "home-9",
      playerInId: "home-12",
    }),
  );
  assert.equal(JSON.stringify(match.events), before);
});

test("player edits preserve identity and update historical labels; duplicate shirt numbers are rejected", () => {
  const match = createMatch();
  savePlayer(match, "home", "home-9", {
    name: "Novo Avançado",
    number: 29,
    starter: true,
    position: "PL",
  });
  assert.equal(
    match.events.find((event) => event.type === "goal" && event.team === "home")
      .player.name,
    "Novo Avançado",
  );
  assert.equal(
    match.events.find((event) => event.type === "goal" && event.team === "home")
      .player.id,
    "home-9",
  );
  const before = JSON.stringify(match);
  assert.throws(() =>
    savePlayer(match, "home", "home-9", {
      name: "Outro",
      number: 8,
      starter: true,
    }),
  );
  assert.equal(JSON.stringify(match), before);
  const player = savePlayer(match, "home", null, {
    name: "Novo Suplente",
    number: 30,
    starter: false,
    position: "MC",
  });
  assert.ok(player.id);
  assert.equal(match.players.home.length, 19);
});

test("match and club edits validate all fields before changing the match", () => {
  const match = createMatch();
  updateMatch(match, {
    home: "Clube da Casa",
    away: "Visitantes",
    competition: "Taça",
    clubs: { home: { shortName: "CAS", color: "#224466" } },
  });
  assert.equal(match.home, "Clube da Casa");
  assert.equal(match.clubs.home.color, "#224466");
  const before = JSON.stringify(match);
  assert.throws(() =>
    updateMatch(match, {
      home: "Um Nome",
      clubs: { away: { shortName: "VIS", color: "invalid" } },
    }),
  );
  assert.equal(JSON.stringify(match), before);
});

test("legacy saved matches gain benches and stable player ids without losing their events or clock", () => {
  const match = createMatch(),
    seconds = match.clock.seconds,
    count = match.events.length;
  delete match.players;
  delete match.clubs;
  for (const event of match.events) if (event.player) delete event.player.id;
  normalizeMatch(match);
  assert.equal(
    match.players.home.filter((player) => !player.starter).length,
    7,
  );
  assert.equal(match.events.length, count);
  assert.equal(match.clock.seconds, seconds);
  assert.equal(match.events[0].player.id, "home-6");
});

test("a dismissed player leaves the active lineup and cannot be substituted off later", () => {
  const match = createMatch();
  addEvent(match, {
    type: "red",
    team: "home",
    seconds: 2000,
    playerId: "home-3",
  });
  assert.equal(lineupAt(match, "home", 2000).length, 10);
  assert.throws(() =>
    addEvent(match, {
      type: "substitution",
      team: "home",
      seconds: 2001,
      playerOutId: "home-3",
      playerInId: "home-12",
    }),
  );
});

test("a player who was substituted off cannot re-enter in a later substitution", () => {
  const match = createMatch();
  addEvent(match, {
    type: "substitution",
    team: "home",
    seconds: 2000,
    playerOutId: "home-9",
    playerInId: "home-12",
  });
  assert.throws(() =>
    addEvent(match, {
      type: "substitution",
      team: "home",
      seconds: 2100,
      playerOutId: "home-8",
      playerInId: "home-9",
    }),
  );
  assert.equal(
    match.events.filter((event) => event.type === "substitution").length,
    1,
  );
});
