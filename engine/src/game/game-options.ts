/** What the players choose before a game: the term of office and the length of each turn. */
export interface GameOptions {
  readonly rounds: number;
  readonly roundSeconds: number;
}

export interface OptionLimit {
  readonly min: number;
  readonly max: number;
}

/** "TERM OF OFFICE:" takes 1-50 rounds; "TURN LENGTH:" 30-120 seconds. */
export const GAME_OPTION_LIMITS: Readonly<Record<keyof GameOptions, OptionLimit>> = {
  rounds: { min: 1, max: 50 },
  roundSeconds: { min: 30, max: 120 },
};

/** The manual's advice: more, shorter rounds. */
export const DEFAULT_GAME_OPTIONS: GameOptions = { rounds: 10, roundSeconds: 45 };

/** Options brought within the cartridge's limits, whatever was asked for. */
export function sanitizeGameOptions(options: Partial<GameOptions>): GameOptions {
  return {
    rounds: withinLimit(options.rounds, "rounds"),
    roundSeconds: withinLimit(options.roundSeconds, "roundSeconds"),
  };
}

function withinLimit(value: number | undefined, option: keyof GameOptions): number {
  const limit = GAME_OPTION_LIMITS[option];
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_GAME_OPTIONS[option];
  return Math.min(limit.max, Math.max(limit.min, Math.round(value)));
}
