import { newGame, type GameEvent, type GameSnapshot } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { BuildMenu } from "../src/app/build-menu.js";
import type { Match } from "../src/app/game-hud.js";
import {
  GameRunner,
  type BoardView,
  type FrameCallbacks,
  type FrameDriver,
} from "../src/app/game-runner.js";
import { GameStore } from "../src/app/game-store.js";
import type { GameFrame, GameSession } from "../src/session/game-session.js";

/** The frame loop, run by the test: a frame comes only when it ticks. */
class TickedFrames implements FrameDriver {
  constructor(private readonly callbacks: FrameCallbacks) {}

  start(): void {}

  stop(): void {}

  tick(): void {
    this.callbacks.onFrame(0);
  }
}

class RecordingView implements BoardView {
  readonly drawn: GameFrame[] = [];

  draw(frame: GameFrame): void {
    this.drawn.push(frame);
  }

  resize(): void {}
}

/** A session that hands over the same frame every time. */
class StillSession implements GameSession {
  readonly side = "left";
  readonly pausable = true;

  constructor(private readonly still: GameFrame) {}

  setDisc(): void {}

  pressKey(): void {}

  layCursor(): void {}

  advanceTo(): void {}

  frame(): GameFrame {
    return this.still;
  }
}

const MATCH: Match = { mine: "left", names: { left: "ADA", right: "UTOPUS" }, rivalled: true };

function aFrame(seconds: number): GameFrame {
  const events: GameEvent[] = [];
  const game = newGame({
    options: { rounds: 1, roundSeconds: 30 },
    seed: 3,
    events: { record: (event) => events.push(event) },
  });
  game.start();
  game.advance(seconds);
  const current: GameSnapshot = game.snapshot();
  return { previous: current, current, alpha: 1, events };
}

const anOverFrame = () => aFrame(40);
const aPlayingFrame = () => aFrame(1);

function aRunner() {
  const view = new RecordingView();
  let frames = new TickedFrames({ onFrame: () => {}, onPixelRatioChange: () => {} });
  const runner = new GameRunner({
    store: new GameStore(),
    view,
    input: { attach: () => {}, detach: () => {}, onFrame: () => {} },
    audio: { hear: () => {} },
    frames: (callbacks) => (frames = new TickedFrames(callbacks)),
    menu: new BuildMenu(),
  });
  return { runner, view, tick: () => frames.tick() };
}

describe("GameRunner once the game is over", () => {
  it("draws the final picture again when the page changes, as no more frames come", () => {
    const { runner, view, tick } = aRunner();
    runner.play(new StillSession(anOverFrame()), MATCH);
    tick();

    runner.refresh();

    expect(view.drawn.map((frame) => frame.current.phase)).toEqual(["over", "over"]);
  });

  it("draws nothing more once the player has gone back to the title", () => {
    const { runner, view, tick } = aRunner();
    runner.play(new StillSession(anOverFrame()), MATCH);
    tick();
    runner.showTitle();

    runner.refresh();

    expect(view.drawn).toHaveLength(1);
  });
});

describe("GameRunner while a game is on the go", () => {
  it("leaves the drawing to the next frame when the page changes", () => {
    const { runner, view } = aRunner();
    runner.play(new StillSession(aPlayingFrame()), MATCH);

    runner.refresh();

    expect(view.drawn).toEqual([]);
  });
});
