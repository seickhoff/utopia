/** A running count toward a threshold: fish caught, showers on crops, storm damage, rammings. */
export class Tally {
  private counted = 0;

  constructor(private readonly threshold: number) {}

  count(): number {
    return this.counted;
  }

  add(amount: number): void {
    this.counted += amount;
  }

  isFull(): boolean {
    return this.counted >= this.threshold;
  }

  empty(): void {
    this.counted = 0;
  }
}

export interface TallyRules {
  readonly catchesPerGold: number;
  readonly showersPerGold: number;
  readonly rammingsToSink: number;
}

/**
 * Each side's running counts. The cartridge keeps one of each per player, shared by all their
 * boats and crops, and never clears them between rounds.
 */
export class Tallies {
  readonly fishing: Tally;
  readonly showers: Tally;
  readonly stormDamage: Tally;
  readonly ramming: Tally;

  constructor(rules: TallyRules & { readonly destroyAt: number }) {
    this.fishing = new Tally(rules.catchesPerGold);
    this.showers = new Tally(rules.showersPerGold);
    this.stormDamage = new Tally(rules.destroyAt);
    this.ramming = new Tally(rules.rammingsToSink);
  }
}
