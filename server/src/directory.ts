import type { GameOptions, Side } from "@utopia/engine";
import type { Refusal } from "@utopia/protocol";
import { Room, type ControllerInput } from "./room.js";
import { PersonSeat, type PlayerLink } from "./seats.js";
import type { CarryOn } from "@utopia/protocol";

/** Where fresh codes, secrets and seeds come from: chance in the server, fixed in tests. */
export interface DirectorySetup {
  readonly roomCode: () => string;
  readonly seatToken: () => string;
  readonly seed: () => number;
}

/** What a seated connection can do in its room. */
export interface Seating {
  input(input: ControllerInput): void;
  carryOn(choice: CarryOn): void;
  leave(): void;
  drop(): void;
}

/** Special Case: a connection not yet in any room, whose game messages go nowhere. */
export const UNSEATED: Seating = {
  input: () => {},
  carryOn: () => {},
  leave: () => {},
  drop: () => {},
};

/** A browser asking for a seat: how to reach it, and where to tell it it sits. */
export interface Asker {
  readonly link: PlayerLink;
  seatAt(seating: Seating): void;
}

interface Request {
  readonly name: string;
  readonly asker: Asker;
}

/** Every open room, by its code. */
export class Directory {
  private readonly rooms = new Map<string, Room>();

  constructor(private readonly setup: DirectorySetup) {}

  host(request: Request & { readonly options: GameOptions }): void {
    const code = this.freshCode();
    const token = this.setup.seatToken();
    const host = new PersonSeat({ name: request.name, token, link: request.asker.link });
    request.asker.link.send({ type: "seated", room: code, side: "left", seat: token });
    const room = new Room({ code, options: request.options, seed: this.setup.seed(), host });
    this.rooms.set(code, room);
    request.asker.seatAt(seatingIn(room, "left"));
  }

  join(request: Request & { readonly room: string }): void {
    const room = this.rooms.get(request.room);
    if (room === undefined || room.closed) return refuse(request.asker, "noSuchRoom");
    if (!room.takesGuests()) return refuse(request.asker, "roomFull");
    const token = this.setup.seatToken();
    request.asker.link.send({ type: "seated", room: room.code, side: "right", seat: token });
    request.asker.seatAt(seatingIn(room, "right"));
    room.seatGuest(new PersonSeat({ name: request.name, token, link: request.asker.link }));
  }

  rejoin(request: { readonly room: string; readonly seat: string; readonly asker: Asker }): void {
    const room = this.rooms.get(request.room);
    const side = room === undefined || room.closed ? "none" : room.seatHolding(request.seat);
    if (room === undefined || side === "none") return refuse(request.asker, "seatGone");
    request.asker.link.send({ type: "seated", room: room.code, side, seat: request.seat });
    request.asker.seatAt(seatingIn(room, side));
    room.rejoin(side, request.asker.link);
  }

  tick(seconds: number): void {
    this.rooms.forEach((room, code) => {
      room.tick(seconds);
      if (room.closed) this.rooms.delete(code);
    });
  }

  private freshCode(): string {
    let code = this.setup.roomCode();
    while (this.rooms.has(code)) code = this.setup.roomCode();
    return code;
  }
}

function refuse(asker: Asker, reason: Refusal): void {
  asker.link.send({ type: "refused", reason });
}

function seatingIn(room: Room, side: Side): Seating {
  return {
    input: (input) => room.input(side, input),
    carryOn: (choice) => room.carryOn(choice),
    leave: () => room.leave(side),
    drop: () => room.drop(side),
  };
}
