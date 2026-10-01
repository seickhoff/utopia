import type { BoatKind, ItemKind } from "../board/item-kind.js";
import type { Side } from "../board/side.js";
import type { Occupant } from "../board/square-content.js";
import type { PopulationChange } from "../economy/population.js";
import type { RoundIncome } from "../economy/round-income.js";
import type { RoundScore } from "../economy/round-score.js";
import type { RazzReason } from "../pilots/keypad.js";
import type { Aboard } from "../pilots/pilot-mode.js";
import type { WeatherKind } from "../sea/weather-kind.js";
import type { Cell } from "./cell.js";

/** What sent a boat to the bottom. */
export type WreckCause = WeatherKind | "pirate" | "ptBoat";

/** What happened to a side's rebels when its round was scored. */
export type RebelChange =
  | { readonly kind: "rose"; readonly cell: Cell; readonly destroyed: Occupant }
  | { readonly kind: "dispersed"; readonly cell: Cell }
  | { readonly kind: "none" };

/** A side's year-end report: the cartridge's sums, part by part. */
export interface RoundReport {
  readonly income: RoundIncome;
  readonly population: PopulationChange;
  readonly goldEarned: number;
  readonly score: RoundScore;
  readonly witheredCrops: readonly Cell[];
  readonly rebels: RebelChange;
}

export type GameEvent =
  | { readonly type: "roundStarted"; readonly round: number }
  | { readonly type: "itemSelected"; readonly side: Side; readonly item: ItemKind }
  | { readonly type: "selectionCancelled"; readonly side: Side }
  | { readonly type: "razzed"; readonly side: Side; readonly reason: RazzReason }
  | {
      readonly type: "itemBought";
      readonly side: Side;
      readonly item: ItemKind;
      readonly cell: Cell;
    }
  | {
      readonly type: "rebelsLanded";
      readonly side: Side;
      readonly cell: Cell;
      readonly destroyed: Occupant;
      readonly cause: "bought" | "unrest";
    }
  | {
      readonly type: "boatTaken";
      readonly side: Side;
      readonly boat: BoatKind;
      readonly cell: Cell;
    }
  | {
      readonly type: "boatAnchored";
      readonly side: Side;
      readonly boat: BoatKind;
      readonly cell: Cell;
    }
  | {
      readonly type: "roundEnded";
      readonly round: number;
      readonly reports: Readonly<Record<Side, RoundReport>>;
    }
  | { readonly type: "totalsShown"; readonly round: number }
  | { readonly type: "weatherFormed"; readonly kind: WeatherKind }
  | {
      readonly type: "goldEarned";
      readonly side: Side;
      readonly source: "fishing" | "rain";
      readonly cell: Cell;
    }
  | {
      readonly type: "itemSmitten";
      readonly side: Side;
      readonly item: ItemKind;
      readonly cell: Cell;
      readonly cause: WeatherKind;
      readonly casualties: number;
    }
  | {
      readonly type: "boatWrecked";
      readonly side: Side;
      readonly boat: BoatKind;
      readonly cell: Cell;
      readonly cause: WreckCause;
    }
  | {
      readonly type: "pilotSinking";
      readonly side: Side;
      readonly boat: Aboard;
      readonly cause: WreckCause;
    }
  | { readonly type: "pilotRespawned"; readonly side: Side }
  | { readonly type: "pirateSinking"; readonly id: number }
  | { readonly type: "gameOver"; readonly totals: Readonly<Record<Side, number>> };

export type GameEventType = GameEvent["type"];

/** Port through which the game tells its players (views, sound, the network) what happened. */
export interface GameEventSink {
  record(event: GameEvent): void;
}
