import type { GameEvent, GameEventType, RoundReport, Side } from "@utopia/engine";

/** What an island lost during a year, beyond what its year-end report says. */
export interface Losses {
  /** Buildings the weather destroyed. */
  readonly buildings: number;
  /** Boats sunk, anchored or under way. */
  readonly boats: number;
  /** Rebels the rival bought and landed here. */
  readonly rebelsSent: number;
}

export interface YearRecord {
  readonly year: number;
  readonly reports: Readonly<Record<Side, RoundReport>>;
  readonly losses: Readonly<Record<Side, Losses>>;
}

type Tally = Record<Side, { buildings: number; boats: number; rebelsSent: number }>;
type EventOf<T extends GameEventType> = Extract<GameEvent, { type: T }>;

/** How each kind of event adds to the year's tally. */
const COUNTED: { readonly [T in GameEventType]?: (tally: Tally, event: EventOf<T>) => void } = {
  itemSmitten: (tally, event) => (tally[event.side].buildings += 1),
  boatWrecked: (tally, event) => (tally[event.side].boats += 1),
  pilotSinking: (tally, event) => (tally[event.side].boats += 1),
  rebelsLanded: (tally, event) => {
    if (event.cause === "bought") tally[event.side].rebelsSent += 1;
  },
};

/** The game's years as they pass: each one's report, and what each island lost along the way. */
export class YearLog {
  private readonly past: YearRecord[] = [];
  private tally: Tally = freshTally();

  record(event: GameEvent): void {
    if (event.type === "roundEnded") return this.closeYear(event);
    const count = COUNTED[event.type] as ((tally: Tally, event: GameEvent) => void) | undefined;
    count?.(this.tally, event);
  }

  years(): readonly YearRecord[] {
    return this.past;
  }

  private closeYear(event: EventOf<"roundEnded">): void {
    this.past.push({ year: event.round, reports: event.reports, losses: this.tally });
    this.tally = freshTally();
  }
}

function freshTally(): Tally {
  return {
    left: { buildings: 0, boats: 0, rebelsSent: 0 },
    right: { buildings: 0, boats: 0, rebelsSent: 0 },
  };
}
