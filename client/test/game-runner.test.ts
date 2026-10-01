import { newGame, type GameEvent, type GameSnapshot } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { BuildMenu } from "../src/app/build-menu.js";
import type { Match } from "../src/app/game-hud.js";
import {
  GameRunner,
  type BoardView,
  type FrameCallbacks,
  type FrameDriver,
  type PlayerInput,
} from "../src/app/game-runner.js";
import { GameStore } from "../src/app/game-store.js";
import type { GameFrame, GameSession } from "../src/session/game-session.js";

/** The frame loop, run by the test: a frame comes only when it ticks. */
class TickedFrames implements FrameDriver {
  running = false;

  constructor(private readonly callbacks: FrameCallbacks) {}

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

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

/** The player's controls: whether they are playing the game. */
class RecordingInput implements PlayerInput {
  attached = false;

  attach(): void {
    this.attached = true;
  }

  detach(): void {
    this.attached = false;
  }

  onFrame(): void {}
}

/** A session that hands over the same frame every time. */
class StillSession implements GameSession {
  readonly side = "left";
  readonly pausable: boolean = true;

  constructor(private readonly still: GameFrame) {}

  setDisc(): void {}

  pressKey(): void {}

  layCursor(): void {}

  advanceTo(): void {}

  frame(): GameFrame {
    return this.still;
  }
}

/** A game on the server, shared with a rival: it carries on whatever one player does. */
class SharedSession extends StillSession {
  override readonly pausable: boolean = false;
}

const MATCH: Match = { mine: "left", names: { left: "ADA", right: "COMPUTER" }, rivalled: true };

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
  const input = new RecordingInput();
  const store = new GameStore();
  let frames = new TickedFrames({ onFrame: () => {}, onPixelRatioChange: () => {} });
  const runner = new GameRunner({
    store,
    view,
    input,
    audio: { hear: () => {} },
    frames: (callbacks) => (frames = new TickedFrames(callbacks)),
    menu: new BuildMenu(),
  });
  const paused = () => store.getView().paused;
  return { runner, view, input, paused, tick: () => frames.tick(), running: () => frames.running };
}

/** A runner with a game in the browser under way, paused by its player. */
function aPausedRunner() {
  const parts = aRunner();
  parts.runner.play(new StillSession(aPlayingFrame()), MATCH);
  parts.runner.togglePause();
  return parts;
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

describe("GameRunner while the player looks away", () => {
  it("draws no frames, so a game in the browser waits", () => {
    const { runner, running } = aRunner();
    runner.play(new StillSession(aPlayingFrame()), MATCH);

    runner.lookAway();

    expect(running()).toBe(false);
  });

  it("plays on once the player looks back", () => {
    const { runner, running } = aRunner();
    runner.play(new StillSession(aPlayingFrame()), MATCH);
    runner.lookAway();

    runner.lookBack();

    expect(running()).toBe(true);
  });

  it("starts no frames on looking back at a finished game", () => {
    const { runner, tick, running } = aRunner();
    runner.play(new StillSession(anOverFrame()), MATCH);
    tick();
    runner.lookAway();

    runner.lookBack();

    expect(running()).toBe(false);
  });

  it("starts no frames on looking back at the title", () => {
    const { runner, running } = aRunner();
    runner.lookAway();

    runner.lookBack();

    expect(running()).toBe(false);
  });
});

describe("GameRunner paused by its player", () => {
  it("draws no frames, so a game in the browser waits", () => {
    const { running } = aPausedRunner();

    expect(running()).toBe(false);
  });

  it("lets go of the controls, so no key or click reaches the game", () => {
    const { input } = aPausedRunner();

    expect(input.attached).toBe(false);
  });

  it("says so on the screen", () => {
    const { paused } = aPausedRunner();

    expect(paused()).toBe(true);
  });

  it("draws the waiting game again when the page changes, as no frames come", () => {
    const { runner, view } = aPausedRunner();

    runner.refresh();

    expect(view.drawn).toHaveLength(1);
  });

  it("stays paused when the player looks back", () => {
    const { runner, running } = aPausedRunner();
    runner.lookAway();

    runner.lookBack();

    expect(running()).toBe(false);
  });

  it("plays on, with the controls taken up again, when unpaused", () => {
    const { runner, running, input, paused } = aPausedRunner();

    runner.togglePause();

    expect([running(), input.attached, paused()]).toEqual([true, true, false]);
  });

  it("starts the next game unpaused", () => {
    const { runner, paused } = aPausedRunner();
    runner.showTitle();

    runner.play(new StillSession(aPlayingFrame()), MATCH);

    expect(paused()).toBe(false);
  });
});

describe("GameRunner asked to pause what cannot wait", () => {
  it("carries a game shared with a rival on", () => {
    const { runner, running } = aRunner();
    runner.play(new SharedSession(aPlayingFrame()), MATCH);

    runner.togglePause();

    expect(running()).toBe(true);
  });

  it("leaves a finished game as it is", () => {
    const { runner, tick, paused } = aRunner();
    runner.play(new StillSession(anOverFrame()), MATCH);
    tick();

    runner.togglePause();

    expect(paused()).toBe(false);
  });

  it("leaves the title as it is", () => {
    const { runner, paused } = aRunner();

    runner.togglePause();

    expect(paused()).toBe(false);
  });
});
