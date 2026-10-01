import type { GameEvent, GameEventType, Side } from "@utopia/engine";
import type { SoundName } from "./rom-sounds.js";

/** A sound to play, or Special Case: none. */
export type Cue = SoundName | "silence";

export interface Heard {
  readonly event: GameEvent;
  /** The island this player governs: only their own refusals are razzed at them. */
  readonly mine: Side;
}

type EventOf<T extends GameEventType> = Extract<GameEvent, { type: T }>;
type CueRules = { readonly [T in GameEventType]: (event: EventOf<T>, mine: Side) => Cue };

const quiet = (): Cue => "silence";
const GOLD_SOUNDS: Readonly<Record<EventOf<"goldEarned">["source"], Cue>> = {
  fishing: "fishPling",
  rain: "rainOnCrop",
};

/** Where the cartridge calls each of its sounds, event by event. */
const CUES: CueRules = {
  roundStarted: quiet,
  itemSelected: quiet,
  selectionCancelled: quiet,
  // X_PLAY_RAZZ2 at $507C, $50AD and $5941
  razzed: (event, mine) => (event.side === mine ? "razz" : "silence"),
  itemBought: quiet,
  // $5C32: only when the rebels destroy what stood on the square
  rebelsLanded: (event) => (event.destroyed === "nothing" ? "silence" : "smitten"),
  boatTaken: quiet,
  boatAnchored: quiet,
  // $53F0, as the last second of a round runs out
  roundEnded: () => "roundOver",
  totalsShown: quiet,
  weatherFormed: quiet,
  // FISH_PLING at $54C4; the rain-on-crop sound at $5754
  goldEarned: (event) => GOLD_SOUNDS[event.source],
  // $56FA
  itemSmitten: () => "smitten",
  // $5536 for an anchored boat, $55BB for a sailing one or a pirate
  boatWrecked: () => "sinkingShip",
  pilotSinking: () => "sinkingShip",
  pirateSinking: () => "sinkingShip",
  pilotRespawned: quiet,
  gameOver: quiet,
};

/** Which of the cartridge's sounds an event makes, heard from one island. */
export function soundOf(heard: Heard): Cue {
  const rule = CUES[heard.event.type] as (event: GameEvent, mine: Side) => Cue;
  return rule(heard.event, heard.mine);
}
