import type { IslandView } from "./island-view.js";
import type { Pace } from "./pace.js";
import { Pause, Tidy, type Step } from "./steps.js";

/** Something the governor sets out to do, and the steps a person takes to do it. */
export interface Intent {
  /** Tells one intent from another, so an order the game refused is not tried again that round. */
  readonly key: string;
  stepsAt(pace: Pace): Step[];
  /** Whether the screen shows it came about, once its steps are over. */
  cameAbout(view: IslandView): boolean;
}

/** Nothing worth doing: the governor lets go of the controller and looks again in a moment. */
class Idle implements Intent {
  readonly key = "idle";

  stepsAt(pace: Pace): Step[] {
    return [new Tidy(), new Pause(pace.drawReaction())];
  }

  cameAbout(): boolean {
    return true;
  }
}

export const IDLE: Intent = new Idle();
