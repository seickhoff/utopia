import type { Side } from "@utopia/engine";
import { DEFAULT_SETUP, type GameSetup } from "../settings/game-setup-store.js";

export type Screen = "title" | "playing" | "final";

export type SetupViewModel = GameSetup;

export interface PanelViewModel {
  readonly side: Side;
  readonly title: string;
  readonly gold: string;
  readonly population: string;
  readonly total: string;
  readonly lastRound: string;
  readonly rebels: string;
}

export interface ClockViewModel {
  readonly year: string;
  readonly time: string;
  readonly urgent: boolean;
}

export interface PaletteItemViewModel {
  readonly key: number;
  readonly name: string;
  readonly price: string;
  readonly affordable: boolean;
  readonly selected: boolean;
  /** The item's picture from the cartridge, rows joined by "/" ("#" lit). */
  readonly picture: string;
  /** The colour the overlay prints it in, as CSS. */
  readonly colour: string;
}

export interface HudViewModel {
  readonly mine: Side;
  readonly panels: readonly PanelViewModel[];
  readonly clock: ClockViewModel;
  readonly palette: readonly PaletteItemViewModel[];
  readonly message: string;
}

export interface YearEndLine {
  readonly label: string;
  readonly left: string;
  readonly right: string;
}

export interface YearEndViewModel {
  readonly shown: "none" | "scores" | "totals";
  readonly title: string;
  readonly lines: readonly YearEndLine[];
}

/** One year of the year-by-year log. */
export interface YearLogEntry {
  readonly title: string;
  readonly lines: readonly YearEndLine[];
}

/** Every year so far, the latest first. */
export interface YearLogViewModel {
  readonly entries: readonly YearLogEntry[];
}

/**
 * Where an online game stands: connecting, waiting for a rival with a code to share, refused,
 * under way, held while a rival is away, or asking what to do after a rival left.
 */
export type OnlineStage =
  | "offline"
  | "connecting"
  | "reconnecting"
  | "waiting"
  | "refused"
  | "playing"
  | "paused"
  | "rivalLeft";

export interface OnlineViewModel {
  readonly stage: OnlineStage;
  /** The room's code, to read out to a rival. */
  readonly room: string;
  /** A link that joins the room. */
  readonly link: string;
  /** Whom the game waits for, who left, or why the server refused. */
  readonly note: string;
}

export const OFFLINE: OnlineViewModel = { stage: "offline", room: "", link: "", note: "" };

export interface FinalViewModel {
  readonly headline: string;
  readonly lines: readonly YearEndLine[];
}

/** A click's offer to build on an open square, and where on the page the click was. */
export interface BuildOffer {
  readonly square: { readonly row: number; readonly col: number };
  readonly anchor: { readonly x: number; readonly y: number };
}

export interface BuildChoiceViewModel {
  readonly key: number;
  readonly name: string;
  readonly price: string;
  /** The item's picture from the cartridge, rows joined by "/" ("#" lit). */
  readonly picture: string;
  readonly colour: string;
  readonly ready: boolean;
  /** Why it cannot be bought now ("Need 15 more", "Harbour busy"); empty when it can. */
  readonly note: string;
  /** Where it goes, when not on the square itself ("In harbour"); otherwise empty. */
  readonly where: string;
  /** What it costs and where it goes, or why it cannot be bought: "40 gold, in harbour". */
  readonly terms: string;
}

/** The quick-build menu: what can be put on the clicked square, and what can be bought besides. */
export interface BuildMenuViewModel {
  readonly open: boolean;
  /** Where the click was, in page pixels. */
  readonly x: number;
  readonly y: number;
  readonly gold: string;
  readonly here: readonly BuildChoiceViewModel[];
  readonly elsewhere: readonly BuildChoiceViewModel[];
}

export interface GameView {
  readonly screen: Screen;
  /** A game in the browser held by its player, waiting until they play on. */
  readonly paused: boolean;
  readonly setup: SetupViewModel;
  readonly hud: HudViewModel;
  readonly yearEnd: YearEndViewModel;
  readonly yearLog: YearLogViewModel;
  readonly online: OnlineViewModel;
  readonly buildMenu: BuildMenuViewModel;
  /** A picture of each item as the 3D view models it, by its keypad key; empty without 3D. */
  readonly portraits: Readonly<Record<number, string>>;
  /** The title screen's picture of the game as the Intellivision drew it; "" if none. */
  readonly titlePicture: string;
  readonly final: FinalViewModel;
}

/** Where React reads the view from (the store), without knowing who writes it. */
export interface GameViewSource {
  subscribe(listener: () => void): () => void;
  getView(): GameView;
}

export const NO_YEAR_END: YearEndViewModel = { shown: "none", title: "", lines: [] };

/** Special Case: the quick-build menu closed. */
export const NO_BUILD_MENU: BuildMenuViewModel = {
  open: false,
  x: 0,
  y: 0,
  gold: "",
  here: [],
  elsewhere: [],
};

const EMPTY_HUD: HudViewModel = {
  mine: "left",
  panels: [],
  clock: { year: "", time: "", urgent: false },
  palette: [],
  message: "",
};

export const INITIAL_VIEW: GameView = {
  screen: "title",
  paused: false,
  setup: DEFAULT_SETUP,
  hud: EMPTY_HUD,
  yearEnd: NO_YEAR_END,
  yearLog: { entries: [] },
  online: OFFLINE,
  buildMenu: NO_BUILD_MENU,
  portraits: {},
  titlePicture: "",
  final: { headline: "", lines: [] },
};
