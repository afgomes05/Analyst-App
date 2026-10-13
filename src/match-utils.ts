import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  CornerUpRight,
  RectangleVertical,
  Shield,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { EventType, Match, Team, MatchEvent } from "./types";

export const actions: {
  type: EventType;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { type: "goal", label: "Golo", icon: Trophy, color: "green" },
  { type: "shot", label: "Remate", icon: Target, color: "blue" },
  { type: "won", label: "Bola ganha", icon: ArrowDownLeft, color: "teal" },
  { type: "lost", label: "Bola perdida", icon: ArrowUpRight, color: "rose" },
  {
    type: "yellow",
    label: "Cartão amarelo",
    icon: RectangleVertical,
    color: "amber",
  },
  {
    type: "red",
    label: "Cartão vermelho",
    icon: RectangleVertical,
    color: "red",
  },
  { type: "corner", label: "Canto", icon: CornerUpRight, color: "violet" },
  { type: "foul", label: "Falta", icon: Shield, color: "gray" },
  {
    type: "substitution",
    label: "Substituição",
    icon: ArrowRightLeft,
    color: "teal",
  },
];
export const actionFor = (type: EventType) =>
  actions.find((action) => action.type === type)!;
export const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
export function parseTime(value: string) {
  if (!/^\d{1,3}:[0-5]\d$/.test(value))
    throw new Error("Usa minutos:segundos, por exemplo 32:18.");
  const [minutes, seconds] = value.split(":").map(Number);
  if (minutes * 60 + seconds > 9000)
    throw new Error("O tempo máximo é 150:00.");
  return minutes * 60 + seconds;
}
export function lineupAt(
  match: Match,
  team: Team,
  seconds: number,
  excludeId?: string,
) {
  const active = new Set(
    match.players[team]
      .filter((player) => player.starter)
      .map((player) => player.id),
  );
  for (const event of match.events
    .filter(
      (event) =>
        event.team === team &&
        ["substitution", "red"].includes(event.type) &&
        event.seconds <= seconds &&
        event.id !== excludeId,
    )
    .slice()
    .sort(
      (a, b) => a.seconds - b.seconds || a.createdAt.localeCompare(b.createdAt),
    )) {
    if (event.player) active.delete(event.player.id);
    if (event.type === "substitution" && event.playerIn)
      active.add(event.playerIn.id);
  }
  return match.players[team].filter((player) => active.has(player.id));
}
export function eventDescription(event: MatchEvent, match: Match) {
  if (event.type === "substitution")
    return `${event.player?.number} ${event.player?.name} → ${event.playerIn?.number} ${event.playerIn?.name}`;
  return event.player
    ? `${event.player.number} · ${event.player.name}`
    : match[event.team];
}
export function getStats(match: Match) {
  const count = (type: EventType, side: Team) =>
    match.events.filter((event) => event.type === type && event.team === side)
      .length;
  const shots = (side: Team) => count("shot", side) + count("goal", side);
  const on = (side: Team) =>
    match.events.filter(
      (event) =>
        event.team === side &&
        (event.type === "goal" ||
          (event.type === "shot" && event.outcome === "on")),
    ).length;
  const rows = [
    { label: "Remates", home: shots("home"), away: shots("away") },
    { label: "À baliza", home: on("home"), away: on("away") },
    ...(["won", "lost", "corner", "foul", "yellow", "red"] as const).map(
      (type) => ({
        label:
          actionFor(type).label === "Bola ganha"
            ? "Bolas ganhas"
            : actionFor(type).label === "Bola perdida"
              ? "Bolas perdidas"
              : (
                  {
                    corner: "Cantos",
                    foul: "Faltas",
                    yellow: "Amarelos",
                    red: "Vermelhos",
                  } as Record<string, string>
                )[type],
        home: count(type, "home"),
        away: count(type, "away"),
      }),
    ),
  ];
  return { count, shots, on, rows };
}
export type Shortcuts = Record<EventType | "clock", string>;
export const defaultShortcuts = {
  ...Object.fromEntries(
    actions.map((action, index) => [action.type, String(index + 1)]),
  ),
  clock: "Space",
} as Shortcuts;
export const keyLabel = (key: string) =>
  key === "Space" ? "Espaço" : key ? key.toUpperCase() : "—";
export function shortcutError(shortcuts: Shortcuts) {
  const used = new Map<string, string>();
  for (const [type, key] of Object.entries(shortcuts)) {
    if (!key) continue;
    if (!/^(?:[a-z0-9]|Space)$/.test(key))
      return "Usa uma letra, um número ou Espaço.";
    const label =
      type === "clock" ? "Cronómetro" : actionFor(type as EventType).label;
    if (used.has(key))
      return `O atalho ${keyLabel(key)} está repetido em ${used.get(key)} e ${label}.`;
    used.set(key, label);
  }
  return "";
}
