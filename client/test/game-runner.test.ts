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
  /** Whether the camera has caught up with where the player turned it. */
  atRest = true;

  draw(frame: GameFrame): void {
    this.drawn.push(frame);
  }

  resize(): void {}

  isAtRest(): boolean {
    return this.atRest;
  }
}

/** The player's controls: whether they are playing the game, or only looking round it. */
class RecordingInput implements PlayerInput {
  attached = false;
  looking = false;
  private turned = () => {};

  attach(): void {
    this.attached = true;
  }

  lookAround(turned: () => void): void {
    this.looking = true;
    this.turned = turned;
  }

  detach(): void {
    this.attached = false;
    this.looking = false;
  }

  onFrame(): void {}

  /** The player turns the camera: zooms, tilts or looks elsewhere. */
  turnTheCamera(): void {
    this.turned();
  }
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
/** A frame in play in which something happened: a round began. */
const aBusyPlayingFrame = (): GameFrame => ({
  ...aPlayingFrame(),
  events: [{ type: "roundStarted", round: 2 }],
});
const hadEvents = (frames: readonly GameFrame[]) => frames.map((frame) => frame.events.length > 0);

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

/** A runner whose game has just ended, its camera still easing toward where it was turned. */
function aFinishedRunner() {
  const parts = aRunner();
  parts.view.atRest = false;
  parts.runner.play(new StillSession(anOverFrame()), MATCH);
  parts.tick();
  return parts;
}

/** A runner whose game has ended, its camera come to rest and its frames stopped. */
function aRestingRunner() {
  const parts = aFinishedRunner();
  parts.view.atRest = true;
  parts.tick();
  return parts;
}

/** A runner with a game in the browser under way, paused by its player. */
function aPausedRunner() {
  const parts = aRunner();
  parts.runner.play(new StillSession(aPlayingFrame()), MATCH);
  parts.runner.togglePause();
  return parts;
}

describe("GameRunner once the game is over", () => {
  it("lets go of the game's controls, keeping only the camera's to look round with", () => {
    const { input } = aFinishedRunner();

    expect([input.attached, input.looking]).toEqual([false, true]);
  });

  it("draws on while the camera comes to rest", () => {
    const { view, tick, running } = aFinishedRunner();

    tick();

    expect([view.drawn.length, running()]).toEqual([2, true]);
  });

  it("draws no more frames once the camera is at rest", () => {
    const { running } = aRestingRunner();

    expect(running()).toBe(false);
  });

  it("takes up the frames again when the player turns the camera", () => {
    const { input, running } = aRestingRunner();

    input.turnTheCamera();

    expect(running()).toBe(true);
  });

  it("stops looking round when the player goes back to the title", () => {
    const { runner, input } = aRestingRunner();

    runner.showTitle();

    expect(input.looking).toBe(false);
  });

  it("hands the game's controls back for the next game", () => {
    const { runner, input } = aRestingRunner();

    runner.play(new StillSession(aPlayingFrame()), MATCH);

    expect([input.attached, input.looking]).toEqual([true, false]);
  });

  it("draws the islands on with the last moment's events left out, as they were drawn once", () => {
    const { view, tick } = aFinishedRunner();

    tick();

    expect(hadEvents(view.drawn)).toEqual([true, false]);
  });

  it("draws the final picture again when the page changes", () => {
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

  it("draws the waiting game again with its last moment's events left out, as they were drawn once", () => {
    const { runner, view } = aRunner();
    runner.play(new StillSession(aBusyPlayingFrame()), MATCH);
    runner.togglePause();

    runner.refresh();

    expect(hadEvents(view.drawn)).toEqual([false]);
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
