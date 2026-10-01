import type { RandomSource } from "./random-source.js";

/**
 * Every chance in Utopia is the EXEC's X_RAND2: a whole number from 0 to one less than the number
 * of sides. The cartridge's own generator lives in the console ROM; any fair die plays the same.
 */
export interface Dice {
  roll(sides: number): number;
}

export class FairDice implements Dice {
  constructor(private readonly random: RandomSource) {}

  roll(sides: number): number {
    return Math.floor(this.random.next() * sides);
  }
}
