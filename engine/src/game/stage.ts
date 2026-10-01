import { FRAMES_PER_SECOND, FRAMES_PER_TICK, playFrame, runTick } from "./frame-step.js";
import { closeRound } from "./round-end.js";
import { bySide, type World } from "./world.js";

export type GamePhase = "ready" | "playing" | "scores" | "totals" | "over";

/** A stretch of the game: waiting, playing a turn, the year-end displays, or the end. */
export interface Phase {
  readonly name: GamePhase;
  secondsLeft(): number;
  frame(): void;
}

/** Waiting to begin, or finished: nothing moves. */
class Stillness implements Phase {
  constructor(readonly name: "ready" | "over") {}
  secondsLeft(): number {
    return 0;
  }
  frame(): void {}
}

/** Runs the game's phases one after another, a 60 Hz frame at a time. */
export class Stage {
  private current: Phase = new Stillness("ready");

  constructor(private readonly world: World) {}

  phase(): Phase {
    return this.current;
  }

  start(): void {
    if (this.current.name !== "ready") return;
    this.enter(new Playing(this.world, this));
    this.world.events.record({ type: "roundStarted", round: this.world.clock.round });
  }

  frame(): void {
    this.current.frame();
  }

  enter(phase: Phase): void {
    this.current = phase;
  }
}

/** A turn in play: sprites move every frame; the timer task runs every third. */
class Playing implements Phase {
  readonly name = "playing";
  private frames = 0;

  constructor(
    private readonly world: World,
    private readonly stage: Stage,
  ) {}

  secondsLeft(): number {
    return this.world.clock.secondsLeft;
  }

  frame(): void {
    this.frames += 1;
    playFrame(this.world);
    if (this.frames % FRAMES_PER_TICK !== 0) return;
    runTick(this.world);
    if (!this.world.clock.hasRunOut()) return;
    closeRound(this.world);
    this.stage.enter(new YearEnd(this.world, this.stage));
  }
}

/** The frozen year-end: SCORES, then TOTALS, then the next turn or the end of the term. */
class YearEnd implements Phase {
  private framesLeft: number;
  private showing: "scores" | "totals" = "scores";

  constructor(
    private readonly world: World,
    private readonly stage: Stage,
  ) {
    this.framesLeft = framesIn(world.rules.timing.scoresSeconds);
  }

  get name(): GamePhase {
    return this.showing;
  }

  secondsLeft(): number {
    return this.framesLeft / FRAMES_PER_SECOND;
  }

  frame(): void {
    this.framesLeft -= 1;
    if (this.framesLeft > 0) return;
    if (this.showing === "scores") return this.showTotals();
    return this.world.clock.isTermOver() ? this.endTerm() : this.beginNextRound();
  }

  private showTotals(): void {
    this.showing = "totals";
    this.framesLeft = framesIn(this.world.rules.timing.totalsSeconds);
    this.world.events.record({ type: "totalsShown", round: this.world.clock.round });
  }

  private beginNextRound(): void {
    this.world.clock.beginNextRound();
    this.stage.enter(new Playing(this.world, this.stage));
    this.world.events.record({ type: "roundStarted", round: this.world.clock.round });
  }

  /** The fat lady sings: "FINAL SCORE", and every sprite is taken off the screen. */
  private endTerm(): void {
    this.stage.enter(new Stillness("over"));
    this.world.sea.clearAll();
    const totals = bySide((side) => this.world.islands[side].standing().totalScore);
    this.world.events.record({ type: "gameOver", totals });
  }
}

function framesIn(seconds: number): number {
  return Math.round(seconds * FRAMES_PER_SECOND);
}
