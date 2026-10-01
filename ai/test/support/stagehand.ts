import { DEFAULT_RULES, FRAMES_PER_SECOND, Navigator, type Game, type Side } from "@utopia/engine";
import type { Errand } from "../../src/errand.js";
import { Hand } from "../../src/hand.js";
import { IslandView } from "../../src/island-view.js";
import type { Step } from "../../src/steps.js";
import { RecordingControls } from "./recording-controls.js";

const FRAME_SECONDS = 1 / FRAMES_PER_SECOND;

/** Carries out a governor's errand in a live game, a frame at a time, noting every command. */
export class Stagehand {
  readonly controls: RecordingControls;
  private readonly hand = new Hand();
  private readonly navigator = new Navigator();

  constructor(private readonly stage: { readonly game: Game; readonly side: Side }) {
    const { game, side } = stage;
    this.controls = new RecordingControls({
      setDisc: (reading) => game.setDisc(side, reading),
      pressKey: (key) => game.pressKey(side, key),
    });
    this.hand.grasp(this.controls);
  }

  /** Plays until the errand is over, or the time runs out. */
  run(errand: Errand, limit: { seconds: number }): this {
    for (let frame = 0; frame < limit.seconds * FRAMES_PER_SECOND && !errand.isOver(); frame += 1) {
      errand.carryOn({
        view: this.view(),
        hand: this.hand,
        navigator: this.navigator,
        seconds: FRAME_SECONDS,
      });
      this.stage.game.advance(FRAME_SECONDS);
    }
    return this;
  }

  /** Acts out one step, once. */
  actOut(step: Step): this {
    step.act({
      view: this.view(),
      hand: this.hand,
      navigator: this.navigator,
      seconds: FRAME_SECONDS,
    });
    return this;
  }

  view(): IslandView {
    const snapshot = this.stage.game.snapshot();
    return new IslandView({ snapshot, side: this.stage.side, speeds: DEFAULT_RULES.pilots });
  }
}
