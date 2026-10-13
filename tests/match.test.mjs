import test from "node:test";
import assert from "node:assert/strict";
import {
  createMatch,
  addEvent,
  updateClock,
  clockSeconds,
} from "../server/match.mjs";

test("a captured event keeps its timestamp and selected player while the clock advances", () => {
  const match = createMatch();
  updateClock(match, { action: "resume" }, 10000);
  assert.equal(clockSeconds(match.clock, 15000), 1943);
  const event = addEvent(match, {
    type: "goal",
    team: "home",
    seconds: 1939,
    playerNumber: 9,
    x: 87,
    y: 50,
  });
  assert.equal(event.seconds, 1939);
  assert.equal(event.player.name, "Francisco Alves");
  assert.equal(
    match.events.filter((e) => e.type === "goal" && e.team === "home").length,
    2,
  );
});

test("pausing and resuming preserve elapsed time, and second half starts paused at 45:00", () => {
  const match = createMatch();
  updateClock(match, { action: "resume" }, 10000);
  updateClock(match, { action: "pause" }, 15000);
  assert.equal(clockSeconds(match.clock, 20000), 1943);
  updateClock(match, { action: "resume" }, 20000);
  assert.equal(clockSeconds(match.clock, 23000), 1946);
  updateClock(match, { action: "period", period: 2 }, 24000);
  assert.equal(match.clock.seconds, 2700);
  assert.equal(match.clock.running, false);
  assert.equal(match.clock.period, 2);
  assert.equal(match.events.length, 16);
});

test("invalid input never adds an event or changes the clock", () => {
  const match = createMatch();
  for (const input of [
    { type: "unknown", team: "home", seconds: 100 },
    { type: "shot", team: "home", seconds: -1 },
    { type: "shot", team: "home", seconds: 100, playerNumber: 99 },
    { type: "shot", team: "home", seconds: 100, x: 101, y: 50 },
    { type: "shot", team: "home", seconds: 100, x: 50 },
    { type: "shot", team: "home", seconds: 100, outcome: "invalid" },
  ])
    assert.throws(() => addEvent(match, input));
  assert.equal(match.events.length, 16);
  const clock = structuredClone(match.clock);
  assert.throws(() => updateClock(match, { action: "set", seconds: NaN }));
  assert.throws(() => updateClock(match, { action: "period", period: 3 }));
  assert.deepEqual(match.clock, clock);
});

test("team actions do not require a player or location", () => {
  const match = createMatch();
  const event = addEvent(match, { type: "won", team: "away", seconds: 1938 });
  assert.equal(event.player, null);
  assert.equal(event.x, null);
  assert.equal(event.y, null);
  assert.equal(event.period, 1);
});
