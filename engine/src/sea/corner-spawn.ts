import type { Velocity } from "../geometry/disc.js";
import { PixelPoint } from "../geometry/pixel-point.js";
import type { Dice } from "../random/dice.js";

/** Where fish and pirates appear: near one of the four corners, heading across (L_526A). */
export interface CornerRules {
  readonly rowSpreadSides: number;
  readonly topY: number;
  readonly bottomY: number;
  readonly leftX: number;
  readonly rightX: number;
  readonly speed: number;
}

export interface CornerSpawn {
  readonly at: PixelPoint;
  readonly velocity: Velocity;
}

/** Rolls a spread of rows, then top or bottom (0 is bottom), then left or right (0 is left). */
export function cornerSpawn(dice: Dice, rules: CornerRules): CornerSpawn {
  const spread = dice.roll(rules.rowSpreadSides);
  const y = (dice.roll(2) === 0 ? rules.bottomY : rules.topY) + spread;
  const fromLeft = dice.roll(2) === 0;
  return {
    at: new PixelPoint(fromLeft ? rules.leftX : rules.rightX, y),
    velocity: { x: fromLeft ? rules.speed : -rules.speed, y: 0 },
  };
}
