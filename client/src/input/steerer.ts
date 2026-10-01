import {
  DISC_RELEASED,
  Navigator,
  PixelPoint,
  type DiscReading,
  squareAnchor,
  squareUnder,
  steerAlong,
  steerWithin,
  watersOf,
  type GameSnapshot,
  type Side,
  type Square,
  type Voyage,
  type Waters,
} from "@utopia/engine";
import type { GameFrame } from "../session/game-session.js";
import type { BuildMenu } from "../app/build-menu.js";
import { buysAtOnce, clickAction, type ClickAction } from "./click-action.js";
import type { HandController } from "./hand-controller.js";

/** A click on the board: the playfield point under it, and where on the page it was. */
export interface BoardClick {
  readonly point: PixelPoint;
  readonly anchor: { readonly x: number; readonly y: number };
}

/** Where the pointer is taking a boat, and whether to act on getting there. */
interface Course {
  readonly point: PixelPoint;
  readonly then: "follow" | "act";
}

/**
 * The mouse on the board. The cursor snaps square by square to the card under the pointer, and a
 * click acts there at once: with nothing chosen, a click on the player's own open land offers the
 * quick-build menu there, and the cursor holds still until it closes. A boat is a boat: the mouse
 * steers it with the disc at its own speed. Held arrow keys take over at once.
 */
export class Steerer {
  private course: Course | "adrift" = "adrift";
  private latest: GameSnapshot | "unseen" = "unseen";
  private side: Side = "left";
  private laidOn: Square | "nowhere" = "nowhere";
  /** A click waits a frame, so it is judged against a snapshot that has caught up with it. */
  private pendingClick: BoardClick | "none" = "none";
  private readonly navigator = new Navigator();

  constructor(
    private readonly controller: HandController,
    private readonly menu: BuildMenu,
  ) {}

  steerFor(side: Side): void {
    this.side = side;
    this.course = "adrift";
  }

  aim(point: PixelPoint): void {
    if (this.controller.hasArrowsHeld() || this.menu.isOpen()) return;
    if (this.isSailing()) return this.follow(point);
    this.snapTo(squareUnder(point));
  }

  click(click: BoardClick): void {
    if (this.menu.isOpen()) return this.menu.dismiss();
    if (buysAtOnce(this.controller.selection())) return this.controller.pressKeypad("enter");
    if (this.isSailing()) {
      this.course = { point: click.point, then: "act" };
      return;
    }
    const square = squareUnder(click.point);
    this.snapTo(square);
    this.pendingClick = { point: squareAnchor(square), anchor: click.anchor };
  }

  /** The pointer has left the board: a boat stops following it. */
  release(): void {
    if (this.course === "adrift" || this.course.then === "act") return;
    this.course = "adrift";
    this.controller.steer(DISC_RELEASED);
  }

  onFrame(frame: GameFrame): void {
    this.latest = frame.current;
    this.laidOn = "nowhere";
    this.settleClick();
    if (this.course === "adrift") return;
    if (this.controller.hasArrowsHeld() || !this.isSailing()) {
      this.course = "adrift";
      return;
    }
    this.steer({ course: this.course, snapshot: frame.current });
  }

  private settleClick(): void {
    if (this.pendingClick === "none") return;
    const { point, anchor } = this.pendingClick;
    this.pendingClick = "none";
    if (this.actAt(point) !== "offer") return;
    const square = squareUnder(point);
    this.menu.offer({ square: { row: square.row, col: square.col }, anchor });
  }

  private follow(point: PixelPoint): void {
    if (this.course !== "adrift" && this.course.then === "act") return;
    this.course = { point, then: "follow" };
  }

  private snapTo(square: Square): void {
    if (square === this.laidOn) return;
    this.laidOn = square;
    this.controller.layCursor(squareAnchor(square));
  }

  /**
   * Sails the sand bars' shortest way to the course's square, or the open sea nearest it, holding
   * each run's heading. Once over the pointer's own square, a boat following it comes on right
   * under it (as far as the sand bars and the edge of the sea allow); one sent to act there, or
   * stopped by land the pointer is over, has arrived, and anchors if asked.
   */
  private steer(steering: { course: Course; snapshot: GameSnapshot }): void {
    const { course, snapshot } = steering;
    const waters = watersOf(snapshot.board.squares);
    const here = squareUnder(this.pilotPoint());
    const pointed = squareUnder(course.point);
    const goal = this.navigator.landfall({ here, goal: pointed, waters });
    if (here !== goal) return this.sail({ here, goal, waters });
    if (course.then === "act" || goal !== pointed) return this.arrive(course);
    this.comeUnder({ course, shore: waters });
  }

  private sail(voyage: Voyage): void {
    this.navigator.plot(voyage);
    const leg = {
      passage: this.navigator.leg(),
      shore: voyage.waters,
      held: this.controller.heading(),
    };
    this.press(steerAlong(this.pilotPoint(), leg));
  }

  /** Brings the boat right under the pointer, in the square both are over. */
  private comeUnder(mooring: { course: Course; shore: Waters }): void {
    const { course, shore } = mooring;
    const heading = steerWithin(this.pilotPoint(), { target: course.point, shore });
    if (heading === DISC_RELEASED) return this.arrive(course);
    this.press(heading);
  }

  private arrive(course: Course): void {
    this.controller.steer(DISC_RELEASED);
    this.course = "adrift";
    if (course.then === "act") this.actAt(course.point);
  }

  /** A boat run aground has stopped, and only a fresh press of the disc sets it going again. */
  private press(disc: DiscReading): void {
    if (this.isBecalmed()) this.controller.steer(DISC_RELEASED);
    this.controller.steer(disc);
  }

  private isBecalmed(): boolean {
    if (this.latest === "unseen") return false;
    const { vx, vy } = this.latest.islands[this.side].pilot;
    return vx === 0 && vy === 0;
  }

  /** Presses the key a click at this point stands for, and says what the click asked for. */
  private actAt(point: PixelPoint): ClickAction {
    if (this.latest === "unseen") return "none";
    const selection = this.controller.selection();
    const action = clickAction({ snapshot: this.latest, side: this.side, point, selection });
    if (action !== "none" && action !== "offer") this.controller.pressKeypad(action);
    return action;
  }

  private isSailing(): boolean {
    return this.latest !== "unseen" && this.latest.islands[this.side].pilot.mode === "sailing";
  }

  private pilotPoint(): PixelPoint {
    if (this.latest === "unseen") return new PixelPoint(0, 0);
    const { x, y } = this.latest.islands[this.side].pilot;
    return new PixelPoint(x, y);
  }
}
