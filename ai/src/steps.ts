import { squareAnchor, type DrifterKind, type KeypadKey, type Square } from "@utopia/engine";
import { fishingTarget } from "./fishing.js";
import { sailOnto, sailToward, steerTo, type Helm } from "./helm.js";
import type { IslandView } from "./island-view.js";

export type StepStatus = "going" | "done" | "abandoned";

export interface StepTurn extends Helm {
  /** How long since the governor last looked. */
  readonly seconds: number;
}

/** One thing a person does with the controller: wait, steer somewhere, press a key. */
export interface Step {
  act(turn: StepTurn): void;
  status(): StepStatus;
}

/** Whether the screen shows a step can still be taken. */
export type Guard = (view: IslandView) => boolean;

/** No passage round the islands takes this long; a boat still at sea by then is stuck. */
const LONGEST_PASSAGE_SECONDS = 45;

abstract class BaseStep implements Step {
  protected state: StepStatus = "going";

  abstract act(turn: StepTurn): void;

  status(): StepStatus {
    return this.state;
  }
}

export class Pause extends BaseStep {
  private waited = 0;

  constructor(private readonly seconds: number) {
    super();
  }

  act(turn: StepTurn): void {
    this.waited += turn.seconds;
    if (this.waited >= this.seconds) this.state = "done";
  }
}

/** Lets go of the disc and cancels any half-keyed order: a fresh start on the next thing. */
export class Tidy extends BaseStep {
  act(turn: StepTurn): void {
    turn.hand.letGo();
    if (turn.view.hasSelection()) turn.hand.press("clear");
    this.state = "done";
  }
}

export class PressKey extends BaseStep {
  constructor(private readonly press: { readonly key: KeypadKey; readonly guard: Guard }) {
    super();
  }

  act(turn: StepTurn): void {
    if (!this.press.guard(turn.view)) {
      this.state = "abandoned";
      return;
    }
    turn.hand.press(this.press.key);
    this.state = "done";
  }
}

/** Flies the cursor onto a square, and lets go of the disc there. */
export class SteerCursor extends BaseStep {
  constructor(private readonly square: Square) {
    super();
  }

  act(turn: StepTurn): void {
    if (turn.view.pilotMode() !== "cursor") {
      this.state = "abandoned";
      return;
    }
    const target = squareAnchor(this.square);
    steerTo(turn, target);
    if (turn.view.hasArrivedAt(target)) this.state = "done";
  }
}

/** A step taken aboard a boat, given up if the boat is lost or takes too long. */
abstract class Seafaring extends BaseStep {
  private elapsed = 0;

  constructor(private readonly seconds: number) {
    super();
  }

  act(turn: StepTurn): void {
    this.elapsed += turn.seconds;
    if (turn.view.pilotMode() !== "sailing") this.state = "abandoned";
    else if (this.elapsed >= this.seconds) this.state = this.whenTimeIsUp();
    else this.sail(turn);
  }

  protected abstract sail(turn: StepTurn): void;

  protected abstract whenTimeIsUp(): StepStatus;
}

/** Sails round the islands onto a square, and lets go of the disc there. */
export class SailTo extends Seafaring {
  constructor(private readonly square: Square) {
    super(LONGEST_PASSAGE_SECONDS);
  }

  protected sail(turn: StepTurn): void {
    sailOnto(turn, this.square);
    if (turn.view.pilotSquare() === this.square) this.state = "done";
  }

  protected whenTimeIsUp(): StepStatus {
    return "abandoned";
  }
}

export interface Station {
  readonly square: Square;
  readonly seconds: number;
  /** What the boat waits there for. */
  readonly until: Guard;
}

/** Keeps a boat over a square for a while, or until what it waits for comes about. */
export class HoldStation extends Seafaring {
  constructor(private readonly station: Station) {
    super(station.seconds);
  }

  protected sail(turn: StepTurn): void {
    if (this.station.until(turn.view)) this.state = "done";
    else sailOnto(turn, this.station.square);
  }

  protected whenTimeIsUp(): StepStatus {
    return "done";
  }
}

export interface FishingStint {
  readonly seconds: number;
  readonly hazards: readonly DrifterKind[];
}

/** Chases schools of fish for a while, steering clear of the hazards the governor minds. */
export class ChaseFish extends Seafaring {
  constructor(private readonly stint: FishingStint) {
    super(stint.seconds);
  }

  protected sail(turn: StepTurn): void {
    sailToward(turn, fishingTarget({ view: turn.view, hazards: this.stint.hazards }));
  }

  protected whenTimeIsUp(): StepStatus {
    return "done";
  }
}
