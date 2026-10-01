import { sanitizeGameOptions, type GameOptions } from "@utopia/engine";
import { PRESET_OPTIONS } from "./game-presets.js";
import type { KeyValueStore } from "./key-value-store.js";

/** Who governs the other island: no one (the original's solo game), or the computer. */
export type OpponentChoice = "none" | "easy" | "normal" | "hard";
export const OPPONENT_CHOICES: readonly OpponentChoice[] = ["none", "easy", "normal", "hard"];

/** How the islands are shown: as the Intellivision drew them, or as a lit diorama. */
export type ViewMode = "classic" | "diorama";
export const VIEW_MODES: readonly ViewMode[] = ["classic", "diorama"];

/** Whether the cartridge's sounds are heard. */
export type SoundSetting = "on" | "off";
export const SOUND_SETTINGS: readonly SoundSetting[] = ["on", "off"];

/** Whether the classic screen's border names its numbers and says whose island is whose. */
export type LabelSetting = "on" | "off";
export const LABEL_SETTINGS: readonly LabelSetting[] = ["on", "off"];

/** The other choice of each two-way setting: what its toggle switches it to. */
export const TOGGLED = {
  view: { diorama: "classic", classic: "diorama" },
  sound: { on: "off", off: "on" },
  labels: { on: "off", off: "on" },
} as const satisfies {
  readonly view: Readonly<Record<ViewMode, ViewMode>>;
  readonly sound: Readonly<Record<SoundSetting, SoundSetting>>;
  readonly labels: Readonly<Record<LabelSetting, LabelSetting>>;
};

/** As many letters of a name as an island's label prints (the protocol's NAME_LENGTH). */
const NAME_LENGTH = 9;

/** The choices a player makes before a game. */
export interface GameSetup extends GameOptions {
  readonly opponent: OpponentChoice;
  readonly view: ViewMode;
  readonly sound: SoundSetting;
  readonly labels: LabelSetting;
  /** The player's name as they typed it, printed over their island. */
  readonly name: string;
}

/** A new player's term and year: the classic preset, longer than the manual's ten years. */
const DEFAULT_OPTIONS = PRESET_OPTIONS.classic;

export const DEFAULT_SETUP: GameSetup = {
  ...DEFAULT_OPTIONS,
  opponent: "normal",
  view: "classic",
  sound: "on",
  labels: "on",
  name: "",
};

const KEY = "utopia.setup";

/** The player's setup, kept as they change it, so the next visit begins where they left off. */
export class GameSetupStore {
  constructor(private readonly store: KeyValueStore) {}

  load(): GameSetup {
    return sanitizeSetup(parsed(this.store.read(KEY)));
  }

  save(setup: GameSetup): void {
    this.store.write(KEY, JSON.stringify(sanitizeSetup(setup)));
  }
}

/** Whether the player has given a name, which every game needs before it can start. */
export function isNamed(setup: GameSetup): boolean {
  return setup.name.trim() !== "";
}

/** A setup brought within the cartridge's limits, whatever was stored or asked for. */
export function sanitizeSetup(setup: Partial<GameSetup>): GameSetup {
  const opponent = OPPONENT_CHOICES.find((choice) => choice === setup.opponent);
  const view = VIEW_MODES.find((mode) => mode === setup.view);
  const sound = SOUND_SETTINGS.find((setting) => setting === setup.sound);
  const labels = LABEL_SETTINGS.find((setting) => setting === setup.labels);
  return {
    ...sanitizeGameOptions({ ...DEFAULT_OPTIONS, ...setup }),
    opponent: opponent ?? DEFAULT_SETUP.opponent,
    view: view ?? DEFAULT_SETUP.view,
    sound: sound ?? DEFAULT_SETUP.sound,
    labels: labels ?? DEFAULT_SETUP.labels,
    name: typeof setup.name === "string" ? setup.name.slice(0, NAME_LENGTH) : DEFAULT_SETUP.name,
  };
}

function parsed(text: string): Partial<GameSetup> {
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" ? (value as Partial<GameSetup>) : {};
  } catch {
    return {};
  }
}
