import {
  DISC_RELEASED,
  PixelPoint,
  type DiscReading,
  squareAnchor,
  squareUnder,
  steerToward,
  type GameSnapshot,
  type Side,
  type Square,
} from "@utopia/engine";
import type { GameFrame } from "../session/game-session.js";
import type { BuildMenu } from "../app/build-menu.js";
import { seaRoute } from "../board/sea-route.js";
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
    this.steer(this.course);
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
   * Sails square by square along the open-water route to the course's square, round any island in
   * the way. The boat has arrived once it is in that square (it cannot always reach the middle:
   * the sand bars stop it short of land a whole square ahead), and anchors there if asked to.
   */
  private steer(course: Course): void {
    const here = squareUnder(this.pilotPoint());
    const next = this.nextSquare({ here, goal: squareUnder(course.point) });
    if (next === "arrived") return this.arrive(course);
    this.press(steerToward(this.pilotPoint(), squareAnchor(next)));
  }

  private nextSquare(leg: { here: Square; goal: Square }): Square | "arrived" {
    if (this.latest === "unseen" || leg.here === leg.goal) return "arrived";
    const [next] = seaRoute({ squares: this.latest.board.squares, from: leg.here, to: leg.goal });
    return next ?? "arrived";
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
