import type { GameEvent, Side } from "@utopia/engine";
import { presentFinal } from "../hud/final-presenter.js";
import type { GameFrame, GameSession } from "../session/game-session.js";
import type { BuildMenu } from "./build-menu.js";
import { GameHud, type Match } from "./game-hud.js";
import type { GameStore } from "./game-store.js";

/** What the runner needs from the view: the classic screen or the 3D diorama. */
export interface BoardView {
  draw(frame: GameFrame): void;
  resize(): void;
}

/** What the runner needs from the controls. */
export interface PlayerInput {
  attach(session: GameSession): void;
  detach(): void;
  /** Controls that steer (the mouse) look at each frame to decide their next press. */
  onFrame(frame: GameFrame): void;
}

/** What the runner needs from the sound: each frame's events, heard from the player's island. */
export interface GameAudio {
  hear(events: readonly GameEvent[], mine: Side): void;
}

/** The frame loop the runner plays games on. */
export interface FrameDriver {
  start(): void;
  stop(): void;
}

export interface FrameCallbacks {
  readonly onFrame: (nowMs: number) => void;
  readonly onPixelRatioChange: (ratio: number) => void;
}

export interface GameRunnerSetup {
  readonly store: GameStore;
  readonly view: BoardView;
  readonly input: PlayerInput;
  readonly audio: GameAudio;
  readonly frames: (callbacks: FrameCallbacks) => FrameDriver;
  readonly menu: BuildMenu;
}

/** A game on the go, or just finished, and how it is seen. */
interface Running {
  onFrame(nowMs: number): void;
  rename(names: Readonly<Record<Side, string>>): void;
  /** Draws the game after the page has changed, if no frame is coming to draw it. */
  redraw(): void;
  /** Takes up the frames again after the player has looked away, if the game is still on. */
  wake(): void;
}

/** Special Case: nothing being played. */
const IDLE: Running = { onFrame: () => {}, rename: () => {}, redraw: () => {}, wake: () => {} };

/** Special Case: who plays before any game has begun. */
const NO_MATCH: Match = { mine: "left", names: { left: "", right: "" }, rivalled: false };

/** The client's game lifecycle: the title and setup, a game played, its final score. */
export class GameRunner {
  private readonly frames: FrameDriver;
  private running: Running = IDLE;
  private current: Match = NO_MATCH;

  constructor(private readonly setup: GameRunnerSetup) {
    this.frames = setup.frames({
      onFrame: (nowMs) => this.running.onFrame(nowMs),
      onPixelRatioChange: () => setup.view.resize(),
    });
  }

  showTitle(): void {
    this.stop();
    this.setup.store.update({ screen: "title" });
  }

  play(session: GameSession, match: Match): void {
    this.current = match;
    const hud = new GameHud({ store: this.setup.store, match, menu: this.setup.menu });
    this.running = {
      onFrame: (nowMs) => this.playFrame({ session, hud, nowMs }),
      rename: (names) => hud.rename(names),
      redraw: () => {},
      wake: () => this.frames.start(),
    };
    this.setup.input.attach(session);
    this.setup.store.update({ screen: "playing" });
    this.frames.start();
  }

  /** The governors' names change mid-game: the computer has taken over a rival's island. */
  rename(names: Readonly<Record<Side, string>>): void {
    this.current = { ...this.current, names };
    this.running.rename(names);
  }

  /** Who is playing the game on now, or was last. */
  match(): Match {
    return this.current;
  }

  /**
   * The player cannot see the board (a phone held upright): no frames are drawn, and a game in
   * the browser, which never runs on through time it did not see, waits.
   */
  lookAway(): void {
    this.frames.stop();
  }

  lookBack(): void {
    this.running.wake();
  }

  /**
   * The page has changed (its size, the view, the labels): the view is fitted to it again, and a
   * finished game, which draws no more frames, is drawn again.
   */
  refresh(): void {
    this.setup.view.resize();
    this.running.redraw();
  }

  private playFrame(moment: PlayMoment): void {
    moment.session.advanceTo(moment.nowMs);
    const frame = moment.session.frame();
    this.setup.view.draw(frame);
    this.setup.input.onFrame(frame);
    this.setup.audio.hear(frame.events, this.current.mine);
    moment.hud.present(frame);
    if (frame.events.some((event) => event.type === "gameOver")) this.finish(frame);
  }

  private finish(frame: GameFrame): void {
    this.stop();
    this.running = { ...IDLE, redraw: () => this.setup.view.draw(frame) };
    const { mine, rivalled } = this.current;
    const final = presentFinal({ snapshot: frame.current, mine, rivalled });
    this.setup.store.update({ screen: "final", final });
  }

  private stop(): void {
    this.frames.stop();
    this.setup.input.detach();
    this.running = IDLE;
  }
}

interface PlayMoment {
  readonly session: GameSession;
  readonly hud: GameHud;
  readonly nowMs: number;
}
