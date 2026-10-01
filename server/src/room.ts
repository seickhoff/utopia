import {
  PixelPoint,
  SIDES,
  newGame,
  opponentOf,
  type Game,
  type GameEvent,
  type GameOptions,
  type Side,
} from "@utopia/engine";
import type { CarryOn, ClientMessage, ServerMessage } from "@utopia/protocol";
import { computerSeat } from "./computer.js";
import { VACANT, type PlayerLink, type Seat } from "./seats.js";

/** A player's hand controller, as it reaches their room. */
export type ControllerInput = Extract<ClientMessage, { type: "disc" | "key" | "lay" }>;

export interface RoomSetup {
  readonly code: string;
  readonly options: GameOptions;
  readonly seed: number;
  readonly host: Seat;
}

/** A room no one has been connected to for this long is given up. */
const UNATTENDED_LIMIT_SECONDS = 15 * 60;
/** However late a tick comes, the game moves on at most this much at once. */
const LONGEST_STEP_SECONDS = 0.25;

interface Match {
  readonly game: Game;
  /** What happened since the last frame went out. */
  readonly events: GameEvent[];
}

type InputRules = {
  readonly [T in ControllerInput["type"]]: (
    at: { readonly game: Game; readonly side: Side },
    input: Extract<ControllerInput, { type: T }>,
  ) => void;
};

const INPUTS: InputRules = {
  disc: ({ game, side }, input) => game.setDisc(side, input.reading),
  key: ({ game, side }, input) => game.pressKey(side, input.key),
  lay: ({ game, side }, input) => game.layCursor(side, new PixelPoint(input.x, input.y)),
};

/**
 * One game between two governors, the host on the left island and the guest on the right. It
 * runs only while both islands are governed: a dropped connection holds it until that person
 * rejoins, and a governor who leaves holds it until the one left behind lets the computer take
 * over or goes back to the lobby.
 */
export class Room {
  private readonly seats: Record<Side, Seat>;
  private match: Match | "waiting" = "waiting";
  private isClosed = false;
  private unattended = 0;

  constructor(private readonly setup: RoomSetup) {
    this.seats = { left: setup.host, right: VACANT };
    setup.host.send(this.waitingMessage());
  }

  get code(): string {
    return this.setup.code;
  }

  get closed(): boolean {
    return this.isClosed;
  }

  /** A guest may join while the host waits for one. */
  takesGuests(): boolean {
    return this.match === "waiting" && !this.isClosed;
  }

  /** Which island a returning person's token is for, if any. */
  seatHolding(token: string): Side | "none" {
    return SIDES.find((side) => this.seats[side].holds(token)) ?? "none";
  }

  seatGuest(guest: Seat): void {
    this.seats.right = guest;
    const events: GameEvent[] = [];
    const sink = { record: (event: GameEvent) => events.push(event) };
    const game = newGame({ options: this.setup.options, seed: this.setup.seed, events: sink });
    game.start();
    this.match = { game, events };
    this.everyone({ type: "started", names: this.names() });
  }

  /** A person back after a dropped connection, told where things stand. */
  rejoin(side: Side, link: PlayerLink): void {
    const seat = this.seats[side];
    seat.attach(link);
    if (this.match === "waiting") return seat.send(this.waitingMessage());
    seat.send({ type: "started", names: this.names() });
    if (this.everyonePresent()) return this.everyone({ type: "resumed" });
    this.tellAbsence(seat);
  }

  drop(side: Side): void {
    this.seats[side].detach();
    if (this.match !== "waiting")
      this.seats[opponentOf(side)].send({ type: "paused", absent: side });
  }

  leave(side: Side): void {
    this.seats[side] = VACANT;
    if (this.match === "waiting" || !this.anyPerson()) return this.close();
    this.seats[opponentOf(side)].send({ type: "rivalLeft", side });
  }

  /** The one left behind decides: the computer takes the empty island, or both go to the lobby. */
  carryOn(choice: CarryOn): void {
    if (this.match === "waiting" || this.everyonePresent()) return;
    if (choice === "lobby") return this.close();
    const { game } = this.match;
    const absent = SIDES.filter((side) => !this.seats[side].present);
    absent.forEach(
      (side) => (this.seats[side] = computerSeat({ game, side, seed: this.setup.seed })),
    );
    this.everyone({ type: "started", names: this.names() });
    this.everyone({ type: "resumed" });
  }

  input(side: Side, input: ControllerInput): void {
    if (this.match === "waiting" || !this.everyonePresent()) return;
    const rule = INPUTS[input.type] as (
      at: { game: Game; side: Side },
      input: ControllerInput,
    ) => void;
    rule({ game: this.match.game, side }, input);
  }

  tick(seconds: number): void {
    if (this.isClosed) return;
    this.watchAttendance(seconds);
    if (this.match === "waiting" || !this.everyonePresent()) return;
    this.play({ match: this.match, seconds: Math.min(seconds, LONGEST_STEP_SECONDS) });
  }

  private play(turn: { match: Match; seconds: number }): void {
    const { game, events } = turn.match;
    const snapshot = game.snapshot();
    SIDES.forEach((side) => this.seats[side].govern({ snapshot, seconds: turn.seconds }));
    game.advance(turn.seconds);
    const frame = { snapshot: game.snapshot(), events: events.splice(0) };
    SIDES.forEach((side) => this.seats[side].sendFrame(frame));
  }

  private watchAttendance(seconds: number): void {
    const attended = SIDES.some(
      (side) => this.seats[side].governing === "person" && this.seats[side].present,
    );
    this.unattended = attended ? 0 : this.unattended + seconds;
    if (this.unattended > UNATTENDED_LIMIT_SECONDS) this.close();
  }

  /** A person rejoining a held game hears why it is held. */
  private tellAbsence(seat: Seat): void {
    const missing = SIDES.find((side) => !this.seats[side].present) ?? "left";
    const vacant = this.seats[missing].vacant;
    seat.send(vacant ? { type: "rivalLeft", side: missing } : { type: "paused", absent: missing });
  }

  private close(): void {
    this.isClosed = true;
    this.everyone({ type: "closed" });
  }

  private everyonePresent(): boolean {
    return SIDES.every((side) => this.seats[side].present);
  }

  private anyPerson(): boolean {
    return SIDES.some((side) => this.seats[side].governing === "person");
  }

  private names(): Readonly<Record<Side, string>> {
    return { left: this.seats.left.name, right: this.seats.right.name };
  }

  private waitingMessage(): ServerMessage {
    return { type: "waiting", room: this.setup.code, host: this.seats.left.name };
  }

  private everyone(message: ServerMessage): void {
    SIDES.forEach((side) => this.seats[side].send(message));
  }
}
