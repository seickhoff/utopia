import {
  squareAnchor,
  squareUnder,
  steerAlong,
  steerToward,
  type DiscReading,
  type Navigator,
  type PixelPoint,
  type Square,
} from "@utopia/engine";
import type { Hand } from "./hand.js";
import type { IslandView } from "./island-view.js";

/** The governor's hand on the disc, what the screen shows of its pilot, and its navigation. */
export interface Helm {
  readonly view: IslandView;
  readonly hand: Hand;
  readonly navigator: Navigator;
}

/** Presses the disc toward a point, letting go on arrival. */
export function steerTo(helm: Helm, target: PixelPoint): void {
  hold(helm, steerToward(helm.view.pilotPoint(), target));
}

/**
 * Sails toward a point the shortest way round the islands, holding each run's heading from square
 * to square, and making for the point itself once it is next door. A point over land (a school
 * hugging the shore) is waited for, not driven at: pressing on into a sand bar only inches the
 * boat up the beach.
 */
export function sailToward(helm: Helm, target: PixelPoint): void {
  const goal = squareUnder(target);
  if (!helm.view.isNavigable(goal)) return helm.hand.letGo();
  helm.navigator.plot({ here: helm.view.pilotSquare(), goal, waters: helm.view });
  const passage = helm.navigator.leg();
  if (passage.to === goal) return steerTo(helm, target);
  const leg = { passage, shore: helm.view, held: helm.hand.heading() };
  hold(helm, steerAlong(helm.view.pilotPoint(), leg));
}

/**
 * Holds a heading on the disc. A pilot stopped short (a boat by a sand bar, a boat put back as the
 * cursor) is given the same heading again, as a person would.
 */
function hold(helm: Helm, reading: DiscReading): void {
  const stoppedShort = reading === helm.hand.heading() && !helm.view.heeds(reading);
  if (stoppedShort) helm.hand.pressAgain();
  else helm.hand.steer(reading);
}

/**
 * Sails onto a square and stops there. The sand bars turn a moving boat back from shore just
 * beyond its square, so the disc is let go the moment the boat is over the square, not its middle.
 */
export function sailOnto(helm: Helm, square: Square): void {
  if (helm.view.pilotSquare() === square) helm.hand.letGo();
  else sailToward(helm, squareAnchor(square));
}
