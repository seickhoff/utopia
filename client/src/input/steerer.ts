import {
  BOAT_KEY,
  DISC_RELEASED,
  HARBOURS,
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

/** A finger dragged on the board: the playfield point under it, and the way it presses the disc. */
export interface FingerDrag {
  readonly point: PixelPoint | "outside";
  readonly heading: DiscReading;
}

/** Where the pointer is taking a boat, and what it does on getting there. */
interface Course {
  readonly point: PixelPoint;
  readonly then: CourseEnd;
}

/**
 * How a course ends. A boat following the mouse lets go when the mouse leaves the board; one sent
 * by a click acts on the square it reaches; one sent by a finger's tap stays out on the water.
 */
type CourseEnd = "follow" | "act" | "stop";
const COURSE_ENDS: Readonly<
  Record<CourseEnd, { readonly leftWithPointer: boolean; readonly actsThere: boolean }>
> = {
  follow: { leftWithPointer: true, actsThere: false },
  act: { leftWithPointer: false, actsThere: true },
  stop: { leftWithPointer: false, actsThere: false },
};

/** A finger this close to the boat, in pixels, taps the boat itself: a fingertip is broad. */
const FINGER_REACH = 6;

/**
 * The mouse on the board. The cursor snaps square by square to the card under the pointer, and a
 * click acts there at once: with nothing chosen, a click on the player's own open land offers the
 * quick-build menu there, and the cursor holds still until it closes. A boat is a boat: the mouse
 * steers it with the disc at its own speed. A finger taps and drags in its own way (see tap and
 * drag). Held arrow keys take over at once.
 */
export class Steerer {
  /** A course to a point, nothing, or a boat driven by a finger as a thumbstick. */
  private course: Course | "adrift" | "driven" = "adrift";
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

  /**
   * A finger's tap. A boat sails to where it taps, and stays out on the water there; a tap on the
   * player's own harbour brings the boat home and docks it, as a click does, the moment it slips
   * in past the sand bars; a tap on the boat itself drops anchor and hands back the cursor.
   * Anything else is as a click.
   */
  tap(click: BoardClick): void {
    if (!this.isSailing() || this.menu.isOpen()) return this.click(click);
    if (buysAtOnce(this.controller.selection())) return this.click(click);
    if (this.isOnBoat(click.point)) return this.disembark();
    const home = squareUnder(click.point) === HARBOURS[this.side];
    this.course = { point: click.point, then: home ? "act" : "stop" };
  }

  /**
   * A finger dragged. It drives a boat as a thumbstick, the way it drags from where it landed, so
   * the finger need never follow the boat off the edge of the screen; it leads the cursor.
   */
  drag(drag: FingerDrag): void {
    if (this.isSailing()) return this.drive(drag.heading);
    if (drag.point !== "outside") this.aim(drag.point);
  }

  /** The pointer has left the board, or the finger has lifted: a boat it led or drove lets go. */
  release(): void {
    if (this.course === "adrift" || this.isHeldToCourse()) return;
    this.leaveOff();
  }

  onFrame(frame: GameFrame): void {
    this.latest = frame.current;
    this.laidOn = "nowhere";
    this.settleClick();
    if (this.course === "adrift") return;
    if (this.controller.hasArrowsHeld() || !this.isSailing()) return this.leaveOff();
    if (this.course === "driven") return;
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
    if (this.isHeldToCourse()) return;
    this.course = { point, then: "follow" };
  }

  /** Whether the boat is bound somewhere it was sent, not led: the pointer moving does not turn it. */
  private isHeldToCourse(): boolean {
    const { course } = this;
    return course !== "adrift" && course !== "driven" && !COURSE_ENDS[course.then].leftWithPointer;
  }

  private drive(heading: DiscReading): void {
    if (this.controller.hasArrowsHeld()) return;
    this.course = "driven";
    this.controller.steer(heading);
  }

  private disembark(): void {
    this.leaveOff();
    this.controller.pressKeypad(BOAT_KEY);
  }

  /** Lets the disc go and drops the course, so no press is left held for the next to repeat. */
  private leaveOff(): void {
    this.course = "adrift";
    this.controller.steer(DISC_RELEASED);
  }

  private isOnBoat(point: PixelPoint): boolean {
    const boat = this.pilotPoint();
    return Math.max(Math.abs(point.x - boat.x), Math.abs(point.y - boat.y)) <= FINGER_REACH;
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
    if (COURSE_ENDS[course.then].actsThere || goal !== pointed) return this.arrive(course);
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
  private comeUnder(spot: { course: Course; shore: Waters }): void {
    const { course, shore } = spot;
    const heading = steerWithin(this.pilotPoint(), { target: course.point, shore });
    if (heading === DISC_RELEASED) return this.arrive(course);
    this.press(heading);
  }

  private arrive(course: Course): void {
    this.controller.steer(DISC_RELEASED);
    this.course = "adrift";
    if (COURSE_ENDS[course.then].actsThere) this.actAt(course.point);
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
