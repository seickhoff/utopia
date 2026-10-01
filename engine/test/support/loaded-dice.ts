import type { Dice } from "../../src/random/dice.js";

/**
 * Dice whose rolls a test scripts by number of sides. Unscripted rolls come up high (sides - 1),
 * so the cartridge's "one in N" chances never happen unless a test asks for them.
 */
export class LoadedDice implements Dice {
  private readonly queued = new Map<number, number[]>();

  /** Queues the next roll of a die with this many sides. */
  next(sides: number, face: number): this {
    this.queued.set(sides, [...(this.queued.get(sides) ?? []), face]);
    return this;
  }

  roll(sides: number): number {
    const faces = this.queued.get(sides) ?? [];
    return faces.length > 0 ? (faces.shift() as number) : sides - 1;
  }

  /** The scripted rolls nothing has used yet, so a test can tell a chance never came up. */
  unused(): number[] {
    return [...this.queued.values()].flat();
  }
}
