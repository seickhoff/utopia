import type { DrifterKind } from "@utopia/engine";
import { Peaceful, Retaliatory, Scheming, type Aggression } from "./aggression.js";
import { Fisher, StayAtAnchor, type Seamanship } from "./seamanship.js";

export type DifficultyName = "easy" | "normal" | "hard";

export const DIFFICULTIES: readonly DifficultyName[] = ["easy", "normal", "hard"];

/** How well a computer governor plays: how quick its hands, how far it looks, how it fights. */
export interface PlayingStrength {
  /** Seconds to take in the screen before setting about something new. */
  readonly reactionSeconds: number;
  /** Seconds between key presses, and between arriving somewhere and the first. */
  readonly keyGapSeconds: number;
  /** How many rounds ahead a purchase is weighed over. */
  readonly horizonRounds: number;
  /** The chance that a governor about to buy buys the wrong thing. */
  readonly mistakeChance: number;
  /** Each governor is given its own, since seamen and schemers remember what they have seen. */
  seamanship(): Seamanship;
  aggression(): Aggression;
}

/** Hurricanes sink boats under way, and pirates catch fishing boats no fort is near. */
const HEEDED_HAZARDS: readonly DrifterKind[] = ["hurricane", "pirate"];

export const PLAYING_STRENGTHS: Readonly<Record<DifficultyName, PlayingStrength>> = {
  easy: {
    reactionSeconds: 1.2,
    keyGapSeconds: 0.6,
    horizonRounds: 1,
    mistakeChance: 0.25,
    seamanship: () => new StayAtAnchor(),
    aggression: () => new Peaceful(),
  },
  normal: {
    reactionSeconds: 0.6,
    keyGapSeconds: 0.35,
    horizonRounds: 3,
    mistakeChance: 0.05,
    seamanship: () => new Fisher([]),
    aggression: () => new Retaliatory(),
  },
  hard: {
    reactionSeconds: 0.25,
    keyGapSeconds: 0.2,
    horizonRounds: 6,
    mistakeChance: 0,
    seamanship: () => new Fisher(HEEDED_HAZARDS),
    aggression: () => new Scheming(),
  },
};
