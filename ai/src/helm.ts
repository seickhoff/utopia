import {
  squareAnchor,
  squareUnder,
  steerToward,
  type PixelPoint,
  type Square,
} from "@utopia/engine";
import type { ChartRoom } from "./chart-room.js";
import type { Hand } from "./hand.js";
import type { IslandView } from "./island-view.js";

/** The governor's hand on the disc, what the screen shows of its pilot, and its sea charts. */
export interface Helm {
  readonly view: IslandView;
  readonly hand: Hand;
  readonly charts: ChartRoom;
}

/**
 * Presses the disc toward a point, letting go on arrival. A pilot stopped short (a boat by a sand
 * bar, a boat put back as the cursor) is given the same heading again, as a person would.
 */
export function steerTo(helm: Helm, target: PixelPoint): void {
  const reading = steerToward(helm.view.pilotPoint(), target);
  const stoppedShort = reading === helm.hand.heading() && !helm.view.heeds(reading);
  if (stoppedShort) helm.hand.pressAgain();
  else helm.hand.steer(reading);
}

/**
 * Sails toward a point the shortest way round the islands, square by square. A point over land
 * (a school hugging the shore) is waited for, not driven at: pressing on into a sand bar only
 * inches the boat up the beach.
 */
export function sailToward(helm: Helm, target: PixelPoint): void {
  const goal = squareUnder(target);
  if (!helm.view.isNavigable(goal)) return helm.hand.letGo();
  const from = helm.view.pilotSquare();
  const waypoint = helm.charts.chartOf(helm.view).nextWaypoint({ from, to: goal });
  steerTo(helm, waypoint === goal ? target : squareAnchor(waypoint));
}

/**
 * Sails onto a square and stops there. The sand bars turn a moving boat back from shore just
 * beyond its square, so the disc is let go the moment the boat is over the square, not its middle.
 */
export function sailOnto(helm: Helm, square: Square): void {
  if (helm.view.pilotSquare() === square) helm.hand.letGo();
  else sailToward(helm, squareAnchor(square));
}
