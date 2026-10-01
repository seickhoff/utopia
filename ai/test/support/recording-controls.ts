import type { DiscReading, KeypadKey } from "@utopia/engine";
import type { IslandControls } from "../../src/island-controls.js";

export type Command =
  | { readonly kind: "disc"; readonly reading: DiscReading }
  | { readonly kind: "key"; readonly key: KeypadKey };

const NOWHERE: IslandControls = { setDisc: () => {}, pressKey: () => {} };

/** A hand controller that notes every command, and passes it on to a game if given one. */
export class RecordingControls implements IslandControls {
  readonly commands: Command[] = [];

  constructor(private readonly onward: IslandControls = NOWHERE) {}

  setDisc(reading: DiscReading): void {
    this.commands.push({ kind: "disc", reading });
    this.onward.setDisc(reading);
  }

  pressKey(key: KeypadKey): void {
    this.commands.push({ kind: "key", key });
    this.onward.pressKey(key);
  }

  discReadings(): DiscReading[] {
    return this.commands.flatMap((command) => (command.kind === "disc" ? [command.reading] : []));
  }

  keys(): KeypadKey[] {
    return this.commands.flatMap((command) => (command.kind === "key" ? [command.key] : []));
  }
}
