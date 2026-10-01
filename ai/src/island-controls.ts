import type { DiscReading, KeypadKey } from "@utopia/engine";

/** The hand controller a governor plays with: the same disc and keypad a person holds. */
export interface IslandControls {
  setDisc(reading: DiscReading): void;
  pressKey(key: KeypadKey): void;
}
