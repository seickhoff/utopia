import { Square } from "../geometry/square.js";
import { ChartRoom } from "./chart-room.js";
import type { Passage, Waters } from "./sea-chart.js";

/** Where a boat is, where it is bound, and the waters between. */
export interface Voyage {
  /** The square the boat's middle is over. */
  readonly here: Square;
  readonly goal: Square;
  readonly waters: Waters;
}

/** Before any voyage, the leg held is one far off the board, which no boat is ever on. */
const FAR_OFF = 10;
const NO_LEG: Passage = {
  from: Square.at(-FAR_OFF, -FAR_OFF),
  to: Square.at(-FAR_OFF, -FAR_OFF),
};

/**
 * A governor's navigation: the chart of the sea, and the leg being sailed. A leg is held until the
 * boat is over its last square. A slanting boat's middle passes through a square beside its leg on
 * the way, and charting afresh from there would set it on a new line a square over, to cross back
 * and forth between the two; so a leg is given up only once it no longer leads toward the goal, or
 * the boat has left it.
 */
export class Navigator {
  private readonly charts = new ChartRoom();
  private held: Passage = NO_LEG;

  /** Takes stock of a voyage: holds to the leg under way, or sets out on the chart's next. */
  plot(voyage: Voyage): void {
    if (this.holdsTo(voyage)) return;
    const { here, goal, waters } = voyage;
    const next = this.charts.chartOf(waters).nextWaypoint({ from: here, to: goal });
    this.held = { from: here, to: next };
  }

  /** The leg being sailed. */
  leg(): Passage {
    return this.held;
  }

  /** Where a boat bound for the goal can stop: the open sea nearest it, if it is land. */
  landfall(voyage: Voyage): Square {
    return this.charts.chartOf(voyage.waters).landfall({ from: voyage.here, to: voyage.goal });
  }

  private holdsTo(voyage: Voyage): boolean {
    const { here, goal, waters } = voyage;
    const passage = this.held;
    const onIt = isNextTo(here, passage.from) && isNextTo(here, passage.to);
    if (here === passage.to || !onIt) return false;
    return this.charts.chartOf(waters).leadsToward({ passage, goal });
  }
}

/** Whether two squares are the same or touch, side or corner. */
function isNextTo(square: Square, other: Square): boolean {
  return Math.max(Math.abs(square.row - other.row), Math.abs(square.col - other.col)) <= 1;
}
