import { DISC_RELEASED, type DiscReading, type KeypadKey } from "@utopia/engine";
import type { IslandControls } from "./island-controls.js";

/** Before the governor is first handed the controller, its presses go nowhere. */
const EMPTY_HANDED: IslandControls = { setDisc: () => {}, pressKey: () => {} };

/**
 * The computer governor's hand on the controller. Like a person's thumb it holds the disc steady:
 * the EXEC only sets a sprite's velocity when the disc changes, so a held heading is not resent.
 */
export class Hand {
  private controls: IslandControls = EMPTY_HANDED;
  private held: DiscReading = DISC_RELEASED;

  grasp(controls: IslandControls): void {
    this.controls = controls;
  }

  steer(reading: DiscReading): void {
    if (reading !== this.held) this.pressDisc(reading);
  }

  /** A sprite stopped by a shore, or put back after sinking, only moves on a fresh press. */
  pressAgain(): void {
    this.pressDisc(this.held);
  }

  letGo(): void {
    this.steer(DISC_RELEASED);
  }

  press(key: KeypadKey): void {
    this.controls.pressKey(key);
  }

  heading(): DiscReading {
    return this.held;
  }

  private pressDisc(reading: DiscReading): void {
    this.held = reading;
    this.controls.setDisc(reading);
  }
}
