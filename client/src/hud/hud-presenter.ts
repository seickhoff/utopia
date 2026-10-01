import {
  CARD_PICTURES,
  COLOURS,
  ITEM_KINDS,
  PALETTE,
  SIDES,
  cardOf,
  keyOf,
  priceOf,
  type GameSnapshot,
  type IslandSnapshot,
  type ItemKind,
  type RazzReason,
  type Side,
} from "@utopia/engine";
import type {
  ClockViewModel,
  HudViewModel,
  PaletteItemViewModel,
  PanelViewModel,
} from "./game-view.js";

export const ITEM_NAMES: Readonly<Record<ItemKind, string>> = {
  fort: "Fort",
  factory: "Factory",
  crop: "Crops",
  school: "School",
  hospital: "Hospital",
  house: "Housing",
  rebel: "Rebels",
  ptBoat: "PT boat",
  fishingBoat: "Fishing boat",
};

/** The colours the keypad overlay prints each item in. */
const OVERLAY_COLOURS: Readonly<Record<ItemKind, number>> = {
  fort: COLOURS.black,
  factory: COLOURS.black,
  crop: COLOURS.darkGreen,
  school: COLOURS.white,
  hospital: COLOURS.red,
  house: COLOURS.yellow,
  rebel: COLOURS.black,
  ptBoat: COLOURS.red,
  fishingBoat: COLOURS.darkGreen,
};

/** Why the cartridge said RAZZ, in words. */
const RAZZ_MESSAGES: Readonly<Record<RazzReason, string>> = {
  selectionPending: "One item at a time: press Clear first",
  nothingSelected: "Choose an item first (keys 1-9)",
  cannotAfford: "Not enough gold",
  notYourLand: "Build on your own island",
  occupied: "Something already stands there",
  harbourBusy: "Sail the boat out of your harbour first",
  noRebelSite: "Forts guard every square over there",
  noBoatHere: "Put the cursor on one of your boats",
  cannotAnchorHere: "Anchor on open water",
  sinking: "Your boat is going down",
};

export type LastRazz = RazzReason | "none";

export interface HudInput {
  readonly snapshot: GameSnapshot;
  readonly mine: Side;
  readonly names: Readonly<Record<Side, string>>;
  readonly lastRazz: LastRazz;
}

const URGENT_SECONDS = 5;
const SECONDS_PER_MINUTE = 60;

export function presentHud(input: HudInput): HudViewModel {
  const { snapshot, mine, names } = input;
  return {
    mine,
    panels: SIDES.map((side) => panelOf({ island: snapshot.islands[side], title: names[side] })),
    clock: clockOf(snapshot),
    palette: ITEM_KINDS.map((kind) => paletteItemOf({ kind, island: snapshot.islands[mine] })),
    message: input.lastRazz === "none" ? "" : RAZZ_MESSAGES[input.lastRazz],
  };
}

function panelOf(named: { island: IslandSnapshot; title: string }): PanelViewModel {
  const { island, title } = named;
  return {
    side: island.side,
    title,
    gold: String(island.gold),
    population: island.population.toLocaleString("en-US"),
    total: String(island.totalScore),
    lastRound: String(island.roundScore),
    rebels: String(island.counts.rebel),
  };
}

function clockOf(snapshot: GameSnapshot): ClockViewModel {
  const minutes = Math.floor(snapshot.secondsLeft / SECONDS_PER_MINUTE);
  const seconds = String(snapshot.secondsLeft % SECONDS_PER_MINUTE).padStart(2, "0");
  return {
    year: `Year ${snapshot.round} of ${snapshot.rounds}`,
    time: `${minutes}:${seconds}`,
    urgent: snapshot.phase === "playing" && snapshot.secondsLeft <= URGENT_SECONDS,
  };
}

function paletteItemOf(item: { kind: ItemKind; island: IslandSnapshot }): PaletteItemViewModel {
  const { kind, island } = item;
  return {
    key: keyOf(kind),
    name: ITEM_NAMES[kind],
    price: String(priceOf(kind)),
    affordable: island.gold >= priceOf(kind),
    selected: island.selection === kind,
    ...itemArt(kind),
  };
}

/** How the keypad overlay shows an item: its picture from the cartridge, in its colour. */
export function itemArt(kind: ItemKind): { picture: string; colour: string } {
  return { picture: CARD_PICTURES[cardOf(kind)], colour: PALETTE[OVERLAY_COLOURS[kind]] };
}
