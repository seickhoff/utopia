import type { GameOptions } from "@utopia/engine";

/** A ready-made length of game: so many years in office, each so many seconds long. */
export type GamePreset = "quick" | "classic" | "fast" | "full" | "long";
export const GAME_PRESETS: readonly GamePreset[] = ["quick", "classic", "fast", "full", "long"];

/** A term and a year set by hand, as no preset sets them: the special case among the presets. */
export type GamePresetChoice = GamePreset | "custom";

export const PRESET_OPTIONS: Readonly<Record<GamePreset, GameOptions>> = {
  quick: { rounds: 20, roundSeconds: 30 },
  classic: { rounds: 20, roundSeconds: 45 },
  fast: { rounds: 30, roundSeconds: 30 },
  full: { rounds: 30, roundSeconds: 45 },
  long: { rounds: 40, roundSeconds: 45 },
};

const SECONDS_PER_MINUTE = 60;

/** The preset that sets these options, or "custom" when none does. */
export function presetOf(options: GameOptions): GamePresetChoice {
  const preset = GAME_PRESETS.find((each) => sameLength(PRESET_OPTIONS[each], options));
  return preset ?? "custom";
}

/** How many minutes of play a game holds: every year's seconds end to end, year ends aside. */
export function gameMinutes(options: GameOptions): number {
  return (options.rounds * options.roundSeconds) / SECONDS_PER_MINUTE;
}

function sameLength(preset: GameOptions, options: GameOptions): boolean {
  return preset.rounds === options.rounds && preset.roundSeconds === options.roundSeconds;
}
