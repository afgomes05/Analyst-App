export type Team = "home" | "away";
export type EventType =
  | "goal"
  | "shot"
  | "won"
  | "lost"
  | "yellow"
  | "red"
  | "corner"
  | "foul";
export type Player = { number: number; name: string };
export type MatchEvent = {
  id: string;
  type: EventType;
  team: Team;
  seconds: number;
  period: number;
  player: Player | null;
  x: number | null;
  y: number | null;
  outcome: "on" | "off" | null;
  note: string;
  createdAt: string;
};
export type Match = {
  localDemo?: boolean;
  id: string;
  demo: boolean;
  home: string;
  away: string;
  competition: string;
  venue: string;
  round: string;
  events: MatchEvent[];
  players: Record<Team, Player[]>;
  serverNow: number;
  clock: {
    seconds: number;
    running: boolean;
    startedAt: number | null;
    period: number;
  };
};
