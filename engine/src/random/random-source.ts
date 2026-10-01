/** Port for randomness, so games can be replayed from a seed and tests stay deterministic. */
export interface RandomSource {
  /** uniform in [0, 1) */
  next(): number;
}

/** mulberry32: tiny, fast and good enough for weather, fish and pirates. */
export class SeededRandom implements RandomSource {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let mixed = this.state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  }
}
